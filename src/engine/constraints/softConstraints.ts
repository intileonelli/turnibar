import { Employee } from '@/src/models';
import { SolverContext, SolverState } from '../state';
import { Slot } from '../types';

export function preferenceMatches(employee: Employee, slot: Pick<Slot, 'categoryId'>): boolean {
  if (!employee.preferredCategoryIds?.length) return true;
  return employee.preferredCategoryIds.includes(slot.categoryId);
}

/**
 * Punteggio di preferenza per una fascia: più alto quanto più la fascia è in cima alla lista
 * (indice 0 = più importante). -1 se il dipendente ha delle preferenze ma questa fascia non è
 * tra quelle; 0 se non ha impostato nessuna preferenza (neutro, non gioca né a favore né contro).
 */
function preferenceRank(employee: Employee, categoryId: string): number {
  const ids = employee.preferredCategoryIds;
  if (!ids?.length) return 0;
  const index = ids.indexOf(categoryId);
  return index === -1 ? -1 : ids.length - index;
}

/** Indice del ruolo dello slot coperto dal dipendente (principale o secondario) e se è avvenuto tramite il ruolo secondario. */
function matchRolePriority(employee: Employee, slot: Pick<Slot, 'roleIds'>) {
  const primaryIndex = slot.roleIds.indexOf(employee.roleId);
  const secondaryIndex = employee.secondaryRoleId ? slot.roleIds.indexOf(employee.secondaryRoleId) : -1;
  const matched = [primaryIndex, secondaryIndex].filter((i) => i !== -1);
  const priorityIndex = matched.length ? Math.min(...matched) : slot.roleIds.length;
  const usedSecondary = secondaryIndex !== -1 && (primaryIndex === -1 || secondaryIndex < primaryIndex);
  return { priorityIndex, usedSecondary };
}

/**
 * "Punteggio" del candidato per uno slot, come una classifica a più livelli: si confronta prima
 * il primo livello tra due candidati, e solo se sono pari si passa al livello successivo, e così
 * via. In questo modo un livello superiore vince SEMPRE su uno inferiore, senza eccezioni dovute
 * a somme di più fattori minori (a differenza di un punteggio numerico unico, dove diversi
 * vantaggi piccoli potrebbero sommarsi e superare un vantaggio grande su un livello più
 * importante). L'ordine, dal più al meno importante, riflette quello scelto per l'azienda:
 * 1) turno fisso, 1bis) fascia oraria richiesta per quella data specifica (stesso peso di un
 * turno fisso, ma per un solo giorno), 2) preferenza di fascia oraria generale, 3) idoneità di
 * ruolo (principale o alternativa), 4) priorità del dipendente, 5) giorno della settimana
 * preferito, 6) equità nella distribuzione delle ore. Ferie, indisponibilità, turni fissi
 * "esclusivi" e fasce richieste sono invece vincoli hard, già applicati prima di arrivare qui
 * (vedi hardConstraints.ts): tra i candidati che arrivano a questo confronto sono già tutti
 * idonei. Ma essere idonei non basta a farli VINCERE lo slot: senza un livello dedicato, un
 * dipendente che ha chiesto una fascia per un giorno preciso non avrebbe alcun vantaggio su
 * altri candidati altrettanto idonei (e la sua preferenza settimanale generale, se diversa,
 * giocherebbe pure contro di lui).
 */
function rankCandidate(employee: Employee, slot: Slot, state: SolverState, context: SolverContext): number[] {
  const pinned = employee.pinnedShiftTemplateIds?.includes(slot.shiftTemplateId) ? 1 : 0;

  const requestedCategoryForDate = context.categoryRequestByEmployeeAndDate.get(employee.id)?.get(slot.date);
  const dateCategoryMatch = requestedCategoryForDate !== undefined && requestedCategoryForDate === slot.categoryId ? 1 : 0;

  const preference = preferenceRank(employee, slot.categoryId);

  const { priorityIndex, usedSecondary } = matchRolePriority(employee, slot);
  const role = -(priorityIndex * 2 + (usedSecondary ? 1 : 0));

  const priority = employee.priority === 'alta' ? 1 : employee.priority === 'bassa' ? -1 : 0;

  const weekday = employee.preferredWeekdays?.includes(slot.weekday) ? 1 : 0;

  let fairness = 0;
  if (employee.weeklyContractHours !== undefined && employee.weeklyContractHours > 0) {
    fairness = 1 - state.getHours(employee.id) / employee.weeklyContractHours;
  }

  return [pinned, dateCategoryMatch, preference, role, priority, weekday, fairness];
}

/** Confronta due classifiche livello per livello: il primo livello diverso decide, i successivi contano solo a parità. */
function compareRanks(a: number[], b: number[]): number {
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return b[i] - a[i];
  }
  return 0;
}

export function sortCandidatesByScore(
  employees: Employee[],
  slot: Slot,
  state: SolverState,
  context: SolverContext
): Employee[] {
  return [...employees].sort((a, b) => compareRanks(rankCandidate(a, slot, state, context), rankCandidate(b, slot, state, context)));
}

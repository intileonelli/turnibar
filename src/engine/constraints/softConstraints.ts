import { Employee } from '@/src/models';
import { shiftPreferenceCategory } from '../dateUtils';
import { SolverState } from '../state';
import { Slot } from '../types';

const PREFERENCE_MATCH_BONUS = 10;
const PREFERENCE_MISMATCH_PENALTY = -5;
const WEEKDAY_PREFERENCE_BONUS = 8;
const FAIRNESS_WEIGHT = 10;
/**
 * Penalità per ogni "gradino" di priorità sceso nell'elenco ruoli di uno slot (es. ruolo
 * principale = 0, prima alternativa = 1, ...). Abbastanza alta da dominare su preferenza e
 * equità, così il ruolo principale viene sempre scelto quando disponibile, e le alternative
 * intervengono solo quando quello principale non è copribile.
 */
const ROLE_PRIORITY_PENALTY = 50;
/** Piccola penalità aggiuntiva se il dipendente copre lo slot con il proprio ruolo secondario. */
const EMPLOYEE_SECONDARY_ROLE_PENALTY = 5;
/**
 * Bonus per un turno tipo "fisso" del dipendente (es. "Inti il martedì fa sempre Sera 1").
 * Molto più alto di ogni altro fattore, così vince sempre tra i candidati idonei; se il
 * dipendente non è idoneo (ferie, indisponibilità, altri vincoli hard) semplicemente non è tra
 * i candidati e il turno va a qualcun altro come al solito.
 */
const PINNED_SHIFT_BONUS = 1000;

export function preferenceMatches(employee: Employee, slot: Pick<Slot, 'startTime'>): boolean {
  if (employee.preference === 'nessuna') return true;
  return employee.preference === shiftPreferenceCategory(slot.startTime);
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
 * Punteggio del candidato per uno slot: più alto è meglio. Combina priorità di ruolo, preferenza
 * di fascia oraria e giorno, e distribuzione equa (solo se il dipendente ha ore contrattuali
 * impostate), così la copertura dei turni resta guidata prima di tutto dall'idoneità (vincoli
 * hard) e questi fattori intervengono solo per scegliere tra candidati già idonei.
 */
export function scoreCandidate(employee: Employee, slot: Slot, state: SolverState): number {
  let score = 0;

  if (employee.pinnedShiftTemplateIds?.includes(slot.shiftTemplateId)) {
    score += PINNED_SHIFT_BONUS;
  }

  const { priorityIndex, usedSecondary } = matchRolePriority(employee, slot);
  if (priorityIndex > 0) {
    score -= priorityIndex * ROLE_PRIORITY_PENALTY;
  }
  if (usedSecondary) {
    score -= EMPLOYEE_SECONDARY_ROLE_PENALTY;
  }

  if (employee.preference !== 'nessuna') {
    score +=
      shiftPreferenceCategory(slot.startTime) === employee.preference
        ? PREFERENCE_MATCH_BONUS
        : PREFERENCE_MISMATCH_PENALTY;
  }

  if (employee.preferredWeekdays && employee.preferredWeekdays.length > 0) {
    if (employee.preferredWeekdays.includes(slot.weekday)) {
      score += WEEKDAY_PREFERENCE_BONUS;
    }
  }

  if (employee.weeklyContractHours !== undefined && employee.weeklyContractHours > 0) {
    const fillRatio = state.getHours(employee.id) / employee.weeklyContractHours;
    score += (1 - fillRatio) * FAIRNESS_WEIGHT;
  }

  return score;
}

export function sortCandidatesByScore(
  employees: Employee[],
  slot: Slot,
  state: SolverState
): Employee[] {
  return [...employees].sort((a, b) => scoreCandidate(b, slot, state) - scoreCandidate(a, slot, state));
}

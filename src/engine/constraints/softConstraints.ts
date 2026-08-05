import { Employee } from '@/src/models';
import { shiftPreferenceCategory } from '../dateUtils';
import { SolverState } from '../state';
import { Slot } from '../types';

const PREFERENCE_MATCH_BONUS = 10;
const PREFERENCE_MISMATCH_PENALTY = -5;
const FAIRNESS_WEIGHT = 10;

export function preferenceMatches(employee: Employee, slot: Pick<Slot, 'startTime'>): boolean {
  if (employee.preference === 'nessuna') return true;
  return employee.preference === shiftPreferenceCategory(slot.startTime);
}

/**
 * Punteggio del candidato per uno slot: più alto è meglio. Combina preferenza di fascia oraria
 * e distribuzione equa (scostamento tra ore già assegnate e ore contrattuali del dipendente),
 * così un part-time non viene penalizzato rispetto a un full-time.
 */
export function scoreCandidate(employee: Employee, slot: Slot, state: SolverState): number {
  let score = 0;

  if (employee.preference !== 'nessuna') {
    score +=
      shiftPreferenceCategory(slot.startTime) === employee.preference
        ? PREFERENCE_MATCH_BONUS
        : PREFERENCE_MISMATCH_PENALTY;
  }

  const contractHours = employee.weeklyContractHours > 0 ? employee.weeklyContractHours : 1;
  const fillRatio = state.getHours(employee.id) / contractHours;
  score += (1 - fillRatio) * FAIRNESS_WEIGHT;

  return score;
}

export function sortCandidatesByScore(
  employees: Employee[],
  slot: Slot,
  state: SolverState
): Employee[] {
  return [...employees].sort((a, b) => scoreCandidate(b, slot, state) - scoreCandidate(a, slot, state));
}

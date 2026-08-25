import { Employee } from '@/src/models';
import { getEligibleCandidates } from './constraints/hardConstraints';
import { sortCandidatesByScore } from './constraints/softConstraints';
import { shiftDurationHours } from './dateUtils';
import { SolverContext, SolverState } from './state';
import { Slot } from './types';

/** Limite di chiamate ricorsive per la ricerca esaustiva, per evitare tempi di calcolo eccessivi. */
const MAX_BACKTRACK_STEPS = 200_000;

export interface SolveResult {
  state: SolverState;
  unresolvedSlots: Slot[];
}

/** Ordina gli slot dal più al meno vincolato (minor numero di candidati idonei), euristica MRV. */
function sortSlotsByMostConstrainedFirst(
  slots: Slot[],
  employees: Employee[],
  context: SolverContext
): Slot[] {
  const probeState = new SolverState();
  const withCounts = slots.map((slot) => ({
    slot,
    eligibleCount: getEligibleCandidates(employees, slot, probeState, context).length,
  }));

  withCounts.sort((a, b) => {
    if (a.eligibleCount !== b.eligibleCount) return a.eligibleCount - b.eligibleCount;
    if (a.slot.date !== b.slot.date) return a.slot.date.localeCompare(b.slot.date);
    if (a.slot.startTime !== b.slot.startTime) return a.slot.startTime.localeCompare(b.slot.startTime);
    return a.slot.roleIds.join(',').localeCompare(b.slot.roleIds.join(','));
  });

  return withCounts.map((w) => w.slot);
}

/**
 * Ricerca esaustiva (backtracking): prova a coprire TUTTI gli slot, esplorando i candidati in
 * ordine di punteggio (preferenza + equità) e tornando indietro quando un ramo non porta a una
 * soluzione completa. Limitata da MAX_BACKTRACK_STEPS: oltre il budget si arrende (nessuna
 * soluzione completa trovata in tempo utile) e il chiamante ricade sul passo greedy.
 */
function solveExhaustive(
  slots: Slot[],
  employees: Employee[],
  context: SolverContext
): SolverState | null {
  const state = new SolverState();
  let steps = 0;

  function backtrack(index: number): boolean {
    if (index === slots.length) return true;
    steps++;
    if (steps > MAX_BACKTRACK_STEPS) return false;

    const slot = slots[index];
    const duration = shiftDurationHours(slot.startTime, slot.endTime);
    const candidates = sortCandidatesByScore(
      getEligibleCandidates(employees, slot, state, context),
      slot,
      state,
      context
    );

    for (const candidate of candidates) {
      state.assign(slot, candidate.id, duration);
      if (backtrack(index + 1)) return true;
      state.unassign(slot, candidate.id, duration);
    }
    return false;
  }

  return backtrack(0) ? state : null;
}

/**
 * Passo greedy: assegna il miglior candidato disponibile a ogni slot in ordine; se uno slot non
 * ha candidati idonei lo lascia scoperto e prosegue. Termina sempre e riporta cosa non è coperto.
 */
function solveGreedy(slots: Slot[], employees: Employee[], context: SolverContext): SolveResult {
  const state = new SolverState();
  const unresolvedSlots: Slot[] = [];

  for (const slot of slots) {
    const candidates = sortCandidatesByScore(
      getEligibleCandidates(employees, slot, state, context),
      slot,
      state,
      context
    );
    if (candidates.length === 0) {
      unresolvedSlots.push(slot);
      continue;
    }
    const duration = shiftDurationHours(slot.startTime, slot.endTime);
    state.assign(slot, candidates[0].id, duration);
  }

  return { state, unresolvedSlots };
}

/**
 * Risolve l'assegnazione turni: prima tenta una copertura completa con backtracking esaustivo
 * (bounded), poi ricade su un passo greedy che garantisce sempre un risultato, riportando
 * chiaramente gli slot che non è stato possibile coprire rispettando i vincoli hard.
 */
export function solveSchedule(
  slots: Slot[],
  employees: Employee[],
  context: SolverContext
): SolveResult {
  const orderedSlots = sortSlotsByMostConstrainedFirst(slots, employees, context);

  const exhaustiveState = solveExhaustive(orderedSlots, employees, context);
  if (exhaustiveState) {
    return { state: exhaustiveState, unresolvedSlots: [] };
  }

  return solveGreedy(orderedSlots, employees, context);
}

export type PhaseRange = {
  startDate: string;
  endDate: string;
};

export function validatePhaseSequence(phases: PhaseRange[]) {
  if (phases.length === 0) {
    return { ok: true as const };
  }

  for (let i = 0; i < phases.length; i += 1) {
    const phase = phases[i];
    if (phase.startDate > phase.endDate) {
      return {
        ok: false as const,
        reason: `Phase ${i + 1} has start date after end date`,
      };
    }

    if (i > 0) {
      const previous = phases[i - 1];
      if (phase.startDate <= previous.endDate) {
        return {
          ok: false as const,
          reason: `Phase ${i + 1} overlaps or touches previous phase`,
        };
      }
    }
  }

  return { ok: true as const };
}

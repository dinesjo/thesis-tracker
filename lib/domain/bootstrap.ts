import {
  DEFAULT_DELIVERABLES,
  DEFAULT_PHASES,
  DEFAULT_PROJECT_DESCRIPTION,
  DEFAULT_PROJECT_TITLE,
} from "@/lib/domain/constants";

export function buildSeedTemplate(ownerId: string) {
  const deliverablePhaseAssignments = [0, 0, 1, 1, 1, 2, 2, 3, 3, 4];

  return {
    project: {
      ownerId,
      title: DEFAULT_PROJECT_TITLE,
      description: DEFAULT_PROJECT_DESCRIPTION,
      startDate: DEFAULT_PHASES[0].startDate,
      endDate: DEFAULT_PHASES[DEFAULT_PHASES.length - 1].endDate,
    },
    phases: DEFAULT_PHASES.map((phase, index) => ({
      name: phase.name,
      orderIndex: index,
      startDate: phase.startDate,
      endDate: phase.endDate,
      colorToken: phase.colorToken,
    })),
    deliverables: DEFAULT_DELIVERABLES.map((title, index) => ({
      title,
      phaseIndex: deliverablePhaseAssignments[index] ?? 0,
    })),
  };
}

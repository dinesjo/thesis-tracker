/**
 * Consistent phase color palette used across all views.
 * Colors are assigned by orderIndex (0–based) and cycle if there are more than 5 phases.
 */

const palette = [
  { bg: "var(--phase-0)", fg: "var(--phase-0-fg)" },
  { bg: "var(--phase-1)", fg: "var(--phase-1-fg)" },
  { bg: "var(--phase-2)", fg: "var(--phase-2-fg)" },
  { bg: "var(--phase-3)", fg: "var(--phase-3-fg)" },
  { bg: "var(--phase-4)", fg: "var(--phase-4-fg)" },
] as const;

export function phaseColor(orderIndex: number) {
  return palette[orderIndex % palette.length];
}

/** Inline style for a colored phase dot or bar accent */
export function phaseDotStyle(orderIndex: number): React.CSSProperties {
  return { backgroundColor: phaseColor(orderIndex).fg };
}

/** Inline style for a subtle phase background band */
export function phaseBandStyle(orderIndex: number): React.CSSProperties {
  const c = phaseColor(orderIndex);
  return { backgroundColor: c.bg, borderColor: c.fg };
}

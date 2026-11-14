// Eco Score → level. Everyone starts at Level 1 with 0 score.

const LEVELS = [
  { min: 0, name: "Eco Starter" },
  { min: 200, name: "Green Helper" },
  { min: 500, name: "Eco Activist" },
  { min: 1000, name: "Eco Champion" },
  { min: 1600, name: "Eco Hero" },
  { min: 2500, name: "Planet Guardian" },
];

/** Eco Score earned for each verified (resolved) report. */
export const SCORE_PER_RESOLVED_REPORT = 25;

export interface LevelInfo {
  level: number;
  name: string;
  score: number;
  /** Score needed for the next level, or null at the top level. */
  next: number | null;
  /** Progress through the current level, 0–100. */
  percent: number;
}

export function levelFor(score: number): LevelInfo {
  let i = 0;
  while (i + 1 < LEVELS.length && score >= LEVELS[i + 1].min) i++;
  const cur = LEVELS[i];
  const next = LEVELS[i + 1]?.min ?? null;
  const percent = next == null ? 100 : Math.round(((score - cur.min) / (next - cur.min)) * 100);
  return { level: i + 1, name: cur.name, score, next, percent };
}

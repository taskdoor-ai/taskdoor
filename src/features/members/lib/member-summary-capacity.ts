export const SUMMARY_ROWS = 4;
const SUMMARY_AVATAR_STEP = 22;
const SUMMARY_ROW_PADDING = 6;

/**
 * How many collaborator avatars four collapsed rows hold, for a value column `width` pixels wide:
 * the first row beside the plus and the arrow (`controls` pixels, their margin included), the three
 * after it across the whole column. Each 28px avatar steps 22px (a half overlap), and the row is
 * padded 6px so the first one starts at the edge -- the CSS of `.member-selector-summary-avatars`.
 */
export function summaryCapacity(width: number, controls: number) {
  const line = width - SUMMARY_ROW_PADDING;
  const first = Math.max(1, Math.floor((line - controls) / SUMMARY_AVATAR_STEP));
  const rest = Math.max(1, Math.floor(line / SUMMARY_AVATAR_STEP));
  return first + (SUMMARY_ROWS - 1) * rest;
}

/** The plus and the arrow, 28px each with 8px between, and 8px before them. */
export const summaryControlsWidth = (withAdd: boolean) => 8 + 28 + (withAdd ? 28 + 8 : 0);

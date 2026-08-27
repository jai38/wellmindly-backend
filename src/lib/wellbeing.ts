/**
 * Wellbeing check-in bands - server-side mirror.
 *
 * The canonical table and the full reasoning live in
 * `frontend-student/src/lib/wellbeing.ts`. It cannot be imported across the
 * process boundary, so this is a deliberate duplicate. **If you change a
 * boundary or a label here, change it there too.**
 *
 * Short version of why this file exists: the Discover instrument is five
 * questions on a 0-3 frequency scale (total 0-15). It was branded "PHQ-9" and
 * this route assigned it diagnosis-shaped labels - `'Severe Depression'` at a
 * score of 13, `'Moderate Stress'` at 9, mixing two vocabularies in one ladder.
 * The real PHQ-9 has nine items, a max of 27 and published bands of
 * 0-4 / 5-9 / 10-14 / 15-19 / 20-27, and the four items this instrument omits
 * include the suicidal-ideation item. A five-item subset with invented bands is
 * not a validated instrument, and this service is not in a position to return a
 * diagnosis.
 *
 * The cut points are unchanged from what this route already used
 * (>= 13 / >= 9 / >= 5 / else), so no stored QuizResult changes band. Only the
 * label strings change.
 */

export const WELLBEING_MAX_SCORE = 15;

export interface WellbeingBand {
  id: 'steady' | 'patchy' | 'demanding' | 'heavy';
  min: number;
  max: number;
  label: string;
}

export const WELLBEING_BANDS: readonly WellbeingBand[] = [
  { id: 'steady', min: 0, max: 4, label: 'A steady couple of weeks' },
  { id: 'patchy', min: 5, max: 8, label: 'Some rough patches' },
  { id: 'demanding', min: 9, max: 12, label: 'A demanding stretch' },
  { id: 'heavy', min: 13, max: WELLBEING_MAX_SCORE, label: 'A heavy couple of weeks' },
];

/** Band for a raw 0-15 total. Clamps rather than throwing. */
export function bandFor(score: number): WellbeingBand {
  const s = Number.isFinite(score) ? score : 0;
  if (s <= WELLBEING_BANDS[0].max) return WELLBEING_BANDS[0];
  const hit = WELLBEING_BANDS.find((b) => s >= b.min && s <= b.max);
  return hit ?? WELLBEING_BANDS[WELLBEING_BANDS.length - 1];
}

/**
 * Non-diagnostic bands for any other quiz, by percentage of its own max.
 * Replaces the old 'Severe Stress' / 'Moderate Stress' / … ladder. These quizzes
 * are self-reflection modules (strengths, values, personality); "Severe" was
 * never a claim they could support either.
 */
export function bandForPercent(pct: number): string {
  if (pct >= 80) return 'A heavy couple of weeks';
  if (pct >= 50) return 'A demanding stretch';
  if (pct >= 20) return 'Some rough patches';
  return 'A steady couple of weeks';
}

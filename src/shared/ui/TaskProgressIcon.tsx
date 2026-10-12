import type { SVGProps } from "react";

type Props = SVGProps<SVGSVGElement> & {
  size?: number | string;
  ratio?: number | null;
  completed?: boolean;
  cancelled?: boolean;
};

/** Four assessment segments, or a continuous ring for a confirmed terminal state. */
export function TaskProgressIcon({ size = 28, ratio, completed = false, cancelled = false, ...props }: Props) {
  const valid = ratio != null && Number.isFinite(ratio) && ratio >= 0 && ratio <= 1;
  const segments = !valid || ratio === 0 ? 0 : ratio === 1 ? 4 : Math.min(3, Math.max(1, Math.round(ratio * 4)));
  return <svg width={size} height={size} viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
    {completed || cancelled ? <>
      <circle cx="14" cy="14" r="11.5" />
      {completed ? <path d="m8.5 14 3.5 3.5 7.5-7.5" strokeWidth={2.5} /> : <path d="m10 10 8 8m0-8-8 8" strokeWidth={2.5} />}
    </> : <g transform="rotate(-90 14 14)">{[0, 1, 2, 3].map(segment => <circle key={segment} cx="14" cy="14" r="11.5" pathLength="100" strokeDasharray="20 80" strokeDashoffset={-segment * 25} opacity={segment < segments ? 1 : .2} />)}</g>}
  </svg>;
}

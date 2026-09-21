import { useId, type CSSProperties } from "react";

// Trace the six inward connections in onboarding-team-v1.png (1254 × 1254).
// Every path is authored from a teammate toward the doorway, never outward.
const connections = [
  "M 449 376 C 520 393 577 420 602 493 C 621 531 645 563 647 623",
  "M 800 355 C 766 409 690 433 658 493 C 643 527 644 571 647 623",
  "M 917 605 C 861 572 820 600 765 624 C 720 644 681 651 647 623",
  "M 832 850 C 808 784 741 736 671 718 C 644 700 642 660 647 623",
  "M 465 800 C 478 775 503 752 531 738 C 576 713 620 670 647 623",
  "M 320 644 C 399 611 431 557 526 603 C 563 622 604 633 647 623",
];

const colors = ["mint", "mint", "mint", "lilac", "mint", "gold"] as const;
const phases = [0, 3.2, 1.1, 4.3, 2.1, 5.3];
const beads = [{ lag: 0, size: 7 }, { lag: .34, size: 3.8 }];

function flowStyle(index: number, lag = 0): CSSProperties {
  return { "--flow-delay": `${-phases[index] + lag}s`, "--flow-path": `path("${connections[index]}")` } as CSSProperties;
}

export function TeamFlowIllustration() {
  const id = useId();
  const maskId = `${id}-door-mask`;
  const entryId = `${id}-door-entry`;
  const glowId = `${id}-door-glow`;

  return <svg className="onboarding-door-flow" viewBox="0 0 1254 1254" aria-hidden="true" focusable="false">
    <defs>
      <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width="1254" height="1254">
        <rect width="1254" height="1254" fill="white" />
        {/* Let the open door leaf and frame occlude incoming light. */}
        <path d="M 543 510 L 613 546 L 613 705 L 543 740 Z" fill="black" />
        <path d="M 560 517 H 689 V 727" fill="none" stroke="black" strokeWidth="12" />
      </mask>
      <clipPath id={entryId}><path d="M 615 525 H 681 V 723 L 615 702 Z" /></clipPath>
      <radialGradient id={glowId}>
        <stop offset="0" stopColor="#9ee2b5" stopOpacity=".7" />
        <stop offset="1" stopColor="#bdebd0" stopOpacity="0" />
      </radialGradient>
      {([
        ["mint", "#b6e9c5", "#4b9a73"],
        ["lilac", "#e3d4f8", "#a284ce"],
        ["gold", "#fff0bb", "#d8b75a"],
      ] as const).map(([name, light, shade]) => <radialGradient key={name} id={`${id}-${name}`} cx="30%" cy="25%" r="80%">
        <stop offset="0" stopColor={light} />
        <stop offset="1" stopColor={shade} />
      </radialGradient>)}
    </defs>
    <g mask={`url(#${maskId})`}>
      {connections.map((path, index) => <g key={path}>
        {beads.map(({ lag, size }) => <g key={lag} className="onboarding-flow-particle" style={flowStyle(index, lag)}>
          <g className="onboarding-flow-bead">
            {lag === 0 && <circle className="onboarding-flow-aura" r="17" fill={`url(#${id}-${colors[index]})`} />}
            <circle r={size} fill={`url(#${id}-${colors[index]})`} stroke="white" strokeWidth="1.5" />
          </g>
        </g>)}
      </g>)}
    </g>
    <g clipPath={`url(#${entryId})`}>
      {connections.map((path, index) => <g key={path} style={flowStyle(index)}>
        <ellipse className="onboarding-door-arrival" cx="647" cy="623" rx="42" ry="64" fill={`url(#${glowId})`} />
        <ellipse className="onboarding-door-ripple" cx="647" cy="623" rx="13" ry="20" />
      </g>)}
    </g>
  </svg>;
}

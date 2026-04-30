type IconProps = { size?: number; color?: string; style?: React.CSSProperties };

const base = (size: number): React.SVGProps<SVGSVGElement> => ({
  width: size, height: size, viewBox: "0 0 20 20", fill: "none",
  stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round" as const, strokeLinejoin: "round" as const,
  style: { display: "block", flexShrink: 0 },
});

export function IconAI({ size = 20 }: IconProps) {
  return (
    <svg {...base(size)} aria-hidden>
      <rect x="5" y="5" width="10" height="10" rx="1.5" />
      <rect x="7.5" y="7.5" width="5" height="5" rx="0.75" />
      <path d="M5 8.5H3M5 11.5H3M15 8.5H17M15 11.5H17M8.5 5V3M11.5 5V3M8.5 15V17M11.5 15V17" />
    </svg>
  );
}

export function IconBio({ size = 20 }: IconProps) {
  return (
    <svg {...base(size)} aria-hidden>
      <path d="M7 2c0 0 3 2.5 3 8s-3 8-3 8M13 2c0 0-3 2.5-3 8s3 8 3 8" />
      <path d="M7 7.5c1 .8 2 1 3 1s2-.2 3-1M7 12.5c1-.8 2-1 3-1s2 .2 3 1" />
    </svg>
  );
}

export function IconGlobe({ size = 20 }: IconProps) {
  return (
    <svg {...base(size)} aria-hidden>
      <circle cx="10" cy="10" r="7.5" />
      <path d="M10 2.5S7.5 5 7.5 10s2.5 7.5 2.5 7.5M10 2.5S12.5 5 12.5 10s-2.5 7.5-2.5 7.5" />
      <path d="M2.5 10h15M3.2 6.5h13.6M3.2 13.5h13.6" />
    </svg>
  );
}

export function IconTrendingUp({ size = 20 }: IconProps) {
  return (
    <svg {...base(size)} aria-hidden>
      <polyline points="2,15 7,9 11,12 16,5" />
      <path d="M13 5h3v3" />
    </svg>
  );
}

export function IconAtom({ size = 20 }: IconProps) {
  return (
    <svg {...base(size)} aria-hidden>
      <circle cx="10" cy="10" r="1.5" fill="currentColor" stroke="none" />
      <ellipse cx="10" cy="10" rx="8" ry="3" />
      <ellipse cx="10" cy="10" rx="8" ry="3" transform="rotate(60 10 10)" />
      <ellipse cx="10" cy="10" rx="8" ry="3" transform="rotate(120 10 10)" />
    </svg>
  );
}

export function IconSparkle({ size = 20 }: IconProps) {
  return (
    <svg {...base(size)} fill="currentColor" stroke="none" aria-hidden>
      <path d="M10 2c0 0-.8 3.8-2 5S2 10 2 10s3.8.8 6 2 2 6 2 6 .8-3.8 2-6 6-2 6-2-3.8-.8-6-2S10 2 10 2z" />
    </svg>
  );
}

export function IconHeart({ size = 20, style }: IconProps) {
  return (
    <svg {...base(size)} style={{ ...base(size).style, ...style }} aria-hidden>
      <path d="M10 17S3.5 13 3.5 7.5a3.75 3.75 0 016.5-2.5 3.75 3.75 0 016.5 2.5C16.5 13 10 17 10 17z" />
    </svg>
  );
}

export function IconCheck({ size = 14 }: IconProps) {
  return (
    <svg {...base(size)} aria-hidden>
      <polyline points="3.5,10 7.5,14 16.5,5.5" />
    </svg>
  );
}

export function IconX({ size = 14 }: IconProps) {
  return (
    <svg {...base(size)} aria-hidden>
      <line x1="4.5" y1="4.5" x2="15.5" y2="15.5" />
      <line x1="15.5" y1="4.5" x2="4.5" y2="15.5" />
    </svg>
  );
}

export function IconRefresh({ size = 14 }: IconProps) {
  return (
    <svg {...base(size)} aria-hidden>
      <path d="M16.5 10a6.5 6.5 0 1 1-1.4-4" />
      <path d="M16.5 3.5v3h-3" />
    </svg>
  );
}

export function IconStar({ size = 12 }: IconProps) {
  return (
    <svg {...base(size)} fill="currentColor" stroke="none" aria-hidden>
      <path d="M10 2l2 6h6l-5 3.6 2 6L10 14l-5 3.6 2-6L2 8h6z" />
    </svg>
  );
}

export function IconWarning({ size = 16 }: IconProps) {
  return (
    <svg {...base(size)} aria-hidden>
      <path d="M10 2.5L1.5 17.5h17L10 2.5z" />
      <line x1="10" y1="8.5" x2="10" y2="12.5" />
      <circle cx="10" cy="15" r="0.75" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconShield({ size = 20 }: IconProps) {
  return (
    <svg {...base(size)} aria-hidden>
      <path d="M10 2L3 5.5v5c0 4.2 3 7.5 7 8.5 4-1 7-4.3 7-8.5v-5L10 2z" />
      <path d="M7.5 10l1.5 1.5 3-3" />
    </svg>
  );
}

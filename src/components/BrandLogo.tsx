import { useId } from 'react';

interface BrandLogoProps {
  size?: number;
  className?: string;
  adaptive?: boolean;
}

export function BrandLogo({
  size = 28,
  className = '',
  adaptive = true,
}: BrandLogoProps) {
  const uid = useId().replace(/:/g, '');
  const shieldId = `tk-banshee-shield-${uid}`;
  const visorId = `tk-banshee-visor-${uid}`;
  const goldId = `tk-banshee-gold-${uid}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      fill="none"
      aria-hidden="true"
      className={`shrink-0 ${className}`.trim()}
    >
      <defs>
        <linearGradient
          id={shieldId}
          x1="48"
          y1="32"
          x2="464"
          y2="480"
          gradientUnits="userSpaceOnUse"
        >
          <stop
            offset="0%"
            stopColor={adaptive ? 'var(--tk-surface-elevated, #151824)' : '#151824'}
          />
          <stop offset="100%" stopColor="#090B12" />
        </linearGradient>
        <linearGradient
          id={goldId}
          x1="70"
          y1="72"
          x2="442"
          y2="220"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#FDE047" />
          <stop offset="52%" stopColor="#FFB703" />
          <stop offset="100%" stopColor="#EA580C" />
        </linearGradient>
        <linearGradient
          id={visorId}
          x1="130"
          y1="220"
          x2="382"
          y2="300"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#FFB703" />
          <stop
            offset="100%"
            stopColor={adaptive ? 'var(--tk-mecha-visor, #FF7A1A)' : '#FF7A1A'}
          />
        </linearGradient>
      </defs>

      {/* Chamfered Banshee Armor Shield Base */}
      <path
        d="M84 24H428L488 84V352L256 488L24 352V84L84 24Z"
        fill={`url(#${shieldId})`}
        stroke={adaptive ? 'var(--tk-accent, #EA580C)' : '#EA580C'}
        strokeWidth="10"
      />
      <path
        d="M96 42H416L470 96V340L256 466L42 340V96L96 42Z"
        stroke="#FFB703"
        strokeOpacity="0.28"
        strokeWidth="4"
      />

      {/* Dark Titanium Banshee Helmet Crown */}
      <path
        d="M168 158L256 126L344 158L364 316L256 382L148 316L168 158Z"
        fill="#1E2333"
        stroke="#475569"
        strokeWidth="5"
      />

      {/* Multi-Pronged Banshee Gold V-Fin Mane */}
      <path
        d="M256 170L68 78L94 128L132 142L108 94L242 192L256 170Z"
        fill={`url(#${goldId})`}
      />
      <path
        d="M256 170L444 78L418 128L380 142L404 94L270 192L256 170Z"
        fill={`url(#${goldId})`}
      />
      <path
        d="M256 164L126 60L154 118L240 184L256 164Z"
        fill={`url(#${goldId})`}
      />
      <path
        d="M256 164L386 60L358 118L272 184L256 164Z"
        fill={`url(#${goldId})`}
      />

      {/* Glowing Psycho-Frame Forehead Crest */}
      <path d="M234 128H278L270 194H242L234 128Z" fill={`url(#${visorId})`} />

      {/* Dark Eye Recess + Glowing Twin Psycho-Frame Eyes */}
      <path d="M158 228H354L344 268H168L158 228Z" fill="#07080D" />
      <path d="M174 238L236 246L230 262H180L174 238Z" fill={`url(#${visorId})`} />
      <path d="M338 238L276 246L282 262H332L338 238Z" fill={`url(#${visorId})`} />

      {/* Faceplate Psycho-Frame Seams & Vents */}
      <path d="M214 294H298" stroke="#FFB703" strokeWidth="9" strokeLinecap="square" />
      <path d="M224 322H288" stroke="#FF7A1A" strokeWidth="8" strokeLinecap="square" />

      {/* Amber Chin Guard */}
      <path d="M234 348H278L268 386H244L234 348Z" fill={`url(#${visorId})`} />

      {/* Top Optical Camera */}
      <rect x="242" y="80" width="28" height="22" rx="2" fill={`url(#${visorId})`} />
    </svg>
  );
}

import { useId } from 'react';

export function BansheeMediaPanel({
  className = '',
}: {
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={`tk-armor-cut relative overflow-hidden border border-[var(--tk-accent-border)] bg-[#07080D] shadow-md select-none ${className}`.trim()}
    >
      <video
        src="/assets/aistudio/rx-0-unicorn-gundam-02-banshee.3840x2160_4e545ce4.mp4"
        autoPlay
        loop
        muted
        playsInline
        preload="metadata"
        className="h-full w-full object-cover object-center opacity-90"
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, rgba(7,8,13,0.1) 0%, rgba(7,8,13,0.35) 60%, rgba(7,8,13,0.88) 100%)',
        }}
      />
      <div className="absolute bottom-2 left-2.5 right-2.5 flex items-center justify-between gap-2">
        <span className="font-display text-[10px] font-bold tracking-[0.14em] uppercase text-[#FFB703]">
          RX-0[N] BANSHEE
        </span>
        <span className="font-mono text-[9px] font-semibold uppercase tracking-wider text-[#FF9E3D]">
          UNIT 02
        </span>
      </div>
    </div>
  );
}

export function HeroDimensionalSculpture({
  className = '',
}: {
  className?: string;
}) {
  const uid = useId().replace(/:/g, '');
  const armorGrad = `tk-banshee-armor-${uid}`;
  const frameGrad = `tk-banshee-frame-${uid}`;
  const goldGrad = `tk-banshee-gold-${uid}`;
  const visorGrad = `tk-banshee-visor-${uid}`;

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none select-none ${className}`.trim()}
    >
      <svg
        viewBox="0 0 240 240"
        fill="none"
        className="w-full h-full tk-float-orb"
      >
        <defs>
          <linearGradient id={armorGrad} x1="40" y1="30" x2="200" y2="200" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#262B3D" />
            <stop offset="55%" stopColor="#161925" />
            <stop offset="100%" stopColor="#0D0F18" />
          </linearGradient>
          <linearGradient id={frameGrad} x1="40" y1="140" x2="200" y2="220" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#1E2333" />
            <stop offset="100%" stopColor="#0B0D14" />
          </linearGradient>
          <linearGradient id={goldGrad} x1="26" y1="24" x2="214" y2="115" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FDE047" />
            <stop offset="50%" stopColor="#FFB703" />
            <stop offset="100%" stopColor="#EA580C" />
          </linearGradient>
          <linearGradient id={visorGrad} x1="70" y1="100" x2="170" y2="195" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFB703" />
            <stop offset="100%" stopColor="var(--tk-mecha-visor, #FF7A1A)" />
          </linearGradient>
        </defs>

        {/* Hangar Target Reticle Halo */}
        <circle
          cx="120"
          cy="122"
          r="94"
          stroke="var(--tk-accent)"
          strokeOpacity="0.32"
          strokeWidth="2"
          strokeDasharray="10 6"
        />
        <ellipse
          cx="120"
          cy="214"
          rx="74"
          ry="13"
          fill="var(--tk-accent)"
          fillOpacity="0.18"
        />

        {/* Obsidian Banshee Torso + Glowing Psycho-Frame Ribs */}
        <path
          d="M44 174L68 150H172L196 174L184 208H56L44 174Z"
          fill={`url(#${frameGrad})`}
          stroke="var(--tk-accent)"
          strokeOpacity="0.6"
          strokeWidth="2"
        />
        <path d="M58 166L86 178L78 190L52 178Z" fill={`url(#${visorGrad})`} />
        <path d="M182 166L154 178L162 190L188 178Z" fill={`url(#${visorGrad})`} />

        {/* Central Chest Chronometer Reactor Core */}
        <circle cx="120" cy="182" r="22" fill="#090B12" stroke={`url(#${goldGrad})`} strokeWidth="3" />
        <circle cx="120" cy="182" r="16" fill="var(--tk-surface)" />
        <path
          d="M120 171V182L129 177"
          stroke="var(--tk-accent)"
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="120" cy="182" r="2.5" fill="#FFB703" />

        {/* Banshee Gold Lion-Mane Collar */}
        <path d="M84 142H156L146 158H94L84 142Z" fill={`url(#${goldGrad})`} />

        {/* Obsidian Helmet & Cheek Guards */}
        <path
          d="M78 70L120 48L162 70L170 128L120 152L70 128L78 70Z"
          fill={`url(#${armorGrad})`}
          stroke="#475569"
          strokeOpacity="0.55"
          strokeWidth="2"
        />
        <path d="M72 96L86 102V134L70 126L72 96Z" fill="#2A3044" />
        <path d="M168 96L154 102V134L170 126L168 96Z" fill="#2A3044" />

        {/* Mohawk Main Sensor */}
        <path d="M108 42H132L136 74H104L108 42Z" fill="#1E2333" stroke="#FFB703" strokeOpacity="0.45" strokeWidth="1.5" />
        <rect x="112" y="47" width="16" height="12" rx="1.5" fill={`url(#${visorGrad})`} />

        {/* Multi-Pronged Banshee Gold V-Fin */}
        <path d="M120 80L24 32L38 60L58 66L46 44L114 92L120 80Z" fill={`url(#${goldGrad})`} />
        <path d="M120 80L216 32L202 60L182 66L194 44L126 92L120 80Z" fill={`url(#${goldGrad})`} />
        <path d="M120 76L54 22L68 54L112 88L120 76Z" fill={`url(#${goldGrad})`} />
        <path d="M120 76L186 22L172 54L128 88L120 76Z" fill={`url(#${goldGrad})`} />

        {/* Psycho-Frame Crest Jewel */}
        <path d="M111 63H129L126 93H114L111 63Z" fill={`url(#${visorGrad})`} />

        {/* Eye Recess & Twin Glowing Amber Eyes */}
        <path d="M78 100H162L156 118H84L78 100Z" fill="#07080D" />
        <path d="M86 105L114 109L111 116H89L86 105Z" fill={`url(#${visorGrad})`} />
        <path d="M154 105L126 109L129 116H151L154 105Z" fill={`url(#${visorGrad})`} />

        {/* Faceplate Vent Slits & Psycho Chin */}
        <path d="M101 126H139" stroke="#FFB703" strokeWidth="3.2" strokeLinecap="square" />
        <path d="M105 135H135" stroke="#FF7A1A" strokeWidth="3.2" strokeLinecap="square" />
        <path d="M110 142H130L126 156H114L110 142Z" fill={`url(#${visorGrad})`} />
      </svg>
    </div>
  );
}

export function DimensionalEmptySchedule3D({
  className = '',
}: {
  className?: string;
}) {
  const uid = useId().replace(/:/g, '');
  const cubeTop = `tk-empty-top-${uid}`;
  const cubeSide = `tk-empty-side-${uid}`;

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none select-none ${className}`.trim()}
    >
      <svg viewBox="0 0 120 120" fill="none" className="w-24 h-24 tk-float-orb">
        <defs>
          <linearGradient id={cubeTop} x1="20" y1="20" x2="100" y2="80" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="var(--tk-secondary)" stopOpacity="0.9" />
            <stop offset="100%" stopColor="var(--tk-accent)" stopOpacity="0.98" />
          </linearGradient>
          <linearGradient id={cubeSide} x1="20" y1="50" x2="90" y2="105" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="var(--tk-accent)" stopOpacity="0.38" />
            <stop offset="100%" stopColor="var(--tk-primary)" stopOpacity="0.18" />
          </linearGradient>
        </defs>

        <ellipse cx="60" cy="104" rx="36" ry="8" fill="var(--tk-accent)" fillOpacity="0.16" />
        <path d="M60 26L96 44L60 62L24 44L60 26Z" fill={`url(#${cubeTop})`} />
        <path d="M24 44L60 62V95L24 77V44Z" fill={`url(#${cubeSide})`} />
        <path
          d="M96 44L60 62V95L96 77V44Z"
          fill="var(--tk-surface-elevated)"
          fillOpacity="0.82"
          stroke="var(--tk-accent-border)"
          strokeWidth="1.4"
        />
        <path d="M60 36L38 23L43 20L60 30L77 20L82 23L60 36Z" fill="#FFB703" />
        <circle cx="60" cy="34" r="3.5" fill="var(--tk-mecha-visor, #FF7A1A)" />
        <circle cx="84" cy="72" r="10" fill="var(--tk-surface)" stroke="var(--tk-accent)" strokeWidth="2.2" />
        <path d="M84 67V72L88 74" stroke="var(--tk-accent)" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </div>
  );
}

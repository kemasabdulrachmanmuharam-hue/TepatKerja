import { useEffect } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Shield } from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { getThemePresetById, type ThemeSettings } from '../utils/theme';
import { getTimeOfDayMood } from '../utils/workspaceFeatures';

interface IntroSplashProps {
  visible: boolean;
  theme: ThemeSettings;
  userName?: string | null;
  nextShiftSummary?: string | null;
  onComplete: () => void;
}

export function IntroSplash({
  visible,
  theme,
  userName,
  nextShiftSummary,
  onComplete,
}: IntroSplashProps) {
  useEffect(() => {
    if (!visible) {
      return;
    }
    const timer = window.setTimeout(() => {
      onComplete();
    }, 2400);
    return () => window.clearTimeout(timer);
  }, [visible, onComplete]);

  if (!visible) {
    return null;
  }

  const preset = getThemePresetById(theme.presetId);
  const mood = getTimeOfDayMood(new Date());

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Animasi pembuka TepatKerja"
      data-testid="intro-splash"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#07080D] text-[#F7F8FC] overflow-hidden px-6"
    >
      {/* Embedded Banshee Reference Video Atmospheric Backdrop */}
      <video
        src="/assets/aistudio/rx-0-unicorn-gundam-02-banshee.3840x2160_4e545ce4.mp4"
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-35"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at center, rgba(7,8,13,0.48) 0%, rgba(7,8,13,0.92) 78%)',
        }}
      />

      {/* Animated Hangar Targeting Rings */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
      >
        <motion.div
          initial={{ scale: 0.65, opacity: 0, rotate: -30 }}
          animate={{ scale: 1, opacity: 0.32, rotate: 0 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className="h-[340px] w-[340px] sm:h-[460px] sm:w-[460px] rounded-full border-2 border-dashed border-[#FF7A1A]"
        />
        <motion.div
          initial={{ scale: 0.4, opacity: 0, rotate: 35 }}
          animate={{ scale: 1, opacity: 0.18, rotate: 0 }}
          transition={{ duration: 1.05, ease: [0.16, 1, 0.3, 1] }}
          className="absolute h-[480px] w-[480px] sm:h-[620px] sm:w-[620px] rounded-full border border-[#FFB703]"
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="tk-armor-cut relative z-10 max-w-md w-full bg-[#0F111A]/95 border border-[#FF7A1A]/50 shadow-2xl overflow-hidden text-center"
      >
        <div className="tk-mecha-stripe w-full" aria-hidden="true" />

        <div className="p-8">
          <motion.div
            initial={{ scale: 0.55, rotate: -14, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
            className="relative mx-auto w-fit"
          >
            <div
              aria-hidden="true"
              className="absolute -inset-3 rounded-[3px] opacity-45 blur-xl"
              style={{ backgroundColor: preset.swatchHex }}
            />
            <BrandLogo size={82} className="relative drop-shadow-lg" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18, duration: 0.45 }}
            className="mt-5"
          >
            <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-[#FFB703]">
              <Shield className="h-3.5 w-3.5" aria-hidden="true" />
              <span>
                {preset.name} · {mood.label}
              </span>
            </p>

            <h1 className="font-display mt-2 text-3xl sm:text-4xl font-extrabold tracking-wide text-white uppercase">
              {mood.greeting}
              {userName ? `, ${userName}` : ''}
            </h1>

            <p className="mt-2 text-sm text-[#CDD3E2] leading-relaxed">
              {nextShiftSummary ||
                'Menyiapkan Unit RX-02 Banshee 3D, jadwal kerja, dan sistem keberangkatan Anda.'}
            </p>
          </motion.div>

          {/* Animated Psycho-Frame Progress Bar */}
          <div
            aria-hidden="true"
            className="mt-6 h-1.5 w-full bg-[#1C2132] overflow-hidden"
          >
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 2.0, ease: 'easeInOut' }}
              style={{ transformOrigin: '0% 50%' }}
              className="h-full w-full bg-gradient-to-r from-[#EA580C] via-[#FF7A1A] to-[#FFB703]"
            />
          </div>

          <button
            type="button"
            onClick={onComplete}
            className="tk-cta-3d mt-6 inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white bg-[#EA580C] hover:bg-[#C2410C]"
          >
            <span>Masuk ke Hangar Kerja</span>
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </motion.div>
    </div>
  );
}

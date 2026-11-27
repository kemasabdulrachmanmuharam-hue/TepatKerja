import { BellRing, Clock, CheckCircle2, VolumeX } from 'lucide-react';
import type { ActiveAlert } from '../types/schedule';
import { AnimatedModal } from './AnimatedModal';

interface ActiveAlertModalProps {
  alert: ActiveAlert | null;
  snoozeMenit: number;
  gpsChecking?: boolean;
  onSnooze: () => void;
  onMarkDeparted: () => void;
  onDismiss: () => void;
}

export function ActiveAlertModal({
  alert,
  snoozeMenit,
  gpsChecking = false,
  onSnooze,
  onMarkDeparted,
  onDismiss,
}: ActiveAlertModalProps) {
  return (
    <AnimatedModal
      isOpen={Boolean(alert)}
      onClose={onDismiss}
      closeOnBackdropClick={false}
      ariaLabelledBy="active-alarm-title"
      panelClassName="w-full max-w-xl max-h-[90vh] overflow-y-auto bg-[var(--tk-surface-elevated)] border border-[var(--tk-border-strong)] rounded-[3px] shadow-[var(--tk-shadow-elevated)] overflow-hidden"
    >
      {alert && (
        <>
        <div className="tk-mecha-stripe w-full" aria-hidden="true" />
        <div className="p-5 sm:p-7">
        <div className="flex items-start gap-3.5">
          <div className="tk-3d-badge flex h-11 w-11 shrink-0 items-center justify-center rounded-[3px] bg-[var(--tk-error-soft)] text-[var(--tk-error-text)] border border-[var(--tk-error-border)]">
            <BellRing className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--tk-error-text)]">
              {alert.isSimulation ? 'Simulasi Pengingat Kerja' : 'Pengingat Waktu Kerja Aktif'}
            </p>
            <h2
              id="active-alarm-title"
              className="mt-1 font-display text-lg sm:text-xl font-bold uppercase tracking-wide text-[var(--tk-text)]"
            >
              {alert.title}
            </h2>
            <p className="mt-1.5 text-sm text-[var(--tk-text-muted)] leading-relaxed">
              {alert.message}
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-4 border-y border-[var(--tk-border)] py-4">
          <div>
            <span className="block text-xs text-[var(--tk-text-subtle)]">Jam Berangkat</span>
            <span className="mt-0.5 block font-display tabular-nums text-xl font-bold text-[var(--tk-text)]">
              {alert.departTimeStr}
            </span>
          </div>
          <div>
            <span className="block text-xs text-[var(--tk-text-subtle)]">Target Jam Masuk</span>
            <span className="mt-0.5 block font-display tabular-nums text-xl font-bold text-[var(--tk-text)]">
              {alert.checkInTimeStr}
            </span>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onSnooze}
            className="tk-armor-cut-sm inline-flex items-center justify-center gap-2 px-3.5 py-2.5 text-sm font-medium text-[var(--tk-text-muted)] bg-[var(--tk-surface)] border border-[var(--tk-border)] hover:bg-[var(--tk-surface-hover)] rounded-[2px] transition-colors duration-150 whitespace-nowrap"
          >
            <Clock className="h-4 w-4" aria-hidden="true" />
            Tunda {snoozeMenit} Menit
          </button>

          {!alert.isSimulation && (
            <button
              type="button"
              disabled={gpsChecking}
              onClick={onMarkDeparted}
              className="tk-armor-cut-sm inline-flex items-center justify-center gap-2 px-3.5 py-2.5 text-sm font-medium text-[var(--tk-accent-text)] bg-[var(--tk-accent-soft)] border border-[var(--tk-accent-border)] hover:opacity-90 rounded-[2px] transition-colors duration-150 whitespace-nowrap disabled:opacity-60"
            >
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              {gpsChecking ? 'Cek GPS...' : 'Sudah Berangkat'}
            </button>
          )}

          <button
            type="button"
            onClick={onDismiss}
            className="tk-cta-3d tk-armor-cut-sm inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-[var(--tk-error)] hover:opacity-95 rounded-[2px] transition-all duration-150 whitespace-nowrap"
          >
            <VolumeX className="h-4 w-4" aria-hidden="true" />
            Matikan Alarm
          </button>
        </div>
        </div>
        </>
      )}
    </AnimatedModal>
  );
}

import { AlertTriangle, CheckCircle2, MapPin, X } from 'lucide-react';
import type { DepartureLocationValidationResult } from '../types/schedule';
import { formatCoordsLabel, formatDistanceLabel } from '../utils/smartCommute';
import { AnimatedModal } from './AnimatedModal';

interface GpsDepartureModalProps {
  pending: {
    occurrenceKey: string;
    shiftName: string;
    validation: DepartureLocationValidationResult;
  } | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export function GpsDepartureModal({
  pending,
  onConfirm,
  onCancel,
}: GpsDepartureModalProps) {
  const isAtWorkplace = pending?.validation.status === 'at_workplace';

  return (
    <AnimatedModal
      isOpen={Boolean(pending)}
      onClose={onCancel}
      ariaLabelledBy="gps-departure-modal-title"
      overlayTestId="gps-departure-modal"
      panelClassName="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-[var(--tk-surface-elevated)] border border-[var(--tk-border-strong)] rounded-[3px] shadow-[var(--tk-shadow-elevated)] overflow-hidden"
    >
      {pending && (
        <>
        <div className="tk-mecha-stripe w-full" aria-hidden="true" />
        <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="tk-3d-badge flex h-10 w-10 shrink-0 items-center justify-center rounded-[3px] bg-[var(--tk-warning-soft)] text-[var(--tk-warning-text)] border border-[var(--tk-warning-border)]">
              <AlertTriangle className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--tk-warning-text)]">
                Validasi GPS Keberangkatan · {pending.shiftName}
              </p>
              <h2
                id="gps-departure-modal-title"
                className="mt-1 font-display text-base sm:text-lg font-bold uppercase tracking-wide text-[var(--tk-text)] leading-snug"
              >
                {isAtWorkplace
                  ? 'Anda Terdeteksi Sudah di Lokasi Kerja'
                  : 'Posisi GPS Berbeda dari Titik Berangkat'}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onCancel}
            aria-label="Tutup dialog validasi GPS"
            className="p-1.5 rounded-[2px] text-[var(--tk-text-subtle)] hover:text-[var(--tk-text)] hover:bg-[var(--tk-surface-muted)] shrink-0 transition-colors"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <p
          data-testid="gps-modal-message"
          className="mt-3 text-xs sm:text-sm text-[var(--tk-text-muted)] leading-relaxed"
        >
          {pending.validation.message}
        </p>

        <div className="mt-4 py-3.5 border-y border-[var(--tk-border)] space-y-2.5 text-xs">
          <div className="flex items-start gap-2">
            <MapPin
              className="h-3.5 w-3.5 text-[var(--tk-accent-text)] shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <div className="min-w-0">
              <span className="block font-medium text-[var(--tk-text-subtle)]">
                Posisi GPS Terdeteksi
              </span>
              <span className="font-semibold text-[var(--tk-text)] break-words">
                {pending.validation.detectedLocationLabel || 'Koordinat GPS aktif'}
              </span>
              {pending.validation.currentCoords && (
                <span className="block font-mono tabular-nums text-[11px] text-[var(--tk-text-subtle)] mt-0.5">
                  ({formatCoordsLabel(pending.validation.currentCoords)})
                </span>
              )}
            </div>
          </div>

          {pending.validation.distanceToOriginMeters !== null && (
            <div className="flex flex-wrap items-baseline justify-between gap-2 pt-2 border-t border-[var(--tk-border-subtle)]">
              <span className="text-[var(--tk-text-subtle)]">
                Jarak ke Titik Berangkat
                {pending.validation.expectedOriginLabel
                  ? ` (${pending.validation.expectedOriginLabel})`
                  : ''}
              </span>
              <span className="font-mono tabular-nums font-bold text-[var(--tk-warning-text)]">
                {formatDistanceLabel(pending.validation.distanceToOriginMeters)} (batas{' '}
                {formatDistanceLabel(pending.validation.thresholdMeters)})
              </span>
            </div>
          )}

          {pending.validation.distanceToWorkplaceMeters !== null && (
            <div className="flex flex-wrap items-baseline justify-between gap-2 pt-2 border-t border-[var(--tk-border-subtle)]">
              <span className="text-[var(--tk-text-subtle)]">
                Jarak ke Lokasi Kerja
                {pending.validation.workplaceLabel ? ` (${pending.validation.workplaceLabel})` : ''}
              </span>
              <span className="font-mono tabular-nums font-semibold text-[var(--tk-text)]">
                {formatDistanceLabel(pending.validation.distanceToWorkplaceMeters)}
              </span>
            </div>
          )}
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-end gap-2.5">
          <button
            type="button"
            data-testid="gps-cancel-depart-btn"
            onClick={onCancel}
            className="tk-armor-cut-sm px-4 py-2.5 text-xs sm:text-sm font-medium text-[var(--tk-text-muted)] bg-[var(--tk-surface)] border border-[var(--tk-border)] hover:bg-[var(--tk-surface-hover)] rounded-[2px] transition-colors"
          >
            Batal
          </button>
          <button
            type="button"
            data-testid="gps-confirm-depart-btn"
            onClick={onConfirm}
            className="tk-cta-3d tk-armor-cut-sm inline-flex items-center gap-1.5 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white bg-[var(--tk-accent)] hover:bg-[var(--tk-accent-hover)] rounded-[2px]"
          >
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            Tetap Catat Sudah Berangkat
          </button>
        </div>
        </div>
        </>
      )}
    </AnimatedModal>
  );
}

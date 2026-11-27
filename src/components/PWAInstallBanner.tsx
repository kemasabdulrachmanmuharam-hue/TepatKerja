import { useState } from 'react';
import { Download, WifiOff, X } from 'lucide-react';
import { useOnlineStatus, usePWAInstall } from '../hooks/usePWA';
import { AnimatedModal } from './AnimatedModal';
import { BrandLogo } from './BrandLogo';

function InstallGuideModal({
  isOpen,
  isIOS,
  onClose,
}: {
  isOpen: boolean;
  isIOS: boolean;
  onClose: () => void;
}) {
  return (
    <AnimatedModal
      isOpen={isOpen}
      onClose={onClose}
      ariaLabelledBy="pwa-guide-title"
      panelClassName="w-full max-w-md max-h-[90vh] overflow-y-auto bg-[var(--tk-surface-elevated)] border border-[var(--tk-border-strong)] rounded-[3px] shadow-[var(--tk-shadow-elevated)] overflow-hidden"
    >
        <div className="tk-mecha-stripe w-full" aria-hidden="true" />
        <div className="p-6">
        <div className="flex items-start justify-between gap-3 border-b border-[var(--tk-border)] pb-4">
          <div className="flex items-center gap-2.5">
            <BrandLogo size={36} />
            <div>
              <h2
                id="pwa-guide-title"
                className="font-display text-sm sm:text-base font-bold uppercase tracking-wide text-[var(--tk-text)]"
              >
                Pasang Aplikasi TepatKerja
              </h2>
              <p className="text-xs text-[var(--tk-text-subtle)]">
                Jalan langsung dari layar utama HP &amp; bisa offline
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup panduan pemasangan"
            className="p-1.5 text-[var(--tk-text-subtle)] hover:text-[var(--tk-text)] hover:bg-[var(--tk-surface-muted)] rounded-[2px]"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-4 space-y-4 text-sm text-[var(--tk-text-muted)] leading-relaxed">
          {isIOS ? (
            <div className="space-y-2">
              <p className="font-semibold text-[var(--tk-text)]">
                Langkah di iPhone / iPad (Safari):
              </p>
              <ol className="list-decimal list-inside space-y-1.5 text-xs sm:text-sm text-[var(--tk-text-muted)]">
                <li>
                  Ketuk ikon <strong>Bagikan (Share)</strong> di bilah bawah
                  atau atas Safari.
                </li>
                <li>
                  Gulir ke bawah lalu pilih{' '}
                  <strong>Tambah ke Layar Utama (Add to Home Screen)</strong>.
                </li>
                <li>
                  Ketuk <strong>Tambah (Add)</strong> di pojok kanan atas untuk
                  menyimpan aplikasi.
                </li>
              </ol>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <p className="font-semibold text-[var(--tk-text)]">
                  Di HP Android (Chrome / Edge):
                </p>
                <ol className="mt-1 list-decimal list-inside space-y-1 text-xs sm:text-sm text-[var(--tk-text-muted)]">
                  <li>
                    Ketuk menu titik tiga (<strong>⋮</strong>) di pojok kanan
                    atas browser.
                  </li>
                  <li>
                    Pilih <strong>Instal aplikasi</strong> atau{' '}
                    <strong>Tambahkan ke layar utama</strong>.
                  </li>
                  <li>
                    Konfirmasi <strong>Instal</strong> agar ikon TepatKerja
                    muncul di HP Anda.
                  </li>
                </ol>
              </div>

              <div className="pt-3 border-t border-[var(--tk-border-subtle)]">
                <p className="font-semibold text-[var(--tk-text)]">
                  Di iPhone / iPad (Safari):
                </p>
                <p className="mt-1 text-xs sm:text-sm text-[var(--tk-text-muted)]">
                  Ketuk ikon <strong>Bagikan (Share)</strong>, lalu pilih{' '}
                  <strong>Tambah ke Layar Utama</strong>.
                </p>
              </div>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="tk-cta-3d tk-armor-cut-sm mt-6 w-full py-2.5 text-sm font-semibold text-white bg-[var(--tk-accent)] hover:bg-[var(--tk-accent-hover)] rounded-[2px]"
        >
          Mengerti
        </button>
        </div>
    </AnimatedModal>
  );
}

export function PWAInstallButton({
  variant = 'secondary',
  className = '',
}: {
  variant?: 'primary' | 'secondary';
  className?: string;
}) {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  const handleClick = async () => {
    if (isInstallable) {
      await install();
      return;
    }
    setShowGuide(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={`${
          variant === 'primary'
            ? 'tk-cta-3d tk-armor-cut-sm inline-flex items-center justify-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-semibold text-white bg-[var(--tk-accent)] hover:bg-[var(--tk-accent-hover)] rounded-[2px] whitespace-nowrap'
            : 'tk-armor-cut-sm inline-flex items-center justify-center gap-2 px-3.5 py-2 text-sm font-medium text-[var(--tk-text-muted)] bg-[var(--tk-surface)] border border-[var(--tk-border)] hover:bg-[var(--tk-surface-hover)] rounded-[2px] transition-colors whitespace-nowrap'
        } ${className}`.trim()}
      >
        <Download className="h-4 w-4" aria-hidden="true" />
        {isIOS ? 'Pasang di iPhone' : 'Unduh Aplikasi'}
      </button>

      <InstallGuideModal
        isOpen={showGuide}
        isIOS={isIOS}
        onClose={() => setShowGuide(false)}
      />
    </>
  );
}

export function PWAInstallBanner() {
  const { isInstalled } = usePWAInstall();
  const [dismissed, setDismissed] = useState(false);

  if (isInstalled || dismissed) {
    return null;
  }

  return (
    <section
      aria-label="Unduh aplikasi mobile"
      className="tk-animate-card tk-card mb-5 rounded-[3px] px-4 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
    >
      <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
        <BrandLogo size={38} className="mt-0.5 sm:mt-0" />
        <div className="min-w-0 flex-1">
          <p className="font-display text-xs sm:text-sm font-bold uppercase tracking-wide text-[var(--tk-text)]">
            Pasang TepatKerja di HP Anda
          </p>
          <p className="text-xs text-[var(--tk-text-muted)] mt-0.5 leading-relaxed">
            Buka cepat dari layar utama HP &amp; tetap aktif meski tanpa
            internet.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 shrink-0 w-full sm:w-auto">
        <PWAInstallButton
          variant="primary"
          className="flex-1 sm:flex-none"
        />
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Tutup banner pasang aplikasi"
          className="p-2 text-[var(--tk-text-subtle)] hover:text-[var(--tk-text)] hover:bg-[var(--tk-surface-muted)] rounded-[2px] transition-colors"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}

export function OfflineIndicator() {
  const isOnline = useOnlineStatus();

  if (isOnline) {
    return null;
  }

  return (
    <div
      role="status"
      className="tk-animate-notice mb-4 bg-[var(--tk-warning-soft)] border border-[var(--tk-warning-border)] rounded-[3px] px-4 py-2.5 flex items-center gap-2.5 text-xs font-medium text-[var(--tk-warning-text)]"
    >
      <WifiOff
        className="h-4 w-4 shrink-0"
        aria-hidden="true"
      />
      <span>
        Mode Offline aktif — Jadwal kerja, kalender shift, dan alarm tetap
        berjalan dari penyimpanan lokal.
      </span>
    </div>
  );
}

import { useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import { formatDateKey, validateShiftInput } from '../utils/scheduleEngine';
import type { ShiftTemplate } from '../types/schedule';
import { AnimatedModal } from './AnimatedModal';
import { tkInputClass, tkSelectClass } from './ui/DesignSystem';

interface QuickShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveShift: (
    shift: Omit<ShiftTemplate, 'id'>,
    applyOption: 'template_only' | 'today_override' | 'weekdays',
  ) => void;
}

export function QuickShiftModal({
  isOpen,
  onClose,
  onSaveShift,
}: QuickShiftModalProps) {
  const [nama, setNama] = useState('');
  const [jamMasuk, setJamMasuk] = useState('08:00');
  const [durasiKerjaMenit, setDurasiKerjaMenit] = useState('480');
  const [catatan, setCatatan] = useState('');
  const [applyOption, setApplyOption] = useState<
    'template_only' | 'today_override' | 'weekdays'
  >('template_only');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const durasiNum = Number(durasiKerjaMenit);
    const check = validateShiftInput({
      nama,
      jamMasuk,
      durasiKerjaMenit: durasiNum,
    });
    if (!check.valid) {
      setErrors(check.errors);
      return;
    }

    onSaveShift(
      {
        nama: nama.trim(),
        jamMasuk: jamMasuk.trim(),
        durasiKerjaMenit: durasiNum,
        catatan: catatan.trim() || `Masuk pukul ${jamMasuk.trim()}`,
      },
      applyOption,
    );
    setNama('');
    setJamMasuk('08:00');
    setDurasiKerjaMenit('480');
    setCatatan('');
    setErrors({});
    onClose();
  };

  return (
    <AnimatedModal
      isOpen={isOpen}
      onClose={onClose}
      ariaLabelledBy="quick-shift-title"
      panelClassName="w-full max-w-md max-h-[90vh] overflow-y-auto bg-[var(--tk-surface-elevated)] border border-[var(--tk-border-strong)] rounded-[3px] shadow-[var(--tk-shadow-elevated)] overflow-hidden"
    >
        <div className="tk-mecha-stripe w-full" aria-hidden="true" />
        <div className="p-5 sm:p-6">
        <div className="flex items-center justify-between border-b border-[var(--tk-border)] pb-4">
          <h2 id="quick-shift-title" className="font-display text-sm sm:text-base font-bold uppercase tracking-wide text-[var(--tk-text)]">
            Tambah Template Shift Baru
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup formulir tambah shift"
            className="p-2 text-[var(--tk-text-subtle)] hover:text-[var(--tk-text)] rounded-[2px] hover:bg-[var(--tk-surface-muted)] transition-colors"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4" noValidate>
          <div>
            <label
              htmlFor="quick-shift-nama"
              className="block text-sm font-medium text-[var(--tk-text-muted)]"
            >
              Nama Shift / Jadwal
            </label>
            <input
              id="quick-shift-nama"
              type="text"
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              placeholder="Contoh: Shift Sore atau Lembur Sabtu"
              className={`mt-1.5 ${tkInputClass}`}
            />
            {errors.nama && (
              <p className="mt-1 text-xs text-[var(--tk-error-text)]">{errors.nama}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="quick-shift-jam"
                className="block text-sm font-medium text-[var(--tk-text-muted)]"
              >
                Jam Masuk
              </label>
              <input
                id="quick-shift-jam"
                type="time"
                value={jamMasuk}
                onChange={(e) => setJamMasuk(e.target.value)}
                className={`mt-1.5 font-mono tabular-nums ${tkInputClass}`}
              />
              {errors.jamMasuk && (
                <p className="mt-1 text-xs text-[var(--tk-error-text)]">{errors.jamMasuk}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="quick-shift-durasi"
                className="block text-sm font-medium text-[var(--tk-text-muted)]"
              >
                Durasi Kerja (menit)
              </label>
              <input
                id="quick-shift-durasi"
                type="number"
                min={60}
                max={960}
                step={30}
                value={durasiKerjaMenit}
                onChange={(e) => setDurasiKerjaMenit(e.target.value)}
                className={`mt-1.5 font-mono tabular-nums ${tkInputClass}`}
              />
              {errors.durasiKerjaMenit && (
                <p className="mt-1 text-xs text-[var(--tk-error-text)]">
                  {errors.durasiKerjaMenit}
                </p>
              )}
            </div>
          </div>

          <div>
            <label
              htmlFor="quick-shift-apply"
              className="block text-sm font-medium text-[var(--tk-text-muted)]"
            >
              Terapkan Langsung
            </label>
            <select
              id="quick-shift-apply"
              value={applyOption}
              onChange={(e) =>
                setApplyOption(
                  e.target.value as
                    | 'template_only'
                    | 'today_override'
                    | 'weekdays',
                )
              }
              className={`mt-1.5 ${tkSelectClass}`}
            >
              <option value="template_only">
                Simpan sebagai pilihan template saja
              </option>
              <option value="today_override">
                Pasang untuk hari ini ({formatDateKey(new Date())})
              </option>
              <option value="weekdays">
                Jadikan jadwal tetap Senin–Jumat
              </option>
            </select>
          </div>

          <div>
            <label
              htmlFor="quick-shift-catatan"
              className="block text-sm font-medium text-[var(--tk-text-muted)]"
            >
              Catatan Singkat (opsional)
            </label>
            <input
              id="quick-shift-catatan"
              type="text"
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              placeholder="Contoh: Bawa kartu akses dan seragam"
              className={`mt-1.5 ${tkInputClass}`}
            />
          </div>

          <div className="pt-3 flex items-center justify-end gap-3 border-t border-[var(--tk-border)]">
            <button
              type="button"
              onClick={onClose}
              className="tk-armor-cut-sm px-4 py-2.5 text-sm font-medium text-[var(--tk-text-muted)] bg-[var(--tk-surface)] border border-[var(--tk-border)] hover:bg-[var(--tk-surface-hover)] rounded-[2px] transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="tk-cta-3d tk-armor-cut-sm px-5 py-2.5 text-sm font-semibold text-white bg-[var(--tk-accent)] hover:bg-[var(--tk-accent-hover)] rounded-[2px]"
            >
              Simpan Shift
            </button>
          </div>
        </form>
        </div>
    </AnimatedModal>
  );
}

import { Box, CalendarDays, Clock, SlidersHorizontal, UserCheck } from 'lucide-react';
import type { AppTab } from '../types/schedule';
import { BrandLogo } from './BrandLogo';

interface TopBarProps {
  activeTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
  onOpenQuickShift: () => void;
  onOpenAccount: () => void;
  accountDisplayName: string | null;
  isSignedIn: boolean;
  syncStatus: 'local' | 'syncing' | 'synced' | 'error';
}

const NAV_ITEMS: Array<{
  id: AppTab;
  label: string;
  mobileLabel: string;
  subtitle: string;
  Icon: typeof Clock;
}> = [
  {
    id: 'dashboard',
    label: 'Hari Ini',
    mobileLabel: 'Hari Ini',
    subtitle: 'Ringkasan shift, unit Gundam 3D & analitik',
    Icon: Clock,
  },
  {
    id: 'studio3d',
    label: 'Ruang 3D',
    mobileLabel: '3D',
    subtitle: 'Unit Gundam 3D, kronometer & pencahayaan hangar',
    Icon: Box,
  },
  {
    id: 'schedule',
    label: 'Jadwal & Shift',
    mobileLabel: 'Jadwal',
    subtitle: 'Kalender mini bulanan, pola rutin & rotasi',
    Icon: CalendarDays,
  },
  {
    id: 'commute',
    label: 'Pengaturan',
    mobileLabel: 'Atur',
    subtitle: 'Tema 3D, durasi perjalanan & nada alarm',
    Icon: SlidersHorizontal,
  },
];

export function TopBar({
  activeTab,
  onSelectTab,
  onOpenQuickShift,
  onOpenAccount,
  accountDisplayName,
  isSignedIn,
  syncStatus,
}: TopBarProps) {
  const shortAccountLabel = accountDisplayName
    ? accountDisplayName.trim().split(/\s+/)[0].slice(0, 12)
    : 'Akun';

  const currentMeta =
    NAV_ITEMS.find((item) => item.id === activeTab) ?? NAV_ITEMS[0];

  return (
    <>
      <header className="sticky top-0 z-30 tk-glass border-b border-[var(--tk-border)]">
        <div className="tk-mecha-stripe w-full" aria-hidden="true" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-3 py-3">
            {/* Mobile Brand Lockup (< md) + Desktop Contextual Breadcrumb (md+) */}
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => onSelectTab('dashboard')}
                className="md:hidden inline-flex items-center gap-2 font-display text-base font-extrabold tracking-wider uppercase text-[var(--tk-text)] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-[var(--tk-accent)] focus-visible:outline-offset-4 rounded-[2px]"
              >
                <BrandLogo size={26} />
                <span>TepatKerja</span>
              </button>

              <div className="hidden md:flex items-center gap-2.5 min-w-0">
                <span className="font-mono text-[11px] font-semibold uppercase tracking-widest text-[var(--tk-accent-text)] whitespace-nowrap">
                  RX-0[N]
                </span>
                <span aria-hidden="true" className="text-xs text-[var(--tk-border-strong)]">
                  /
                </span>
                <span className="font-display text-xs font-bold uppercase tracking-wider text-[var(--tk-text)] whitespace-nowrap">
                  {currentMeta.label}
                </span>
                <span className="hidden lg:inline text-xs text-[var(--tk-text-subtle)] truncate ml-1">
                  · {currentMeta.subtitle}
                </span>
              </div>
            </div>

            {/* Single-Row Armor Action Controls */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={onOpenAccount}
                aria-label="Akun pribadi dan sinkronisasi"
                className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-2 text-xs font-semibold text-[var(--tk-text)] bg-[var(--tk-surface)] border border-[var(--tk-border)] hover:bg-[var(--tk-surface-hover)] rounded-[3px] transition-colors whitespace-nowrap shrink-0"
              >
                <UserCheck
                  className="h-3.5 w-3.5 text-[var(--tk-accent-text)] shrink-0"
                  aria-hidden="true"
                />
                <span>{shortAccountLabel}</span>
                {isSignedIn && (
                  <span
                    aria-hidden="true"
                    className={`h-1.5 w-1.5 rounded-[1px] shrink-0 ${
                      syncStatus === 'error'
                        ? 'bg-red-500'
                        : syncStatus === 'syncing'
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                    }`}
                  />
                )}
              </button>

              <button
                type="button"
                onClick={onOpenQuickShift}
                className="tk-cta-3d px-3 sm:px-4 py-2 text-xs font-display font-bold uppercase tracking-wider text-white bg-[var(--tk-accent)] hover:bg-[var(--tk-accent-hover)] whitespace-nowrap shrink-0"
              >
                <span className="sm:hidden">+ Shift</span>
                <span className="hidden sm:inline">+ Tambah Shift</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Native-Style 4-Tab Bottom Bar (<= 15% viewport height) */}
      <nav
        aria-label="Navigasi mobile"
        className="md:hidden fixed bottom-0 inset-x-0 z-30 tk-glass border-t border-[var(--tk-border)] pb-[env(safe-area-inset-bottom)]"
      >
        <div className="grid grid-cols-4">
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            const Icon = item.Icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
                className={`relative min-h-[48px] py-2 flex flex-col items-center justify-center gap-0.5 text-[10px] font-display font-bold uppercase tracking-wider transition-colors ${
                  isActive
                    ? 'text-[var(--tk-accent-text)] bg-[var(--tk-accent-soft)]/60'
                    : 'text-[var(--tk-text-subtle)] hover:text-[var(--tk-text)]'
                }`}
              >
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute top-0 inset-x-2 h-[2px] bg-[var(--tk-accent)]"
                  />
                )}
                <Icon className="h-4 w-4" aria-hidden="true" />
                <span className="whitespace-nowrap">{item.mobileLabel}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}

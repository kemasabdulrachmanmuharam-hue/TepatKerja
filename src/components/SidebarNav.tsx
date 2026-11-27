import {
  Box,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Plus,
  SlidersHorizontal,
  UserCheck,
} from 'lucide-react';
import type { AppTab, ComputedOccurrence } from '../types/schedule';
import { BrandLogo } from './BrandLogo';

interface SidebarNavProps {
  activeTab: AppTab;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onSelectTab: (tab: AppTab) => void;
  onOpenQuickShift: () => void;
  onOpenAccount: () => void;
  accountDisplayName: string | null;
  isSignedIn: boolean;
  syncStatus: 'local' | 'syncing' | 'synced' | 'error';
  nextOccurrence: ComputedOccurrence | null;
}

const SIDEBAR_ITEMS: Array<{
  id: AppTab;
  code: string;
  label: string;
  hint: string;
  Icon: typeof Clock;
}> = [
  { id: 'dashboard', code: '01', label: 'Hari Ini', hint: 'Ringkasan & analitik', Icon: Clock },
  { id: 'studio3d', code: '02', label: 'Ruang 3D', hint: 'Unit RX-0 Banshee 3D', Icon: Box },
  {
    id: 'schedule',
    code: '03',
    label: 'Jadwal & Shift',
    hint: 'Kalender & rotasi',
    Icon: CalendarDays,
  },
  {
    id: 'commute',
    code: '04',
    label: 'Pengaturan',
    hint: 'Armor, rute & alarm',
    Icon: SlidersHorizontal,
  },
];

export function SidebarNav({
  activeTab,
  collapsed,
  onToggleCollapse,
  onSelectTab,
  onOpenQuickShift,
  onOpenAccount,
  accountDisplayName,
  isSignedIn,
  syncStatus,
  nextOccurrence,
}: SidebarNavProps) {
  const shortAccountLabel = accountDisplayName
    ? accountDisplayName.trim().split(/\s+/)[0].slice(0, 14)
    : 'Mode Lokal';

  return (
    <aside
      aria-label="Navigasi samping ruang kerja"
      className={`hidden md:flex flex-col shrink-0 sticky top-0 h-screen z-30 tk-glass border-r border-[var(--tk-border)] transition-all duration-200 ${
        collapsed ? 'w-[80px]' : 'w-[80px] lg:w-[260px]'
      }`}
    >
      <div className="tk-mecha-stripe w-full shrink-0" aria-hidden="true" />
      {/* Brand Lockup + Collapse Control */}
      <div className="px-4 py-4 border-b border-[var(--tk-border-subtle)] flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => onSelectTab('dashboard')}
          className={`inline-flex items-center gap-2.5 text-left min-w-0 rounded-[3px] focus-visible:outline-2 focus-visible:outline-[var(--tk-accent)] focus-visible:outline-offset-2 ${
            collapsed ? 'mx-auto' : 'mx-auto lg:mx-0'
          }`}
        >
          <BrandLogo size={34} className="drop-shadow-xs shrink-0" />
          {!collapsed && (
            <div className="hidden lg:block min-w-0">
              <span className="font-display block text-base font-extrabold tracking-wider uppercase text-[var(--tk-text)] truncate leading-none">
                TepatKerja
              </span>
              <span className="font-mono block text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--tk-accent-text)] truncate mt-1">
                RX-0[N] Hangar
              </span>
            </div>
          )}
        </button>

        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label={collapsed ? 'Perluas sidebar navigasi' : 'Ringkas sidebar navigasi'}
          aria-expanded={!collapsed}
          className="hidden lg:inline-flex p-1.5 rounded-[2px] border border-transparent hover:border-[var(--tk-border)] text-[var(--tk-text-subtle)] hover:text-[var(--tk-text)] hover:bg-[var(--tk-surface-muted)] transition-colors shrink-0"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          ) : (
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
      </div>

      {/* Primary Workspace Links */}
      <nav
        aria-label="Navigasi utama sidebar"
        className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto"
      >
        {SIDEBAR_ITEMS.map((item) => {
          const isActive = activeTab === item.id;
          const Icon = item.Icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              aria-current={isActive ? 'page' : undefined}
              title={item.label}
              className={`w-full flex items-center gap-3 rounded-[3px] px-3 py-2.5 text-left transition-all duration-150 ${
                collapsed ? 'justify-center' : 'justify-center lg:justify-start'
              } ${
                isActive
                  ? 'tk-armor-cut-sm bg-[var(--tk-accent-soft)] text-[var(--tk-accent-text)] border border-[var(--tk-accent-border)] shadow-xs'
                  : 'text-[var(--tk-text-muted)] border border-transparent hover:border-[var(--tk-border-subtle)] hover:text-[var(--tk-text)] hover:bg-[var(--tk-surface-muted)]'
              }`}
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[2px] transition-colors ${
                  isActive
                    ? 'bg-[var(--tk-accent)] text-white shadow-xs'
                    : 'bg-[var(--tk-surface-muted)] text-[var(--tk-text-subtle)]'
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
              {!collapsed && (
                <div className="hidden lg:block min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="font-display block text-xs font-bold uppercase tracking-wider leading-tight truncate">
                      {item.label}
                    </span>
                    <span className="font-mono text-[10px] font-semibold text-[var(--tk-text-subtle)] shrink-0">
                      {item.code}
                    </span>
                  </div>
                  <span className="block text-[11px] text-[var(--tk-text-subtle)] truncate mt-0.5">
                    {item.hint}
                  </span>
                </div>
              )}
            </button>
          );
        })}

        {/* Quick Shift Action */}
        <div className="pt-3">
          <button
            type="button"
            onClick={onOpenQuickShift}
            title="Tambah Shift"
            className={`tk-cta-3d w-full flex items-center justify-center gap-2 px-3 py-2.5 text-xs font-display font-bold uppercase tracking-wider text-white bg-[var(--tk-accent)] hover:bg-[var(--tk-accent-hover)] transition-all ${
              collapsed ? '' : 'lg:justify-center'
            }`}
          >
            <Plus className="h-4 w-4 shrink-0" aria-hidden="true" />
            {!collapsed && <span className="hidden lg:inline whitespace-nowrap">Tambah Shift</span>}
          </button>
        </div>
      </nav>

      {/* Bottom Next Shift Summary + Account Profile Footer */}
      <div className="p-3 border-t border-[var(--tk-border-subtle)] space-y-2.5">
        {!collapsed && nextOccurrence && (
          <div className="hidden lg:block rounded-[3px] bg-[var(--tk-surface-muted)] border border-[var(--tk-border)] px-3 py-2.5">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[var(--tk-text-subtle)] truncate">
              Target Berikutnya
            </p>
            <p className="font-display text-xs font-bold text-[var(--tk-text)] truncate mt-0.5">
              {nextOccurrence.shiftName}
            </p>
            <p className="text-[11px] font-mono tabular-nums text-[var(--tk-accent-text)] font-semibold mt-0.5">
              Berangkat {nextOccurrence.jamBerangkatStr} · Masuk {nextOccurrence.jamMasukStr}
            </p>
          </div>
        )}

        <button
          type="button"
          onClick={onOpenAccount}
          title="Akun pribadi dan rute"
          aria-label="Akun pribadi dan sinkronisasi"
          className={`w-full flex items-center gap-2.5 rounded-[3px] px-3 py-2 text-left bg-[var(--tk-surface)] border border-[var(--tk-border)] hover:bg-[var(--tk-surface-hover)] transition-colors ${
            collapsed ? 'justify-center' : 'justify-center lg:justify-between'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <UserCheck
              className="h-4 w-4 text-[var(--tk-accent-text)] shrink-0"
              aria-hidden="true"
            />
            {!collapsed && (
              <div className="hidden lg:block min-w-0">
                <span className="block text-xs font-semibold text-[var(--tk-text)] truncate">
                  {shortAccountLabel}
                </span>
                <span className="block text-[10px] text-[var(--tk-text-subtle)] truncate">
                  {isSignedIn
                    ? syncStatus === 'error'
                      ? 'Perlu sinkronisasi'
                      : syncStatus === 'syncing'
                        ? 'Menyinkronkan...'
                        : 'Cloud tersinkron'
                    : 'Penyimpanan lokal'}
                </span>
              </div>
            )}
          </div>
          {isSignedIn && !collapsed && (
            <span
              aria-hidden="true"
              className={`hidden lg:inline-block h-2 w-2 rounded-[1px] shrink-0 ${
                syncStatus === 'error'
                  ? 'bg-red-500'
                  : syncStatus === 'syncing'
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
              }`}
            />
          )}
        </button>
      </div>
    </aside>
  );
}

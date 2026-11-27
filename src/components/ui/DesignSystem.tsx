import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  XCircle,
} from 'lucide-react';

export const tkInputClass =
  'w-full px-3.5 py-2 text-sm bg-[var(--tk-surface)] border border-[var(--tk-border)] rounded-[3px] text-[var(--tk-text)] placeholder:text-[var(--tk-text-subtle)] transition-colors focus:outline-none focus:border-[var(--tk-accent)] focus:ring-2 focus:ring-[var(--tk-focus-ring)] disabled:bg-[var(--tk-disabled-bg)] disabled:text-[var(--tk-disabled-text)] disabled:cursor-not-allowed';

export const tkSelectClass =
  'w-full px-3.5 py-2 text-sm bg-[var(--tk-surface)] border border-[var(--tk-border)] rounded-[3px] text-[var(--tk-text)] transition-colors focus:outline-none focus:border-[var(--tk-accent)] focus:ring-2 focus:ring-[var(--tk-focus-ring)] disabled:bg-[var(--tk-disabled-bg)] disabled:text-[var(--tk-disabled-text)] disabled:cursor-not-allowed';

export const tkLabelClass =
  'block text-xs font-semibold uppercase tracking-wide text-[var(--tk-text-muted)]';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'soft'
  | 'ghost'
  | 'danger';

export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
}

const BUTTON_VARIANT_MAP: Record<ButtonVariant, string> = {
  primary:
    'tk-cta-3d text-white bg-[var(--tk-accent)] hover:bg-[var(--tk-accent-hover)] border border-transparent',
  secondary:
    'tk-armor-cut-sm text-[var(--tk-text-muted)] hover:text-[var(--tk-text)] bg-[var(--tk-surface)] border border-[var(--tk-border)] hover:bg-[var(--tk-surface-hover)] hover:border-[var(--tk-border-strong)] shadow-xs',
  soft:
    'tk-armor-cut-sm text-[var(--tk-accent-text)] bg-[var(--tk-accent-soft)] border border-[var(--tk-accent-border)] hover:opacity-90',
  ghost:
    'text-[var(--tk-text-muted)] hover:text-[var(--tk-text)] hover:bg-[var(--tk-surface-muted)] border border-transparent',
  danger:
    'tk-armor-cut-sm text-[var(--tk-error-text)] bg-[var(--tk-error-soft)] border border-[var(--tk-error-border)] hover:opacity-90',
};

const BUTTON_SIZE_MAP: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs rounded-[2px] gap-1.5',
  md: 'px-4 py-2.5 text-sm rounded-[2px] gap-2',
  lg: 'px-5 py-3 text-sm rounded-[2px] gap-2',
};

export function Button({
  variant = 'secondary',
  size = 'md',
  type = 'button',
  className = '',
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center font-semibold tracking-wide whitespace-nowrap transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none ${BUTTON_VARIANT_MAP[variant]} ${BUTTON_SIZE_MAP[size]} ${className}`.trim()}
      {...rest}
    >
      {children}
    </button>
  );
}

interface CardProps extends HTMLAttributes<HTMLElement> {
  as?: 'section' | 'div' | 'aside' | 'article';
  variant?: 'default' | 'elevated' | 'glass';
  interactive?: boolean;
  children: ReactNode;
}

export function Card({
  as = 'section',
  variant = 'default',
  interactive = false,
  className = '',
  children,
  ...rest
}: CardProps) {
  const Tag = as;
  const variantClass =
    variant === 'elevated'
      ? 'tk-card-elevated'
      : variant === 'glass'
        ? 'tk-glass'
        : 'tk-card';
  const interactiveClass = interactive ? 'tk-card-interactive' : '';

  return (
    <Tag
      className={`${variantClass} ${interactiveClass} rounded-[3px] ${className}`.trim()}
      {...rest}
    >
      {children}
    </Tag>
  );
}

export type SemanticTone =
  | 'neutral'
  | 'accent'
  | 'success'
  | 'warning'
  | 'error'
  | 'info';

const TONE_CLASSES: Record<SemanticTone, string> = {
  neutral:
    'bg-[var(--tk-surface-muted)] text-[var(--tk-text-muted)] border-[var(--tk-border)]',
  accent:
    'bg-[var(--tk-accent-soft)] text-[var(--tk-accent-text)] border-[var(--tk-accent-border)]',
  success:
    'bg-[var(--tk-success-soft)] text-[var(--tk-success-text)] border-[var(--tk-success-border)]',
  warning:
    'bg-[var(--tk-warning-soft)] text-[var(--tk-warning-text)] border-[var(--tk-warning-border)]',
  error:
    'bg-[var(--tk-error-soft)] text-[var(--tk-error-text)] border-[var(--tk-error-border)]',
  info:
    'bg-[var(--tk-info-soft)] text-[var(--tk-info-text)] border-[var(--tk-info-border)]',
};

export function Badge({
  tone = 'neutral',
  className = '',
  children,
  ...rest
}: HTMLAttributes<HTMLSpanElement> & {
  tone?: SemanticTone;
  children: ReactNode;
}) {
  return (
    <span
      className={`tk-3d-badge inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-[2px] border whitespace-nowrap ${TONE_CLASSES[tone]} ${className}`.trim()}
      {...rest}
    >
      {children}
    </span>
  );
}

export function StatusBanner({
  tone = 'info',
  title,
  message,
  action,
  className = '',
  ...rest
}: HTMLAttributes<HTMLDivElement> & {
  tone?: 'success' | 'warning' | 'error' | 'info';
  title?: string;
  message: string;
  action?: ReactNode;
}) {
  const Icon =
    tone === 'success'
      ? CheckCircle2
      : tone === 'warning'
        ? AlertTriangle
        : tone === 'error'
          ? XCircle
          : Info;

  return (
    <div
      role="status"
      className={`tk-animate-notice rounded-[3px] border px-4 sm:px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 ${TONE_CLASSES[tone]} ${className}`.trim()}
      {...rest}
    >
      <div className="flex items-start gap-3 min-w-0 flex-1">
        <Icon className="h-5 w-5 shrink-0 mt-0.5" aria-hidden="true" />
        <div className="min-w-0">
          {title && (
            <p className="font-display text-sm font-bold tracking-wide text-[var(--tk-text)]">{title}</p>
          )}
          <p className="text-xs text-[var(--tk-text-muted)] leading-relaxed">
            {message}
          </p>
        </div>
      </div>
      {action && <div className="flex items-center gap-2 shrink-0">{action}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  subtext,
  icon,
  tone = 'neutral',
  valueTestId,
  className = '',
}: {
  label: string;
  value: ReactNode;
  subtext?: ReactNode;
  icon?: ReactNode;
  tone?: SemanticTone;
  valueTestId?: string;
  className?: string;
}) {
  const valueToneClass =
    tone === 'accent'
      ? 'text-[var(--tk-accent-text)]'
      : tone === 'success'
        ? 'text-[var(--tk-success-text)]'
        : tone === 'warning'
          ? 'text-[var(--tk-warning-text)]'
          : tone === 'error'
            ? 'text-[var(--tk-error-text)]'
            : 'text-[var(--tk-text)]';

  return (
    <div
      className={`tk-card tk-card-interactive rounded-[3px] p-4 sm:p-5 flex items-start justify-between gap-3 ${className}`.trim()}
    >
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--tk-text-subtle)]">
          {label}
        </p>
        <p
          data-testid={valueTestId}
          className={`mt-1.5 font-display tabular-nums text-2xl font-bold tracking-wide ${valueToneClass}`}
        >
          {value}
        </p>
        {subtext && (
          <p className="mt-1 text-xs text-[var(--tk-text-subtle)] leading-snug">
            {subtext}
          </p>
        )}
      </div>
      {icon && (
        <div className="tk-3d-badge h-10 w-10 rounded-[2px] bg-[var(--tk-accent-soft)] border border-[var(--tk-accent-border)] text-[var(--tk-accent-text)] flex items-center justify-center shrink-0">
          {icon}
        </div>
      )}
    </div>
  );
}

export function EmptyState({
  visual,
  title,
  description,
  action,
  className = '',
}: {
  visual?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`py-8 px-4 text-center max-w-md mx-auto ${className}`.trim()}>
      {visual && <div className="mx-auto mb-4 w-fit">{visual}</div>}
      <h3 className="font-display text-xl font-bold tracking-wide text-[var(--tk-text)] uppercase">{title}</h3>
      <p className="mt-1.5 text-sm text-[var(--tk-text-muted)] leading-relaxed">
        {description}
      </p>
      {action && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          {action}
        </div>
      )}
    </div>
  );
}

export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`tk-skeleton rounded-[2px] ${className}`.trim()}
    />
  );
}

export function ToggleSwitch({
  checked,
  onToggle,
  ariaLabel,
  testId,
  disabled = false,
}: {
  checked: boolean;
  onToggle: () => void;
  ariaLabel: string;
  testId?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      data-testid={testId}
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onToggle}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors disabled:opacity-50 ${
        checked
          ? 'bg-[var(--tk-accent)] border-[var(--tk-accent)]'
          : 'bg-[var(--tk-surface)] border-[var(--tk-border)]'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full shadow-xs transition-transform ${
          checked
            ? 'translate-x-6 bg-white'
            : 'translate-x-1 bg-[var(--tk-text-subtle)]'
        }`}
      />
    </button>
  );
}

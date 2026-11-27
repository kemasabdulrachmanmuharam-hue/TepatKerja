import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  public constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: '',
    };
  }

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error.message || 'Terjadi kendala saat memuat aplikasi.',
    };
  }

  public componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('TepatKerja ErrorBoundary:', error, info);
  }

  public render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--tk-bg)] text-[var(--tk-text)] p-6">
          <div className="tk-armor-cut max-w-md w-full bg-[var(--tk-surface)] border border-[var(--tk-border-strong)] rounded-[3px] p-6 space-y-4">
            <h1 className="font-display text-lg font-bold uppercase tracking-wide">
              Terjadi Gangguan Sementara
            </h1>
            <p className="text-sm text-[var(--tk-text-muted)] leading-relaxed">
              Aplikasi mengalami kendala saat menyinkronkan sesi atau tampilan.
              Data jadwal lokal Anda tetap aman di browser.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="tk-cta-3d px-4 py-2 text-xs font-display font-bold uppercase tracking-wider text-white bg-[var(--tk-accent)] hover:bg-[var(--tk-accent-hover)]"
            >
              Muat Ulang Aplikasi
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

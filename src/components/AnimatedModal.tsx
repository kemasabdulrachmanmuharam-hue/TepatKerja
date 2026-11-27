import { useEffect, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';

interface AnimatedModalProps {
  isOpen: boolean;
  onClose?: () => void;
  ariaLabelledBy: string;
  panelClassName?: string;
  overlayTestId?: string;
  panelTestId?: string;
  closeOnBackdropClick?: boolean;
  children: ReactNode;
}

export function AnimatedModal({
  isOpen,
  onClose,
  ariaLabelledBy,
  panelClassName = 'w-full max-w-md max-h-[90vh] overflow-y-auto bg-[var(--tk-surface-elevated)] border border-[var(--tk-border-strong)] rounded-[3px] shadow-[var(--tk-shadow-elevated)] p-6',
  overlayTestId,
  panelTestId,
  closeOnBackdropClick = true,
  children,
}: AnimatedModalProps) {
  useEffect(() => {
    if (!isOpen || !onClose) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="tk-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby={ariaLabelledBy}
          data-testid={overlayTestId}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          onClick={(e) => {
            if (closeOnBackdropClick && onClose && e.target === e.currentTarget) {
              onClose();
            }
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 backdrop-blur-xs p-4"
        >
          <motion.div
            key="tk-modal-panel"
            data-testid={panelTestId}
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className={`relative ${panelClassName}`}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

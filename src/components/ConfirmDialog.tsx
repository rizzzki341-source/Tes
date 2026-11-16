import { useEffect, useId, useRef, type ReactNode } from 'react';
import { Button } from './Button';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  body?: ReactNode;
  /** Default "Ya, lanjutkan". */
  confirmLabel?: string;
  /** Default "Batal". */
  cancelLabel?: string;
  /** Styles the confirm button as destructive. */
  danger?: boolean;
  onConfirm: () => void;
  /** Also called for Escape, the Android back button and a click on the backdrop. */
  onCancel: () => void;
}

/** Native modal dialog. Focus returns to the element that opened it. */
export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel = 'Ya, lanjutkan',
  cancelLabel = 'Batal',
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const bodyId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
    } else if (!open && dialog.open) {
      if (typeof dialog.close === 'function') dialog.close();
      else dialog.removeAttribute('open');
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="dialog"
      aria-labelledby={titleId}
      aria-describedby={body ? bodyId : undefined}
      // `close` fires for Escape, form-less close() calls and the back button; keep the parent's state in step.
      onClose={() => {
        if (open) onCancel();
      }}
      onClick={(event) => {
        if (event.target === ref.current) onCancel();
      }}
    >
      <div className="dialog__inner">
        <h2 id={titleId} className="dialog__title">
          {title}
        </h2>
        {body ? (
          <div id={bodyId} className="dialog__body">
            {body}
          </div>
        ) : null}
        <div className="dialog__actions">
          <Button variant="ghost" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>
  );
}

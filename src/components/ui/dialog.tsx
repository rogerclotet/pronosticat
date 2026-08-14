type DialogProps = {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

export function Dialog({ title, onClose, children, footer }: DialogProps) {
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 p-4 sm:items-center">
      <button
        type="button"
        aria-label="Tanca"
        className="absolute inset-0"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        className="relative z-10 w-full max-w-lg border-2 border-border-strong bg-background"
      >
        <div className="border-b-2 border-border bg-header-bg px-4 py-3">
          <div
            id="dialog-title"
            className="font-sans text-sm font-extrabold uppercase leading-none tracking-tight"
          >
            {title}
          </div>
        </div>
        <div className="px-4 py-3.5">{children}</div>
        {footer ? (
          <div className="flex flex-col gap-2 border-t-2 border-border bg-header-bg px-4 pb-4 pt-3">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}

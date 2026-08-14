type SheetProps = {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

export function Sheet({
  title,
  subtitle,
  onClose,
  children,
  footer,
}: SheetProps) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <div className="border-b-2 border-border bg-header-bg">
        <div className="mx-auto flex w-full max-w-lg items-center gap-2.5 px-3 pb-3 pt-6">
          <button
            type="button"
            onClick={onClose}
            aria-label="Tanca"
            className="border-2 border-border-strong bg-transparent px-3 py-2 font-mono text-sm font-bold text-foreground"
          >
            ←
          </button>
          <div className="flex flex-col gap-1">
            <div className="font-sans text-sm font-extrabold uppercase leading-none tracking-tight">
              {title}
            </div>
            {subtitle && (
              <div className="label-mono leading-none">{subtitle}</div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="mx-auto w-full max-w-lg px-4 pb-5 pt-3.5">
          {children}
        </div>
      </div>

      {footer && (
        <div className="border-t-2 border-border bg-header-bg">
          <div className="mx-auto flex w-full max-w-lg flex-col gap-2 px-4 pb-6 pt-3">
            {footer}
          </div>
        </div>
      )}
    </div>
  );
}

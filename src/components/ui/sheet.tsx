type SheetProps = {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

export function Sheet({ title, subtitle, onClose, children, footer }: SheetProps) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <div className="flex items-center gap-2.5 border-b-2 border-border bg-header-bg px-3 pb-3 pt-6">
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

      <div className="flex-1 overflow-auto px-4 pb-5 pt-3.5">{children}</div>

      {footer && (
        <div className="flex flex-col gap-2 border-t-2 border-border bg-header-bg px-4 pb-6 pt-3">
          {footer}
        </div>
      )}
    </div>
  );
}

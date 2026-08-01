import { BottomNav } from "./bottom-nav";

type AppShellProps = {
  children: React.ReactNode;
  groupName?: string;
};

export function AppShell({ children, groupName }: AppShellProps) {
  return (
    <div className="flex min-h-full flex-col">
      <main className="mx-auto w-full max-w-lg flex-1 pb-20">{children}</main>
      <BottomNav groupName={groupName} />
    </div>
  );
}

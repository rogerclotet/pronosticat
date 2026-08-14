import { Link } from "@/i18n/routing";

export function InviteInvalid({
  title,
  body,
  cta,
}: {
  title: string;
  body: string;
  cta: string;
}) {
  return (
    <div className="mx-auto flex min-h-full w-full max-w-lg flex-col bg-header-bg">
      <div className="flex flex-1 flex-col gap-4 px-5 pb-5 pt-16">
        <h1 className="font-sans text-[34px] font-extrabold uppercase leading-[0.95] tracking-tight">
          {title}
        </h1>
        <p className="max-w-xs font-sans text-[13px] leading-relaxed text-text-secondary">
          {body}
        </p>
      </div>
      <div className="px-5 pb-8">
        <Link
          href="/"
          className="block border-2 border-teal bg-teal px-6 py-3 text-center text-lg font-bold uppercase tracking-wide text-background hover:bg-teal-dark"
        >
          {cta}
        </Link>
      </div>
    </div>
  );
}

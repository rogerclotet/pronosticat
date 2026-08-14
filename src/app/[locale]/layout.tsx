import { Suspense } from "react";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default function LocaleLayout({ children, params }: Props) {
  // The params promise is passed down rather than awaited here: awaiting it in
  // the layout body would make every route below it unprerenderable.
  return (
    <Suspense fallback={null}>
      <LocaleProvider params={params}>{children}</LocaleProvider>
    </Suspense>
  );
}

async function LocaleProvider({ children, params }: Props) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as "ca")) {
    notFound();
  }

  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}

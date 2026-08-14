import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { sanitizeAuthCallbackUrl } from "@/lib/invite";

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  return (
    <Suspense fallback={<div className="min-h-full bg-background" />}>
      <LoginContent searchParams={searchParams} />
    </Suspense>
  );
}

async function LoginContent({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const callbackURL = sanitizeAuthCallbackUrl(next) ?? "/";
  const session = await getSession();
  if (session) {
    redirect(callbackURL);
  }

  const { LoginForm } = await import("@/components/auth/login-form");
  return <LoginForm callbackURL={callbackURL} />;
}

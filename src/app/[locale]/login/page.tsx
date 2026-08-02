import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";

export default async function LoginPage() {
  const session = await getSession();
  if (session) {
    redirect("/");
  }

  const { LoginForm } = await import("@/components/auth/login-form");
  return <LoginForm />;
}

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { InviteAcceptView } from "@/components/invite/invite-accept-view";
import { InviteInvalid } from "@/components/invite/invite-invalid";
import { joinGroup } from "@/lib/actions/groups";
import { normalizeInviteCode } from "@/lib/invite";
import { getGroupInvitePreview } from "@/lib/queries/groups";
import { assertRateLimit } from "@/lib/security/rate-limit";
import { getSession } from "@/lib/session";

export const metadata = {
  title: "Invitació · Pronosticat",
};

type InvitePageProps = {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ join?: string }>;
};

export default function InvitePage(props: InvitePageProps) {
  return (
    <Suspense fallback={<InviteFallback />}>
      <InviteContent params={props.params} searchParams={props.searchParams} />
    </Suspense>
  );
}

async function InviteContent({ params, searchParams }: InvitePageProps) {
  const t = await getTranslations("invite");
  const { code: rawCode } = await params;
  const { join } = await searchParams;
  const code = normalizeInviteCode(rawCode);

  if (!code) {
    return (
      <InviteInvalid
        title={t("invalidTitle")}
        body={t("invalidBody")}
        cta={t("invalidCta")}
      />
    );
  }

  const session = await getSession();
  let joinFailed = false;
  if (session && join === "1") {
    try {
      await joinGroup(code);
    } catch {
      joinFailed = true;
    }
    if (!joinFailed) {
      redirect("/");
    }
  }

  const forwarded = (await headers()).get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || "unknown";
  assertRateLimit(`invite-preview:${ip}`, 40, 60_000);

  const preview = await getGroupInvitePreview(code);
  if (!preview) {
    return (
      <InviteInvalid
        title={t("invalidTitle")}
        body={t("invalidBody")}
        cta={t("invalidCta")}
      />
    );
  }

  return (
    <InviteAcceptView
      inviteCode={code}
      groupName={preview.name}
      competition={preview.competition}
      memberCount={preview.memberCount}
      isLoggedIn={session != null}
      initialError={joinFailed}
    />
  );
}

function InviteFallback() {
  return <div className="min-h-full bg-header-bg" />;
}

"use client";

import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { InviteShareButton } from "@/components/groups/invite-share-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePathname, useRouter } from "@/i18n/routing";
import { createGroup, joinGroup } from "@/lib/actions/groups";
import type { Competition } from "@/lib/constants";
import { cn } from "@/lib/utils";

const CREATE_STEPS_TOTAL = 2;

export function OnboardingWizard() {
  const t = useTranslations("onboarding");
  const tGroup = useTranslations("group");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [name, setName] = useState("");
  const [competition, setCompetition] = useState<Competition>("laliga");
  const [code, setCode] = useState("");
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mode = searchParams.get("mode") === "join" ? "join" : "create";
  // Only trust the invite step if we actually have a code to show — a
  // fresh visit/refresh at ?step=invite has no code in memory to display.
  const view =
    mode === "join"
      ? "join"
      : searchParams.get("step") === "invite" && inviteCode
        ? "create-2"
        : "create-1";

  async function handleCreateStep1(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const group = await createGroup({ name, competition });
      setInviteCode(group.inviteCode);
      router.push(`${pathname}?mode=create&step=invite`);
    } catch {
      setError(t("error"));
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await joinGroup(code);
      router.replace("/");
    } catch {
      setError(t("error"));
    } finally {
      setLoading(false);
    }
  }

  if (view === "join") {
    return (
      <OnboardingScreen
        title={t("joinTitle")}
        body={t("joinBody")}
        onSubmit={handleJoin}
        error={error}
        fields={[
          {
            label: t("codeLabel"),
            input: (
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                maxLength={12}
                required
              />
            ),
          },
        ]}
        cta={t("joinCta")}
        loading={loading}
        alt={t("createInsteadAlt")}
        onAlt={() => router.push(`${pathname}?mode=create`)}
        step={null}
      />
    );
  }

  if (view === "create-1") {
    return (
      <OnboardingScreen
        title={t("createTitle")}
        body={t("createBody")}
        onSubmit={handleCreateStep1}
        error={error}
        fields={[
          {
            label: t("nameLabel"),
            input: (
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            ),
          },
          {
            label: t("competitionLabel"),
            input: (
              <select
                value={competition}
                onChange={(e) => setCompetition(e.target.value as Competition)}
                className="w-full border-2 border-border-strong bg-background px-3 py-3 font-mono text-sm font-bold text-foreground focus:border-teal focus:outline-none"
              >
                <option value="laliga">{tGroup("competitions.laliga")}</option>
                <option value="premier_league">
                  {tGroup("competitions.premier_league")}
                </option>
                <option value="champions_league">
                  {tGroup("competitions.champions_league")}
                </option>
              </select>
            ),
          },
        ]}
        cta={t("createCta")}
        loading={loading}
        alt={t("haveCodeAlt")}
        onAlt={() => router.push(`${pathname}?mode=join`)}
        step={{ index: 0, total: CREATE_STEPS_TOTAL }}
      />
    );
  }

  return (
    <OnboardingScreen
      title={t("inviteTitle")}
      body={t("inviteBody")}
      onSubmit={(e) => {
        e.preventDefault();
        router.replace("/");
      }}
      fields={[
        {
          label: t("groupCodeLabel"),
          input: <StaticValue value={inviteCode ?? ""} accent />,
        },
      ]}
      cta={t("finishCta")}
      preCta={
        inviteCode ? (
          <InviteShareButton
            inviteCode={inviteCode}
            groupName={name}
            label={t("shareCta")}
            size="lg"
          />
        ) : null
      }
      step={{ index: 1, total: CREATE_STEPS_TOTAL }}
    />
  );
}

function StaticValue({
  value,
  accent,
}: {
  value: string | number;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "border-2 border-border-strong bg-background px-2.5 py-3 font-mono text-sm font-bold",
        accent ? "text-teal" : "text-foreground",
      )}
    >
      {value}
    </div>
  );
}

function OnboardingScreen({
  title,
  body,
  fields,
  cta,
  preCta,
  onSubmit,
  loading,
  error,
  alt,
  onAlt,
  step,
}: {
  title: string;
  body: string;
  fields: { label: string; input: React.ReactNode }[];
  cta: string;
  preCta?: React.ReactNode;
  onSubmit: (e: React.FormEvent) => void;
  loading?: boolean;
  error?: string | null;
  alt?: string;
  onAlt?: () => void;
  step: { index: number; total: number } | null;
}) {
  return (
    <form
      onSubmit={onSubmit}
      className="mx-auto flex min-h-full w-full max-w-lg flex-col bg-header-bg"
    >
      <div className="flex flex-1 flex-col gap-4 overflow-auto px-5 pb-5 pt-16">
        <h1 className="font-sans text-[34px] font-extrabold uppercase leading-[0.95] tracking-tight">
          {title}
        </h1>
        <p className="max-w-xs font-sans text-[13px] leading-relaxed text-text-secondary">
          {body}
        </p>

        <div className="flex flex-col gap-3 border-2 border-border bg-background p-3.5">
          {fields.map((f) => (
            <div key={f.label} className="flex flex-col gap-1.5">
              <span className="label-mono">{f.label}</span>
              {f.input}
            </div>
          ))}
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        {step && (
          <div className="flex gap-1.5">
            {Array.from({ length: step.total }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-1.5 flex-1 border-2 border-border",
                  i <= step.index ? "bg-teal" : "bg-background",
                )}
              />
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2 px-5 pb-8">
        {preCta}
        <Button type="submit" size="lg" disabled={loading}>
          {cta}
        </Button>
        {alt && (
          <Button
            type="button"
            variant="ghost"
            onClick={onAlt}
            disabled={loading}
          >
            {alt}
          </Button>
        )}
      </div>
    </form>
  );
}

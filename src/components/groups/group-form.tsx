"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { createGroup, joinGroup } from "@/lib/actions/groups";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import type { Competition } from "@/lib/constants";

type GroupFormsProps = {
  mode: "create" | "join";
  onSuccess?: () => void;
};

export function GroupForm({ mode, onSuccess }: GroupFormsProps) {
  const t = useTranslations("group");
  const tCommon = useTranslations("common");
  const [name, setName] = useState("");
  const [competition, setCompetition] = useState<Competition>("laliga");
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (mode === "create") {
        await createGroup({ name, competition });
      } else {
        await joinGroup(inviteCode);
      }
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : tCommon("error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === "create" ? (
          <>
            <div>
              <label className="mb-1 block text-xs uppercase tracking-wider text-muted">
                {t("name")}
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs uppercase tracking-wider text-muted">
                {t("competition")}
              </label>
              <select
                value={competition}
                onChange={(e) => setCompetition(e.target.value as Competition)}
                className="w-full border-2 border-border bg-background px-4 py-2 text-foreground focus:border-teal focus:outline-none"
              >
                <option value="laliga">{t("competitions.laliga")}</option>
                <option value="premier_league">
                  {t("competitions.premier_league")}
                </option>
                <option value="champions_league">
                  {t("competitions.champions_league")}
                </option>
              </select>
            </div>
          </>
        ) : (
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wider text-muted">
              {t("inviteCode")}
            </label>
            <Input
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              placeholder={t("joinCodePlaceholder")}
              required
              maxLength={6}
            />
          </div>
        )}

        {error && <p className="text-sm text-danger">{error}</p>}

        <Button type="submit" className="w-full" disabled={loading}>
          {mode === "create" ? t("createSubmit") : t("joinSubmit")}
        </Button>
      </form>
    </Card>
  );
}

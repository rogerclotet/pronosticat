"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { invitePath } from "@/lib/invite";
import { shareInviteLink } from "@/lib/share-invite";

type InviteShareButtonProps = {
  inviteCode: string;
  groupName: string;
  label?: string;
  variant?: "primary" | "secondary";
  size?: "md" | "lg";
};

export function InviteShareButton({
  inviteCode,
  groupName,
  label,
  variant = "secondary",
  size = "md",
}: InviteShareButtonProps) {
  const t = useTranslations("group");
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const url = `${window.location.origin}${invitePath(inviteCode)}`;
    const result = await shareInviteLink({
      title: t("shareTitle", { name: groupName }),
      text: t("shareText", { name: groupName }),
      url,
    });
    if (result !== "copied") return;
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Button type="button" variant={variant} size={size} onClick={handleShare}>
      {copied ? t("linkCopied") : (label ?? t("invite"))}
    </Button>
  );
}

"use client";

import { Pencil } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useRouter } from "@/i18n/routing";
import { authClient } from "@/lib/auth-client";

const MAX_NAME_LENGTH = 40;

export function EditNameButton({ name }: { name: string }) {
  const t = useTranslations("perfil");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(name);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openDialog() {
    setValue(name);
    setError(null);
    setOpen(true);
  }

  async function handleSave() {
    const trimmed = value.trim();
    if (!trimmed || trimmed.length > MAX_NAME_LENGTH) {
      setError(t("nameInvalid", { max: MAX_NAME_LENGTH }));
      return;
    }

    setPending(true);
    setError(null);
    const { error: updateError } = await authClient.updateUser({
      name: trimmed,
    });
    setPending(false);

    if (updateError) {
      setError(updateError.message ?? tCommon("error"));
      return;
    }

    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        className="flex items-center gap-1.5 text-left"
      >
        <span className="font-sans text-base font-extrabold">{name}</span>
        <Pencil className="size-3.5 shrink-0 text-muted" strokeWidth={2.5} />
      </button>

      {open ? (
        <Dialog
          title={t("editNameTitle")}
          onClose={() => {
            if (!pending) setOpen(false);
          }}
          footer={
            <>
              <Button type="button" disabled={pending} onClick={handleSave}>
                {tCommon("save")}
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={pending}
                onClick={() => setOpen(false)}
              >
                {tCommon("cancel")}
              </Button>
            </>
          }
        >
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            maxLength={MAX_NAME_LENGTH}
            disabled={pending}
            autoFocus
          />
          {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
        </Dialog>
      ) : null}
    </>
  );
}

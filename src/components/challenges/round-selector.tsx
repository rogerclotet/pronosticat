"use client";

import { useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { RoundSelect } from "@/components/ui/round-select";
import { usePathname, useRouter } from "@/i18n/routing";
import type { RoundOption } from "@/lib/queries/round-board";

type RoundSelectorProps = {
  options: RoundOption[];
  selectedId: string;
};

/** Switches a board screen to another round; the default one is the first. */
export function RoundSelector({ options, selectedId }: RoundSelectorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const [defaultOption] = options;

  function handleChange(roundId: string) {
    const params = new URLSearchParams(searchParams.toString());
    // The default round is what the screen shows without a param — keep the URL
    // clean rather than pinning an id that will age out.
    if (roundId === defaultOption?.id) {
      params.delete("round");
    } else {
      params.set("round", roundId);
    }
    // A challenge sheet left open belongs to the round being navigated away from.
    params.delete("slot");
    const query = params.toString();
    startTransition(() => {
      router.replace(query ? `${pathname}?${query}` : pathname);
    });
  }

  return (
    <RoundSelect
      options={options}
      value={selectedId}
      disabled={pending}
      onChange={handleChange}
    />
  );
}

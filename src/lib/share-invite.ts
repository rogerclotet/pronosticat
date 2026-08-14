export async function shareInviteLink(input: {
  title: string;
  text: string;
  url: string;
}): Promise<"shared" | "copied" | "cancelled"> {
  if (typeof navigator.share === "function") {
    try {
      await navigator.share({
        title: input.title,
        text: input.text,
        url: input.url,
      });
      return "shared";
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return "cancelled";
      }
    }
  }

  await navigator.clipboard.writeText(input.url);
  return "copied";
}

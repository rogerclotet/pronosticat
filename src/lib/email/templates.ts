import "server-only";

/**
 * Deliberately plain HTML: no images, no external CSS, table-free. Mail
 * clients strip most of it anyway, and the app's whole reason for sending is
 * that push could not reach this person.
 */
function layout(input: {
  heading: string;
  body: string;
  ctaLabel: string;
  ctaUrl: string;
  unsubscribeUrl: string;
}): string {
  return `<!doctype html>
<html lang="ca">
<body style="margin:0;padding:24px;background:#0f1115;color:#e8ebf0;font-family:-apple-system,Segoe UI,Roboto,sans-serif;">
  <div style="max-width:480px;margin:0 auto;border:2px solid #2a3040;background:#161a22;padding:24px;">
    <h1 style="margin:0 0 16px;font-size:18px;text-transform:uppercase;color:#4ecdc4;">${input.heading}</h1>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.6;">${input.body}</p>
    <a href="${input.ctaUrl}" style="display:inline-block;background:#4ecdc4;color:#0f1115;padding:12px 20px;font-weight:bold;text-decoration:none;">${input.ctaLabel}</a>
    <p style="margin:24px 0 0;font-size:12px;color:#8b93a7;">
      Reps aquest correu perquè no tens els avisos del mòbil activats.
      <a href="${input.unsubscribeUrl}" style="color:#8b93a7;">Deixa de rebre correus</a>.
    </p>
  </div>
</body>
</html>`;
}

function hoursLeft(remainingMs: number): string {
  const hours = Math.max(1, Math.round(remainingMs / (60 * 60 * 1000)));
  return hours === 1 ? "1 hora" : `${hours} hores`;
}

export function deadlineEmail(input: {
  missingSlots: number;
  remainingMs: number;
  competitionLabel: string;
  appUrl: string;
  unsubscribeUrl: string;
}) {
  const slots =
    input.missingSlots === 1
      ? "1 casella per omplir"
      : `${input.missingSlots} caselles per omplir`;
  const left = hoursLeft(input.remainingMs);
  const subject = `Et queden ${slots} · ${input.competitionLabel}`;
  const body = `El tauler de ${input.competitionLabel} es tanca d'aquí a ${left} i encara tens ${slots}. Un cop xiuli el primer partit ja no s'hi pot tocar res.`;

  return {
    subject,
    text: `${body}\n\n${input.appUrl}`,
    html: layout({
      heading: "El tauler es tanca aviat",
      body,
      ctaLabel: "Omple el tauler",
      ctaUrl: input.appUrl,
      unsubscribeUrl: input.unsubscribeUrl,
    }),
  };
}

export function roundSettledEmail(input: {
  matchday: number;
  groupName: string;
  points: number;
  appUrl: string;
  unsubscribeUrl: string;
}) {
  const sign = input.points >= 0 ? `+${input.points}` : `${input.points}`;
  const subject = `Jornada ${input.matchday} liquidada: ${sign} punts`;
  const body = `Ja hi ha els punts de la jornada ${input.matchday} a ${input.groupName}. Hi has fet <strong>${sign} punts</strong>. Mira com ha quedat la classificació.`;

  return {
    subject,
    text: `Jornada ${input.matchday} a ${input.groupName}: ${sign} punts.\n\n${input.appUrl}`,
    html: layout({
      heading: `Jornada ${input.matchday} liquidada`,
      body,
      ctaLabel: "Veure la classificació",
      ctaUrl: input.appUrl,
      unsubscribeUrl: input.unsubscribeUrl,
    }),
  };
}

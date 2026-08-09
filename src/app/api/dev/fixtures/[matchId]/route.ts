import { NextResponse } from "next/server";
import {
  checkDevFixturesAuth,
  devFixturesDisabledResponse,
  devFixturesUnauthorizedResponse,
  isDevFixturesEnabled,
} from "@/lib/dev/guard";
import { deleteDevMatch, updateDevMatch } from "@/lib/dev/fixtures";
import { runScoreOnly } from "@/lib/actions/scoring";

type RouteContext = { params: Promise<{ matchId: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  if (!isDevFixturesEnabled()) return devFixturesDisabledResponse();
  if (!checkDevFixturesAuth(request)) return devFixturesUnauthorizedResponse();

  const { matchId } = await context.params;

  try {
    const body = await request.json();
    const match = await updateDevMatch(matchId, body);

    if (body.runScore === true) {
      await runScoreOnly();
    }

    return NextResponse.json({ match });
  } catch (error) {
    console.error("Update dev fixture failed:", error);
    const message = error instanceof Error ? error.message : "Failed to update fixture";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  if (!isDevFixturesEnabled()) return devFixturesDisabledResponse();
  if (!checkDevFixturesAuth(request)) return devFixturesUnauthorizedResponse();

  const { matchId } = await context.params;

  try {
    await deleteDevMatch(matchId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Delete dev fixture failed:", error);
    const message = error instanceof Error ? error.message : "Failed to delete fixture";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

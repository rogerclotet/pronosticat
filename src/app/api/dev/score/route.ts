import { NextResponse } from "next/server";
import {
  checkDevFixturesAuth,
  devFixturesDisabledResponse,
  devFixturesUnauthorizedResponse,
  isDevFixturesEnabled,
} from "@/lib/dev/guard";
import { runScoreOnly } from "@/lib/actions/scoring";

export async function POST(request: Request) {
  if (!isDevFixturesEnabled()) return devFixturesDisabledResponse();
  if (!checkDevFixturesAuth(request)) return devFixturesUnauthorizedResponse();

  try {
    await runScoreOnly();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Dev score run failed:", error);
    return NextResponse.json({ error: "Score run failed" }, { status: 500 });
  }
}

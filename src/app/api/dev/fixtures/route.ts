import { NextResponse } from "next/server";
import type { Competition } from "@/lib/constants";
import { createDevMatch, listDevMatches } from "@/lib/dev/fixtures";
import {
  checkDevFixturesAuth,
  devFixturesDisabledResponse,
  devFixturesUnauthorizedResponse,
  isDevFixturesEnabled,
} from "@/lib/dev/guard";

export async function GET(request: Request) {
  if (!isDevFixturesEnabled()) return devFixturesDisabledResponse();
  if (!checkDevFixturesAuth(request)) return devFixturesUnauthorizedResponse();

  const { searchParams } = new URL(request.url);
  const competition = searchParams.get("competition") as Competition | null;

  try {
    const matches = await listDevMatches(competition ?? undefined);
    return NextResponse.json({ matches });
  } catch (error) {
    console.error("List dev fixtures failed:", error);
    return NextResponse.json(
      { error: "Failed to list fixtures" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  if (!isDevFixturesEnabled()) return devFixturesDisabledResponse();
  if (!checkDevFixturesAuth(request)) return devFixturesUnauthorizedResponse();

  try {
    const body = await request.json();
    const match = await createDevMatch(body);
    return NextResponse.json({ match }, { status: 201 });
  } catch (error) {
    console.error("Create dev fixture failed:", error);
    const message =
      error instanceof Error ? error.message : "Failed to create fixture";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

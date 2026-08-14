import { afterEach, describe, expect, it, vi } from "vitest";
import {
  checkDevFixturesAuth,
  isDevFixturesEnabled,
  isDevFixturesUiEnabled,
} from "./guard";

describe("dev fixtures guard", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("enables the UI only in development", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(isDevFixturesUiEnabled()).toBe(true);

    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DEV_FIXTURES_ENABLED", "true");
    vi.stubEnv("CRON_SECRET", "s");
    expect(isDevFixturesUiEnabled()).toBe(false);
  });

  it("does not enable production API routes without a secret", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DEV_FIXTURES_ENABLED", "true");
    vi.stubEnv("DEV_FIXTURES_SECRET", "");
    vi.stubEnv("CRON_SECRET", "");
    expect(isDevFixturesEnabled()).toBe(false);
  });

  it("enables production API routes when flag and secret are set", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DEV_FIXTURES_ENABLED", "true");
    vi.stubEnv("CRON_SECRET", "s3cret");
    expect(isDevFixturesEnabled()).toBe(true);
  });

  it("rejects production requests without a matching bearer token", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DEV_FIXTURES_ENABLED", "true");
    vi.stubEnv("CRON_SECRET", "s3cret");
    const request = new Request("http://localhost/api/dev/score", {
      method: "POST",
    });
    expect(checkDevFixturesAuth(request)).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { parsePushSubscription } from "./validate";

const valid = {
  endpoint: "https://push.example/sub/abc",
  keys: { p256dh: "abcDEFghi", auth: "xyz_-12" },
};

describe("parsePushSubscription", () => {
  it("accepts a well-formed HTTPS subscription", () => {
    expect(parsePushSubscription(valid)).toEqual(valid);
  });

  it("accepts localhost HTTP for development", () => {
    expect(
      parsePushSubscription({
        ...valid,
        endpoint: "http://localhost:3000/push",
      }),
    ).not.toBeNull();
  });

  it("rejects missing keys or a non-HTTPS remote endpoint", () => {
    expect(parsePushSubscription({ endpoint: valid.endpoint })).toBeNull();
    expect(
      parsePushSubscription({
        ...valid,
        endpoint: "http://evil.example/push",
      }),
    ).toBeNull();
    expect(
      parsePushSubscription({
        ...valid,
        keys: { p256dh: "not+valid", auth: valid.keys.auth },
      }),
    ).toBeNull();
  });
});

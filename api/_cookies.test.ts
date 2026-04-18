import { describe, it, expect } from "vitest";
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  STATE_COOKIE,
  accessCookie,
  clearCookie,
  parseCookies,
  refreshCookie,
  serializeCookie,
  signedCookieValue,
  stateCookie,
  verifySignedCookie,
} from "./_cookies";

describe("parseCookies", () => {
  it("handles empty / undefined headers", () => {
    expect(parseCookies(undefined)).toEqual({});
    expect(parseCookies("")).toEqual({});
  });

  it("parses key=value pairs and decodes URI-encoded values", () => {
    expect(parseCookies("a=1; b=hello%20world; c=plain")).toEqual({
      a: "1",
      b: "hello world",
      c: "plain",
    });
  });

  it("ignores malformed entries", () => {
    expect(parseCookies("=oops; valid=1; nope")).toEqual({ valid: "1" });
  });
});

describe("serializeCookie", () => {
  it("includes HttpOnly Secure SameSite=Lax by default and Path=/", () => {
    const c = serializeCookie("a", "1");
    expect(c).toContain("a=1");
    expect(c).toContain("HttpOnly");
    expect(c).toContain("Secure");
    expect(c).toContain("SameSite=Lax");
    expect(c).toContain("Path=/");
  });

  it("encodes the value", () => {
    expect(serializeCookie("k", "a b/c")).toContain("k=a%20b%2Fc");
  });

  it("respects maxAge=0 for clear", () => {
    expect(clearCookie("a")).toContain("Max-Age=0");
  });
});

describe("signed state cookie", () => {
  const KEY = "test-key";

  it("round-trips a payload", () => {
    const signed = signedCookieValue("nonce-123", KEY);
    expect(verifySignedCookie(signed, KEY)).toBe("nonce-123");
  });

  it("rejects a tampered signature", () => {
    const signed = signedCookieValue("nonce-123", KEY);
    const tampered = signed.slice(0, -2) + "xx";
    expect(verifySignedCookie(tampered, KEY)).toBe(null);
  });

  it("rejects a different key", () => {
    const signed = signedCookieValue("nonce-123", KEY);
    expect(verifySignedCookie(signed, "other-key")).toBe(null);
  });

  it("rejects malformed values", () => {
    expect(verifySignedCookie(undefined, KEY)).toBe(null);
    expect(verifySignedCookie("nodot", KEY)).toBe(null);
  });
});

describe("named cookie helpers", () => {
  it("refreshCookie sets long max-age on the right name", () => {
    const c = refreshCookie("rtoken");
    expect(c).toContain(`${REFRESH_COOKIE}=rtoken`);
    expect(c).toMatch(/Max-Age=\d{6,}/);
  });

  it("accessCookie subtracts a 60s buffer from expiresIn", () => {
    expect(accessCookie("at", 3600)).toContain("Max-Age=3540");
    expect(accessCookie("at", 30)).toContain("Max-Age=0");
  });

  it("stateCookie has a short max-age", () => {
    const c = stateCookie("xyz");
    expect(c).toContain(`${STATE_COOKIE}=xyz`);
    expect(c).toContain("Max-Age=600");
  });

  it("ACCESS_COOKIE constant matches what accessCookie writes", () => {
    expect(accessCookie("at", 3600)).toContain(`${ACCESS_COOKIE}=at`);
  });
});

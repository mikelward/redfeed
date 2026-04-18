import { describe, it, expect } from "vitest";
import { sanitizeRedditHtml } from "./sanitize";

describe("sanitizeRedditHtml", () => {
  it("returns empty string for null/undefined", () => {
    expect(sanitizeRedditHtml(null)).toBe("");
    expect(sanitizeRedditHtml(undefined)).toBe("");
    expect(sanitizeRedditHtml("")).toBe("");
  });

  it("decodes HTML-entity-encoded markup from Reddit", () => {
    const encoded = "&lt;div class=&quot;md&quot;&gt;&lt;p&gt;Hello&lt;/p&gt;&lt;/div&gt;";
    const out = sanitizeRedditHtml(encoded);
    expect(out).toContain("<p>Hello</p>");
  });

  it("strips <script> and event handlers", () => {
    const bad = "<p>ok</p><script>alert(1)</script><img src=x onerror=alert(1)>";
    const out = sanitizeRedditHtml(bad);
    expect(out).not.toContain("<script");
    expect(out).not.toContain("onerror");
    expect(out).toContain("<p>ok</p>");
  });

  it("keeps anchors with href but drops unknown attrs", () => {
    const html = '<a href="https://example.com" onclick="x" target="_self">link</a>';
    const out = sanitizeRedditHtml(html);
    expect(out).toContain('href="https://example.com"');
    expect(out).not.toContain("onclick");
  });
});

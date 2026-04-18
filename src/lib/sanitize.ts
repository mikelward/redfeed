import DOMPurify from "dompurify";

function decodeEntities(html: string): string {
  if (typeof document === "undefined") return html;
  const el = document.createElement("textarea");
  el.innerHTML = html;
  return el.value;
}

export function sanitizeRedditHtml(html: string | null | undefined): string {
  if (!html) return "";
  const decoded = decodeEntities(html);
  return DOMPurify.sanitize(decoded, {
    ALLOWED_TAGS: [
      "a", "b", "blockquote", "br", "code", "del", "em", "h1", "h2", "h3",
      "h4", "h5", "h6", "hr", "i", "li", "ol", "p", "pre", "strong", "sub",
      "sup", "table", "tbody", "td", "th", "thead", "tr", "ul", "span", "div",
    ],
    ALLOWED_ATTR: ["href", "title", "class"],
    ALLOW_DATA_ATTR: false,
  });
}

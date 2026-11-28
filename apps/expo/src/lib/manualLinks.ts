/*
 * Addresses of manual pages. Plain string handling: React Native's URL class does not implement every property.
 */

export type ManualTheme = "system" | "light" | "dark";

/** `url` with query parameter `theme` set: the manual pages use it instead of the phone's light or dark mode. */
export function withManualTheme(url: string, theme: ManualTheme): string {
  const hashAt = url.indexOf("#");
  const hash = hashAt >= 0 ? url.slice(hashAt) : "";
  const withoutHash = hashAt >= 0 ? url.slice(0, hashAt) : url;
  const queryAt = withoutHash.indexOf("?");
  const path = queryAt >= 0 ? withoutHash.slice(0, queryAt) : withoutHash;
  const query = queryAt >= 0 ? withoutHash.slice(queryAt + 1) : "";
  const params = query.split("&").filter(p => p && !p.startsWith("theme="));
  params.push(`theme=${theme}`);
  return `${path}?${params.join("&")}${hash}`;
}

const ABSOLUTE = /^[a-z][a-z0-9+.-]*:/i;
const ORIGIN = /^([a-z][a-z0-9+.-]*:)\/\/[^/?#]*/i;

/** "https://host:port" of an absolute http(s) address, or "" otherwise. */
export function originOf(url: string): string {
  return ORIGIN.exec(url)?.[0].toLowerCase() ?? "";
}

/** `href` (as in a link on the page at `base`) as an absolute address. */
export function resolveUrl(href: string, base: string): string {
  if (ABSOLUTE.test(href)) return href;
  const origin = originOf(base);
  if (!origin) return href;
  if (href.startsWith("//")) return ORIGIN.exec(base)![1] + href;
  if (href.startsWith("#") || href.startsWith("?")) {
    const cut = href.startsWith("#") ? base.search(/#/) : base.search(/[?#]/);
    return (cut >= 0 ? base.slice(0, cut) : base) + href;
  }

  const queryAt = href.search(/[?#]/);
  const hrefPath = queryAt >= 0 ? href.slice(0, queryAt) : href;
  const suffix = queryAt >= 0 ? href.slice(queryAt) : "";

  let basePath = base.slice(origin.length).replace(/[?#].*$/, "") || "/";
  basePath = basePath.slice(0, basePath.lastIndexOf("/") + 1);
  const joined = hrefPath.startsWith("/") ? hrefPath : basePath + hrefPath;

  const out: string[] = [];
  const parts = joined.split("/");
  parts.forEach((part, i) => {
    const last = i === parts.length - 1;
    if (part === "..") {
      if (out.length > 1) out.pop();
      if (last) out.push("");
    } else if (part === ".") {
      if (last) out.push("");
    } else {
      out.push(part);
    }
  });
  return origin + out.join("/") + suffix;
}

/**
 * `<slug>.mdx` filename for a title. Dedupe already guarantees one
 * pending_queue row per unique item, but two unrelated items can still
 * share a near-identical title (e.g. the same headline from two sources,
 * or "Weekly roundup"), so the dedupe id's first 8 hex chars are appended
 * to keep filenames unique without needing a second dedupe pass here.
 */
export function slugify(title: string, dedupeId: string): string {
  const base = title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    // slice() can cut mid dash-run (e.g. land right after a "-" that was
    // followed by more content), so re-trim a trailing dash it reintroduces
    // — otherwise the "-" + dedupeId suffix below produces "foo--abcd1234".
    .replace(/-+$/, "");
  const suffix = dedupeId.slice(0, 8);
  return base ? `${base}-${suffix}` : suffix;
}

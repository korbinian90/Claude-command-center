const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,63}$/;

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/['"`]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

export function isValidSlug(input: unknown): input is string {
  return typeof input === "string" && SLUG_RE.test(input);
}

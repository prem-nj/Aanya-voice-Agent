/**
 * Pure, dependency-free helpers for resolving voice navigation commands on the
 * client (in-app persistent assistant). Kept free of React so it can be unit
 * tested with Node's built-in test runner, exactly like the server helpers.
 */

/**
 * Normalize a phrase for matching: lowercase, replace non-alphanumeric
 * punctuation with spaces, collapse whitespace runs, trim.
 * e.g. "  Go to Home!  " -> "go to home"
 */
export const normalizeText = (input) =>
  String(input ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

// Phrases that signal a navigation request. Longest first so multi-word
// phrases like "take me to" are matched before the shorter "take me".
export const NAVIGATION_PHRASES = [
  "take me to",
  "navigate to",
  "bring me to",
  "switch to",
  "head over to",
  "go to",
  "open up",
  "take me",
  "navigate",
  "head to",
  "move to",
  "show me",
  "start",
  "open",
  "visit",
  "show",
  "go",
];

const NAVIGATION_PHRASES_SORTED = [...NAVIGATION_PHRASES].sort(
  (a, b) => b.length - a.length
);

// Fillers stripped from the edges of a target phrase so "go to the dashboard"
// resolves precisely to "dashboard".
const FILLERS = ["please", "the", "a", "an", "to", "page", "pages"];

/**
 * True when a cleaned message reads like a navigation command
 * ("go to X", "open Y", ...). Uses word-boundary-friendly prefix matching.
 */
export const isNavigationCommand = (cleanInput) => {
  const clean = normalizeText(cleanInput);
  if (!clean) return false;
  return NAVIGATION_PHRASES_SORTED.some(
    (phrase) => clean === phrase || clean.startsWith(`${phrase} `)
  );
};

/**
 * Remove the leading navigation phrase plus edge fillers, returning the core
 * target token(s):
 *   "go to the dashboard"  -> "dashboard"
 *   "take me to settings"  -> "settings"
 *   "customers"            -> "customers"
 */
export const extractTarget = (command) => {
  let target = normalizeText(command);
  if (!target) return "";

  for (const phrase of NAVIGATION_PHRASES_SORTED) {
    if (target === phrase) return "";
    if (target.startsWith(`${phrase} `)) {
      target = target.slice(phrase.length).trim();
      break;
    }
  }

  let changed = true;
  while (changed && target) {
    changed = false;
    for (const filler of FILLERS) {
      if (target === filler) {
        target = "";
        changed = true;
        break;
      }
      if (target.startsWith(`${filler} `)) {
        target = target.slice(filler.length).trim();
        changed = true;
        break;
      }
    }
    for (const filler of FILLERS) {
      if (target.length > filler.length && target.endsWith(` ${filler}`)) {
        target = target.slice(0, -(filler.length + 1)).trim();
        changed = true;
        break;
      }
    }
  }
  return target;
};

/** Path segments of a route, e.g. "/pricing" -> ["pricing"]. */
export const routeSegments = (path) =>
  String(path || "")
    .split("/")
    .filter(Boolean)
    .map((segment) => normalizeText(segment));

/**
 * A page's matching surfaces: name, aliases, keywords and route segments,
 * each normalized once.
 */
const buildSurfaces = (page) => {
  const legacy =
    Array.isArray(page.keyword)
      ? page.keyword
      : Array.isArray(page.keywords)
        ? page.keywords
        : [];
  const keywords = Array.isArray(page.keywords) ? page.keywords : legacy;
  const aliases = Array.isArray(page.aliases) ? page.aliases : [];
  return {
    name: normalizeText(page.name),
    aliases: aliases.map(normalizeText),
    keywords: keywords.map(normalizeText),
    segments: routeSegments(page.path),
  };
};

const MAX_SCORE = 1;

/**
 * Confidence for a single page against a target phrase. Exact page-name
 * matches win outright; aliases, keywords and route segments contribute
 * progressively lower confidence.
 */
export const scorePage = (target, page) => {
  if (!target || !page) return 0;
  const { name, aliases, keywords, segments } = buildSurfaces(page);
  let best = 0;

  // Exact page-name match is preferred above everything.
  if (name && target === name) return MAX_SCORE;

  if (name) {
    if (target.includes(name)) best = Math.max(best, 0.9);
    if (name.includes(target) && target.length >= 2) best = Math.max(best, 0.78);
  }

  aliases.forEach((alias) => {
    if (target === alias) best = Math.max(best, 0.95);
    if (alias && target.includes(alias)) best = Math.max(best, 0.7);
    if (alias && alias.includes(target) && target.length >= 2) best = Math.max(best, 0.6);
  });

  keywords.forEach((keyword) => {
    if (target === keyword) best = Math.max(best, 0.9);
    if (keyword && target.includes(keyword)) best = Math.max(best, 0.66);
    if (keyword && keyword.includes(target) && target.length >= 2) best = Math.max(best, 0.55);
  });

  segments.forEach((segment) => {
    if (target === segment) best = Math.max(best, 0.85);
    if (target.includes(segment) && segment) best = Math.max(best, 0.6);
    if (segment && segment.includes(target) && target.length >= 2) best = Math.max(best, 0.5);
  });

  return best;
};

/**
 * Resolve a voice command against the configured navigation pages.
 *
 * @param {string} command      Raw spoken/text command.
 * @param {Array}  navigationPages
 * @returns {{type:"match",page,confidence}|{type:"ambiguous",pages}|{type:"not-found"}}
 */
export const matchNavigationCommand = (command, navigationPages = []) => {
  const target = extractTarget(command);
  const pages = (Array.isArray(navigationPages) ? navigationPages : []).filter(
    (page) => page && page.path
  );

  if (!target || pages.length === 0) return { type: "not-found" };

  const scored = pages
    .map((page) => ({ page, confidence: scorePage(target, page) }))
    .filter((entry) => entry.confidence > 0)
    .sort(
      (a, b) =>
        b.confidence - a.confidence || a.page.path.localeCompare(b.page.path)
    );

  if (scored.length === 0) return { type: "not-found" };

  const top = scored[0].confidence;
  const tied = scored.filter((entry) => entry.confidence === top);

  if (tied.length > 1) {
    return { type: "ambiguous", pages: tied.map((entry) => entry.page) };
  }

  return { type: "match", page: scored[0].page, confidence: top };
};

/**
 * Navigation safety: only accept internal, single-slash routes. Rejects
 * external URLs, protocol-relative URLs, forged schemes and control chars.
 */
export const isSafeRoute = (route) => {
  if (typeof route !== "string") return false;
  const value = route.trim();
  if (!value.startsWith("/")) return false;
  if (value.startsWith("//")) return false;
  const lower = value.toLowerCase();
  // Forged scheme after the leading slash, e.g. "/javascript:alert(1)"
  if (/^[a-z][a-z0-9+.-]*:/.test(value.slice(1))) return false;
  if (
    lower.includes("javascript:") ||
    lower.includes("data:") ||
    lower.includes("vbscript:")
  ) {
    return false;
  }
  if (/[\s<>"'`]/.test(value)) return false;
  return true;
};
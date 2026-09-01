/**
 * Pure, dependency-free helpers for resolving voice navigation commands.
 * Kept separate from the controller so they can be unit-tested without
 * requiring a database connection.
 */

/**
 * Normalize a phrase for matching: lowercase, replace punctuation with
 * spaces, collapse runs of whitespace, and trim. This makes matching
 * tolerant of capitalization, punctuation, and extra spaces
 * (e.g. "Go to Home!" -> "go to home").
 */
export const normalizeText = (input) =>
    String(input ?? "")
        .toLowerCase()
        .replace(/[^\w\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim()

// Leading words/phrases that signal a navigation request.
const NAVIGATION_PHRASES = [
    "open",
    "go",
    "start",
    "show",
    "navigate",
    "take me",
]

// Words used to detect a request to go to the Home page, used as a
// fallback when no configurable page matched. Reuses the existing
// "/home" route; no new route is created.
const HOME_PHRASES = [
    "home",
    "homepage",
    "home page",
    "main page",
]

// Existing Home route defined in client/src/App.jsx (do NOT duplicate).
const HOME_PATH = "/home"

export const isNavigationIntent = (cleanMessage) =>
    NAVIGATION_PHRASES.some((word) => cleanMessage.startsWith(word))

/**
 * Resolve which page a navigation command should open.
 * Returns { path, name } on success, or null when the message is not a
 * navigation request (or no page / fallback matched).
 */
export const resolveNavigation = (cleanMessage, pages) => {
    if (!isNavigationIntent(cleanMessage)) return null

    const matchedPage = (pages ?? []).find((page) => {
        // Accept both plural "keywords" (current) and legacy "keyword".
        const keywords = page.keywords ?? page.keyword ?? []
        return keywords.some((keyword) =>
            cleanMessage.includes(normalizeText(keyword))
        )
    })

    if (matchedPage) {
        return { path: matchedPage.path, name: matchedPage.name || "page" }
    }

    // Home fallback: if the request clearly targets the Home page but it
    // was never configured, navigate to the existing "/home" route.
    if (HOME_PHRASES.some((phrase) => cleanMessage.includes(phrase))) {
        return { path: HOME_PATH, name: "Home" }
    }

    return null
}
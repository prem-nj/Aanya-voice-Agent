/**
 * Validation helpers for user-configured navigation pages. Pure and testable.
 */
import { isSafeRoute, normalizeText } from "./navigation.js";

/**
 * Validate a navigation page. Returns an object of `{ field: message }`.
 * `allPages` is used to enforce duplicate-route prevention; `editingId`
 * (when provided) excludes the page currently being edited.
 */
export const validateNavigationPage = (page, allPages = [], editingId = null) => {
  const errors = {};
  const name = String(page?.name ?? "").trim();
  const path = String(page?.path ?? "").trim();

  if (!name) {
    errors.name = "Page name is required.";
  }

  if (!path) {
    errors.path = "Route is required.";
  } else if (!path.startsWith("/")) {
    errors.path = 'Route must start with "/".';
  } else if (!isSafeRoute(path)) {
    errors.path =
      "Route must be a valid internal path (no external URLs or schemes).";
  } else {
    const duplicate = (allPages || []).some(
      (existing) =>
        existing &&
        editingId !== existing.id &&
        normalizeText(existing.path) === normalizeText(path)
    );
    if (duplicate) {
      errors.path = `A page with route "${path}" already exists.`;
    }
  }

  return errors;
};

export const isPageValid = (errors) =>
  !errors || (!errors.name && !errors.path);

/** Convert a comma-separated string into a trimmed array of tags. */
export const parseTagList = (value) =>
  String(value || "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
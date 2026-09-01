import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeText,
  isNavigationIntent,
  resolveNavigation,
} from "../utils/navigation.js";

// A realistic page list as saved by the Builder (plural `keywords`),
// which is exactly what the fixed schema now persists.
const PAGES = [
  {
    name: "Home",
    path: "/home",
    keywords: ["home", "homepage", "main page", "home page"],
  },
  {
    name: "Pricing",
    path: "/pricing",
    keywords: ["pricing", "plans", "price"],
  },
];

test("normalizeText handles case, punctuation and extra spaces", () => {
  assert.equal(normalizeText("  Go   to   Home!  "), "go to home");
  assert.equal(normalizeText("OPEN THE HOMEPAGE."), "open the homepage");
  assert.equal(normalizeText("Take me to the Main Page!!"), "take me to the main page");
  assert.equal(normalizeText(null), "");
  assert.equal(normalizeText(undefined), "");
});

test("isNavigationIntent detects navigation-style openers", () => {
  assert.equal(isNavigationIntent(normalizeText("go to home")), true);
  assert.equal(isNavigationIntent(normalizeText("go home")), true);
  assert.equal(isNavigationIntent(normalizeText("navigate to the home page")), true);
  assert.equal(isNavigationIntent(normalizeText("open the homepage")), true);
  assert.equal(isNavigationIntent(normalizeText("take me to the main page")), true);
  assert.equal(isNavigationIntent(normalizeText("start pricing")), true);
  // Non-navigation queries are ignored
  assert.equal(isNavigationIntent(normalizeText("what is your price")), false);
  assert.equal(isNavigationIntent(normalizeText("hi there")), false);
});

test('"go to home" navigates to the configured Home page', () => {
  const nav = resolveNavigation(normalizeText("go to home"), PAGES);
  assert.deepEqual(nav, { path: "/home", name: "Home" });
});

test('"go home" navigates home (no direct keyword overlap needed)', () => {
  const nav = resolveNavigation(normalizeText("go home"), PAGES);
  assert.deepEqual(nav, { path: "/home", name: "Home" });
});

test('"navigate to the home page" navigates home (capitalized / padded)', () => {
  const nav = resolveNavigation(normalizeText("Navigate   to   the Home Page."), PAGES);
  assert.deepEqual(nav, { path: "/home", name: "Home" });
});

test('"open the homepage" navigates home', () => {
  const nav = resolveNavigation(normalizeText("Open the Homepage!"), PAGES);
  assert.deepEqual(nav, { path: "/home", name: "Home" });
});

test('"take me to the main page" navigates home', () => {
  const nav = resolveNavigation(normalizeText("Take me to the main page."), PAGES);
  assert.deepEqual(nav, { path: "/home", name: "Home" });
});

test("other configured pages still work", () => {
  const nav = resolveNavigation(normalizeText("show me pricing"), PAGES);
  assert.deepEqual(nav, { path: "/pricing", name: "Pricing" });
});

test("home fallback works even when user configured no pages", () => {
  // No pages configured at all -> fallback to existing /home route.
  const nav = resolveNavigation(normalizeText("go to home"), []);
  assert.deepEqual(nav, { path: "/home", name: "Home" });
});

test("home fallback works with legacy singular `keyword` field", () => {
  const legacyPages = [
    { name: "Home", path: "/home", keyword: ["home"] },
  ];
  const nav = resolveNavigation(normalizeText("go to home"), legacyPages);
  assert.deepEqual(nav, { path: "/home", name: "Home" });
});

test("non-navigation messages return null (not treated as navigation)", () => {
  assert.equal(resolveNavigation(normalizeText("what is your pricing"), PAGES), null);
  assert.equal(resolveNavigation(normalizeText("hello"), PAGES), null);
});
test("aliases are matched as well as keywords", () => {
  const pages = [
    { name: "Dashboard", path: "/dashboard", keywords: [], aliases: ["home", "main"] },
    { name: "Pricing", path: "/pricing", keywords: ["pricing", "plan"] },
  ];
  const nav = resolveNavigation(normalizeText("open the main page"), pages);
  assert.deepEqual(nav, { path: "/dashboard", name: "Dashboard" });
});
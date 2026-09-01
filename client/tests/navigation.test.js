/**
 * Unit tests for the client-side navigation / voice-command logic.
 * Run with: node --test tests/*.test.js  (uses Node's built-in test runner).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeText,
  isNavigationCommand,
  extractTarget,
  matchNavigationCommand,
  isSafeRoute,
} from "../src/utils/navigation.js";
import {
  validateNavigationPage,
  isPageValid,
  parseTagList,
} from "../src/utils/navigationValidation.js";
import { createNavigationStorage } from "../src/utils/assistantStorage.js";

const PAGES = [
  { id: "d1", name: "Dashboard", path: "/dashboard", aliases: ["home", "main dashboard"], keywords: ["dashboard", "overview"] },
  { id: "c1", name: "Customers", path: "/customers", aliases: ["clients", "customer list"], keywords: ["customers"] },
  { id: "s1", name: "Settings", path: "/settings", aliases: ["preferences"], keywords: ["settings", "config"] },
  { id: "b1", name: "Billing", path: "/billing", keywords: ["billing", "payment", "plans"] },
];

// --- Normalization ---------------------------------------------------------

test("normalizeText handles case, punctuation and extra spaces", () => {
  assert.equal(normalizeText("  Go   to   Dashboard!  "), "go to dashboard");
  assert.equal(normalizeText("OPEN Customers."), "open customers");
  assert.equal(normalizeText(undefined), "");
  assert.equal(normalizeText(null), "");
});

test("isNavigationCommand detects navigation phrasing", () => {
  assert.equal(isNavigationCommand("go to the dashboard"), true);
  assert.equal(isNavigationCommand("open customers"), true);
  assert.equal(isNavigationCommand("navigate to settings"), true);
  assert.equal(isNavigationCommand("take me to the reports page"), true);
  assert.equal(isNavigationCommand("go home"), true);
  assert.equal(isNavigationCommand("what is the pricing"), false);
  assert.equal(isNavigationCommand("hi there"), false);
});

test("extractTarget strips navigation prefixes and fillers", () => {
  assert.equal(extractTarget("go to the dashboard"), "dashboard");
  assert.equal(extractTarget("open customers"), "customers");
  assert.equal(extractTarget("navigate to settings"), "settings");
  assert.equal(extractTarget("take me to the reports page"), "reports");
  assert.equal(extractTarget("customers"), "customers");
});

// --- Route matching --------------------------------------------------------

test("exact page-name match is preferred and scores 1", () => {
  const m = matchNavigationCommand("go to customers", PAGES);
  assert.equal(m.type, "match");
  assert.equal(m.page.name, "Customers");
  assert.equal(m.confidence, 1);
});

test("exact name beats an identical alias on another page", () => {
  const pref = [
    { id: "a", name: "Dashboard", path: "/dashboard", aliases: ["home"] },
    { id: "b", name: "Overview", path: "/overview", aliases: ["dashboard"] },
  ];
  const m = matchNavigationCommand("go to dashboard", pref);
  assert.equal(m.type, "match");
  assert.equal(m.page.name, "Dashboard");
});

test("alias matching navigates the configured page", () => {
  const m = matchNavigationCommand("open clients", PAGES);
  assert.equal(m.type, "match");
  assert.equal(m.page.name, "Customers");
});

test("keyword matching navigates the configured page", () => {
  const m = matchNavigationCommand("show me payment", PAGES);
  assert.equal(m.type, "match");
  assert.equal(m.page.name, "Billing");
});

test("no-match returns not-found with a helpful type", () => {
  const m = matchNavigationCommand("go to the moon", PAGES);
  assert.equal(m.type, "not-found");
});

test("no pages configured returns not-found", () => {
  const m = matchNavigationCommand("go to dashboard", []);
  assert.equal(m.type, "not-found");
});

test("ambiguous matches return the tied pages", () => {
  const amb = [
    { id: "a", name: "Reports A", path: "/reports/a", keywords: ["reports", "sales"] },
    { id: "b", name: "Reports B", path: "/reports/b", keywords: ["reports", "sales"] },
  ];
  const m = matchNavigationCommand("open reports", amb);
  assert.equal(m.type, "ambiguous");
  assert.equal(m.pages.length, 2);
// --- Navigation safety -----------------------------------------------------

test("isSafeRoute accepts internal routes and rejects external/unsafe ones", () => {
  assert.equal(isSafeRoute("/dashboard"), true);
  assert.equal(isSafeRoute("/reports/quarterly"), true);
  assert.equal(isSafeRoute("dashboard"), false);
  assert.equal(isSafeRoute(""), false);
  assert.equal(isSafeRoute(null), false);
  assert.equal(isSafeRoute("https://evil.com"), false);
  assert.equal(isSafeRoute("//evil.com"), false);
  assert.equal(isSafeRoute("javascript:alert(1)"), false);
  assert.equal(isSafeRoute("/javascript:alert(1)"), false);
  assert.equal(isSafeRoute("data:text/html,x"), false);
});

// --- Validation + duplicates -----------------------------------------------

test("validateNavigationPage requires a name and a / route", () => {
  assert.ok(isPageValid(validateNavigationPage({ name: "C", path: "/c" }, [])));
  assert.ok(validateNavigationPage({ name: " ", path: "/c" }, []).name);
  assert.ok(validateNavigationPage({ name: "C", path: "" }, []).path);
});

test("validateNavigationPage rejects routes not starting with /", () => {
  assert.ok(validateNavigationPage({ name: "C", path: "customers" }, []).path);
});

test("validateNavigationPage rejects unsafe routes", () => {
  assert.ok(validateNavigationPage({ name: "C", path: "https://x.com" }, []).path);
  assert.ok(validateNavigationPage({ name: "C", path: "/javascript:alert(1)" }, []).path);
});

test("validateNavigationPage prevents duplicate routes", () => {
  const existing = [
    { id: "1", name: "A", path: "/a" },
    { id: "2", name: "B", path: "/b" },
  ];
  const duplicate = validateNavigationPage({ name: "C", path: "/a" }, existing);
  assert.ok(duplicate.path);
  // Editing the same row must not be treated as a duplicate.
  assert.ok(
    isPageValid(validateNavigationPage({ name: "A", path: "/a" }, existing, "1"))
  );
});

test("parseTagList trims and drops empties", () => {
  assert.deepEqual(parseTagList("home,  dashboard ,,overview"), [
    "home",
    "dashboard",
    "overview",
  ]);
});

// --- Persistence bridge ----------------------------------------------------

test("createNavigationStorage round-trips through a storage backend", () => {
  const backend = {};
  const storage = createNavigationStorage({
    getItem: (k) => (k in backend ? backend[k] : null),
    setItem: (k, v) => {
      backend[k] = v;
    },
    removeItem: (k) => {
      delete backend[k];
    },
  });

  storage.save([{ name: "Dashboard", path: "/dashboard" }]);
  assert.deepEqual(storage.load(), [{ name: "Dashboard", path: "/dashboard" }]);
  storage.clear();
  assert.equal(storage.load(), null);
});
});
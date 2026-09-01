/* eslint-disable react-refresh/only-export-components */
/**
 * Global assistant state + voice-navigation orchestration.
 *
 * Mounted once at the highest shared layout level (AppShell) so a single
 * assistant instance persists across internal route changes, preserving its
 * open/minimized state and the conversation.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { ServerUrl } from "../config";
import {
  isNavigationCommand,
  isSafeRoute,
  matchNavigationCommand,
  normalizeText,
} from "../utils/navigation";
import { validateNavigationPage } from "../utils/navigationValidation";
import { navigationStorage } from "../utils/assistantStorage";

const AssistantContext = createContext(null);

let idCounter = 0;
const generateId = () =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `page_${Date.now()}_${idCounter++}`;

const normalizePage = (page) => ({
  id: (page && page.id) || generateId(),
  name: (page && page.name) || "",
  path: (page && page.path) || "",
  aliases: arraySafe(page && page.aliases),
  keywords: arraySafe(page && (page.keywords ?? page.keyword)),
});

const arraySafe = (value) =>
  Array.isArray(value) ? value.filter((item) => typeof item === "string") : [];

export function AssistantProvider({ user, children }) {
  const navigate = useNavigate();
  const location = useLocation();

  const assistantName = user?.assistantName || "Anaya AI";

  const [navigationPages, setNavigationPages] = useState(() => {
    const backend =
      user && Array.isArray(user.pages) && user.pages.length ? user.pages : null;
    const stored = backend ?? navigationStorage.load();
    return (stored || []).map(normalizePage);
  });
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [error, setError] = useState(null);

  // Mirror to localStorage so config survives refresh even before a save.
  useEffect(() => {
    navigationStorage.save(navigationPages);
  }, [navigationPages]);

  const currentPath = location.pathname;

  const navigateTo = useCallback(
    (route) => {
      if (!isSafeRoute(route)) return { ok: false, reason: "unsafe" };
      if (route === location.pathname) return { ok: false, reason: "already-there" };
      navigate(route, { replace: false });
      return { ok: true };
    },
    [navigate, location.pathname]
  );
  const pushMessage = useCallback((message) => {
    setMessages((prev) => [
      { id: generateId(), timestamp: Date.now(), ...message },
      ...prev,
    ]);
  }, []);

  const clearConversation = useCallback(() => setMessages([]), []);

  const open = useCallback(() => {
    setIsOpen(true);
    setIsMinimized(false);
  }, []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggleOpen = useCallback(() => setIsOpen((prev) => !prev), []);
  const minimize = useCallback(() => setIsMinimized(true), []);
  const maximize = useCallback(() => setIsMinimized(false), []);
  const setListening = useCallback((value) => setIsListening(Boolean(value)), []);

  // Page (route) management --------------------------------------------------
  const addNavigationPage = useCallback(
    (pageInput) => {
      const page = normalizePage(pageInput);
      const errors = validateNavigationPage(page, navigationPages, null);
      if (Object.keys(errors).length) return { ok: false, errors };
      setNavigationPages((prev) => [...prev, page]);
      return { ok: true, page };
    },
    [navigationPages]
  );

  const updateNavigationPage = useCallback(
    (id, pageInput) => {
      const page = normalizePage({ ...pageInput, id });
      const errors = validateNavigationPage(page, navigationPages, id);
      if (Object.keys(errors).length) return { ok: false, errors };
      setNavigationPages((prev) => prev.map((existing) => (existing.id === id ? page : existing)));
      return { ok: true, page };
    },
    [navigationPages]
  );

  const removeNavigationPage = useCallback((id) => {
    setNavigationPages((prev) => prev.filter((page) => page.id !== id));
  }, []);

  // Voice command processing -------------------------------------------------
  const askAssistant = useCallback(
    async (message) => {
      const defaultHint = () => {
        const names = navigationPages.map((p) => p.name).filter(Boolean);
        return names.length
          ? `I can navigate your app by voice. Try saying: open ${names.slice(0, 3).join(", ")}.`
          : "I'm your voice navigation assistant. Configure navigation pages above and I'll take you anywhere in the app by voice.";
      };

      if (!user?._id || !ServerUrl) return defaultHint();
      try {
        const res = await axios.post(
          `${ServerUrl}/api/assistant/ask`,
          { message, userId: user._id },
          { timeout: 12000, withCredentials: true }
        );
        const data = res?.data;
        if (data?.success && data?.aiResponse) return data.aiResponse;
        if (data?.success && data?.action === "navigate" && isSafeRoute(data.path)) {
          navigateTo(data.path);
          return data.response || "Opening that page.";
        }
        return defaultHint();
      } catch {
        return defaultHint();
      }
    },
    [navigationPages, navigateTo, user]
  );

  const processCommand = useCallback(
    async (rawText) => {
      const text = String(rawText || "").trim();
      if (!text) return "";
      pushMessage({ role: "user", content: text });
      setIsProcessing(true);
      setError(null);
      try {
        const clean = normalizeText(text);
        let reply;
        if (isNavigationCommand(clean)) {
          const match = matchNavigationCommand(text, navigationPages);
          if (match.type === "match") {
            if (match.page.path === location.pathname) {
              reply = `You are already on the ${match.page.name} page.`;
            } else {
              const nav = navigateTo(match.page.path);
              reply = nav.ok
                ? `Opening the ${match.page.name} page.`
                : nav.reason === "unsafe"
                  ? "That route was rejected for safety reasons."
                  : `You are already on the ${match.page.name} page.`;
            }
          } else if (match.type === "ambiguous") {
            const names = match.pages.map((p) => p.name).join(", ");
            reply = `I found several pages that could match: ${names}. Could you tell me which one you'd like to open?`;
          } else {
            reply = "I couldn't find a configured page matching that request.";
          }
        } else {
          reply = await askAssistant(text);
        }
        pushMessage({ role: "assistant", content: reply });
        return reply;
      } catch (err) {
        const reply = "Sorry, I ran into an error while processing that.";
        pushMessage({ role: "assistant", content: reply });
        setError(err?.message || "assistant error");
        return reply;
      } finally {
        setIsProcessing(false);
      }
    },
    [navigationPages, location.pathname, navigateTo, pushMessage, askAssistant]
  );
const value = useMemo(
    () => ({
      navigationPages,
      assistantName,
      addNavigationPage,
      updateNavigationPage,
      removeNavigationPage,
      validateNavigationPage,
      currentPath,
      navigateTo,
      isOpen,
      isMinimized,
      messages,
      isProcessing,
      isListening,
      speechSupported,
      error,
      setSpeechSupported,
      open,
      close,
      toggleOpen,
      minimize,
      maximize,
      setListening,
      clearConversation,
      processCommand,
    }),
    [
      navigationPages,
      assistantName,
      addNavigationPage,
      updateNavigationPage,
      removeNavigationPage,
      currentPath,
      navigateTo,
      isOpen,
      isMinimized,
      messages,
      isProcessing,
      isListening,
      speechSupported,
      error,
      open,
      close,
      toggleOpen,
      minimize,
      maximize,
      setListening,
      setSpeechSupported,
      processCommand,
      clearConversation,
    ]
  );

  return (
    <AssistantContext.Provider value={value}>{children}</AssistantContext.Provider>
  );
}

export const useAssistant = () => {
  const context = useContext(AssistantContext);
  if (!context) {
    throw new Error("useAssistant must be used within an AssistantProvider");
  }
  return context;
};
/**
 * Reusable Web Speech API (SpeechRecognition) hook.
 *
 * Guarantees:
 * - A single recognition instance at a time (calling `start` while listening
 *   safely aborts the previous one -> prevents duplicate microphone listeners).
 * - Speech recognition is stopped/aborted cleanly when the hook unmounts.
 * - Graceful handling when the browser does not support the API.
 */
import { useCallback, useEffect, useRef, useState } from "react";

const getSpeechRecognition = () => {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
};

export function useSpeechRecognition({ onResult, onStart, onEnd, onError } = {}) {
  const handlersRef = useRef({ onResult, onStart, onEnd, onError });
  const recognitionRef = useRef(null);
  const [listening, setListening] = useState(false);
  const [supported] = useState(() => Boolean(getSpeechRecognition()));

  // Keep the latest handlers without re-creating the recognition instance.
  useEffect(() => {
    handlersRef.current = { onResult, onStart, onEnd, onError };
  }, [onResult, onStart, onEnd, onError]);

  const stop = useCallback(() => {
    const recognition = recognitionRef.current;
    if (recognition) {
      try {
        recognition.onresult = null;
        recognition.onend = null;
        recognition.onerror = null;
      } catch {
        /* ignore */
      }
      try {
        recognition.abort();
      } catch {
        /* ignore */
      }
      try {
        recognition.stop();
      } catch {
        /* ignore */
      }
      recognitionRef.current = null;
    }
    setListening(false);
  }, []);

  const start = useCallback(() => {
    const Recognition = getSpeechRecognition();
    if (!Recognition) return;

    // Abort any existing recognition so there is never more than one
    // microphone listener attached at a time.
    stop();

    const recognition = new Recognition();
    recognitionRef.current = recognition;
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setListening(true);
      handlersRef.current.onStart?.();
    };
    recognition.onresult = (event) => {
      const transcript = event?.results?.[0]?.[0]?.transcript || "";
      handlersRef.current.onResult?.(transcript);
    };
    recognition.onend = () => {
      setListening(false);
      handlersRef.current.onEnd?.();
    };
    recognition.onerror = (event) => {
      setListening(false);
      handlersRef.current.onError?.(event?.error);
    };

    try {
      recognition.start();
    } catch (error) {
      setListening(false);
      handlersRef.current.onError?.(error);
    }
  }, [stop]);

  // Stop recognition cleanly when the component unmounts.
  useEffect(() => stop, [stop]);

  return { supported, listening, start, stop };
}
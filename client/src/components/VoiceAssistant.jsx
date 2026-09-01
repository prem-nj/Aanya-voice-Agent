import { useCallback, useEffect, useRef, useState } from "react";
import {
  FiChevronDown,
  FiMic,
  FiMicOff,
  FiMinus,
  FiRotateCcw,
  FiSend,
  FiX,
} from "react-icons/fi";
import { useAssistant } from "../context/AssistantContext";
import { useSpeechRecognition } from "../hooks/useSpeechRecognition";

const speak = (text) => {
  if (typeof window === "undefined" || !text) return;
  try {
    window.speechSynthesis?.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 1;
    utterance.pitch = 1;
    window.speechSynthesis?.speak(utterance);
  } catch {
    /* ignore TTS errors */
  }
};

const MESSAGE_STYLE = {
  user: "self-end rounded-2xl rounded-br-md bg-gradient-to-r from-purple-500 to-emerald-500 text-white",
  assistant:
    "self-start rounded-2xl rounded-bl-md border border-orange-100 bg-white text-gray-700",
};

export default function VoiceAssistant() {
  const {
    isOpen,
    isMinimized,
    messages,
    isProcessing,
    toggleOpen,
    close,
    minimize,
    maximize,
    clearConversation,
    setListening,
    setSpeechSupported,
    processCommand,
  } = useAssistant();
  const [input, setInput] = useState("");
  const messagesRef = useRef(null);
  const inputRef = useRef(null);

  const handleCommand = useCallback(
    async (rawText) => {
      const text = String(rawText || "").trim();
      if (!text) return;
      setInput("");
      const reply = await processCommand(text);
      if (reply) speak(reply);
    },
    [processCommand]
  );

  const { supported, listening, start, stop } = useSpeechRecognition({
    onStart: () => setListening(true),
    onResult: handleCommand,
    onEnd: () => setListening(false),
    onError: () => setListening(false),
  });

  useEffect(() => {
    setSpeechSupported(supported);
  }, [supported, setSpeechSupported]);

  const toggleMic = () => (listening ? stop() : start());

  useEffect(() => {
    const el = messagesRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, isOpen, isMinimized]);

  useEffect(() => {
    if (isOpen && !isMinimized) inputRef.current?.focus();
  }, [isOpen, isMinimized]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (event) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, close]);

  const send = (event) => {
    event.preventDefault();
    handleCommand(input);
  };

  return (
    <>
      <button
        type="button"
        onClick={toggleOpen}
        aria-label={isOpen ? "Close Anaya AI voice assistant" : "Open Anaya AI voice assistant"}
        aria-expanded={isOpen}
        className="fixed bottom-4 right-4 z-50 flex h-14 w-14 cursor-pointer items-center justify-center rounded-full bg-gradient-to-r from-purple-500 to-emerald-500 text-white shadow-[0_10px_30px_rgba(139,92,246,0.4)] transition-transform hover:scale-105"
      >
        {isOpen ? <FiX size={22} /> : <FiMic size={24} />}
        {!isOpen && (
          <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full bg-emerald-400 ring-2 ring-white" />
        )}
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-label="Anaya AI voice assistant"
          className="fixed bottom-20 right-4 z-50 flex max-h-[75vh] w-[calc(100vw-2rem)] max-w-[380px] flex-col overflow-hidden rounded-3xl border border-orange-100 bg-white shadow-[0_20px_60px_rgba(0,0,0,0.18)]"
        >
          <div className="flex items-center justify-between gap-2 border-b border-orange-100 px-4 py-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="relative flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-purple-500 to-emerald-500">
                <span className="text-sm font-bold text-white">A</span>
                {listening && (
                  <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400" />
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold leading-tight text-gray-800">Anaya AI</p>
                <p className="truncate text-[11px] leading-none text-gray-400">
                  {listening ? "Listening..." : isProcessing ? "Thinking..." : "Voice navigation assistant"}
                </p>
              </div>
            </div>
            <div className="flex flex-shrink-0 items-center gap-0.5">
              <button
                type="button"
                onClick={isMinimized ? maximize : minimize}
                aria-label={isMinimized ? "Expand" : "Minimize assistant"}
                className="cursor-pointer rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100"
              >
                {isMinimized ? <FiChevronDown size={16} /> : <FiMinus size={16} />}
              </button>
              <button
                type="button"
                onClick={clearConversation}
                aria-label="Clear conversation"
                title="Clear conversation"
                className="cursor-pointer rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100"
              >
                <FiRotateCcw size={16} />
              </button>
              <button
                type="button"
                onClick={close}
                aria-label="Close assistant"
                className="cursor-pointer rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100"
              >
                <FiX size={16} />
              </button>
            </div>
          </div>

          {isMinimized ? null : (
            <>
              <div ref={messagesRef} className="max-h-72 flex-1 space-y-3 overflow-y-auto bg-[#f8fafc] px-4 py-4">
                {messages.length === 0 ? (
                  <div className="py-6 text-center text-sm text-gray-400">
                    Try saying {"\u201C"}go to the dashboard{"\u201D"} or {"\u201C"}open customers{"\u201D"}.
                  </div>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      className={`max-w-[85%] px-3 py-2 text-sm leading-relaxed shadow-sm ${
                        MESSAGE_STYLE[message.role] || MESSAGE_STYLE.assistant
                      }`}
                    >
                      {message.content}
                    </div>
                  ))
                )}
                {isProcessing && (
                  <div className="flex items-center gap-1 self-start px-2 pt-1">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-gray-300" />
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-gray-300 [animation-delay:150ms]" />
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-gray-300 [animation-delay:300ms]" />
                  </div>
                )}
              </div>

              <form onSubmit={send} className="flex items-center gap-2 border-t border-orange-100 px-3 py-3">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder={supported ? "Type or speak a command…" : "Type a command…"}
                  aria-label="Command for Anaya AI"
                  className="min-w-0 flex-1 rounded-full border border-orange-100 bg-[#f8fafc] px-4 py-2 text-sm outline-none transition-colors focus:border-purple-300"
                />
                {supported ? (
                  <button
                    type="button"
                    onClick={toggleMic}
                    aria-label={listening ? "Stop listening" : "Start listening"}
                    className={`flex h-10 w-10 cursor-pointer items-center justify-center rounded-full transition-colors ${
                      listening ? "bg-emerald-500 text-white" : "bg-purple-50 text-purple-600 hover:bg-purple-100"
                    }`}
                  >
                    {listening ? <span className="h-3 w-3 animate-ping rounded-full bg-white" /> : <FiMic size={18} />}
                  </button>
                ) : (
                  <span title="Speech recognition not supported in this browser" className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-300">
                    <FiMicOff size={18} />
                  </span>
                )}
                <button
                  type="submit"
                  aria-label="Send"
                  disabled={!input.trim() || isProcessing}
                  className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-gradient-to-r from-purple-500 to-emerald-500 text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <FiSend size={17} />
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </>
  );
}
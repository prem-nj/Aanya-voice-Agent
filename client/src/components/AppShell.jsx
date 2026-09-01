/**
 * AppShell: the highest shared layout for authenticated pages.
 *
 * Wraps the Navbar, the routed page content and the globally-mounted voice
 * assistant in a single AssistantProvider. Because the assistant lives here,
 * exactly one instance is mounted for the whole session - it persists across
 * internal route changes and preserves its open/minimized + conversation state.
 */
import Navbar from "./Navbar";
import VoiceAssistant from "./VoiceAssistant";
import { AssistantProvider } from "../context/AssistantContext";

export default function AppShell({ user, setUser, children }) {
  return (
    <AssistantProvider user={user}>
      <Navbar setUser={setUser} user={user} />
      {children}
      <VoiceAssistant />
    </AssistantProvider>
  );
}
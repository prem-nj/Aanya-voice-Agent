/**
 * AppShell: the highest shared layout for authenticated pages.
 *
 * Wraps the Navbar and the routed page content in a single AssistantProvider
 * (used by the Builder page for navigation-page configuration).
 */
import Navbar from "./Navbar";
import { AssistantProvider } from "../context/AssistantContext";

export default function AppShell({ user, setUser, children }) {
  return (
    <AssistantProvider user={user}>
      <Navbar setUser={setUser} user={user} />
      {children}
    </AssistantProvider>
  );
}
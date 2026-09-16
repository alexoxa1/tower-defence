import type { ReactNode } from "react";
import { isSupabaseConfigured } from "./supabaseClient";
import { useAuth } from "./AuthProvider";
import { LoginScreen } from "./LoginScreen";

function ConfigMessage() {
  return (
    <main className="auth-screen">
      <div className="auth-config">
        <h1>Configuration needed</h1>
        <p>
          Citadel Watch needs Supabase credentials to sign in. Set{" "}
          <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code>{" "}
          in a <code>.env.local</code> file, then restart the dev server.
        </p>
        <p>See <code>.env.example</code> and the Auth section of the README.</p>
      </div>
    </main>
  );
}

export function AuthGate({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  // Vite DEV only. Dead-code-eliminated from production builds.
  const skipAuth =
    import.meta.env.DEV &&
    new URLSearchParams(window.location.search).has("skipAuth");

  if (skipAuth) return <>{children}</>;
  if (!isSupabaseConfigured) return <ConfigMessage />;
  if (loading) {
    return (
      <div className="auth-splash">
        <span className="auth-splash-mark">Citadel Watch</span>
      </div>
    );
  }
  if (!session) return <LoginScreen />;

  return <>{children}</>;
}

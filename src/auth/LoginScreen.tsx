import { useId, useState, type FormEvent } from "react";
import { useAuth } from "./AuthProvider";

export function LoginScreen() {
  const { signIn } = useAuth();
  const emailId = useId();
  const passwordId = useId();
  const errorId = useId();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    const { error: signInError } = await signIn(email, password);
    if (signInError) {
      setError(signInError);
      setSubmitting(false);
    }
  };

  return (
    <main className="auth-screen">
      <form className="auth-card" onSubmit={onSubmit} noValidate>
        <p className="auth-kicker">Citadel Watch</p>
        <h1 className="auth-title">Watch Access</h1>
        <p className="auth-sub">Sign in to command the citadel.</p>

        <div className="auth-field">
          <label htmlFor={emailId}>Email</label>
          <input
            id={emailId}
            type="email"
            name="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={submitting}
          />
        </div>

        <div className="auth-field">
          <label htmlFor={passwordId}>Password</label>
          <input
            id={passwordId}
            type="password"
            name="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={submitting}
            aria-describedby={error ? errorId : undefined}
          />
        </div>

        {error ? (
          <p className="auth-error" id={errorId} role="alert">
            {error}
          </p>
        ) : null}

        <button type="submit" className="auth-submit" disabled={submitting}>
          {submitting ? "Signing in…" : "Enter the Watch"}
        </button>
      </form>
    </main>
  );
}

import { useAuth } from "./AuthProvider";

export function SignOutControl() {
  const { session, signOut } = useAuth();
  const email = session?.user.email;
  if (!email) return null;

  return (
    <div className="auth-topbar">
      <div className="auth-signout">
        <span className="auth-signout-email" title={email}>
          {email}
        </span>
        <button type="button" className="auth-signout-btn" onClick={() => void signOut()}>
          Sign out
        </button>
      </div>
    </div>
  );
}

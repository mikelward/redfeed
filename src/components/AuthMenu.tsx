import { logout } from "../lib/me";
import type { MeState } from "../lib/useMe";

interface Props {
  state: MeState;
}

export default function AuthMenu({ state }: Props) {
  if (state.loading) return null;

  if (!state.me) {
    return (
      <a className="rf-auth-link" href="/api/auth/start" aria-label="log in with Reddit">
        Log in
      </a>
    );
  }

  const onLogout = async () => {
    await logout();
    state.refresh();
  };

  return (
    <div className="rf-auth-menu">
      <span className="rf-auth-name">u/{state.me.name}</span>
      <button onClick={onLogout} aria-label="log out">
        Log out
      </button>
    </div>
  );
}

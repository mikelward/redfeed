import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AuthMenu from "./AuthMenu";
import type { MeState } from "../lib/useMe";

const baseRefresh = vi.fn();
const loadingState: MeState = {
  me: null,
  loading: true,
  error: null,
  refresh: baseRefresh,
};
const loggedOutState: MeState = {
  me: null,
  loading: false,
  error: null,
  refresh: baseRefresh,
};
const loggedInState = (refresh = baseRefresh): MeState => ({
  me: { name: "alice", total_karma: 99, icon_img: null },
  loading: false,
  error: null,
  refresh,
});

describe("AuthMenu", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, status: 204 })));
  });
  afterEach(() => vi.unstubAllGlobals());

  it("renders nothing while loading", () => {
    const { container } = render(<AuthMenu state={loadingState} />);
    expect(container.firstChild).toBe(null);
  });

  it("renders a Log in anchor pointing to /api/auth/start when logged out", () => {
    render(<AuthMenu state={loggedOutState} />);
    const link = screen.getByLabelText("log in with Reddit") as HTMLAnchorElement;
    expect(link.getAttribute("href")).toBe("/api/auth/start");
  });

  it("renders the username and a Log out button when logged in", () => {
    render(<AuthMenu state={loggedInState()} />);
    expect(screen.getByText("u/alice")).toBeInTheDocument();
    expect(screen.getByLabelText("log out")).toBeInTheDocument();
  });

  it("Log out POSTs /api/auth/logout and refreshes", async () => {
    const refresh = vi.fn();
    const user = userEvent.setup();
    render(<AuthMenu state={loggedInState(refresh)} />);
    await user.click(screen.getByLabelText("log out"));
    const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls[0][0]).toBe("/api/auth/logout");
    expect(refresh).toHaveBeenCalled();
  });
});

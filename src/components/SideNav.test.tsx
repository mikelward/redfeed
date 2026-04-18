import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import SideNav from "./SideNav";
import { DISMISSED_KEY } from "../lib/dismissedStore";

function renderDrawer(open = true) {
  const onClose = vi.fn();
  const utils = render(
    <MemoryRouter>
      <SideNav open={open} onClose={onClose} />
    </MemoryRouter>,
  );
  return { onClose, ...utils };
}

describe("SideNav", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 401, json: async () => ({}) })),
    );
  });
  afterEach(() => vi.unstubAllGlobals());

  it("renders Home, About, Restore, and Log-in items when open", async () => {
    renderDrawer();
    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute(
      "href",
      "/r/popular",
    );
    expect(screen.getByRole("link", { name: "About" })).toHaveAttribute(
      "href",
      "/about",
    );
    expect(
      screen.getByLabelText("restore all dismissed posts"),
    ).toBeInTheDocument();
    // me probe returned 401 → log-in link visible
    expect(
      await screen.findByLabelText("log in with Reddit"),
    ).toHaveAttribute("href", "/api/auth/start");
  });

  it("tapping Restore clears dismissed store and closes", async () => {
    const user = userEvent.setup();
    localStorage.setItem(
      DISMISSED_KEY,
      JSON.stringify({ t3_x: Date.now() }),
    );
    const { onClose } = renderDrawer();
    await user.click(screen.getByLabelText("restore all dismissed posts"));
    expect(localStorage.getItem(DISMISSED_KEY)).toBe("{}");
    expect(onClose).toHaveBeenCalled();
  });

  it("tapping the overlay fires onClose", async () => {
    const user = userEvent.setup();
    const { onClose, container } = renderDrawer();
    const overlay = container.querySelector('[aria-hidden="true"]');
    expect(overlay).toBeInTheDocument();
    await user.click(overlay!);
    expect(onClose).toHaveBeenCalled();
  });

  it("Escape key fires onClose when open", async () => {
    const { onClose } = renderDrawer();
    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalled();
  });

  it("does not hook Escape when closed", async () => {
    const { onClose } = renderDrawer(false);
    await userEvent.keyboard("{Escape}");
    expect(onClose).not.toHaveBeenCalled();
  });

  it("shows username and Log-out when me returns 200", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({ name: "alice", total_karma: 1 }),
      })),
    );
    renderDrawer();
    expect(await screen.findByText(/u\/alice/)).toBeInTheDocument();
    expect(screen.getByLabelText("log out")).toBeInTheDocument();
  });
});

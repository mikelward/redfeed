import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import AboutPage from "./AboutPage";

function renderAbout() {
  return render(
    <MemoryRouter initialEntries={["/about"]}>
      <Routes>
        <Route path="/about" element={<AboutPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("AboutPage", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 401, json: async () => ({}) })),
    );
  });
  afterEach(() => vi.unstubAllGlobals());

  it("names the site as an unofficial reader", () => {
    renderAbout();
    expect(screen.getByText(/unofficial/i)).toBeInTheDocument();
    expect(screen.getByText(/reader for Reddit/i)).toBeInTheDocument();
  });

  it("lists each OAuth scope with a reason", () => {
    renderAbout();
    for (const scope of ["identity", "read", "vote", "submit", "save", "history"]) {
      expect(screen.getByText(scope)).toBeInTheDocument();
    }
  });

  it("explains how reads and writes use the Reddit API", () => {
    renderAbout();
    expect(screen.getByText(/User-Agent/)).toBeInTheDocument();
    expect(screen.getByText(/oauth\.reddit\.com/)).toBeInTheDocument();
  });

  it("opens the side nav when the hamburger is tapped", async () => {
    const user = userEvent.setup();
    renderAbout();
    await user.click(screen.getByLabelText("open menu"));
    expect(screen.getByRole("dialog", { name: "site menu" })).toBeInTheDocument();
  });

  it("brand in the header links to home", () => {
    renderAbout();
    expect(screen.getByRole("link", { name: "Redfeed home" })).toHaveAttribute(
      "href",
      "/r/popular",
    );
  });

  it("footer offers an in-app link back to the feed instead of the browser back button", () => {
    renderAbout();
    expect(screen.queryByText(/browser.{0,5}back button/i)).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /returning to the feed/i }),
    ).toHaveAttribute("href", "/r/popular");
  });
});

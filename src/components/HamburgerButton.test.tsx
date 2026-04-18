import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import HamburgerButton from "./HamburgerButton";

describe("HamburgerButton", () => {
  it("calls onClick when tapped", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(<HamburgerButton onClick={onClick} />);
    await user.click(screen.getByLabelText("open menu"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("renders the ☰ trigram glyph", () => {
    render(<HamburgerButton onClick={() => {}} />);
    expect(screen.getByLabelText("open menu").textContent).toBe("☰");
  });
});

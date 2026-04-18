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

  it("renders three evenly-spaced bars with identical geometry", () => {
    const { container } = render(<HamburgerButton onClick={() => {}} />);
    const rects = container.querySelectorAll("svg rect");
    expect(rects).toHaveLength(3);
    const widths = Array.from(rects).map((r) => r.getAttribute("width"));
    const heights = Array.from(rects).map((r) => r.getAttribute("height"));
    const fills = Array.from(rects).map((r) => r.getAttribute("fill"));
    expect(new Set(widths).size).toBe(1);
    expect(new Set(heights).size).toBe(1);
    expect(new Set(fills).size).toBe(1);

    const ys = Array.from(rects).map((r) => Number(r.getAttribute("y")));
    const h = Number(heights[0]);
    const gap1 = ys[1] - (ys[0] + h);
    const gap2 = ys[2] - (ys[1] + h);
    expect(gap1).toBe(gap2);
  });
});

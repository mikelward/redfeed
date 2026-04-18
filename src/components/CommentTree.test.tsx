import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CommentTree from "./CommentTree";
import type { RedditComment, RedditMore } from "../lib/reddit";

function makeComment(overrides: Partial<RedditComment> = {}): RedditComment {
  return {
    id: "c1",
    name: "t1_c1",
    author: "alice",
    body: "Hello world",
    body_html: "&lt;p&gt;Hello world&lt;/p&gt;",
    score: 3,
    created_utc: Math.floor(Date.now() / 1000) - 60,
    depth: 0,
    permalink: "/r/x/comments/abc/_/c1",
    replies: "",
    ...overrides,
  };
}

describe("CommentTree", () => {
  it("renders a comment with author and body", () => {
    render(
      <CommentTree
        items={[{ kind: "t1", data: makeComment() }]}
      />,
    );
    expect(screen.getByText("alice")).toBeInTheDocument();
    expect(screen.getByText("Hello world")).toBeInTheDocument();
  });

  it("collapses the body on tap and expands again", async () => {
    const user = userEvent.setup();
    render(
      <CommentTree items={[{ kind: "t1", data: makeComment() }]} />,
    );
    const btn = screen.getByRole("button", { name: /alice/ });
    expect(btn).toHaveAttribute("aria-expanded", "true");
    await user.click(btn);
    expect(btn).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("Hello world")).not.toBeInTheDocument();
    await user.click(btn);
    expect(screen.getByText("Hello world")).toBeInTheDocument();
  });

  it("renders nested replies recursively (collapsed by default)", async () => {
    const user = userEvent.setup();
    const reply = makeComment({
      id: "c2",
      name: "t1_c2",
      author: "bob",
      body_html: "&lt;p&gt;reply text&lt;/p&gt;",
      depth: 1,
    });
    const parent = makeComment({
      replies: {
        kind: "Listing",
        data: {
          after: null,
          before: null,
          children: [{ kind: "t1", data: reply }],
        },
      },
    });
    render(<CommentTree items={[{ kind: "t1", data: parent }]} />);
    // Top-level still expanded; reply header visible but its body hidden.
    expect(screen.getByText("bob")).toBeInTheDocument();
    expect(screen.queryByText("reply text")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /bob/ }));
    expect(screen.getByText("reply text")).toBeInTheDocument();
  });

  it("shows a +N replies hint on collapsed nested comments", () => {
    const reply = makeComment({
      id: "c2",
      name: "t1_c2",
      author: "bob",
      depth: 1,
      replies: {
        kind: "Listing",
        data: {
          after: null,
          before: null,
          children: [
            {
              kind: "t1",
              data: makeComment({ id: "c3", name: "t1_c3", depth: 2 }),
            },
            {
              kind: "t1",
              data: makeComment({ id: "c4", name: "t1_c4", depth: 2 }),
            },
          ],
        },
      },
    });
    const parent = makeComment({
      replies: {
        kind: "Listing",
        data: {
          after: null,
          before: null,
          children: [{ kind: "t1", data: reply }],
        },
      },
    });
    render(<CommentTree items={[{ kind: "t1", data: parent }]} />);
    expect(screen.getByText(/\+2 replies/)).toBeInTheDocument();
  });

  it('renders a "more" node with the count', () => {
    const more: RedditMore = {
      id: "_m",
      name: "t1__m",
      count: 5,
      depth: 0,
      parent_id: "t3_abc",
      children: ["x", "y"],
    };
    render(<CommentTree items={[{ kind: "more", data: more }]} />);
    expect(screen.getByText(/5 more replies/)).toBeInTheDocument();
  });

  it("collapses top-level comments below the score threshold", () => {
    render(
      <CommentTree
        items={[
          {
            kind: "t1",
            data: makeComment({ score: 0, body_html: "&lt;p&gt;hidden text&lt;/p&gt;" }),
          },
        ]}
      />,
    );
    expect(screen.queryByText("hidden text")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /alice/ })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  it("renders a low-score marker on the collapsed header", () => {
    const { container } = render(
      <CommentTree
        items={[
          { kind: "t1", data: makeComment({ score: -3 }) },
        ]}
      />,
    );
    expect(
      container.querySelector('[data-low-score="true"]'),
    ).toBeInTheDocument();
  });

  it("keeps positive-score top-level comments expanded", () => {
    render(
      <CommentTree
        items={[
          {
            kind: "t1",
            data: makeComment({ score: 5, body_html: "&lt;p&gt;visible text&lt;/p&gt;" }),
          },
        ]}
      />,
    );
    expect(screen.getByText("visible text")).toBeInTheDocument();
  });

  it("renders [deleted] for deleted comments without body HTML", () => {
    render(
      <CommentTree
        items={[
          {
            kind: "t1",
            data: makeComment({
              author: "[deleted]",
              body: "[deleted]",
              body_html: null,
            }),
          },
        ]}
      />,
    );
    expect(screen.getAllByText("[deleted]").length).toBeGreaterThan(0);
  });
});

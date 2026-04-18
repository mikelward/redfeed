import { useState } from "react";
import HamburgerButton from "../components/HamburgerButton";
import SideNav from "../components/SideNav";
import styles from "./AboutPage.module.css";

const SCOPES: Array<[string, string]> = [
  ["identity", "Shows your username and karma in the header."],
  ["read", "Reads subscriber-only and age-gated content you already have access to."],
  ["vote", "Submits up/down votes from the feed and thread views."],
  ["submit", "Posts top-level comments and replies (no link/post submissions)."],
  ["save", "Saves posts and comments to your Reddit saved list."],
  ["history", "Reads your own comment and post history."],
];

export default function AboutPage() {
  const [navOpen, setNavOpen] = useState(false);
  return (
    <>
      <header className="rf-header">
        <HamburgerButton onClick={() => setNavOpen(true)} />
        <span className="rf-brand">Redfeed</span>
        <span className="rf-feed-name">About</span>
      </header>
      <main>
        <article className={styles.page}>
          <h1>About Redfeed</h1>
          <p>
            Redfeed is an <strong>unofficial, mobile-friendly reader for Reddit</strong>,
            maintained as a personal project. It is not affiliated with,
            endorsed by, or sponsored by Reddit, Inc. &quot;Reddit&quot;, the
            Reddit logo, and the alien mascot are trademarks of Reddit, Inc.
          </p>

          <h2>What it does</h2>
          <p>
            Redfeed renders Reddit&apos;s public feeds and comment threads in a
            cleaner, thumb-friendlier layout than the mobile web experience:
          </p>
          <ul>
            <li>
              <strong>Fewer, larger tap targets per row.</strong> A post has at
              most three: the upvote (when logged in), the title or image, and
              the comments button.
            </li>
            <li>
              <strong>RSS-reader-style auto-dismiss.</strong> A post that
              scrolls past the top of the viewport is removed from the feed
              so returning readers see only what&apos;s new. An Undo toast
              covers accidental dismissals.
            </li>
          </ul>

          <h2>How it uses the Reddit API</h2>
          <p>
            All data comes from Reddit&apos;s official APIs. Redfeed does not
            scrape HTML and does not store Reddit content in a database.
          </p>
          <ul>
            <li>
              <strong>Reads</strong> go through a serverless proxy on this
              site (<code>/api/feed</code>, <code>/api/thread</code>) that
              attaches a descriptive <code>User-Agent</code>, as required by
              Reddit&apos;s API policy, and an app-only OAuth token. Requests
              are sent to <code>https://oauth.reddit.com</code>.
            </li>
            <li>
              <strong>Writes</strong> (voting, commenting, saving) go through
              the same serverless layer with your own user-level OAuth token
              attached, never with ours.
            </li>
            <li>
              Your browser never sees or stores a Reddit OAuth token.
            </li>
          </ul>

          <h2>Permissions</h2>
          <p>
            Logging in is optional. It is only required to vote, comment, or
            save. When you tap <strong>Log in</strong>, Reddit asks you to
            approve these OAuth scopes:
          </p>
          <table className={styles.scopes}>
            <thead>
              <tr>
                <th>Scope</th>
                <th>Why Redfeed asks</th>
              </tr>
            </thead>
            <tbody>
              {SCOPES.map(([scope, reason]) => (
                <tr key={scope}>
                  <td>{scope}</td>
                  <td>{reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p>
            Your Reddit <strong>access</strong> and <strong>refresh</strong>
            {" "}tokens live in HTTP-only, Secure, <code>SameSite=Lax</code>{" "}
            cookies on this site&apos;s origin. Client-side JavaScript cannot
            read them. Tapping <strong>Log out</strong> revokes the refresh
            token at Reddit and clears both cookies.
          </p>

          <h2>What&apos;s stored in your browser</h2>
          <ul>
            <li>
              <code>rf.dismissed.v1</code> (localStorage): the list of posts
              you&apos;ve auto-dismissed, with a 7-day TTL.
            </li>
            <li>
              <code>rf_access</code>, <code>rf_refresh</code>,{" "}
              <code>rf_oauth_state</code> (cookies): set only when you choose
              to log in.
            </li>
          </ul>
          <p>
            Redfeed runs no third-party analytics, no advertising SDKs, and
            no tracking beyond what Reddit itself sees when serving the
            content you request.
          </p>

          <h2>Source and contact</h2>
          <p>
            Redfeed is a non-commercial personal project. The source lives at{" "}
            <a
              href="https://github.com/mikelward/redfeed"
              target="_blank"
              rel="noopener noreferrer"
            >
              github.com/mikelward/redfeed
            </a>
            .
          </p>

          <p className={styles.footer}>
            If you are viewing this through Redfeed, you can dismiss this
            page by tapping the menu icon and choosing Home, or by using
            your browser&apos;s back button.
          </p>
        </article>
      </main>
      <SideNav open={navOpen} onClose={() => setNavOpen(false)} />
    </>
  );
}

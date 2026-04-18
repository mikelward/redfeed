import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { logout } from "../lib/me";
import { useMe } from "../lib/useMe";
import { useDismissedStories } from "../lib/useDismissedStories";
import styles from "./SideNav.module.css";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function SideNav({ open, onClose }: Props) {
  const meState = useMe();
  const dismissedStore = useDismissedStories();
  const drawerRef = useRef<HTMLElement>(null);
  const openerRef = useRef<Element | null>(null);

  useEffect(() => {
    if (!open) return;
    openerRef.current = document.activeElement;
    drawerRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      if (openerRef.current instanceof HTMLElement) openerRef.current.focus();
    };
  }, [open, onClose]);

  const onRestoreAll = () => {
    dismissedStore.clearAll();
    onClose();
  };

  const onLogout = async () => {
    await logout();
    meState.refresh();
    onClose();
  };

  return (
    <>
      <div
        className={`${styles.overlay} ${open ? styles.open : ""}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        ref={drawerRef}
        className={`${styles.drawer} ${open ? styles.open : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="site menu"
        tabIndex={-1}
        aria-hidden={!open}
      >
        <div className={styles.header}>
          <span className={styles.brand}>Redfeed</span>
          <button
            type="button"
            className={styles.close}
            onClick={onClose}
            aria-label="close menu"
          >
            ×
          </button>
        </div>
        <nav className={styles.nav}>
          <div className={styles.section}>
            <Link className={styles.item} to="/r/popular" onClick={onClose}>
              Home
            </Link>
            <Link className={styles.item} to="/about" onClick={onClose}>
              About
            </Link>
          </div>
          <div className={styles.section}>
            <button
              type="button"
              className={styles.item}
              onClick={onRestoreAll}
              aria-label="restore all dismissed posts"
            >
              Restore dismissed posts
            </button>
          </div>
          <div className={styles.section}>
            {meState.loading ? null : meState.me ? (
              <>
                <div className={styles.userRow}>
                  Signed in as <strong>u/{meState.me.name}</strong>
                </div>
                <button
                  type="button"
                  className={styles.item}
                  onClick={onLogout}
                  aria-label="log out"
                >
                  Log out
                </button>
              </>
            ) : (
              <a
                className={`${styles.item} ${styles.primaryItem}`}
                href="/api/auth/start"
                aria-label="log in with Reddit"
              >
                Log in with Reddit
              </a>
            )}
          </div>
        </nav>
      </aside>
    </>
  );
}

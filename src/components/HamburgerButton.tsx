interface Props {
  onClick: () => void;
  label?: string;
}

export default function HamburgerButton({
  onClick,
  label = "open menu",
}: Props) {
  return (
    <button
      type="button"
      className="rf-hamburger"
      onClick={onClick}
      aria-label={label}
    >
      <svg
        className="rf-hamburger-icon"
        width="22"
        height="16"
        viewBox="0 0 22 16"
        aria-hidden="true"
        focusable="false"
        shapeRendering="crispEdges"
      >
        <rect x="0" y="0" width="22" height="2" rx="1" fill="currentColor" />
        <rect x="0" y="7" width="22" height="2" rx="1" fill="currentColor" />
        <rect x="0" y="14" width="22" height="2" rx="1" fill="currentColor" />
      </svg>
    </button>
  );
}

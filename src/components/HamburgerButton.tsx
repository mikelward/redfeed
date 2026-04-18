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
      <span aria-hidden="true" />
      <span aria-hidden="true" />
      <span aria-hidden="true" />
    </button>
  );
}

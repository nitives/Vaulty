interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export function Toggle({ checked, onChange, disabled = false }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      tabIndex={0}
      onClick={() => onChange(!checked)}
      className={`toggle-track relative inline-block flex-shrink-0 cursor-pointer select-none ${
        checked ? "toggle-track-on" : ""
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
    />
  );
}

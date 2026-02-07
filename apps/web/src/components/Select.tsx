interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  disabled?: boolean;
}

export function Select({
  value,
  onChange,
  options,
  disabled = false,
}: SelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="rounded-lg border border-neutral-300 bg-white px-1.5 py-1.5 text-sm text-neutral-900 transition-colors dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-100 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

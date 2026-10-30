"use client";

/** Interruptor liga/desliga. O verde é o "ligado" em qualquer tema. */
export default function Switch({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative shrink-0 w-[52px] h-8 rounded-full border transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-wait ${
        checked ? "bg-ok border-ok" : "bg-bg-elevated border-border-default"
      }`}
    >
      <span
        aria-hidden="true"
        className={`absolute top-[3px] left-[3px] w-6 h-6 rounded-full transition-transform ${checked ? "translate-x-5 bg-bg-primary" : "translate-x-0 bg-text-muted"}`}
      />
    </button>
  );
}

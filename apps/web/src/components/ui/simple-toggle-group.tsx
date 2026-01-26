"use client";

interface SimpleToggleGroupProps<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

export function SimpleToggleGroup<T extends string>({
  options,
  value,
  onChange,
  className = "mx-6 my-4",
}: SimpleToggleGroupProps<T>) {
  return (
    <div className={`flex rounded-lg overflow-hidden border border-border ${className}`}>
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={`flex-1 py-2 px-4 text-sm font-medium transition-colors ${
            value === option.value
              ? "bg-primary text-primary-foreground"
              : "bg-muted hover:bg-muted/80"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

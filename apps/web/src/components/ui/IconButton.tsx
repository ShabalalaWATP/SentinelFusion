import type { ButtonHTMLAttributes, ReactNode } from "react";

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  children: ReactNode;
  active?: boolean;
};

export function IconButton({
  label,
  children,
  active = false,
  className = "",
  ...props
}: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`grid h-10 w-10 place-items-center rounded-md border text-slate-300 transition hover:border-cyan-300/60 hover:text-cyan-100 focus:outline-none focus:ring-2 focus:ring-cyan-300/60 ${
        active
          ? "border-cyan-300/[0.60] bg-cyan-300/[0.12] text-cyan-100"
          : "border-slate-500/[0.18] bg-slate-950/[0.30]"
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

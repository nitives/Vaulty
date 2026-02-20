import { ButtonHTMLAttributes } from "react";
import clsx from "clsx";
import { buttonStyles } from "@/styles/Button";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "base" | "primary" | "danger";
}

export function Button({
  variant = "base",
  className,
  children,
  ...props
}: ButtonProps) {
  // `buttonStyles` has base, primary, danger which map to variant
  let styleClass = buttonStyles.base;

  if (variant === "primary") {
    styleClass = buttonStyles.primary;
  } else if (variant === "danger") {
    styleClass = buttonStyles.danger;
  }

  return (
    <button className={clsx(styleClass, className)} {...props}>
      {children}
    </button>
  );
}

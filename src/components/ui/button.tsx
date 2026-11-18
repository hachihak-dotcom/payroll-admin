import { Slot } from "@radix-ui/react-slot";
import { clsx } from "clsx";
import type { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean; variant?: "primary" | "outline" | "plain" };
export function Button({ asChild, variant = "primary", className, type = "button", ...props }: Props) {
  const Component = asChild ? Slot : "button";
  return <Component type={asChild ? undefined : type} className={clsx("button", `button-${variant}`, className)} {...props} />;
}

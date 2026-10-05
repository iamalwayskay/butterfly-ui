import { LoaderCircle, type LucideIcon } from "lucide-react";
import {
  cloneElement,
  createElement,
  forwardRef,
  isValidElement,
  type ButtonHTMLAttributes,
  type ReactElement,
  type ReactNode,
} from "react";
import { Slot, Tooltip } from "radix-ui";
import { cn } from "@/lib/utils";

export type ButtonVariant =
  | "primary"
  | "default"
  | "outline"
  | "secondary"
  | "quiet"
  | "ghost"
  | "destructive";
export type ButtonSize =
  | "default"
  | "sm"
  | "lg"
  | "icon"
  | "icon-xs"
  | "icon-sm"
  | "icon-lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  trailingIcon?: ReactNode;
  loading?: boolean;
  asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = "secondary",
      size = "default",
      icon,
      trailingIcon,
      loading = false,
      asChild = false,
      className,
      children,
      disabled,
      type = "button",
      ...props
    },
    ref,
  ) {
    const resolvedVariant =
      variant === "default"
        ? "primary"
        : variant === "ghost"
          ? "quiet"
          : variant;
    if (asChild) {
      const child = isValidElement(children)
        ? (children as ReactElement<{ children?: ReactNode }>)
        : null;
      const content = (
        <>
          {loading ? (
            <LoaderCircle className="bf-button__spinner" aria-hidden="true" />
          ) : icon ? (
            <span className="bf-button__icon" aria-hidden="true">
              {icon}
            </span>
          ) : null}
          <span className="bf-button__label">
            {child?.props.children ?? children}
          </span>
          {!loading && trailingIcon ? (
            <span className="bf-button__icon" aria-hidden="true">
              {trailingIcon}
            </span>
          ) : null}
        </>
      );
      return (
        <Slot.Root
          data-slot="button"
          className={cn(
            "bf-button",
            `bf-button--${resolvedVariant}`,
            `bf-button--${size}`,
            className,
          )}
          aria-busy={loading || undefined}
          {...props}
        >
          {child ? cloneElement(child, undefined, content) : children}
        </Slot.Root>
      );
    }
    return (
      <button
        data-slot="button"
        ref={ref}
        type={type}
        className={cn(
          "bf-button",
          `bf-button--${resolvedVariant}`,
          `bf-button--${size}`,
          className,
        )}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading ? (
          <LoaderCircle className="bf-button__spinner" aria-hidden="true" />
        ) : icon ? (
          <span className="bf-button__icon" aria-hidden="true">
            {icon}
          </span>
        ) : null}
        <span className="bf-button__label">{children}</span>
        {!loading && trailingIcon ? (
          <span className="bf-button__icon" aria-hidden="true">
            {trailingIcon}
          </span>
        ) : null}
      </button>
    );
  },
);

export interface IconButtonProps
  extends Omit<
    ButtonHTMLAttributes<HTMLButtonElement>,
    "children" | "aria-label"
  > {
  label: string;
  icon: ReactNode | LucideIcon;
  variant?: Exclude<ButtonVariant, "primary" | "default">;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton(
    {
      label,
      icon,
      variant = "secondary",
      className,
      type = "button",
      ...props
    },
    ref,
  ) {
    const content = isValidElement(icon)
      ? icon
      : createElement(icon as LucideIcon, { "aria-hidden": true });
    return (
      <Tooltip.Provider delayDuration={300}>
        <Tooltip.Root>
          <Tooltip.Trigger asChild>
      <button
        ref={ref}
        type={type}
        className={cn(
          "bf-icon-button",
          `bf-icon-button--${variant}`,
          className,
        )}
        aria-label={label}
        {...props}
      >
        <span aria-hidden="true">{content}</span>
      </button>
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Content className="bf-icon-tooltip" sideOffset={8} collisionPadding={13}>
              {label}
            </Tooltip.Content>
          </Tooltip.Portal>
        </Tooltip.Root>
      </Tooltip.Provider>
    );
  },
);

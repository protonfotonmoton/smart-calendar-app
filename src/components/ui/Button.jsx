import { forwardRef } from "react";
import "./Button.css";

/**
 * Accessible button component with visual variants.
 * Props: variant ("primary"|"secondary"|"ghost"|"danger"), size ("sm"|"md"), all native <button> props.
 */
export const Button = forwardRef(function Button(
  { variant = "secondary", size = "md", className = "", children, ...rest },
  ref
) {
  const classes = ["ui-button", `ui-button--${variant}`, `ui-button--${size}`, className]
    .filter(Boolean)
    .join(" ");
  return (
    <button ref={ref} className={classes} type={rest.type || "button"} {...rest}>
      {children}
    </button>
  );
});

export default Button;

"use client";

import type { ForwardedRef } from "react";
import { forwardRef } from "react";

import { Button, type ButtonProps } from "../button/button";

/**
 * `ActionButton` is a thin alias around the base `Button` that always
 * carries `isLoading` / `isSuccess` props, making async-action sites
 * (Submit, Register, Save in form, Cancel-with-network) read clearly.
 *
 * Visual behaviour lives entirely on `Button` itself.
 */
export type ActionButtonProps = Omit<ButtonProps, "isLoading" | "isSuccess"> & {
  isLoading?: boolean;
  isSuccess?: boolean;
};

export const ActionButton = forwardRef<HTMLButtonElement, ActionButtonProps>(
  ({ isLoading = false, isSuccess = false, ...rest }, ref: ForwardedRef<HTMLButtonElement>) => (
    <Button
      ref={ref}
      isLoading={isLoading}
      isSuccess={isSuccess}
      {...rest}
    />
  )
);

ActionButton.displayName = "ActionButton";

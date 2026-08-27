"use client";

import { useEffect, useRef, useState, type ComponentPropsWithoutRef } from "react";
import { useFormStatus } from "react-dom";

type Props = Omit<ComponentPropsWithoutRef<"button">, "type" | "disabled"> & {
  pendingLabel?: string;
  savedLabel?: string;
  /** Set false for buttons whose children aren't plain text (e.g. icon + label) — dims/disables instead of swapping content. */
  swapLabel?: boolean;
  /** Fires once, right when the action completes (pending -> not pending) — e.g. to collapse a parent card after the checkmark has had a moment to show. */
  onSettled?: () => void;
};

export default function SubmitButton({
  children,
  className = "",
  pendingLabel = "Saving…",
  savedLabel = "Saved ✓",
  swapLabel = true,
  onSettled,
  ...rest
}: Props) {
  const { pending } = useFormStatus();
  const [justSaved, setJustSaved] = useState(false);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending) {
      setJustSaved(true);
      onSettled?.();
      const timer = setTimeout(() => setJustSaved(false), 1800);
      return () => clearTimeout(timer);
    }
    wasPending.current = pending;
  }, [pending, onSettled]);

  return (
    <button
      type="submit"
      disabled={pending}
      className={`${className} disabled:opacity-60 disabled:active:scale-100`}
      {...rest}
    >
      {swapLabel ? (pending ? pendingLabel : justSaved ? savedLabel : children) : children}
    </button>
  );
}

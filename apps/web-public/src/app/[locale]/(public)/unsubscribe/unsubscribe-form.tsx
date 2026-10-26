"use client";

import { useState } from "react";

interface UnsubscribeFormProps {
  apiBase: string;
  token: string;
  alreadyUnsubscribed: boolean;
  labels: {
    confirmButton: string;
    working: string;
    successTitle: string;
    successBody: string;
    alreadyBody: string;
    errorBody: string;
  };
}

type State = "idle" | "working" | "done" | "already" | "error";

export function UnsubscribeForm({
  apiBase,
  token,
  alreadyUnsubscribed,
  labels,
}: UnsubscribeFormProps): React.ReactNode {
  const [state, setState] = useState<State>(
    alreadyUnsubscribed ? "already" : "idle",
  );

  async function handleClick(): Promise<void> {
    setState("working");
    try {
      const res = await fetch(
        `${apiBase}/api/v1/email/unsubscribe?token=${encodeURIComponent(token)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: "List-Unsubscribe=One-Click",
        },
      );
      if (!res.ok) {
        setState("error");
        return;
      }
      const data = (await res.json()) as { status?: string };
      setState(data.status === "invalid_token" ? "error" : "done");
    } catch {
      setState("error");
    }
  }

  if (state === "done" || state === "already") {
    return (
      <div
        className="rounded-md border border-[var(--border-2)] bg-white p-5 text-sm text-ink-200"
        role="status"
        style={{ lineHeight: "1.65" }}
      >
        <p className="font-semibold text-ink-400">{labels.successTitle}</p>
        <p className="mt-2">
          {state === "already" ? labels.alreadyBody : labels.successBody}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => void handleClick()}
        disabled={state === "working"}
        className="inline-flex h-11 items-center rounded-md bg-ember-400 px-[18px] text-sm font-semibold text-white transition-colors hover:bg-[var(--brand-primary-hover)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ember-400/30 focus-visible:ring-offset-2 focus-visible:ring-offset-bone-100 disabled:opacity-60"
      >
        {state === "working" ? labels.working : labels.confirmButton}
      </button>
      {state === "error" ? (
        <p className="text-sm text-danger" role="alert">
          {labels.errorBody}
        </p>
      ) : null}
    </div>
  );
}

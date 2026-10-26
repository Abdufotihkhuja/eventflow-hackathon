/**
 * `onError` for every organizer mutation: say what went wrong, out loud.
 *
 * Lives next to the toast (which it needs) rather than in `shared/lib`, so the
 * dependency runs ui → lib and never back.
 *
 * The sheet that triggered the save is deliberately NOT closed by this handler:
 * a failed save must leave the typed text where it is. Closing it would throw
 * away the author's work and teach them to distrust the button.
 */
import { useCallback } from "react";

import { useI18n } from "@shared/i18n";
import { haptics } from "@shared/lib/haptics";
import { mutationErrorText } from "@shared/lib/mutation-error";

import { useToast } from "./toast";

export function useMutationError(): (e: unknown) => void {
  const { t, lang } = useI18n();
  const toast = useToast();

  return useCallback(
    (e: unknown) => {
      const { key, detail } = mutationErrorText(e, lang);
      haptics.error();
      // The server's own sentence wins when we have one in the reader's
      // language — it names the field, our copy only names the category.
      toast.show(detail ?? t(key));
    },
    [t, lang, toast],
  );
}

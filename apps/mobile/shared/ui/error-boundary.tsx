/**
 * AppErrorBoundary — top-level crash containment. Without it, any uncaught
 * render error white-screens the whole app with no recovery (FND-06). This
 * catches the error, shows a localized recovery screen, and lets the user retry
 * (re-mount the subtree). Mounted INSIDE the providers so the fallback can use
 * i18n + theme; `componentDidCatch` is the single place to forward crashes to a
 * reporter (FND-19) — no PII, no `console` (keeps the zero-log invariant).
 */
import { Component, type ReactNode } from "react";
import { View } from "react-native";

import { useI18n } from "@shared/i18n";
import { captureException } from "@shared/lib/crash";
import { gutter } from "@shared/theme";

import { Btn } from "./button";
import { StateBlock } from "./primitives";
import { Screen } from "./screen";

function ErrorFallback({ onRetry }: { onRetry: () => void }): React.JSX.Element {
  const { t } = useI18n();
  return (
    <Screen>
      <View style={{ paddingHorizontal: gutter, paddingTop: 12 }}>
        <StateBlock
          icon="alert"
          tone="error"
          title={t("error.boundary.title")}
          body={t("error.boundary.body")}
          action={
            <Btn size="md" variant="secondary" icon="refresh" onPress={onRetry}>
              {t("common.retry")}
            </Btn>
          }
        />
      </View>
    </Screen>
  );
}

interface State {
  hasError: boolean;
}

export class AppErrorBoundary extends Component<{ children: ReactNode }, State> {
  override state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  override componentDidCatch(error: unknown): void {
    captureException(error, { boundary: "app-root" });
  }

  private reset = (): void => this.setState({ hasError: false });

  override render(): ReactNode {
    if (this.state.hasError) return <ErrorFallback onRetry={this.reset} />;
    return this.props.children;
  }
}

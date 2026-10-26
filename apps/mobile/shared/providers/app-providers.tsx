import type { PropsWithChildren } from "react";

import { QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { queryClient } from "@shared/api";
import { AuthProvider } from "@shared/auth";
import { I18nProvider } from "@shared/i18n";
import { RegionProvider } from "@shared/region";

/**
 * Root provider composition — the app "core".
 *
 * Order: SafeArea → React Query (data layer) → i18n → Auth/session. Auth sits
 * innermost so it can read i18n and drive the query cache; the data layer is
 * available to every screen below.
 */
export function AppProviders({ children }: PropsWithChildren): React.JSX.Element {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <I18nProvider>
          <RegionProvider>
            <AuthProvider>{children}</AuthProvider>
          </RegionProvider>
        </I18nProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

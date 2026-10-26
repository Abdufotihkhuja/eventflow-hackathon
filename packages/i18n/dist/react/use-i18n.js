"use client";
import { useI18n } from "./i18n-provider.js";
export { useI18n };
export function useT() {
    const { t } = useI18n();
    return t;
}
//# sourceMappingURL=use-i18n.js.map
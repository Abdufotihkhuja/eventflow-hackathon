import { messages as en } from "./messages/en/index.js";
import { messages as ru } from "./messages/ru/index.js";
import { messages as uz } from "./messages/uz/index.js";

export const messagesByLocale = {
  en,
  ru,
  uz,
} as const;

export { en, ru, uz };

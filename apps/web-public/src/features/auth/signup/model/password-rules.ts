/** Backend-allowed special chars: @$!%*?& */
export const PASSWORD_SPECIAL_CHARS_REGEX = /[@$!%*?&]/;

export const PASSWORD_RULES = {
  length: (value: string): boolean => value.length >= 8,
  lowercase: (value: string): boolean => /[a-z]/.test(value),
  uppercase: (value: string): boolean => /[A-Z]/.test(value),
  number: (value: string): boolean => /[0-9]/.test(value),
  special: (value: string): boolean => PASSWORD_SPECIAL_CHARS_REGEX.test(value),
} as const;

export type PasswordRuleKey = keyof typeof PASSWORD_RULES;

export const PASSWORD_RULE_KEYS: readonly PasswordRuleKey[] = [
  "length",
  "lowercase",
  "uppercase",
  "number",
  "special",
];

export const evaluatePassword = (
  value: string
): Record<PasswordRuleKey, boolean> => ({
  length: PASSWORD_RULES.length(value),
  lowercase: PASSWORD_RULES.lowercase(value),
  uppercase: PASSWORD_RULES.uppercase(value),
  number: PASSWORD_RULES.number(value),
  special: PASSWORD_RULES.special(value),
});

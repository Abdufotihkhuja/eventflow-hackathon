import { readFileSync, readdirSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

type Locale = "en" | "ru" | "uz";
type Severity = "error" | "warning";
type MessageValue = string | number | boolean | null | undefined | MessageTree | MessageValue[];
type MessageTree = { [key: string]: MessageValue };

type Issue = {
  severity: Severity;
  type: string;
  locale: Locale;
  namespace: string;
  keyPath?: string;
  value?: MessageValue;
  message: string;
};

const locales = ["en", "ru", "uz"] as const;
const baseLocale: Locale = "en";
const scriptDir = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(scriptDir, "..");
const messagesRoot = join(packageRoot, "src", "messages");
const keyLikeValuePattern = /^[a-z][a-z0-9]*(?:\.[a-z][a-z0-9]*|[._-][a-zA-Z0-9]+){1,}$/;
const placeholderPattern = /\{([A-Za-z0-9_]+)\}/g;
const cyrillicPattern = /[А-Яа-яЁё]/;

const issues: Issue[] = [];

function addIssue(issue: Issue): void {
  issues.push(issue);
}

function isPlainObject(value: MessageValue): value is MessageTree {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function valueType(value: MessageValue): string {
  if (value === null) {
    return "null";
  }

  if (value === undefined) {
    return "undefined";
  }

  if (Array.isArray(value)) {
    return "array";
  }

  return typeof value;
}

function safeValue(value: MessageValue): string | undefined {
  if (isPlainObject(value)) {
    return undefined;
  }

  const text = JSON.stringify(value);
  if (text === undefined) {
    return "undefined";
  }

  return text.length > 160 ? `${text.slice(0, 157)}...` : text;
}

function getPropertyName(name: ts.PropertyName): string | undefined {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) {
    return name.text;
  }

  return undefined;
}

function unwrapExpression(expression: ts.Expression): ts.Expression {
  let current = expression;

  while (ts.isAsExpression(current) || ts.isSatisfiesExpression(current) || ts.isParenthesizedExpression(current)) {
    current = current.expression;
  }

  return current;
}

function readExpression(expression: ts.Expression, filePath: string): MessageValue {
  const current = unwrapExpression(expression);

  if (ts.isObjectLiteralExpression(current)) {
    const result: MessageTree = {};

    for (const property of current.properties) {
      if (ts.isPropertyAssignment(property)) {
        const name = getPropertyName(property.name);

        if (!name) {
          throw new Error(`Unsupported computed property in ${relative(packageRoot, filePath)}`);
        }

        result[name] = readExpression(property.initializer, filePath);
        continue;
      }

      if (ts.isSpreadAssignment(property)) {
        throw new Error(`Unsupported spread assignment in ${relative(packageRoot, filePath)}`);
      }

      throw new Error(`Unsupported object member in ${relative(packageRoot, filePath)}`);
    }

    return result;
  }

  if (ts.isStringLiteral(current) || ts.isNoSubstitutionTemplateLiteral(current)) {
    return current.text;
  }

  if (ts.isNumericLiteral(current)) {
    return Number(current.text);
  }

  if (current.kind === ts.SyntaxKind.TrueKeyword) {
    return true;
  }

  if (current.kind === ts.SyntaxKind.FalseKeyword) {
    return false;
  }

  if (current.kind === ts.SyntaxKind.NullKeyword) {
    return null;
  }

  if (ts.isIdentifier(current) && current.text === "undefined") {
    return undefined;
  }

  if (ts.isArrayLiteralExpression(current)) {
    return current.elements.map((element) => readExpression(element, filePath));
  }

  throw new Error(`Unsupported expression "${current.getText()}" in ${relative(packageRoot, filePath)}`);
}

function readMessageFile(filePath: string): MessageTree {
  const source = ts.createSourceFile(filePath, readFileSync(filePath, "utf8"), ts.ScriptTarget.Latest, true);

  for (const statement of source.statements) {
    if (!ts.isVariableStatement(statement)) {
      continue;
    }

    const isExported = statement.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword);

    if (!isExported) {
      continue;
    }

    for (const declaration of statement.declarationList.declarations) {
      if (declaration.initializer && ts.isIdentifier(declaration.name)) {
        const value = readExpression(declaration.initializer, filePath);

        if (!isPlainObject(value)) {
          throw new Error(`Top-level export is not an object in ${relative(packageRoot, filePath)}`);
        }

        return value;
      }
    }
  }

  throw new Error(`No exported message object found in ${relative(packageRoot, filePath)}`);
}

function readLocale(locale: Locale): Record<string, MessageTree> {
  const localeDir = join(messagesRoot, locale);
  const namespaceFiles = readdirSync(localeDir)
    .filter((fileName) => fileName.endsWith(".ts") && fileName !== "index.ts")
    .sort();

  return Object.fromEntries(
    namespaceFiles.map((fileName) => [basename(fileName, ".ts"), readMessageFile(join(localeDir, fileName))]),
  );
}

function getPlaceholders(value: string): string[] {
  const placeholders = new Set<string>();
  let match: RegExpExecArray | null;

  while ((match = placeholderPattern.exec(value))) {
    placeholders.add(match[1]);
  }

  return [...placeholders].sort();
}

function comparePlaceholders(left: string, right: string): boolean {
  const leftPlaceholders = getPlaceholders(left);
  const rightPlaceholders = getPlaceholders(right);

  return (
    leftPlaceholders.length === rightPlaceholders.length &&
    leftPlaceholders.every((placeholder, index) => placeholder === rightPlaceholders[index])
  );
}

function inspectValue(locale: Locale, namespace: string, keyPath: string, value: MessageValue): void {
  if (value === null || value === undefined) {
    addIssue({
      severity: "error",
      type: "nullish-value",
      locale,
      namespace,
      keyPath,
      value,
      message: "Translation value must not be null or undefined.",
    });
    return;
  }

  if (typeof value !== "string") {
    if (!isPlainObject(value)) {
      addIssue({
        severity: "error",
        type: "invalid-type",
        locale,
        namespace,
        keyPath,
        value,
        message: `Translation value must be a string or object, got ${valueType(value)}.`,
      });
    }

    return;
  }

  if (value.trim().length === 0) {
    addIssue({
      severity: "error",
      type: "empty-value",
      locale,
      namespace,
      keyPath,
      value,
      message: "Translation value must not be empty.",
    });
  }

  if (keyLikeValuePattern.test(value)) {
    addIssue({
      severity: "warning",
      type: "raw-key-like-value",
      locale,
      namespace,
      keyPath,
      value,
      message: "Translation value looks like a raw translation key.",
    });
  }

  if (locale === "uz" && cyrillicPattern.test(value)) {
    addIssue({
      severity: "warning",
      type: "uzbek-cyrillic",
      locale,
      namespace,
      keyPath,
      value,
      message: "Uzbek translations should use Latin script.",
    });
  }
}

function inspectTree(locale: Locale, namespace: string, tree: MessageTree, keyPath = ""): void {
  for (const [key, value] of Object.entries(tree)) {
    const nextPath = keyPath ? `${keyPath}.${key}` : key;

    inspectValue(locale, namespace, nextPath, value);

    if (isPlainObject(value)) {
      inspectTree(locale, namespace, value, nextPath);
    }
  }
}

function compareTree(
  locale: Locale,
  namespace: string,
  baseTree: MessageTree,
  candidateTree: MessageTree,
  keyPath = "",
): void {
  for (const [key, baseValue] of Object.entries(baseTree)) {
    const nextPath = keyPath ? `${keyPath}.${key}` : key;
    const candidateValue = candidateTree[key];

    if (!(key in candidateTree)) {
      addIssue({
        severity: "error",
        type: "missing-key",
        locale,
        namespace,
        keyPath: nextPath,
        message: `Missing key from ${baseLocale}.`,
      });
      continue;
    }

    const baseType = valueType(baseValue);
    const candidateType = valueType(candidateValue);

    if (baseType !== candidateType) {
      addIssue({
        severity: "error",
        type: "type-mismatch",
        locale,
        namespace,
        keyPath: nextPath,
        value: candidateValue,
        message: `Expected ${baseType} to match ${baseLocale}, got ${candidateType}.`,
      });
      continue;
    }

    if (typeof baseValue === "string" && typeof candidateValue === "string") {
      if (!comparePlaceholders(baseValue, candidateValue)) {
        addIssue({
          severity: "error",
          type: "placeholder-mismatch",
          locale,
          namespace,
          keyPath: nextPath,
          value: candidateValue,
          message: `Placeholders differ from ${baseLocale}: expected {${getPlaceholders(baseValue).join("}, {")}}, got {${getPlaceholders(candidateValue).join("}, {")}}.`,
        });
      }

      continue;
    }

    if (isPlainObject(baseValue) && isPlainObject(candidateValue)) {
      compareTree(locale, namespace, baseValue, candidateValue, nextPath);
    }
  }

  for (const key of Object.keys(candidateTree)) {
    const nextPath = keyPath ? `${keyPath}.${key}` : key;

    if (!(key in baseTree)) {
      addIssue({
        severity: "warning",
        type: "extra-key",
        locale,
        namespace,
        keyPath: nextPath,
        value: candidateTree[key],
        message: `Extra key not present in ${baseLocale}.`,
      });
    }
  }
}

function formatIssue(issue: Issue): string {
  const parts = [
    `[${issue.severity.toUpperCase()}]`,
    issue.type,
    `locale=${issue.locale}`,
    `namespace=${issue.namespace}`,
  ];

  if (issue.keyPath) {
    parts.push(`key=${issue.keyPath}`);
  }

  const value = safeValue(issue.value);

  if (value !== undefined) {
    parts.push(`value=${value}`);
  }

  return `${parts.join(" ")}\n  ${issue.message}`;
}

const catalogs = Object.fromEntries(locales.map((locale) => [locale, readLocale(locale)])) as Record<
  Locale,
  Record<string, MessageTree>
>;
const allNamespaces = new Set(locales.flatMap((locale) => Object.keys(catalogs[locale])));

for (const namespace of [...allNamespaces].sort()) {
  for (const locale of locales) {
    if (!catalogs[locale][namespace]) {
      addIssue({
        severity: "error",
        type: "missing-namespace",
        locale,
        namespace,
        message: `Missing namespace present in another locale.`,
      });
    }
  }
}

for (const locale of locales) {
  for (const [namespace, tree] of Object.entries(catalogs[locale])) {
    inspectTree(locale, namespace, tree);
  }
}

for (const locale of locales) {
  if (locale === baseLocale) {
    continue;
  }

  for (const namespace of Object.keys(catalogs[baseLocale]).sort()) {
    const baseTree = catalogs[baseLocale][namespace];
    const candidateTree = catalogs[locale][namespace];

    if (!candidateTree) {
      continue;
    }

    compareTree(locale, namespace, baseTree, candidateTree);
  }
}

const errorCount = issues.filter((issue) => issue.severity === "error").length;
const warningCount = issues.filter((issue) => issue.severity === "warning").length;

console.log(`i18n validation report`);
console.log(`Locales: ${locales.join(", ")}`);
console.log(`Namespaces: ${[...allNamespaces].sort().join(", ")}`);
console.log(`Errors: ${errorCount}`);
console.log(`Warnings: ${warningCount}`);

if (issues.length > 0) {
  console.log("");
  console.log(issues.map(formatIssue).join("\n\n"));
}

if (errorCount > 0) {
  process.exitCode = 1;
}

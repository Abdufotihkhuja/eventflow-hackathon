import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

type AppId = "workspace" | "admin" | "public";
type Priority = "high" | "medium" | "low";
type Confidence = "high" | "medium" | "low";

type Finding = {
  app: AppId;
  filePath: string;
  relativePath: string;
  line: number;
  column: number;
  category: string;
  priority: Priority;
  value: string;
  snippet: string;
  suggestedNamespace: string;
  confidence: Confidence;
  reason: string;
};

type AppTarget = {
  app: AppId;
  root: string;
};

type FileSummary = {
  filePath: string;
  relativePath: string;
  count: number;
  high: number;
  medium: number;
  low: number;
  categories: string[];
  examples: Finding[];
  suggestedNamespace: string;
  suggestedPriority: Priority;
};

type GitInfo = {
  branch: string;
  commit: string;
  workingTree: "clean" | "dirty" | "unknown";
};

type RunMetadata = {
  generatedAt: string;
  branch: string;
  commit: string;
  workingTree: GitInfo["workingTree"];
  scannedRoots: string[];
  excludedPaths: string[];
};

const scriptDir = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(scriptDir, "..");
const repoRoot = resolve(packageRoot, "..", "..");
const outputRoot = join(repoRoot, "artifacts", "i18n-scan");

const appTargets: AppTarget[] = [
  { app: "workspace", root: join(repoRoot, "apps", "web-workspace", "src") },
  { app: "admin", root: join(repoRoot, "apps", "web-admin", "src") },
  { app: "public", root: join(repoRoot, "apps", "web-public", "src") },
];

const sourceExtensions = new Set([".ts", ".tsx", ".js", ".jsx"]);
const ignoredDirNames = new Set(["node_modules", "dist", "build", ".next", "coverage"]);
const excludedPaths = [
  "artifacts/**",
  "artifacts/i18n-scan/**",
  "packages/i18n/dist/**",
  "packages/i18n/src/messages/**",
  "node_modules/**",
  "dist/**",
  "build/**",
  ".next/**",
  "coverage/**",
  "**/*.map",
  "**/*.d.ts",
  "**/*.dto.ts",
  "**/*.generated.*",
  "**/__generated__/**",
  "**/generated/**",
  "**/openapi/**",
  "**/sdk/**",
  "**/contracts/**",
  "package-lock.json",
  "**/*.md",
  "artifacts/i18n-scan/summary.md",
  "artifacts/i18n-scan/workspace.md",
  "artifacts/i18n-scan/admin.md",
  "artifacts/i18n-scan/public.md",
  "artifacts/i18n-scan/raw.json",
];
const uiPropNames = new Set([
  "label",
  "title",
  "description",
  "placeholder",
  "message",
  "emptyText",
  "helperText",
  "aria-label",
  "alt",
  "tooltip",
  "confirmText",
  "cancelText",
  "header",
  "ariaLabel",
  "helper",
]);
const staticDataPropertyNames = new Set([
  "label",
  "title",
  "description",
  "placeholder",
  "message",
  "header",
  "helperText",
  "emptyText",
  "confirmText",
  "cancelText",
  "tooltip",
  "heading",
  "subheading",
  "caption",
  "option",
  "options",
]);
const internalJsxPropNames = new Set([
  "className",
  "data-testid",
  "id",
  "key",
  "name",
  "type",
  "variant",
  "size",
  "color",
  "icon",
  "href",
  "to",
  "src",
  "htmlFor",
  "role",
  "target",
  "rel",
  "method",
  "autoComplete",
  "inputMode",
  "pattern",
]);
const internalPropertyNames = new Set([
  "id",
  "slug",
  "key",
  "name",
  "type",
  "value",
  "field",
  "accessorKey",
  "queryKey",
  "mutationKey",
  "eventName",
  "analyticsName",
  "code",
  "permission",
  "permissions",
  "endpoint",
  "path",
  "url",
  "href",
  "src",
  "method",
  "variant",
  "size",
  "color",
  "icon",
  "className",
  "data-testid",
  "dataTestId",
]);
const staticDataVariablePatterns = [
  /(^|_)STATUS_LABELS$/,
  /(^|_)ROLE_LABELS$/,
  /(^|_)PERMISSION_LABELS$/,
  /(^|_)FILTER_OPTIONS$/,
  /(^|_)MENU_ITEMS$/,
  /(^|_)NAV_ITEMS$/,
  /(^|_)TABS$/,
  /(^|_)BADGES$/,
  /(^|_)EMPTY_STATE$/,
  /(^|_)FORM_STEPS$/,
  /(^|_)OPTIONS$/,
];
const highImpactJsxTagPatterns = [
  /^(?:button|a|label|legend|summary|option|th|caption|h[1-6])$/i,
  /(?:Button|Link|Title|Heading|Header|Label|MenuItem|SelectItem|TabsTrigger|TableHead|TableCaption|Breadcrumb|Badge|NavItem|SidebarItem|EmptyState)/,
];
const dialogComponentNames = new Set([
  "DialogTitle",
  "DialogDescription",
  "AlertDialogTitle",
  "AlertDialogDescription",
  "SheetTitle",
  "SheetDescription",
]);
const toastMethods = new Set(["success", "error", "info", "warning"]);
const validationCallNames = new Set([
  "message",
  "required",
  "min",
  "max",
  "length",
  "email",
  "url",
  "uuid",
  "regex",
  "refine",
  "superRefine",
  "nonempty",
]);
const publicLocalePaths = ["/events", "/blog", "/profile", "/about", "/privacy", "/terms"];
const hardcodedEnglishLabels = [
  "Save",
  "Cancel",
  "Delete",
  "Edit",
  "Search",
  "Filter",
  "Status",
  "Role",
  "User",
  "Organization",
  "Event",
  "Loading",
  "No data",
  "Try again",
  "Required",
  "Optional",
  "Sign in",
  "Sign up",
  "Profile",
  "Settings",
  "Dashboard",
];

const cyrillicPattern = /[А-Яа-яЁё]/;
const localePattern = /\b(?:ru-RU|en-US)\b|date-fns\/locale\/ru/;
const generatedMarkerPattern = /@generated|auto-generated|autogenerated|generated file|do not edit/i;
const meaningfulTextPattern = /[\p{L}\p{N}]/u;
const translationKeyPattern = /^[a-z][a-zA-Z0-9]*(?:\.[a-zA-Z0-9_-]+){1,10}$/;
const localeSegmentPattern = /^\/(?:en|ru|uz)(?:\/|$)/;
const staticAssetPathPattern = /^\/(?:_next|assets|static|images|img|icons|favicon\.ico|robots\.txt|sitemap\.xml)(?:\/|$)|\.(?:png|jpe?g|webp|gif|svg|ico|css|js|json|pdf|map)$/i;
const technicalTokenPattern = /^[A-Z0-9_]+$|^[a-z0-9_-]+$/;
const cssUtilityTokenPattern =
  /^!?-?(?:[a-z0-9]+:)*(?:(?:[a-z][a-z0-9-]*(?:-\[[^\]]+\]|\[[^\]]+\]|-[a-z0-9/%.]+)+)|flex|grid|block|hidden|inline|inline-block|relative|absolute|fixed|sticky|sr-only|container|truncate|uppercase|lowercase|capitalize|antialiased|border|rounded|shadow|underline|italic|font-bold|font-medium|font-semibold)$/i;
const englishLabelPatterns = hardcodedEnglishLabels.map((label) => ({
  label,
  pattern: new RegExp(`(^|[^A-Za-z])${escapeRegExp(label)}([^A-Za-z]|$)`, "i"),
}));

const findings: Finding[] = [];
const findingKeys = new Set<string>();
const commentRangesByFile = new Map<string, Array<{ start: number; end: number }>>();

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function resetOutputRoot(): void {
  rmSync(outputRoot, { recursive: true, force: true });
  mkdirSync(outputRoot, { recursive: true });
}

function toRelative(filePath: string): string {
  return relative(repoRoot, filePath).split(sep).join("/");
}

function isGeneratedFile(filePath: string, content: string): boolean {
  const normalized = toRelative(filePath).toLowerCase();
  const fileName = basename(filePath).toLowerCase();

  return (
    fileName.includes(".generated.") ||
    fileName.includes("__generated__") ||
    normalized.includes("/__generated__/") ||
    normalized.includes("/generated/") ||
    generatedMarkerPattern.test(content.slice(0, 1600))
  );
}

function shouldSkipPath(pathName: string): boolean {
  const parts = pathName.split(sep);

  if (parts.some((part) => ignoredDirNames.has(part))) {
    return true;
  }

  const normalized = pathName.split(sep).join("/");

  return (
    normalized.includes("/artifacts/") ||
    normalized.endsWith("/artifacts") ||
    normalized.includes("packages/i18n/src/messages") ||
    normalized.includes("packages/i18n/dist") ||
    normalized.includes("/__generated__/") ||
    normalized.includes("/generated/") ||
    normalized.includes("/openapi/") ||
    normalized.includes("/sdk/") ||
    normalized.includes("/contracts/") ||
    normalized.endsWith("package-lock.json") ||
    normalized.endsWith(".md") ||
    normalized.endsWith(".map") ||
    normalized.endsWith(".d.ts") ||
    normalized.endsWith(".dto.ts") ||
    normalized.endsWith(".dto.tsx") ||
    normalized.endsWith(".types.ts") ||
    normalized.endsWith(".types.tsx")
  );
}

function git(args: string[]): string | undefined {
  try {
    return execFileSync("git", args, { cwd: repoRoot, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return undefined;
  }
}

function readGitInfo(): GitInfo {
  const branch = git(["rev-parse", "--abbrev-ref", "HEAD"]) ?? "unknown";
  const commit = git(["rev-parse", "--short", "HEAD"]) ?? "unknown";
  const status = git(["status", "--short", "--untracked-files=all", "--", ".", ":(exclude)artifacts/i18n-scan"]);

  return {
    branch,
    commit,
    workingTree: status === undefined ? "unknown" : status.length > 0 ? "dirty" : "clean",
  };
}

function collectFiles(root: string): string[] {
  if (!existsSync(root)) {
    return [];
  }

  const files: string[] = [];

  function visit(current: string): void {
    if (shouldSkipPath(current)) {
      return;
    }

    const entries = readdirSync(current, { withFileTypes: true });

    for (const entry of entries) {
      const nextPath = join(current, entry.name);

      if (entry.isDirectory()) {
        if (!ignoredDirNames.has(entry.name)) {
          visit(nextPath);
        }

        continue;
      }

      if (entry.isFile() && sourceExtensions.has(extname(entry.name))) {
        files.push(nextPath);
      }
    }
  }

  visit(root);
  return files.sort();
}

function getLineAndColumn(sourceFile: ts.SourceFile, position: number): { line: number; column: number } {
  const lineAndCharacter = sourceFile.getLineAndCharacterOfPosition(position);

  return {
    line: lineAndCharacter.line + 1,
    column: lineAndCharacter.character + 1,
  };
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function stripTemplatePlaceholders(value: string): string {
  return value.replace(/\$\{[^}]*\}/g, "${...}");
}

function compactSnippet(value: string): string {
  const normalized = normalizeText(value);

  return normalized.length > 180 ? `${normalized.slice(0, 177)}...` : normalized;
}

function isMeaningfulText(value: string): boolean {
  const normalized = normalizeText(value);

  if (normalized.length < 2) {
    return false;
  }

  if (!meaningfulTextPattern.test(normalized)) {
    return false;
  }

  if (/^[\d\s.,:%/+()#-]+$/.test(normalized)) {
    return false;
  }

  if (/^[a-z0-9_.:-]+$/i.test(normalized) && normalized.includes(".")) {
    return false;
  }

  return true;
}

function isTranslationKey(value: string): boolean {
  return translationKeyPattern.test(normalizeText(value));
}

function collectCommentRanges(content: string): Array<{ start: number; end: number }> {
  const ranges: Array<{ start: number; end: number }> = [];
  let index = 0;

  while (index < content.length) {
    const lineStart = content.indexOf("//", index);
    const blockStart = content.indexOf("/*", index);

    if (lineStart === -1 && blockStart === -1) {
      break;
    }

    if (lineStart !== -1 && (blockStart === -1 || lineStart < blockStart)) {
      const lineEnd = content.indexOf("\n", lineStart);
      ranges.push({ start: lineStart, end: lineEnd === -1 ? content.length : lineEnd });
      index = lineEnd === -1 ? content.length : lineEnd + 1;
      continue;
    }

    const blockEnd = content.indexOf("*/", blockStart + 2);
    ranges.push({ start: blockStart, end: blockEnd === -1 ? content.length : blockEnd + 2 });
    index = blockEnd === -1 ? content.length : blockEnd + 2;
  }

  return ranges;
}

function isInCommentRange(sourceFile: ts.SourceFile, node: ts.Node): boolean {
  const ranges = commentRangesByFile.get(sourceFile.fileName);

  if (!ranges || ranges.length === 0) {
    return false;
  }

  const fullStart = node.getFullStart();
  const start = node.getStart(sourceFile);

  return ranges.some((range) => (fullStart >= range.start && fullStart < range.end) || (start >= range.start && start < range.end));
}

function isCssUtilityList(value: string): boolean {
  const tokens = normalizeText(value).split(/\s+/).filter(Boolean);

  return tokens.length > 1 && tokens.every((token) => cssUtilityTokenPattern.test(token));
}

function isTechnicalString(value: string): boolean {
  const normalized = stripTemplatePlaceholders(normalizeText(value));

  if (isTranslationKey(normalized)) {
    return true;
  }

  if (/^(?:https?:)?\/\//i.test(normalized) || /^(?:mailto|tel):/i.test(normalized)) {
    return true;
  }

  if (normalized.startsWith("#")) {
    return true;
  }

  if (normalized.startsWith("/") && !isPublicLocalePath(normalized)) {
    return true;
  }

  if (staticAssetPathPattern.test(normalized)) {
    return true;
  }

  if (isCssUtilityList(normalized)) {
    return true;
  }

  if (technicalTokenPattern.test(normalized) && !cyrillicPattern.test(normalized) && normalized.length < 32) {
    return true;
  }

  return false;
}

function getPropertyName(name: ts.PropertyName | ts.BindingName | ts.JsxAttributeName): string | undefined {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) {
    return name.text;
  }

  if (ts.isJsxNamespacedName(name)) {
    return `${name.namespace.text}:${name.name.text}`;
  }

  return undefined;
}

function getJsxTagName(name: ts.JsxTagNameExpression): string {
  if (ts.isIdentifier(name)) {
    return name.text;
  }

  if (ts.isPropertyAccessExpression(name)) {
    return name.name.text;
  }

  return name.getText();
}

function getNearestJsxTagName(node: ts.Node): string | undefined {
  let current: ts.Node | undefined = node.parent;

  while (current) {
    if (ts.isJsxElement(current)) {
      return getJsxTagName(current.openingElement.tagName);
    }

    if (ts.isJsxSelfClosingElement(current)) {
      return getJsxTagName(current.tagName);
    }

    current = current.parent;
  }

  return undefined;
}

function unwrapExpression(expression: ts.Expression): ts.Expression {
  let current = expression;

  while (
    ts.isAsExpression(current) ||
    ts.isSatisfiesExpression(current) ||
    ts.isParenthesizedExpression(current) ||
    ts.isNonNullExpression(current)
  ) {
    current = current.expression;
  }

  return current;
}

function readStaticString(expression: ts.Expression): string | undefined {
  const current = unwrapExpression(expression);

  if (ts.isStringLiteral(current) || ts.isNoSubstitutionTemplateLiteral(current)) {
    return current.text;
  }

  if (ts.isTemplateExpression(current)) {
    const values = [current.head.text, ...current.templateSpans.map((span) => span.literal.text)];
    const expressionText = current.templateSpans.length > 0 ? "${...}" : "";

    return normalizeText(`${values.join(expressionText)}`);
  }

  return undefined;
}

function readJsxAttributeString(initializer: ts.JsxAttribute["initializer"]): string | undefined {
  if (!initializer) {
    return undefined;
  }

  if (ts.isStringLiteral(initializer)) {
    return initializer.text;
  }

  if (ts.isJsxExpression(initializer) && initializer.expression) {
    return readStaticString(initializer.expression);
  }

  return undefined;
}

function getStringFromNode(node: ts.Node): string | undefined {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return node.text;
  }

  if (ts.isJsxText(node)) {
    return normalizeText(node.getText());
  }

  if (ts.isTemplateExpression(node)) {
    return readStaticString(node);
  }

  return undefined;
}

function isInModuleDeclaration(node: ts.Node): boolean {
  let current: ts.Node | undefined = node;

  while (current) {
    if (ts.isImportDeclaration(current) || ts.isExportDeclaration(current)) {
      return true;
    }

    current = current.parent;
  }

  return false;
}

function isTypeOnlyContext(node: ts.Node): boolean {
  let current: ts.Node | undefined = node;

  while (current) {
    if (
      ts.isTypeAliasDeclaration(current) ||
      ts.isInterfaceDeclaration(current) ||
      ts.isTypeLiteralNode(current) ||
      ts.isLiteralTypeNode(current)
    ) {
      return true;
    }

    current = current.parent;
  }

  return false;
}

function isPropertyNameNode(node: ts.Node): boolean {
  const parent = node.parent;

  return (
    Boolean(parent) &&
    ((ts.isPropertyAssignment(parent) && parent.name === node) ||
      (ts.isPropertySignature(parent) && parent.name === node) ||
      (ts.isMethodSignature(parent) && parent.name === node))
  );
}

function getNearestPropertyName(node: ts.Node): string | undefined {
  let current: ts.Node | undefined = node;

  while (current) {
    if (ts.isPropertyAssignment(current)) {
      return getPropertyName(current.name);
    }

    if (ts.isJsxAttribute(current)) {
      return getPropertyName(current.name);
    }

    current = current.parent;
  }

  return undefined;
}

function isInsideCallNamed(node: ts.Node, names: Set<string>): boolean {
  return isInsideCallExpression(node, (callName) => names.has(callName) || names.has(getLastCallSegment(callName)));
}

function isAlreadyI18nContext(sourceFile: ts.SourceFile, node: ts.Node, value: string): boolean {
  const propertyName = getNearestPropertyName(node);

  if (propertyName === "labelKey" || isTranslationKey(value)) {
    return true;
  }

  if (isInsideCallNamed(node, new Set(["t", "useT", "createLabelGetter"]))) {
    return true;
  }

  let current: ts.Node | undefined = node.parent;

  while (current) {
    if (
      ts.isImportDeclaration(current) &&
      ts.isStringLiteral(current.moduleSpecifier) &&
      current.moduleSpecifier.text === "@eventflow/i18n"
    ) {
      return true;
    }

    current = current.parent;
  }

  return isInModuleDeclaration(node) && normalizeText(value) === "@eventflow/i18n";
}

function isInSuppressedLine(sourceFile: ts.SourceFile, node: ts.Node, suppressedLines: Set<number>): boolean {
  const { line } = getLineAndColumn(sourceFile, node.getStart(sourceFile));

  return suppressedLines.has(line);
}

function collectSuppressedLines(content: string): Set<number> {
  const result = new Set<number>();
  const lines = content.split(/\r?\n/);

  for (let index = 0; index < lines.length; index += 1) {
    const lineNumber = index + 1;
    const line = lines[index];

    if (line.includes("i18n-scan-ignore-next-line")) {
      result.add(lineNumber + 1);
    }

    if (line.includes("i18n-scan-ignore")) {
      result.add(lineNumber);
    }
  }

  return result;
}

function isInsideJsxElement(node: ts.Node, names: Set<string>): boolean {
  let current: ts.Node | undefined = node.parent;

  while (current) {
    if (ts.isJsxElement(current)) {
      return names.has(getJsxTagName(current.openingElement.tagName));
    }

    current = current.parent;
  }

  return false;
}

function isInsideCallExpression(node: ts.Node, predicate: (callName: string) => boolean): boolean {
  let current: ts.Node | undefined = node.parent;

  while (current) {
    if (ts.isCallExpression(current)) {
      const callName = getCallName(current.expression);

      if (callName && predicate(callName)) {
        return true;
      }
    }

    current = current.parent;
  }

  return false;
}

function isConsoleOrDebugContext(node: ts.Node): boolean {
  return isInsideCallExpression(
    node,
    (callName) => callName.startsWith("console.") || callName.toLowerCase().includes("logger") || callName.toLowerCase().includes("debug"),
  );
}

function isInsideVisibleJsxExpression(node: ts.Node): boolean {
  let current: ts.Node | undefined = node.parent;

  while (current) {
    if (ts.isJsxAttribute(current)) {
      return false;
    }

    if (ts.isJsxExpression(current)) {
      return !current.parent || !ts.isJsxAttribute(current.parent);
    }

    current = current.parent;
  }

  return false;
}

function isStaticDataVariableName(name: string): boolean {
  return staticDataVariablePatterns.some((pattern) => pattern.test(name));
}

function nearestVariableName(node: ts.Node): string | undefined {
  let current: ts.Node | undefined = node;

  while (current) {
    if (ts.isVariableDeclaration(current) && ts.isIdentifier(current.name)) {
      return current.name.text;
    }

    if (ts.isPropertyAssignment(current)) {
      return getPropertyName(current.name);
    }

    current = current.parent;
  }

  return undefined;
}

function isInStaticDataInitializer(node: ts.Node): boolean {
  let current: ts.Node | undefined = node;

  while (current) {
    if (ts.isVariableDeclaration(current) && ts.isIdentifier(current.name) && isStaticDataVariableName(current.name.text)) {
      return true;
    }

    current = current.parent;
  }

  return false;
}

function getCallName(expression: ts.Expression): string | undefined {
  const current = unwrapExpression(expression);

  if (ts.isIdentifier(current)) {
    return current.text;
  }

  if (ts.isPropertyAccessExpression(current)) {
    const left = getCallName(current.expression);

    return left ? `${left}.${current.name.text}` : current.name.text;
  }

  return undefined;
}

function isToastCall(node: ts.CallExpression): boolean {
  const expression = unwrapExpression(node.expression);

  if (ts.isIdentifier(expression)) {
    return expression.text === "toast";
  }

  return (
    ts.isPropertyAccessExpression(expression) &&
    expression.expression.getText() === "toast" &&
    toastMethods.has(expression.name.text)
  );
}

function isRouterLocaleNavigation(node: ts.CallExpression): boolean {
  const expression = unwrapExpression(node.expression);

  return (
    ts.isPropertyAccessExpression(expression) &&
    expression.expression.getText() === "router" &&
    (expression.name.text === "push" || expression.name.text === "replace")
  );
}

function isSchemaFile(filePath: string): boolean {
  const normalized = toRelative(filePath).toLowerCase();

  return normalized.includes("/schema") || normalized.includes("/schemas");
}

function isTestOrStoryPath(filePath: string): boolean {
  const normalized = toRelative(filePath).toLowerCase();

  return (
    normalized.includes(".test.") ||
    normalized.includes(".spec.") ||
    normalized.includes(".stories.") ||
    normalized.includes("/__tests__/") ||
    normalized.includes("/stories/") ||
    normalized.includes("/test/") ||
    normalized.includes("/tests/")
  );
}

function isFixtureDemoPath(filePath: string): boolean {
  const normalized = toRelative(filePath).toLowerCase();
  const fileName = basename(filePath).toLowerCase();

  return (
    fileName.includes("fixtures.ts") ||
    fileName.includes("fixtures.tsx") ||
    fileName.startsWith("mock") ||
    fileName.startsWith("demo") ||
    fileName.startsWith("seed") ||
    normalized.includes("/fixtures/") ||
    normalized.includes("/mocks/") ||
    normalized.includes("/demo/")
  );
}

function isPublicEventFixturesPath(filePath: string): boolean {
  return toRelative(filePath).toLowerCase() === "apps/web-public/src/entities/event/model/fixtures.ts";
}

function isApiServiceTypeNoisePath(filePath: string): boolean {
  const normalized = toRelative(filePath).toLowerCase();
  const fileName = basename(filePath).toLowerCase();

  return (
    normalized.includes("/api/") ||
    normalized.includes("/services/") ||
    normalized.includes("/sdk/") ||
    normalized.includes("/contracts/") ||
    fileName.endsWith(".service.ts") ||
    fileName.endsWith(".service.tsx") ||
    fileName.endsWith(".api.ts") ||
    fileName.endsWith(".api.tsx") ||
    fileName.endsWith(".types.ts") ||
    fileName.endsWith(".types.tsx") ||
    fileName.endsWith(".dto.ts") ||
    fileName.endsWith(".dto.tsx") ||
    fileName.startsWith("generated") ||
    fileName.includes("generated")
  );
}

function isExplicitUiConfigContext(node: ts.Node): boolean {
  const propertyName = getNearestPropertyName(node);
  const variableName = nearestVariableName(node);

  return Boolean(
    (propertyName && (uiPropNames.has(propertyName) || staticDataPropertyNames.has(propertyName))) ||
      (variableName && isStaticDataVariableName(variableName)),
  );
}

function isHighImpactJsxText(node: ts.Node, value: string): boolean {
  const tagName = getNearestJsxTagName(node);
  const normalized = normalizeText(value);

  if (!tagName || normalized.length > 90) {
    return false;
  }

  return highImpactJsxTagPatterns.some((pattern) => pattern.test(tagName));
}

function classifyFinding(
  sourceFile: ts.SourceFile,
  node: ts.Node,
  category: string,
  value: string,
  priority: Priority,
  confidence: Confidence,
): { priority: Priority; confidence: Confidence; reasonSuffix?: string } {
  const filePath = sourceFile.fileName;

  if (isInCommentRange(sourceFile, node)) {
    return { priority: "low", confidence: "low", reasonSuffix: "Comment/docstring match; excluded from actionable batches." };
  }

  if (isTestOrStoryPath(filePath)) {
    return { priority: "low", confidence: "low", reasonSuffix: "Test/story file; excluded from actionable batches." };
  }

  if (isPublicEventFixturesPath(filePath)) {
    return { priority: "medium", confidence: "medium", reasonSuffix: "Public event fixture/demo content; keep separate from product UI batches." };
  }

  if (isFixtureDemoPath(filePath)) {
    const visibleFixture = category === "jsx-text" || category === "ui-prop-text" || category === "static-display-data" || isExplicitUiConfigContext(node);

    return visibleFixture
      ? { priority: "medium", confidence: "medium", reasonSuffix: "Fixture/mock/demo display content; keep separate from product UI batches." }
      : { priority: "low", confidence: "low", reasonSuffix: "Fixture/mock/demo non-UI noise; excluded from actionable batches." };
  }

  if (isApiServiceTypeNoisePath(filePath)) {
    if (isExplicitUiConfigContext(node)) {
      return { priority: "medium", confidence: "medium", reasonSuffix: "Explicit UI config in API/service/type-ish file; review, but not high confidence." };
    }

    return { priority: "low", confidence: "low", reasonSuffix: "API/service/type/generated-ish file; likely not direct static UI." };
  }

  if (category === "jsx-text" && priority === "high") {
    const impact = isHighImpactJsxText(node, value) ? "control/heading" : "body/copy";

    return { priority: "medium", confidence, reasonSuffix: `Visible JSX ${impact} text; actionable, but batched below explicit props/dialogs/static config.` };
  }

  return { priority, confidence };
}

function getLastCallSegment(callName: string): string {
  const segments = callName.split(".");

  return segments[segments.length - 1] ?? callName;
}

function isValidationCall(node: ts.CallExpression): boolean {
  const callName = getCallName(node.expression);
  const lastSegment = callName ? getLastCallSegment(callName) : undefined;

  return Boolean(lastSegment && validationCallNames.has(lastSegment));
}

function isPublicLocalePath(value: string): boolean {
  const normalized = stripTemplatePlaceholders(normalizeText(value));

  if (!normalized.startsWith("/") || normalized.startsWith("//")) {
    return false;
  }

  if (localeSegmentPattern.test(normalized)) {
    return false;
  }

  if (normalized.startsWith("/api/") || normalized === "/api" || staticAssetPathPattern.test(normalized)) {
    return false;
  }

  return publicLocalePaths.includes(normalized);
}

function detectEnglishLabel(value: string): string | undefined {
  const normalized = normalizeText(value);

  if (
    normalized.includes("/") ||
    normalized.includes("@") ||
    normalized.includes(".") ||
    normalized.includes("${") ||
    /^[A-Z_]+$/.test(normalized) ||
    (/^[a-z0-9_-]+$/.test(normalized) && normalized === normalized.toLowerCase())
  ) {
    return undefined;
  }

  return englishLabelPatterns.find(({ pattern }) => pattern.test(normalized))?.label;
}

function suggestedNamespaceFor(filePath: string, category: string): string {
  const normalized = toRelative(filePath).toLowerCase();

  if (category.includes("toast")) {
    return "toasts";
  }

  if (category.includes("validation")) {
    return "validation";
  }

  if (normalized.includes("/auth/") || normalized.includes("sign-in") || normalized.includes("sign-up")) {
    return "security";
  }

  if (normalized.includes("/profile/")) {
    return "profile";
  }

  if (normalized.includes("/event") || normalized.includes("/events/")) {
    return "events";
  }

  if (normalized.includes("/task") || normalized.includes("/tasks/")) {
    return "tasks";
  }

  if (normalized.includes("/registration")) {
    return "registrations";
  }

  if (normalized.includes("/role")) {
    return "roles";
  }

  if (normalized.includes("/permission")) {
    return "permissions";
  }

  if (normalized.includes("/user")) {
    return "users";
  }

  if (normalized.includes("/dashboard")) {
    return "dashboard";
  }

  if (normalized.includes("/setting")) {
    return "settings";
  }

  if (normalized.includes("/blog")) {
    return "blog";
  }

  if (normalized.includes("/nav") || normalized.includes("/menu")) {
    return "navigation";
  }

  if (normalized.includes("/filter")) {
    return "filters";
  }

  if (normalized.includes("/table")) {
    return "tables";
  }

  if (normalized.includes("apps/web-public/")) {
    return "public";
  }

  if (normalized.includes("apps/web-admin/")) {
    return "admin";
  }

  return "common";
}

function priorityFor(filePath: string, category: string): Priority {
  const normalized = toRelative(filePath).toLowerCase();

  if (
    normalized.includes(".test.") ||
    normalized.includes(".spec.") ||
    normalized.includes(".stories.") ||
    normalized.includes("/__tests__/") ||
    normalized.includes("/test/") ||
    normalized.includes("/tests/")
  ) {
    return "low";
  }

  if (
    normalized.includes("/fixtures") ||
    normalized.includes("/mock") ||
    normalized.includes("/demo") ||
    normalized.includes("/schema")
  ) {
    return "medium";
  }

  if (
    normalized.includes("/shared/api/") ||
    normalized.includes("/src/api/") ||
    normalized.includes("service.ts") ||
    normalized.includes("logger") ||
    normalized.includes("debug")
  ) {
    return category === "cyrillic-text" ? "medium" : "low";
  }

  if (
    category === "toast-text" ||
    category === "dialog-text" ||
    category === "ui-prop-text" ||
    category === "jsx-text" ||
    category === "validation-message" ||
    category === "static-display-data" ||
    category === "public-locale-link"
  ) {
    return "high";
  }

  if (category === "direct-locale-formatting") {
    return "medium";
  }

  if (category === "cyrillic-text" || category === "hardcoded-english-label") {
    return "low";
  }

  return "medium";
}

function confidenceFor(filePath: string, category: string): Confidence {
  const normalized = toRelative(filePath).toLowerCase();

  if (
    normalized.includes(".test.") ||
    normalized.includes(".spec.") ||
    normalized.includes(".stories.") ||
    normalized.includes("/__tests__/") ||
    normalized.includes("/test/") ||
    normalized.includes("/tests/") ||
    normalized.includes("/fixtures") ||
    normalized.includes("/mock") ||
    normalized.includes("/demo") ||
    normalized.includes("/shared/api/") ||
    normalized.includes("/src/api/") ||
    normalized.includes("service.ts")
  ) {
    return "low";
  }

  if (
    category === "toast-text" ||
    category === "dialog-text" ||
    category === "ui-prop-text" ||
    category === "jsx-text" ||
    category === "validation-message" ||
    category === "static-display-data" ||
    category === "public-locale-link"
  ) {
    return "high";
  }

  if (category === "direct-locale-formatting") {
    return "medium";
  }

  return "low";
}

function addFinding(
  app: AppId,
  sourceFile: ts.SourceFile,
  node: ts.Node,
  category: string,
  value: string,
  reason: string,
  options: { priority?: Priority; confidence?: Confidence } = {},
): void {
  const normalized = normalizeText(value);

  if (!isMeaningfulText(normalized) && category !== "public-locale-link" && category !== "direct-locale-formatting") {
    return;
  }

  if (isAlreadyI18nContext(sourceFile, node, normalized)) {
    return;
  }

  const filePath = sourceFile.fileName;
  const position = getLineAndColumn(sourceFile, node.getStart(sourceFile));
  const basePriority = options.priority ?? priorityFor(filePath, category);
  const baseConfidence = options.confidence ?? confidenceFor(filePath, category);
  const classification = classifyFinding(sourceFile, node, category, normalized, basePriority, baseConfidence);
  const priority = classification.priority;
  const confidence = classification.confidence;
  const relativePath = toRelative(filePath);
  const key = [relativePath, position.line, position.column, category, normalized].join("\u0000");

  if (findingKeys.has(key)) {
    return;
  }

  findingKeys.add(key);

  findings.push({
    app,
    filePath,
    relativePath,
    line: position.line,
    column: position.column,
    category,
    priority,
    value: normalized,
    snippet: compactSnippet(node.getText(sourceFile)),
    suggestedNamespace: suggestedNamespaceFor(filePath, category),
    confidence,
    reason: classification.reasonSuffix ? `${reason} ${classification.reasonSuffix}` : reason,
  });
}

function addStringFindings(app: AppId, sourceFile: ts.SourceFile, node: ts.Node, value: string): void {
  if (localePattern.test(value) || (isInModuleDeclaration(node) && value === "date-fns/locale/ru")) {
    addFinding(app, sourceFile, node, "direct-locale-formatting", value, "Direct locale formatting should use i18n locale helpers.", {
      priority: "medium",
      confidence: "medium",
    });
  }

  if (
    isInModuleDeclaration(node) ||
    ts.isJsxText(node) ||
    isInsideVisibleJsxExpression(node) ||
    isInsideCallExpression(node, (callName) => callName === "toast" || callName.startsWith("toast.")) ||
    (isSchemaFile(sourceFile.fileName) && isInsideCallExpression(node, (callName) => validationCallNames.has(getLastCallSegment(callName)))) ||
    isTypeOnlyContext(node) ||
    isPropertyNameNode(node) ||
    isTechnicalString(value) ||
    isConsoleOrDebugContext(node)
  ) {
    return;
  }

  const propertyName = getNearestPropertyName(node);

  if (
    propertyName &&
    (internalPropertyNames.has(propertyName) ||
      internalJsxPropNames.has(propertyName) ||
      staticDataPropertyNames.has(propertyName) ||
      uiPropNames.has(propertyName))
  ) {
    return;
  }

  if (cyrillicPattern.test(value)) {
    addFinding(app, sourceFile, node, "cyrillic-text", value, "Unclassified Cyrillic text; review only if it is production-visible UI.", {
      priority: priorityFor(sourceFile.fileName, "cyrillic-text"),
      confidence: "low",
    });
  }

  detectEnglishLabel(value);
}

function scanJsxAttribute(app: AppId, sourceFile: ts.SourceFile, attribute: ts.JsxAttribute): void {
  const name = getPropertyName(attribute.name);
  const value = readJsxAttributeString(attribute.initializer);

  if (!name || !value) {
    return;
  }

  if (internalJsxPropNames.has(name) && name !== "href") {
    return;
  }

  if (uiPropNames.has(name)) {
    if (!isTechnicalString(value)) {
      addFinding(app, sourceFile, attribute, "ui-prop-text", value, `User-facing JSX prop "${name}".`, {
        priority: "high",
        confidence: "high",
      });
    }
  }

  if (app === "public" && name === "href" && isPublicLocalePath(value)) {
    addFinding(
      app,
      sourceFile,
      attribute,
      "public-locale-link",
      value,
      "Public app internal link should include or derive the active locale segment.",
      { priority: "high", confidence: "high" },
    );
  }
}

function scanObjectProperty(app: AppId, sourceFile: ts.SourceFile, property: ts.PropertyAssignment): void {
  const name = getPropertyName(property.name);
  const value = readStaticString(property.initializer);

  if (!name || !value) {
    return;
  }

  if (internalPropertyNames.has(name) || isTechnicalString(value)) {
    return;
  }

  if (isInsideCallExpression(property, (callName) => callName === "toast" || callName.startsWith("toast."))) {
    if (staticDataPropertyNames.has(name)) {
      addFinding(app, sourceFile, property, "toast-text", value, `Toast option "${name}".`, {
        priority: "high",
        confidence: "high",
      });
    }

    return;
  }

  if (!staticDataPropertyNames.has(name)) {
    return;
  }

  const relativePath = toRelative(sourceFile.fileName).toLowerCase();
  const isSchemaMessage = name === "message" && (relativePath.includes("/schema") || relativePath.includes("/schemas"));
  const isGeneratedLookingApi =
    relativePath.includes("/shared/api/") ||
    relativePath.includes("/src/api/") ||
    relativePath.includes("/services/") ||
    relativePath.includes("service.ts");
  const category = isSchemaMessage ? "validation-message" : "static-display-data";
  const priority: Priority = isGeneratedLookingApi ? "low" : isSchemaMessage ? "high" : priorityFor(sourceFile.fileName, category);
  const confidence: Confidence = isGeneratedLookingApi ? "low" : confidenceFor(sourceFile.fileName, category);

  addFinding(app, sourceFile, property, category, value, `User-facing static property "${name}".`, {
    priority,
    confidence,
  });
}

function scanCallExpression(app: AppId, sourceFile: ts.SourceFile, node: ts.CallExpression): void {
  const firstArg = node.arguments[0];
  const firstArgText = firstArg ? readStaticString(firstArg) : undefined;

  if (isSchemaFile(sourceFile.fileName) && isValidationCall(node)) {
    for (const argument of node.arguments) {
      const argumentText = readStaticString(argument);

      if (argumentText && !isTechnicalString(argumentText) && isMeaningfulText(argumentText)) {
        addFinding(app, sourceFile, argument, "validation-message", argumentText, "Validation schema message.", {
          priority: "high",
          confidence: "high",
        });
      }
    }
  }

  if (isToastCall(node) && firstArg && firstArgText && !isTechnicalString(firstArgText)) {
    addFinding(app, sourceFile, firstArg, "toast-text", firstArgText, `Toast call "${getCallName(node.expression) ?? "toast"}".`, {
      priority: "high",
      confidence: "high",
    });
  }

  if (app === "public" && isRouterLocaleNavigation(node) && firstArg && firstArgText && isPublicLocalePath(firstArgText)) {
    addFinding(
      app,
      sourceFile,
      firstArg,
      "public-locale-link",
      firstArgText,
      "Public app router navigation should include or derive the active locale segment.",
      { priority: "high", confidence: "high" },
    );
  }
}

function scanFile(app: AppId, filePath: string): void {
  const content = readFileSync(filePath, "utf8");

  if (isGeneratedFile(filePath, content)) {
    return;
  }

  commentRangesByFile.set(filePath, collectCommentRanges(content));
  const suppressedLines = collectSuppressedLines(content);
  const sourceKind = extname(filePath).endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true, sourceKind);

  function visit(node: ts.Node): void {
    if (isInSuppressedLine(sourceFile, node, suppressedLines)) {
      return;
    }

    if (ts.isJsxText(node)) {
      const value = normalizeText(node.getText(sourceFile));

      if (isMeaningfulText(value)) {
        const category = isInsideJsxElement(node, dialogComponentNames) ? "dialog-text" : "jsx-text";
        const reason = category === "dialog-text" ? "Visible dialog title/description text." : "Visible JSX text node.";

        addFinding(app, sourceFile, node, category, value, reason, { priority: "high", confidence: "high" });
      }
    }

    if (ts.isJsxAttribute(node)) {
      scanJsxAttribute(app, sourceFile, node);
    }

    if (ts.isPropertyAssignment(node)) {
      scanObjectProperty(app, sourceFile, node);
    }

    if (ts.isCallExpression(node)) {
      scanCallExpression(app, sourceFile, node);
    }

    const staticValue = getStringFromNode(node);

    if (
      staticValue &&
      !ts.isJsxText(node) &&
      isInsideVisibleJsxExpression(node) &&
      !isTechnicalString(staticValue) &&
      isMeaningfulText(staticValue)
    ) {
      addFinding(app, sourceFile, node, "jsx-text", staticValue, "Visible JSX expression text.", {
        priority: "high",
        confidence: "high",
      });
    }

    if (staticValue) {
      addStringFindings(app, sourceFile, node, staticValue);
    }

    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && isStaticDataVariableName(node.name.text)) {
      addStaticDataInitializerFindings(app, sourceFile, node);
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
}

function addStaticDataInitializerFindings(app: AppId, sourceFile: ts.SourceFile, declaration: ts.VariableDeclaration): void {
  if (!declaration.initializer) {
    return;
  }

  function visit(node: ts.Node): void {
    const value = getStringFromNode(node);
    const propertyName = getNearestPropertyName(node);

    if (
      value &&
      isMeaningfulText(value) &&
      !isTechnicalString(value) &&
      !(propertyName && internalPropertyNames.has(propertyName)) &&
      !(propertyName && staticDataPropertyNames.has(propertyName)) &&
      !isTypeOnlyContext(node)
    ) {
      addFinding(
        app,
        sourceFile,
        node,
        "static-display-data",
        value,
        `Static display data constant "${declaration.name.getText(sourceFile)}".`,
        { priority: priorityFor(sourceFile.fileName, "static-display-data"), confidence: confidenceFor(sourceFile.fileName, "static-display-data") },
      );
    }

    ts.forEachChild(node, visit);
  }

  visit(declaration.initializer);
}

function groupFindingsByFile(appFindings: Finding[]): FileSummary[] {
  const groups = new Map<string, Finding[]>();

  for (const finding of appFindings) {
    const existing = groups.get(finding.filePath) ?? [];
    existing.push(finding);
    groups.set(finding.filePath, existing);
  }

  return [...groups.entries()]
    .map(([filePath, group]): FileSummary => {
      const high = group.filter((finding) => finding.priority === "high").length;
      const medium = group.filter((finding) => finding.priority === "medium").length;
      const low = group.filter((finding) => finding.priority === "low").length;
      const namespaceCounts = countBy(group.map((finding) => finding.suggestedNamespace));
      const suggestedNamespace = topEntry(namespaceCounts) ?? "common";
      const suggestedPriority: Priority = high > 0 ? "high" : medium > 0 ? "medium" : "low";

      return {
        filePath,
        relativePath: group[0].relativePath,
        count: group.length,
        high,
        medium,
        low,
        categories: [...new Set(group.map((finding) => finding.category))].sort(),
        examples: group
          .slice()
          .sort(compareFindings)
          .slice(0, 5),
        suggestedNamespace,
        suggestedPriority,
      };
    })
    .sort((left, right) => right.high - left.high || right.medium - left.medium || right.count - left.count || left.relativePath.localeCompare(right.relativePath));
}

function countBy(values: string[]): Map<string, number> {
  const result = new Map<string, number>();

  for (const value of values) {
    result.set(value, (result.get(value) ?? 0) + 1);
  }

  return result;
}

function topEntry(counts: Map<string, number>): string | undefined {
  return [...counts.entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))[0]?.[0];
}

function compareFindings(left: Finding, right: Finding): number {
  return left.line - right.line || left.column - right.column || left.category.localeCompare(right.category);
}

function priorityWeight(priority: Priority): number {
  if (priority === "high") {
    return 3;
  }

  if (priority === "medium") {
    return 2;
  }

  return 1;
}

function isActionableFinding(finding: Finding): boolean {
  if (finding.confidence === "low") {
    return false;
  }

  if (isPublicEventFixturesPath(finding.filePath)) {
    return finding.priority === "medium" && finding.confidence === "medium";
  }

  return (
    (finding.priority === "high" && (finding.confidence === "high" || finding.confidence === "medium")) ||
    (finding.priority === "medium" && finding.confidence === "high")
  );
}

function areaForFile(relativePath: string): string {
  const pathName = relativePath.toLowerCase();

  if (pathName.includes("apps/web-public/src/entities/event/model/fixtures.ts")) {
    return "public fixtures/demo content";
  }

  if (pathName.includes("/tasks/") || pathName.includes("/boards/")) {
    return "tasks";
  }

  if (pathName.includes("/dashboard/")) {
    return "dashboard";
  }

  if (pathName.includes("/super-admin/") && pathName.includes("/events/")) {
    return "super-admin events";
  }

  if (pathName.includes("/blog") || pathName.includes("/editor/")) {
    return "blog/editor";
  }

  if (pathName.includes("/profile/")) {
    return "profile";
  }

  if (pathName.includes("/event") || pathName.includes("/events/")) {
    return "events";
  }

  if (pathName.includes("/place") || pathName.includes("/places/")) {
    return "places";
  }

  if (pathName.includes("/auth/") || pathName.includes("sign-in") || pathName.includes("sign-up") || pathName.includes("/security/")) {
    return "security";
  }

  return "common UI";
}

function makeBatches(fileSummaries: FileSummary[]): Array<{
  name: string;
  files: FileSummary[];
  estimatedRisk: string;
  recommendedPromptFocus: string;
}> {
  const batches: Array<{
    name: string;
    files: FileSummary[];
    estimatedRisk: string;
    recommendedPromptFocus: string;
  }> = [];
  const grouped = new Map<string, FileSummary[]>();

  for (const file of fileSummaries) {
    const area = areaForFile(file.relativePath);
    const existing = grouped.get(area) ?? [];
    existing.push(file);
    grouped.set(area, existing);
  }

  const orderedGroups = [...grouped.entries()].sort(
    (left, right) =>
      Math.max(...right[1].map((file) => priorityWeight(file.suggestedPriority))) -
        Math.max(...left[1].map((file) => priorityWeight(file.suggestedPriority))) ||
      right[1].reduce((sum, file) => sum + file.count, 0) - left[1].reduce((sum, file) => sum + file.count, 0) ||
      left[0].localeCompare(right[0]),
  );

  for (const [area, groupFiles] of orderedGroups) {
    const sorted = groupFiles.slice().sort(
      (left, right) =>
        priorityWeight(right.suggestedPriority) - priorityWeight(left.suggestedPriority) ||
        right.count - left.count ||
        left.relativePath.localeCompare(right.relativePath),
    );

    for (let index = 0; index < sorted.length; index += 12) {
      const files = sorted.slice(index, index + 12);
      const highFiles = files.filter((file) => file.suggestedPriority === "high").length;
      const mediumFiles = files.filter((file) => file.suggestedPriority === "medium").length;
      const topCategories = [...countBy(files.flatMap((file) => file.categories)).entries()]
        .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
        .slice(0, 4)
        .map(([category]) => category);

      batches.push({
        name: `Batch ${batches.length + 1}: ${area}`,
        files,
        estimatedRisk: highFiles > 8 ? "high" : highFiles > 0 || mediumFiles > 8 ? "medium" : "low",
        recommendedPromptFocus:
          area === "public fixtures/demo content"
            ? "Move visible fixture/demo copy into the appropriate public i18n namespace separately from product UI work."
            : `Fix ${area} ${topCategories.join(", ") || "hardcoded UI text"} with @eventflow/i18n keys; skip low-confidence/API/comment noise.`,
      });
    }
  }

  return batches;
}

function totalsFor(appFindings: Finding[]): { total: number; high: number; medium: number; low: number } {
  return {
    total: appFindings.length,
    high: appFindings.filter((finding) => finding.priority === "high").length,
    medium: appFindings.filter((finding) => finding.priority === "medium").length,
    low: appFindings.filter((finding) => finding.priority === "low").length,
  };
}

function markdownTableRow(values: string[]): string {
  return `| ${values.map((value) => value.replace(/\|/g, "\\|").replace(/\n/g, " ")).join(" | ")} |`;
}

function renderAppReport(app: AppId, appFindings: Finding[]): string {
  const totals = totalsFor(appFindings);
  const files = groupFindingsByFile(appFindings);
  const actionableFiles = groupFindingsByFile(appFindings.filter(isActionableFinding));
  const batches = makeBatches(actionableFiles);
  const lines: string[] = [];

  lines.push(`# i18n Scan: ${app}`);
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(markdownTableRow(["Total findings", "High priority", "Medium priority", "Low priority", "Files"]));
  lines.push(markdownTableRow(["---:", "---:", "---:", "---:", "---:"]));
  lines.push(markdownTableRow([String(totals.total), String(totals.high), String(totals.medium), String(totals.low), String(files.length)]));
  lines.push("");
  lines.push("## Findings by file");
  lines.push("");

  if (files.length === 0) {
    lines.push("No findings.");
    lines.push("");
  }

  for (const file of files) {
    lines.push(`### ${file.relativePath}`);
    lines.push("");
    lines.push(`- Count: ${file.count}`);
    lines.push(`- Categories: ${file.categories.join(", ")}`);
    lines.push(`- Suggested namespace: \`${file.suggestedNamespace}\``);
    lines.push(`- Suggested priority: ${file.suggestedPriority}`);
    lines.push("- Examples:");

    for (const example of file.examples) {
      lines.push(
        `  - ${example.line}:${example.column} [${example.priority}/${example.confidence}/${example.category}] ${example.value} | snippet: \`${example.snippet}\` | namespace: \`${example.suggestedNamespace}\` | reason: ${example.reason}`,
      );
    }

    lines.push("");
  }

  lines.push("## Suggested batches");
  lines.push("");

  if (batches.length === 0) {
    lines.push("No batches needed.");
    lines.push("");
  }

  for (const batch of batches) {
    lines.push(`### ${batch.name}`);
    lines.push("");
    lines.push(`- Files: ${batch.files.length}`);
    lines.push(`- Estimated risk: ${batch.estimatedRisk}`);
    lines.push(`- Recommended prompt focus: ${batch.recommendedPromptFocus}`);
    lines.push("- File list:");

    for (const file of batch.files) {
      lines.push(`  - ${file.relativePath} (${file.count} findings, ${file.suggestedPriority})`);
    }

    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

function renderSummaryReport(metadata: RunMetadata): string {
  const lines: string[] = [];
  const allTotals = totalsFor(findings);
  const topZones = groupFindingsByFile(findings)
    .filter((file) => file.high > 0)
    .slice(0, 10);
  const topNoisyFiles = groupFindingsByFile(findings).slice(0, 30);
  const topCategories = [...countBy(findings.map((finding) => `${finding.category} / ${finding.priority} / ${finding.confidence}`)).entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 12);
  const topSnippets = [...countBy(findings.map((finding) => finding.value)).entries()]
    .filter(([, count]) => count > 1)
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 20);

  lines.push("# i18n Hardcoded UI Scan Summary");
  lines.push("");
  lines.push("## Run metadata");
  lines.push("");
  lines.push(`- generatedAt: ${metadata.generatedAt}`);
  lines.push(`- branch: ${metadata.branch}`);
  lines.push(`- commit: ${metadata.commit}`);
  lines.push(`- workingTree: ${metadata.workingTree}`);
  lines.push(`- scannedRoots: ${metadata.scannedRoots.map((root) => `\`${root}\``).join(", ")}`);
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(markdownTableRow(["Scope", "Total findings", "High priority", "Medium priority", "Low priority", "Files"]));
  lines.push(markdownTableRow(["---", "---:", "---:", "---:", "---:", "---:"]));
  lines.push(
    markdownTableRow([
      "all",
      String(allTotals.total),
      String(allTotals.high),
      String(allTotals.medium),
      String(allTotals.low),
      String(new Set(findings.map((finding) => finding.filePath)).size),
    ]),
  );

  for (const app of appTargets.map((target) => target.app)) {
    const appFindings = findings.filter((finding) => finding.app === app);
    const totals = totalsFor(appFindings);

    lines.push(
      markdownTableRow([
        app,
        String(totals.total),
        String(totals.high),
        String(totals.medium),
        String(totals.low),
        String(new Set(appFindings.map((finding) => finding.filePath)).size),
      ]),
    );
  }

  lines.push("");
  lines.push("## Top high-priority zones");
  lines.push("");

  if (topZones.length === 0) {
    lines.push("No high-priority zones found.");
  }

  for (const zone of topZones) {
    lines.push(
      `- ${zone.relativePath}: ${zone.high} high / ${zone.count} total; categories: ${zone.categories.join(", ")}; namespace: \`${zone.suggestedNamespace}\``,
    );
  }

  lines.push("");
  lines.push("## Top noisy files / categories");
  lines.push("");

  if (topNoisyFiles.length === 0) {
    lines.push("No noisy files found.");
  } else {
    lines.push("### Files");
    lines.push("");

    for (const file of topNoisyFiles) {
      lines.push(
        `- ${file.relativePath}: ${file.count} total (${file.high} high, ${file.medium} medium, ${file.low} low); categories: ${file.categories.join(", ")}`,
      );
    }
  }

  lines.push("");
  lines.push("### Categories");
  lines.push("");

  if (topCategories.length === 0) {
    lines.push("No noisy categories found.");
  } else {
    for (const [category, count] of topCategories) {
      lines.push(`- ${category}: ${count}`);
    }
  }

  lines.push("");
  lines.push("## Scanner Noise Analysis");
  lines.push("");
  lines.push("### Top noisy files");
  lines.push("");

  if (topNoisyFiles.length === 0) {
    lines.push("- No noisy files found.");
  } else {
    for (const file of topNoisyFiles) {
      lines.push(
        `- ${file.relativePath}: ${file.count} total (${file.high} high, ${file.medium} medium, ${file.low} low); categories: ${file.categories.join(", ")}`,
      );
    }
  }

  lines.push("");
  lines.push("### Top noisy categories");
  lines.push("");

  if (topCategories.length === 0) {
    lines.push("- No noisy categories found.");
  } else {
    for (const [category, count] of topCategories) {
      lines.push(`- ${category}: ${count}`);
    }
  }

  lines.push("");
  lines.push("### Likely false positive patterns");
  lines.push("");
  lines.push("- API/service/type/generated-ish files are downgraded unless they contain explicit UI label/title/description/placeholder/options config.");
  lines.push("- Tests, stories, comments, docstrings, mocks, demos, seeds, and fixtures are excluded from normal actionable batches.");
  lines.push("- Existing i18n usage is skipped for `t(...)`, `useT(...)`, `createLabelGetter(...)`, `labelKey`, translation-key-looking strings, and `@eventflow/i18n` imports.");
  lines.push("- Public locale-link findings only keep exact static links `/events`, `/blog`, `/profile`, `/about`, `/privacy`, and `/terms`.");

  if (topSnippets.length > 0) {
    lines.push("");
    lines.push("### Repeated snippets/patterns");
    lines.push("");

    for (const [snippet, count] of topSnippets) {
      lines.push(`- ${count}x: \`${compactSnippet(snippet)}\``);
    }
  }

  lines.push("");
  lines.push("## Reports");
  lines.push("");
  lines.push("- `workspace.md`");
  lines.push("- `admin.md`");
  lines.push("- `public.md`");
  lines.push("- `raw.json`");
  lines.push("");

  return `${lines.join("\n")}\n`;
}

function writeReports(metadata: RunMetadata): void {
  writeFileSync(join(outputRoot, "summary.md"), renderSummaryReport(metadata), "utf8");

  for (const app of appTargets.map((target) => target.app)) {
    writeFileSync(
      join(outputRoot, `${app}.md`),
      renderAppReport(
        app,
        findings.filter((finding) => finding.app === app),
      ),
      "utf8",
    );
  }

  writeFileSync(
    join(outputRoot, "raw.json"),
    `${JSON.stringify(
      {
        generatedAt: metadata.generatedAt,
        branch: metadata.branch,
        commit: metadata.commit,
        workingTree: metadata.workingTree,
        scannedRoots: metadata.scannedRoots,
        excludedPaths: metadata.excludedPaths,
        outputRoot: toRelative(outputRoot),
        totalFindings: findings.length,
        totals: totalsFor(findings),
        totalsByApp: Object.fromEntries(
          appTargets.map((target) => [target.app, totalsFor(findings.filter((finding) => finding.app === target.app))]),
        ),
        findings: findings.slice().sort((left, right) => left.relativePath.localeCompare(right.relativePath) || compareFindings(left, right)),
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
}

resetOutputRoot();

const gitInfo = readGitInfo();
const metadata: RunMetadata = {
  generatedAt: new Date().toISOString(),
  branch: gitInfo.branch,
  commit: gitInfo.commit,
  workingTree: gitInfo.workingTree,
  scannedRoots: appTargets.map((target) => toRelative(target.root)),
  excludedPaths,
};

for (const target of appTargets) {
  for (const filePath of collectFiles(target.root)) {
    scanFile(target.app, filePath);
  }
}

writeReports(metadata);

const totals = totalsFor(findings);
console.log(`i18n hardcoded UI scan complete`);
console.log(`Generated at: ${metadata.generatedAt}`);
console.log(`Git: ${metadata.branch} @ ${metadata.commit} (${metadata.workingTree})`);
console.log(`Reports: ${toRelative(outputRoot)}`);
console.log(`Findings: ${totals.total} total (${totals.high} high, ${totals.medium} medium, ${totals.low} low)`);

for (const target of appTargets) {
  const appTotals = totalsFor(findings.filter((finding) => finding.app === target.app));

  console.log(`${target.app}: ${appTotals.total} total (${appTotals.high} high, ${appTotals.medium} medium, ${appTotals.low} low)`);
}

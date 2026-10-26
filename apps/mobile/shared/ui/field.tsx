/**
 * Field — a real text input with the kit's look: uppercase label, icon, focus
 * ring, optional trailing slot, and hint / error text. Controlled via
 * `value` / `onChangeText`.
 *
 * iOS New Architecture (Fabric — forced by Expo Go SDK 54) drops a TextInput's
 * first responder when the view that CONTAINS it gets re-styled. So the focus
 * ring must NOT restyle the input's container: the row holding the `<TextInput>`
 * is fully static, and the focus border/shadow lives in a sibling absolute
 * overlay (`pointerEvents="none"`). Toggling the overlay never touches the
 * input's view → tapping a field keeps the keyboard up. The input is also
 * memoized so the focus re-render doesn't re-commit it.
 */
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Platform,
  Pressable,
  TextInput,
  View,
  Text,
  type KeyboardTypeOptions,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from "react-native";

import { accent, controlH, radii, type, usePalette } from "@shared/theme";

import { Icon } from "./icon";

// react-native-web only: kill the browser's blue focus ring on the <input>.
const WEB_INPUT_RESET =
  Platform.OS === "web"
    ? ({ outlineStyle: "none", outlineWidth: 0 } as unknown as TextStyle)
    : null;

interface FieldInputProps {
  value?: string;
  defaultValue?: string;
  onChangeText?: (t: string) => void;
  placeholder?: string;
  placeholderTextColor: string;
  secureTextEntry?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  autoComplete?: TextInputProps["autoComplete"];
  textContentType?: TextInputProps["textContentType"];
  autoFocus?: boolean;
  editable?: boolean;
  accessibilityLabel?: string;
  returnKeyType?: TextInputProps["returnKeyType"];
  onSubmitEditing?: TextInputProps["onSubmitEditing"];
  submitBehavior?: TextInputProps["submitBehavior"];
  multiline?: boolean;
  numberOfLines?: number;
  maxLength?: number;
  /** Caret/selection tint — ember on dark surfaces (scan/invite inputs). */
  selectionColor?: string;
  inputRef?: React.Ref<TextInput>;
  onFocus: () => void;
  onBlur: () => void;
  style: StyleProp<TextStyle>;
}

const FieldInput = memo(function FieldInput({
  value, defaultValue, onChangeText, placeholder, placeholderTextColor, secureTextEntry,
  keyboardType, autoCapitalize, autoComplete, textContentType, autoFocus, editable,
  accessibilityLabel, returnKeyType, onSubmitEditing, submitBehavior, multiline, numberOfLines,
  maxLength, selectionColor, inputRef, onFocus, onBlur, style,
}: FieldInputProps): React.JSX.Element {
  return (
    <TextInput
      ref={inputRef}
      value={value}
      defaultValue={defaultValue}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={placeholderTextColor}
      secureTextEntry={secureTextEntry}
      keyboardType={keyboardType}
      autoCapitalize={autoCapitalize}
      autoComplete={autoComplete}
      textContentType={textContentType}
      autoFocus={autoFocus}
      editable={editable}
      accessibilityLabel={accessibilityLabel}
      returnKeyType={returnKeyType}
      onSubmitEditing={onSubmitEditing}
      submitBehavior={submitBehavior}
      multiline={multiline}
      numberOfLines={numberOfLines}
      maxLength={maxLength}
      selectionColor={selectionColor}
      onFocus={onFocus}
      onBlur={onBlur}
      style={style}
    />
  );
});

export interface FieldProps {
  label?: string;
  /** Marks the label with the brand asterisk. Purely visual — validation is
   *  still the caller's job; this only tells the user before they submit. */
  required?: boolean;
  value?: string;
  onChangeText?: (t: string) => void;
  placeholder?: string;
  icon?: string;
  trailing?: React.ReactNode;
  hint?: string;
  error?: string;
  secureTextEntry?: boolean;
  /** Show an eye toggle that reveals/masks the value (password fields). */
  secureToggle?: boolean;
  /** a11y labels for the reveal toggle (defaults to English). */
  showLabel?: string;
  hideLabel?: string;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  /** Autofill / input-purpose hints (password managers, OS AutoFill; WCAG 2.2 1.3.5). */
  autoComplete?: TextInputProps["autoComplete"];
  textContentType?: TextInputProps["textContentType"];
  autoFocus?: boolean;
  editable?: boolean;
  /** Focus-chaining: "next" on intermediate fields, "done"/"go" on the last. */
  returnKeyType?: TextInputProps["returnKeyType"];
  onSubmitEditing?: TextInputProps["onSubmitEditing"];
  /** RN submit behavior ("submit" keeps focus — pair with onSubmitEditing→next.focus()). */
  submitBehavior?: TextInputProps["submitBehavior"];
  multiline?: boolean;
  numberOfLines?: number;
  maxLength?: number;
  /** Caret/selection tint. Defaults to ember (`accent.base`) — the brand caret. */
  selectionColor?: string;
  /** Imperative handle for focus-chaining (`ref.current?.focus()`). */
  inputRef?: React.Ref<TextInput>;
}

export function Field({
  label, required, value, onChangeText, placeholder, icon, trailing, hint, error,
  secureTextEntry, secureToggle, showLabel = "Show password", hideLabel = "Hide password",
  keyboardType, autoCapitalize = "none", autoComplete, textContentType, autoFocus, editable = true,
  returnKeyType, onSubmitEditing, submitBehavior, multiline, numberOfLines, maxLength,
  selectionColor = accent.base, inputRef,
}: FieldProps): React.JSX.Element {
  const p = usePalette();
  const [focused, setFocused] = useState(false);
  const [shown, setShown] = useState(false);
  const border = error ? p.danger : focused ? accent.base : p.border;
  const canToggle = !!secureToggle && !!secureTextEntry;
  const effectiveSecure = secureTextEntry && !(canToggle && shown);

  const onFocus = useCallback(() => setFocused(true), []);
  const onBlur = useCallback(() => setFocused(false), []);

  // A password field asks for a LATIN keyboard unless the caller says otherwise.
  //
  // iOS picks the language of a `default` keyboard by restoring the last one the
  // user typed on. Every form here puts an email field (`email-address` — always
  // Latin) above the password, so focus moves email → password and the layout
  // snaps back to the device language: on a Russian phone the user types
  // "Qwer123%" and the field receives "Йцук123%". It is masked, so the first
  // sign anything went wrong is a rejected login. `ascii-capable` requests a
  // Latin layout while leaving the globe key in place for a password that
  // genuinely is not ASCII.
  const effectiveKeyboardType = keyboardType ?? (secureTextEntry ? "ascii-capable" : undefined);

  // Uncontrolled-on-native text (iOS/Android): Android Fabric races a
  // controlled `value` echo against the native edit, dropping/blanking typed
  // text. The native input fully owns its text — `value` is NEVER passed to it
  // (so there are no controlled/uncontrolled transitions and no way for a
  // stale render to overwrite what the user typed). Programmatic writes from
  // the parent (clears, form prefills) are applied imperatively, and ONLY when
  // the `value` prop actually changed between renders to something that isn't
  // the echo of the user's own typing. Web keeps the classic controlled input
  // (the DOM never had the bug).
  const loose = Platform.OS !== "web";
  const innerRef = useRef<TextInput | null>(null);
  const setRefs = useCallback(
    (node: TextInput | null) => {
      innerRef.current = node;
      if (typeof inputRef === "function") inputRef(node);
      else if (inputRef && typeof inputRef === "object") (inputRef as React.MutableRefObject<TextInput | null>).current = node;
    },
    [inputRef],
  );
  const initial = useRef(value ?? "").current;
  const nativeText = useRef(value ?? "");
  const onChangeRef = useRef(onChangeText);
  onChangeRef.current = onChangeText;
  const handleChangeText = useCallback((t: string) => {
    nativeText.current = t;
    onChangeRef.current?.(t);
  }, []);
  const prevValue = useRef(value);
  useEffect(() => {
    if (!loose) return;
    const prev = prevValue.current;
    prevValue.current = value;
    if (value === prev) return; // parent value untouched this render
    if ((value ?? "") === nativeText.current) return; // echo of the user's own typing
    nativeText.current = value ?? "";
    // `setNativeProps` is a no-op on Fabric (new architecture), which silently
    // swallowed every programmatic clear — a "reset" left the old text on
    // screen. `clear()` goes through the `setTextAndSelection` native command,
    // which Fabric does implement.
    if ((value ?? "") === "") innerRef.current?.clear();
    else innerRef.current?.setNativeProps({ text: value ?? "" });
  }, [value, loose]);

  // The input + its CONTAINER stay referentially stable so a focus re-render
  // never restyles them (which would drop the iOS first responder).
  // Android + secureTextEntry + custom fontFamily is a long-standing RN bug:
  // the masking dots (and sometimes revealed text) render invisible. Secure
  // fields on Android use the system typeface instead. (Restyling on the
  // show/hide toggle is safe here — the focus-drop-on-restyle quirk is iOS.)
  const androidSecure = Platform.OS === "android" && !!effectiveSecure;
  const inputStyle = useMemo<StyleProp<TextStyle>>(
    // No lineHeight on a single-line TextInput — on iOS a fixed lineHeight clips
    // the glyphs and breaks vertical centering; the fixed-height row centers it.
    // CRITICAL: the key must be OMITTED, not overridden with `undefined` —
    // `[{...lineHeight: 21}, {lineHeight: undefined}]` kills the Android Fabric
    // EditText on the first keystroke (view is torn down; typing shows nothing).
    () => {
      const { lineHeight: _omitted, ...baseType } = type({ weight: 500, size: 15, color: p.fg });
      return [
        baseType,
        { flex: 1, padding: 0 },
        androidSecure ? { fontFamily: undefined } : null,
        // `alignSelf: stretch` — the row is 96pt tall, but an EMPTY multiline
        // input is only one line high and sits at the top (the row aligns its
        // children to flex-start). Without stretching, the other ~60pt of the
        // box belong to the row View, so tapping the middle of a big empty
        // textarea focused nothing at all. Stretch the input alone — the icon
        // and the trailing slot keep their own alignment.
        multiline ? ({ textAlignVertical: "top" as const, lineHeight: 21, paddingTop: 0, alignSelf: "stretch" as const }) : null,
        WEB_INPUT_RESET,
      ];
    },
    [p.fg, multiline, androidSecure],
  );
  const rowStyle = useMemo<ViewStyle>(
    () => ({
      flexDirection: "row",
      alignItems: multiline ? "flex-start" : "center",
      gap: 10,
      ...(multiline ? { minHeight: 96, paddingVertical: 13 } : { height: controlH.field }),
      paddingHorizontal: 14,
      borderRadius: radii.control,
      backgroundColor: p.isDark ? "rgba(255,255,255,0.05)" : p.surface,
    }),
    [p.isDark, p.surface, multiline],
  );

  return (
    <View>
      {label ? (
        // The label is already associated to the input via its
        // `accessibilityLabel`; hide this visual copy from the a11y tree so
        // screen readers don't announce the label twice.
        <Text
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={[type({ weight: 600, size: 11, leading: 1, track: 0.04, color: error ? p.danger : p.fgMuted, transform: "uppercase" }), { marginBottom: 8 }]}
        >
          {label}
          {required ? <Text style={{ color: accent.base }}> *</Text> : null}
        </Text>
      ) : null}
      <View style={{ position: "relative" }}>
        <View style={rowStyle}>
          {icon ? <Icon name={icon} size={18} color={p.fgSubtle} /> : null}
          <FieldInput
            value={loose ? undefined : (value ?? "")}
            defaultValue={loose ? initial : undefined}
            onChangeText={handleChangeText}
            placeholder={placeholder}
            placeholderTextColor={p.fgMuted}
            secureTextEntry={effectiveSecure}
            keyboardType={effectiveKeyboardType}
            autoCapitalize={autoCapitalize}
            autoComplete={autoComplete}
            textContentType={textContentType}
            autoFocus={autoFocus}
            editable={editable}
            // Programmatic label association — screen readers read the label,
            // not just the placeholder (WCAG 1.3.1).
            accessibilityLabel={label}
            returnKeyType={returnKeyType}
            onSubmitEditing={onSubmitEditing}
            submitBehavior={submitBehavior}
            multiline={multiline}
            numberOfLines={numberOfLines}
            maxLength={maxLength}
            selectionColor={selectionColor}
            inputRef={setRefs}
            onFocus={onFocus}
            onBlur={onBlur}
            style={inputStyle}
          />
          {canToggle ? (
            <Pressable
              onPress={() => setShown((s) => !s)}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={shown ? hideLabel : showLabel}
            >
              <Icon name="eye" size={18} color={shown ? accent.base : p.fgSubtle} />
            </Pressable>
          ) : (
            trailing
          )}
        </View>
        {/* Focus/error ring — a sibling overlay, so toggling it never restyles
            the input's container (keeps the keyboard up on iOS Fabric). */}
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: 0, right: 0, top: 0, bottom: 0,
            borderRadius: radii.control,
            borderWidth: 1.5,
            borderColor: border,
            ...(focused && !error
              ? { shadowColor: accent.base, shadowOpacity: 0.18, shadowRadius: 6, shadowOffset: { width: 0, height: 0 } }
              : null),
          }}
        />
      </View>
      {hint || error ? (
        <Text style={[type({ weight: 500, size: 12, leading: 1.4, color: error ? p.danger : p.fgMuted }), { marginTop: 7 }]}>
          {error || hint}
        </Text>
      ) : null}
    </View>
  );
}

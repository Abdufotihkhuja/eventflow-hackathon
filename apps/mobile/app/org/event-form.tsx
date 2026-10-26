/**
 * 4.5 · Create / edit event — the design's five-step wizard.
 *
 * The old screen was one long scroll of every field at once. The design breaks
 * it into Основное → Тип и доступ → Когда → Где → Публикация, because the form
 * is long enough that a phone-sized single scroll hides its own errors: "Далее"
 * validates only the current step and collects that step's failures into one
 * plate at the top, so a mistake is never scrolled off-screen.
 *
 * Every field maps to a real CreateEventDto member. Three that the API has
 * always accepted are wired for the first time here: `accessType` (was pinned
 * to OPEN), `registrationDeadline`, and `onlineUrl` — the last of which the old
 * form collected from the user and then silently dropped on submit.
 *
 * The design's RU/UZ/EN per-field language tabs ARE built, but not as tabs: a
 * tab strip hides whether the other locales are filled, which is the one thing
 * the author needs to see. Each translatable field carries a compact locale
 * summary instead, and editing happens in the 2.2 sheet where all three are
 * visible at once. `translations` / `shortDescription` are real CreateEventDto
 * members, and "Перевести" runs the platform's own POST /translations/batch.
 *
 * Deliberately NOT built: the publication-credit counter — no entitlement data
 * reaches mobile, so it would have been decoration over nothing.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { ScrollView, Text, TextInput, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  blocksToPlainText,
  checkSlug,
  plainTextToBlocks,
  suggestSlug,
  uploadCoverImage,
  useCreateEventMutation,
  useOrgEventDetailQuery,
  useSubmitReviewMutation,
  useUpdateEventMutation,
  type EventAccessType,
  type EventFormPayload,
  type EventLocale,
  type EventTranslations,
  type TranslatableField,
} from "@entities/org-events";
import { useCategoriesQuery } from "@entities/catalog";
import { useAuth, useWorkspaceGate } from "@shared/auth";
import { useI18n } from "@shared/i18n";
import { formatDateStamp, formatTime, hueFromId, patternFromId, resolveMediaUrl } from "@shared/lib/format";
import { haptics } from "@shared/lib/haptics";
import { confirm } from "@shared/lib/confirm";
import { AnimatedPressable, dur, ease, enterStagger } from "@shared/motion";
import { accent, gutter, radii, type, usePalette } from "@shared/theme";
import {
  Btn,
  CoverPicker,
  DateTimeField,
  Field,
  Icon,
  IconBtn,
  LocaleSummary,
  LocationPicker,
  Screen,
  Skeleton,
  TranslationsSheet,
  useToast,
} from "@shared/ui";

import type { StringKey } from "@shared/i18n/strings";

type Currency = "UZS" | "USD" | "EUR" | "RUB";
const CURRENCIES: Currency[] = ["UZS", "USD", "EUR", "RUB"];
type EventFormat = "OFFLINE" | "ONLINE" | "HYBRID";

const STEPS = [1, 2, 3, 4, 5] as const;
type Step = (typeof STEPS)[number];

const STEP_TITLE: Record<Step, StringKey> = {
  1: "org.form.step.basics",
  2: "org.form.step.access",
  3: "org.form.step.when",
  4: "org.form.step.where",
  5: "org.form.step.publish",
};

const ACCESS: { key: EventAccessType; label: StringKey; desc: StringKey }[] = [
  { key: "OPEN", label: "org.form.access.OPEN", desc: "org.form.access.OPEN.desc" },
  { key: "REQUEST", label: "org.form.access.REQUEST", desc: "org.form.access.REQUEST.desc" },
  { key: "INVITE_ONLY", label: "org.form.access.INVITE_ONLY", desc: "org.form.access.INVITE_ONLY.desc" },
  { key: "PRIVATE", label: "org.form.access.PRIVATE", desc: "org.form.access.PRIVATE.desc" },
];

const FORMATS: { key: EventFormat; desc: StringKey }[] = [
  { key: "OFFLINE", desc: "org.form.format.OFFLINE.desc" },
  { key: "ONLINE", desc: "org.form.format.ONLINE.desc" },
  { key: "HYBRID", desc: "org.form.format.HYBRID.desc" },
];

/** Combine a date-only and a time-only Date into one ISO instant. When only
 *  one is set, the other's fields default sanely (time → 09:00). */
function combine(date: Date | null, time: Date | null): Date | null {
  if (!date) return null;
  const out = new Date(date);
  if (time) out.setHours(time.getHours(), time.getMinutes(), 0, 0);
  else out.setHours(9, 0, 0, 0);
  return out;
}

type ErrKey = "title" | "desc" | "slug" | "price" | "date" | "end" | "deadline" | "venue" | "url" | "capacity";
type FieldErrors = Partial<Record<ErrKey, string>>;

/* ── small building blocks ─────────────────────────────────────────────────── */

/** Field label with the design's ember required-marker. */
function Label({ children, required }: { children: React.ReactNode; required?: boolean }): React.JSX.Element {
  const p = usePalette();
  return (
    <Text maxFontSizeMultiplier={1.3} style={type({ weight: 600, size: 13, leading: 1, color: p.fgDefault })}>
      {children}
      {required ? <Text style={{ color: accent.base }}> *</Text> : null}
    </Text>
  );
}

/** Selectable card — the shared shell behind type / access / format pickers. */
function PickCard({
  on, onPress, children, style,
}: {
  on: boolean;
  onPress: () => void;
  children: React.ReactNode;
  style?: object;
}): React.JSX.Element {
  const p = usePalette();
  return (
    <AnimatedPressable
      accessibilityRole="radio"
      accessibilityState={{ selected: on }}
      haptic="select"
      scaleTo={0.98}
      onPress={onPress}
      style={{
        padding: 13,
        borderRadius: radii.control,
        backgroundColor: on ? accent.soft : p.surface,
        borderWidth: on ? 2 : 1,
        borderColor: on ? accent.base : p.border,
        ...style,
      }}
    >
      {children}
    </AnimatedPressable>
  );
}

/** iOS-style switch at the design's 51×31. */
function Toggle({ on, onPress, label }: { on: boolean; onPress: () => void; label: string }): React.JSX.Element {
  const p = usePalette();
  return (
    <AnimatedPressable
      accessibilityRole="switch"
      accessibilityState={{ checked: on }}
      accessibilityLabel={label}
      haptic="select"
      scaleTo={0.94}
      onPress={onPress}
      style={{
        width: 51,
        height: 31,
        borderRadius: radii.pill,
        padding: 2,
        backgroundColor: on ? accent.base : p.borderStrong,
        alignItems: on ? "flex-end" : "flex-start",
        justifyContent: "center",
      }}
    >
      <View style={{ width: 27, height: 27, borderRadius: radii.pill, backgroundColor: "#fff" }} />
    </AnimatedPressable>
  );
}

/** A row inside a grouped card (toggles, date pairs). */
function GroupRow({ children, first }: { children: React.ReactNode; first?: boolean }): React.JSX.Element {
  const p = usePalette();
  return (
    <View>
      {first ? null : <View style={{ height: 1, backgroundColor: p.borderSubtle, marginHorizontal: 14 }} />}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, padding: 14 }}>
        {children}
      </View>
    </View>
  );
}

/** Dashed advisory note (design uses it for the multi-day hint). */
function Note({ children }: { children: React.ReactNode }): React.JSX.Element {
  const p = usePalette();
  return (
    <View
      style={{
        flexDirection: "row",
        gap: 10,
        padding: 12,
        borderRadius: radii.control,
        backgroundColor: p.canvas,
        borderWidth: 1,
        borderColor: p.borderStrong,
        borderStyle: "dashed",
      }}
    >
      <Icon name="info" size={16} sw={2} color={p.fgMuted} />
      <Text maxFontSizeMultiplier={1.3} style={[type({ weight: 400, size: 12, leading: 1.5, color: p.fgDefault }), { flex: 1 }]}>
        {children}
      </Text>
    </View>
  );
}

/* ── screen ────────────────────────────────────────────────────────────────── */

export default function EventForm(): React.JSX.Element {
  const router = useRouter();
  const p = usePalette();
  const { t, lang } = useI18n();
  const { workspace } = useAuth();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editing = typeof id === "string" && id.length > 0;

  const detailQ = useOrgEventDetailQuery(editing ? id : undefined);
  const categoriesQ = useCategoriesQuery({ locale: lang });
  const createM = useCreateEventMutation();
  const updateM = useUpdateEventMutation();
  const submitM = useSubmitReviewMutation();

  const [step, setStep] = useState<Step>(1);

  // ── form state ──────────────────────────────────────────────────────────
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [description, setDescription] = useState("");
  // Per-locale copies of the plain-text fields. The HOST locale is whatever the
  // app is running in — that is the language the author is typing in.
  const [translations, setTranslations] = useState<EventTranslations>({});
  const [trField, setTrField] = useState<TranslatableField | null>(null);
  const [coverPath, setCoverPath] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const [free, setFree] = useState(true);
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState<Currency>("UZS");
  const [accessType, setAccessType] = useState<EventAccessType>("OPEN");
  const [format, setFormat] = useState<EventFormat>("OFFLINE");
  const [categoryIds, setCategoryIds] = useState<string[]>([]);

  const [startDate, setStartDate] = useState<Date | null>(null);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [deadlineOn, setDeadlineOn] = useState(false);
  const [deadlineDate, setDeadlineDate] = useState<Date | null>(null);
  const [deadlineTime, setDeadlineTime] = useState<Date | null>(null);

  const [venue, setVenue] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [onlineUrl, setOnlineUrl] = useState("");
  /** Map point for the venue — drives the public event map, so it is worth
   *  carrying even though the API leaves it optional. */
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [mapOpen, setMapOpen] = useState(false);

  const [capacity, setCapacity] = useState("");
  const [registrationOpen, setRegistrationOpen] = useState(true);
  const [commentsEnabled, setCommentsEnabled] = useState(true);

  const [errors, setErrors] = useState<FieldErrors>({});
  const [dirty, setDirty] = useState(false);

  // Prefill once, when the edit payload arrives. A ref guards against a refetch
  // (e.g. window refocus) clobbering the user's in-progress edits.
  const prefilled = useRef(false);
  const detail = detailQ.data;
  useEffect(() => {
    if (!editing || !detail || prefilled.current) return;
    prefilled.current = true;
    setTitle(detail.title);
    setSlug(detail.slug ?? "");
    setShortDescription(detail.shortDescription);
    setDescription(blocksToPlainText(detail.description));
    setTranslations(detail.translations as EventTranslations);
    setCoverPath(detail.coverImagePath);
    setFree(detail.free);
    if (detail.price != null) setPrice(String(detail.price));
    if (detail.currency) setCurrency((detail.currency as Currency) ?? "UZS");
    setAccessType(detail.accessType);
    setFormat(detail.format);
    setCategoryIds(detail.categoryIds);
    if (detail.startDate) {
      const s = new Date(detail.startDate);
      setStartDate(s);
      setStartTime(s);
    }
    if (detail.endDate) {
      const e = new Date(detail.endDate);
      setEndDate(e);
      setEndTime(e);
    }
    if (detail.registrationDeadline) {
      const d = new Date(detail.registrationDeadline);
      setDeadlineOn(true);
      setDeadlineDate(d);
      setDeadlineTime(d);
    }
    setVenue(detail.venue);
    setAddress(detail.address);
    setCity(detail.city);
    setOnlineUrl(detail.onlineUrl);
    setCoords(
      detail.latitude != null && detail.longitude != null
        ? { latitude: detail.latitude, longitude: detail.longitude }
        : null,
    );
    if (detail.capacity != null) setCapacity(String(detail.capacity));
    setRegistrationOpen(detail.registrationOpen);
    setCommentsEnabled(detail.commentsEnabled);
  }, [editing, detail]);

  const mark = <T,>(setter: (v: T) => void) => (v: T): void => {
    setter(v);
    if (!dirty) setDirty(true);
  };

  // ── slug: suggest from the title, then check availability as it is typed ──
  const [slugState, setSlugState] = useState<"idle" | "checking" | "free" | "taken">("idle");
  const slugTouched = useRef(false);
  const slugSeq = useRef(0);

  useEffect(() => {
    const s = slug.trim();
    if (!s) {
      setSlugState("idle");
      return;
    }
    const seq = ++slugSeq.current;
    setSlugState("checking");
    const timer = setTimeout(() => {
      void checkSlug(s, editing && id ? id : undefined)
        .then((ok) => {
          // Ignore a response that a newer keystroke has already superseded.
          if (seq === slugSeq.current) setSlugState(ok ? "free" : "taken");
        })
        .catch(() => {
          if (seq === slugSeq.current) setSlugState("idle");
        });
    }, 400);
    return () => clearTimeout(timer);
  }, [slug, editing, id]);

  /** Derive a slug from the title the first time the user leaves it blank —
   *  never overwrite one they typed themselves. */
  const autoSlug = useCallback(async (): Promise<void> => {
    if (slugTouched.current || slug.trim() || !title.trim()) return;
    try {
      setSlug(await suggestSlug(title.trim(), editing && id ? id : undefined));
    } catch {
      /* a suggestion is a convenience; the field stays editable */
    }
  }, [slug, title, editing, id]);

  // ── validation, per step ────────────────────────────────────────────────
  const online = format === "ONLINE";
  const offline = format === "OFFLINE" || format === "HYBRID";
  const needsUrl = format === "ONLINE" || format === "HYBRID";

  const validateStep = useCallback(
    (s: Step): FieldErrors => {
      const e: FieldErrors = {};
      if (s === 1) {
        const name = title.trim();
        if (!name) e.title = t("org.form.err.nameRequired");
        else if (name.length < 3) e.title = t("org.form.err.nameShort");
        if (!description.trim()) e.desc = t("org.form.err.descRequired");
        if (slug.trim() && slugState === "taken") e.slug = t("org.form.err.slugTaken");
      }
      if (s === 2 && !free) {
        const n = Number(price);
        if (!price.trim() || !Number.isFinite(n) || n <= 0) e.price = t("org.form.err.priceRequired");
      }
      if (s === 3) {
        const start = combine(startDate, startTime);
        if (!start) e.date = t("org.form.err.dateRequired");
        else if (start.getTime() <= Date.now()) e.date = t("org.form.err.datePast");
        const end = combine(endDate, endTime);
        if (start && end && end.getTime() <= start.getTime()) e.end = t("org.form.err.endBeforeStart");
        if (deadlineOn) {
          const dl = combine(deadlineDate, deadlineTime);
          if (!dl) e.deadline = t("org.form.err.deadlineRequired");
          else if (start && dl.getTime() > start.getTime()) e.deadline = t("org.form.err.deadlineAfterStart");
        }
      }
      if (s === 4) {
        if (offline && !venue.trim()) e.venue = t("org.form.err.venueRequired");
        if (needsUrl && !onlineUrl.trim()) e.url = t("org.form.err.urlRequired");
      }
      if (s === 5 && capacity.trim()) {
        const c = Number(capacity);
        if (!Number.isInteger(c) || c <= 0) e.capacity = t("org.form.err.capacityInvalid");
      }
      return e;
    },
    [title, description, slug, slugState, free, price, startDate, startTime, endDate, endTime,
     deadlineOn, deadlineDate, deadlineTime, offline, venue, needsUrl, onlineUrl, capacity, t],
  );

  // ── progress bar ────────────────────────────────────────────────────────
  const progress = useSharedValue(1 / STEPS.length);
  useEffect(() => {
    progress.value = withTiming(step / STEPS.length, { duration: dur.base, easing: ease.standard });
  }, [step, progress]);
  const progressStyle = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));

  // ── payload + submit ────────────────────────────────────────────────────
  function buildPayload(): EventFormPayload {
    const start = combine(startDate, startTime) as Date;
    const end = combine(endDate, endTime) ?? new Date(start.getTime() + 2 * 3600_000);
    const dl = deadlineOn ? combine(deadlineDate, deadlineTime) : null;
    return {
      title: title.trim(),
      shortDescription: shortDescription.trim() || undefined,
      translations: Object.keys(translations).length > 0 ? translations : undefined,
      description: plainTextToBlocks(description),
      type: free ? "FREE" : "PAID",
      format,
      accessType,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      registrationDeadline: dl ? dl.toISOString() : null,
      registrationOpen,
      commentsEnabled,
      venue: offline ? venue.trim() || undefined : undefined,
      address: offline ? address.trim() || undefined : undefined,
      city: offline ? city.trim() || undefined : undefined,
      // Coordinates belong to a physical venue only — an online event has none.
      latitude: offline ? coords?.latitude : undefined,
      longitude: offline ? coords?.longitude : undefined,
      onlineUrl: needsUrl ? onlineUrl.trim() || undefined : undefined,
      price: free ? undefined : Number(price),
      currency: free ? undefined : currency,
      maxParticipants: capacity.trim() ? Number(capacity) : undefined,
      coverImage: coverPath ?? undefined,
      categoryIds: categoryIds.length > 0 ? categoryIds : undefined,
      slug: slug.trim() || undefined,
    };
  }

  /** Validate EVERY step before a terminal action — the user can reach step 5
   *  by editing, without having passed steps 1-4 in this session. */
  function validateAll(): { ok: boolean; firstBad?: Step } {
    for (const s of STEPS) {
      const e = validateStep(s);
      if (Object.keys(e).length > 0) {
        setErrors(e);
        setStep(s);
        return { ok: false, firstBad: s };
      }
    }
    setErrors({});
    return { ok: true };
  }

  const busy = createM.isPending || updateM.isPending || submitM.isPending;

  async function finish(submitForReview: boolean): Promise<void> {
    if (!validateAll().ok) {
      haptics.warn();
      toast.show(t("org.form.err.fix"));
      return;
    }
    const payload = buildPayload();
    try {
      if (editing && id) {
        await updateM.mutateAsync({ id, payload });
        haptics.success();
        toast.show(t("org.form.toast.saved"));
        router.back();
        return;
      }
      const row = await createM.mutateAsync(payload);
      if (!submitForReview) {
        haptics.success();
        toast.show(t("org.form.toast.created"));
        router.replace({ pathname: "/org/event/[id]", params: { id: row.id } });
        return;
      }
      // The design ends the wizard at moderation, not at a draft. Creation and
      // submission are two calls; if the submit half fails the draft still
      // exists, so land on manage rather than losing the user's work.
      try {
        await submitM.mutateAsync(row.id);
        haptics.success();
        router.replace({ pathname: "/org/event/submitted", params: { name: payload.title } });
      } catch {
        haptics.warn();
        toast.show(t("org.form.toast.submitFailed"));
        router.replace({ pathname: "/org/event/[id]", params: { id: row.id } });
      }
    } catch {
      haptics.error();
      toast.show(t("org.form.toast.error"));
    }
  }

  function onNext(): void {
    const e = validateStep(step);
    setErrors(e);
    if (Object.keys(e).length > 0) {
      haptics.warn();
      return;
    }
    if (step === 1) void autoSlug();
    if (step < 5) {
      haptics.tap();
      setStep((s) => (s + 1) as Step);
      return;
    }
    void finish(true);
  }

  function onBack(): void {
    if (step > 1) {
      haptics.tap();
      setErrors({});
      setStep((s) => (s - 1) as Step);
    }
  }

  async function onPickCover(file?: File): Promise<void> {
    if (!file) return; // native has no picker
    setUploading(true);
    try {
      setCoverPath(await uploadCoverImage(file));
      if (!dirty) setDirty(true);
    } catch {
      toast.show(t("org.form.cover.error"));
    } finally {
      setUploading(false);
    }
  }

  function onClose(): void {
    if (!dirty) {
      router.back();
      return;
    }
    confirm({
      title: t("org.form.discard.title"),
      message: t("org.form.discard.body"),
      confirmText: t("org.form.discard.confirm"),
      cancelText: t("org.form.discard.cancel"),
      destructive: true,
      onConfirm: () => router.back(),
    });
  }

  // The author types in whatever language the app is running in, so that is
  // the host locale and the translation source.
  const hostLocale = (lang === "uz" || lang === "en" ? lang : "ru") as EventLocale;
  const TR_LABEL: Record<TranslatableField, StringKey> = {
    title: "org.form.name",
    shortDescription: "org.form.shortDescription",
    venue: "org.form.venue",
  };

  const categories = categoriesQ.data ?? [];
  const seed = editing && id ? id : title || "new-event";
  const errorList = useMemo(() => Object.values(errors).filter(Boolean) as string[], [errors]);

  // Gate, not a bare null-check: a cold start restores the workspace
  // asynchronously, and redirecting during that window is what threw
  // organizers into the participant feed on launch.
  const gate = useWorkspaceGate();
  if (gate) return gate;
  const loadingEdit = editing && detailQ.isPending;

  const slugHint: Record<typeof slugState, { text: StringKey; color: string }> = {
    idle: { text: "org.form.slug.hint", color: p.fgSubtle },
    checking: { text: "org.form.slug.checking", color: p.fgSubtle },
    free: { text: "org.form.slug.free", color: p.success },
    taken: { text: "org.form.slug.taken", color: p.danger },
  };

  return (
    <Screen>
      {/* ── header: close · step · draft ─────────────────────────────────── */}
      <View
        style={{
          flexShrink: 0,
          paddingTop: insets.top,
          backgroundColor: p.surface,
          borderBottomWidth: 1,
          borderBottomColor: p.border,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", paddingTop: 4, paddingBottom: 10, paddingHorizontal: 12, gap: 8 }}>
          <IconBtn name="x" size={40} onPress={onClose} accessibilityLabel={t("org.form.a11yClose")} />
          <View style={{ flex: 1, alignItems: "center", gap: 2 }}>
            <Text numberOfLines={1} maxFontSizeMultiplier={1.2} style={type({ weight: 600, size: 15, leading: 1, color: p.fg })}>
              {editing ? t("org.form.titleEdit") : t("org.form.titleNew")}
            </Text>
            <Text maxFontSizeMultiplier={1.2} style={type({ role: "mono", weight: 400, size: 11, leading: 1, color: p.fgSubtle })}>
              {t("org.form.stepOf", { n: step, total: STEPS.length })}
            </Text>
          </View>
          {editing ? (
            <View style={{ width: 40 }} />
          ) : (
            <AnimatedPressable
              accessibilityRole="button"
              haptic="tap"
              scaleTo={0.95}
              hitSlop={8}
              onPress={() => void finish(false)}
              style={{ minWidth: 40, alignItems: "flex-end", paddingRight: 4 }}
            >
              <Text maxFontSizeMultiplier={1.2} style={type({ weight: 600, size: 13, leading: 1, color: accent.base })}>
                {t("org.form.draft")}
              </Text>
            </AnimatedPressable>
          )}
        </View>

        {/* progress */}
        <View style={{ marginHorizontal: gutter, height: 3, borderRadius: radii.pill, backgroundColor: p.sunken, overflow: "hidden" }}>
          <Animated.View style={[{ height: "100%", backgroundColor: accent.base }, progressStyle]} />
        </View>

        <Text
          maxFontSizeMultiplier={1.3}
          style={[
            type({ role: "display", weight: 700, size: 20, leading: 1.15, track: -0.03, color: p.fg }),
            { marginHorizontal: gutter, marginTop: 12, marginBottom: 12 },
          ]}
        >
          {t(STEP_TITLE[step])}
        </Text>
      </View>

      {loadingEdit ? (
        <View style={{ paddingHorizontal: gutter, paddingTop: 16, gap: 16 }}>
          <Skeleton h={50} r={radii.control} />
          <Skeleton h={50} r={radii.control} />
          <Skeleton h={120} r={radii.control} />
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: gutter, paddingTop: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="on-drag"
          automaticallyAdjustKeyboardInsets
        >
          {/* Error plate — the whole point of stepping the form */}
          {errorList.length > 0 ? (
            <Animated.View
              entering={enterStagger(0)}
              accessibilityRole="alert"
              style={{
                padding: 12,
                marginBottom: 18,
                borderRadius: radii.control,
                backgroundColor: p.dangerSoft,
                borderWidth: 1,
                borderColor: p.danger,
                gap: 6,
              }}
            >
              <Text maxFontSizeMultiplier={1.3} style={type({ weight: 600, size: 13, leading: 1.2, color: p.dangerSoftFg })}>
                {t("org.form.err.count", { n: errorList.length })}
              </Text>
              {errorList.map((msg) => (
                <Text key={msg} maxFontSizeMultiplier={1.3} style={type({ weight: 400, size: 12, leading: 1.4, color: p.dangerSoftFg })}>
                  {`· ${msg}`}
                </Text>
              ))}
            </Animated.View>
          ) : null}

          {/* ── 1 · Основное ──────────────────────────────────────────────── */}
          {step === 1 ? (
            <View style={{ gap: 18 }}>
              <View style={{ gap: 7 }}>
                <Field
                  label={t("org.form.name")}
                  required
                  value={title}
                  onChangeText={mark(setTitle)}
                  placeholder={t("org.form.namePlaceholder")}
                  error={errors.title}
                  autoCapitalize="sentences"
                  maxLength={120}
                />
                <LocaleSummary
                  hostLocale={hostLocale}
                  host={title}
                  values={translations.title ?? {}}
                  onPress={() => setTrField("title")}
                />
              </View>

              <View style={{ gap: 7 }}>
                <Field
                  label={t("org.form.shortDescription")}
                  value={shortDescription}
                  onChangeText={mark(setShortDescription)}
                  placeholder={t("org.form.shortDescriptionPlaceholder")}
                  autoCapitalize="sentences"
                  multiline
                  numberOfLines={2}
                  maxLength={500}
                  hint={`${shortDescription.length}/500`}
                />
                <LocaleSummary
                  hostLocale={hostLocale}
                  host={shortDescription}
                  values={translations.shortDescription ?? {}}
                  onPress={() => setTrField("shortDescription")}
                />
              </View>

              {/* slug — /e/ prefix + live availability */}
              <View style={{ gap: 7 }}>
                <Label>{t("org.form.slug")}</Label>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    height: 48,
                    paddingHorizontal: 14,
                    borderRadius: radii.control,
                    backgroundColor: p.surface,
                    borderWidth: 1,
                    borderColor: errors.slug ? p.danger : p.border,
                  }}
                >
                  <Text style={type({ role: "mono", weight: 400, size: 14, leading: 1, color: p.fgSubtle })}>/e/</Text>
                  <TextInput
                    value={slug}
                    onChangeText={(v) => {
                      slugTouched.current = true;
                      mark(setSlug)(v.toLowerCase().replace(/[^a-z0-9-]/g, "-"));
                    }}
                    placeholder={t("org.form.slugPlaceholder")}
                    placeholderTextColor={p.fgSubtle}
                    autoCapitalize="none"
                    autoCorrect={false}
                    accessibilityLabel={t("org.form.slug")}
                    style={[type({ role: "mono", weight: 400, size: 15, leading: 1, color: p.fg }), { flex: 1, height: "100%", padding: 0 }]}
                  />
                </View>
                <Text maxFontSizeMultiplier={1.3} style={type({ role: "mono", weight: 500, size: 12, leading: 1.3, color: slugHint[slugState].color })}>
                  {t(slugHint[slugState].text)}
                </Text>
                {errors.slug ? (
                  <Text maxFontSizeMultiplier={1.3} style={type({ weight: 400, size: 12, leading: 1.3, color: p.danger })}>{errors.slug}</Text>
                ) : null}
              </View>

              <Field
                label={t("org.form.description")}
                required
                value={description}
                onChangeText={mark(setDescription)}
                placeholder={t("org.form.descriptionPlaceholder")}
                error={errors.desc}
                multiline
                numberOfLines={5}
                autoCapitalize="sentences"
                maxLength={2000}
              />

              <View style={{ gap: 7 }}>
                <Label>{t("org.form.cover")}</Label>
                <CoverPicker
                  coverUrl={resolveMediaUrl(coverPath ?? undefined)}
                  hue={hueFromId(seed)}
                  pattern={patternFromId(seed)}
                  uploading={uploading}
                  onPick={onPickCover as never}
                  onRemove={() => {
                    setCoverPath(null);
                    if (!dirty) setDirty(true);
                  }}
                />
              </View>
            </View>
          ) : null}

          {/* ── 2 · Тип и доступ ──────────────────────────────────────────── */}
          {step === 2 ? (
            <View style={{ gap: 20 }}>
              <View style={{ gap: 9 }}>
                <Label>{t("org.form.type")}</Label>
                <View style={{ flexDirection: "row", gap: 10 }}>
                  {[true, false].map((isFree) => (
                    <PickCard
                      key={String(isFree)}
                      on={free === isFree}
                      onPress={() => {
                        mark(setFree)(isFree);
                        setErrors((prev) => ({ ...prev, price: undefined }));
                      }}
                      style={{ flex: 1, gap: 4 }}
                    >
                      <Text maxFontSizeMultiplier={1.3} style={type({ weight: 600, size: 14, leading: 1, color: free === isFree ? accent.ink : p.fg })}>
                        {t(isFree ? "org.form.free" : "org.form.paid")}
                      </Text>
                      <Text maxFontSizeMultiplier={1.3} style={type({ weight: 400, size: 11, leading: 1.3, color: p.fgMuted })}>
                        {t(isFree ? "org.form.free.desc" : "org.form.paid.desc")}
                      </Text>
                    </PickCard>
                  ))}
                </View>
              </View>

              {!free ? (
                <View style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
                  <View style={{ flex: 2 }}>
                    <Field
                      label={t("org.form.price")}
                      required
                      value={price}
                      onChangeText={mark(setPrice)}
                      placeholder={t("org.form.pricePlaceholder")}
                      error={errors.price}
                      keyboardType="number-pad"
                    />
                  </View>
                  <View style={{ flex: 1, gap: 7 }}>
                    <Label>{t("org.form.currency")}</Label>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                      {CURRENCIES.map((c) => {
                        const on = currency === c;
                        return (
                          <AnimatedPressable
                            key={c}
                            accessibilityRole="button"
                            accessibilityState={{ selected: on }}
                            haptic="select"
                            scaleTo={0.96}
                            onPress={() => mark(setCurrency)(c)}
                            style={{
                              paddingHorizontal: 10,
                              height: 34,
                              alignItems: "center",
                              justifyContent: "center",
                              borderRadius: radii.control,
                              backgroundColor: on ? accent.soft : p.surface,
                              borderWidth: 1,
                              borderColor: on ? accent.base : p.border,
                            }}
                          >
                            <Text maxFontSizeMultiplier={1.2} style={type({ role: "mono", weight: 600, size: 12, leading: 1, color: on ? accent.ink : p.fgDefault })}>
                              {c}
                            </Text>
                          </AnimatedPressable>
                        );
                      })}
                    </View>
                  </View>
                </View>
              ) : null}

              <View style={{ gap: 9 }}>
                <Label>{t("org.form.access")}</Label>
                <View style={{ gap: 8 }}>
                  {ACCESS.map(({ key, label, desc }) => {
                    const on = accessType === key;
                    return (
                      <PickCard key={key} on={on} onPress={() => mark(setAccessType)(key)} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                        <View
                          style={{
                            width: 20,
                            height: 20,
                            borderRadius: radii.pill,
                            borderWidth: 2,
                            borderColor: on ? accent.base : p.borderStrong,
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          {on ? <View style={{ width: 9, height: 9, borderRadius: radii.pill, backgroundColor: accent.base }} /> : null}
                        </View>
                        <View style={{ flex: 1, gap: 2 }}>
                          <Text maxFontSizeMultiplier={1.3} style={type({ weight: 600, size: 14, leading: 1.15, color: on ? accent.ink : p.fg })}>
                            {t(label)}
                          </Text>
                          <Text maxFontSizeMultiplier={1.3} style={type({ weight: 400, size: 11, leading: 1.3, color: p.fgMuted })}>
                            {t(desc)}
                          </Text>
                        </View>
                      </PickCard>
                    );
                  })}
                </View>
              </View>

              <View style={{ gap: 9 }}>
                <Label>{t("org.form.format")}</Label>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {FORMATS.map(({ key, desc }) => {
                    const on = format === key;
                    return (
                      <PickCard key={key} on={on} onPress={() => mark(setFormat)(key)} style={{ flex: 1, alignItems: "center", gap: 3 }}>
                        <Text maxFontSizeMultiplier={1.2} style={type({ role: "mono", weight: 600, size: 12, leading: 1, color: on ? accent.ink : p.fg })}>
                          {t(`org.form.format.${key}` as StringKey)}
                        </Text>
                        <Text maxFontSizeMultiplier={1.2} style={type({ weight: 400, size: 11, leading: 1.2, color: p.fgMuted })}>
                          {t(desc)}
                        </Text>
                      </PickCard>
                    );
                  })}
                </View>
              </View>

              {categories.length > 0 ? (
                <View style={{ gap: 9 }}>
                  <Label>{t("org.form.categories")}</Label>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                    {categories.map((c) => {
                      const on = categoryIds.includes(c.id);
                      return (
                        <AnimatedPressable
                          key={c.id}
                          accessibilityRole="button"
                          accessibilityState={{ selected: on }}
                          haptic="select"
                          scaleTo={0.96}
                          onPress={() =>
                            mark(setCategoryIds)(on ? categoryIds.filter((x) => x !== c.id) : [...categoryIds, c.id])
                          }
                          style={{
                            paddingHorizontal: 13,
                            paddingVertical: 10,
                            borderRadius: radii.pill,
                            backgroundColor: on ? p.inverse : p.surface,
                            borderWidth: 1,
                            borderColor: on ? "transparent" : p.border,
                          }}
                        >
                          <Text maxFontSizeMultiplier={1.3} style={type({ weight: 500, size: 13, leading: 1, color: on ? p.fgInverse : p.fgDefault })}>
                            {c.name}
                          </Text>
                        </AnimatedPressable>
                      );
                    })}
                  </View>
                </View>
              ) : null}
            </View>
          ) : null}

          {/* ── 3 · Когда ─────────────────────────────────────────────────── */}
          {step === 3 ? (
            <View style={{ gap: 18 }}>
              <View style={{ flexDirection: "row", gap: 10 }}>
                <DateTimeField
                  label={t("org.form.date")}
                  mode="date"
                  value={startDate}
                  onChange={mark(setStartDate)}
                  icon="cal"
                  placeholder={t("org.form.datePlaceholder")}
                  error={errors.date}
                  minimumDate={new Date()}
                />
                <DateTimeField
                  label={t("org.form.time")}
                  mode="time"
                  value={startTime}
                  onChange={mark(setStartTime)}
                  icon="clock"
                  placeholder={t("org.form.timePlaceholder")}
                />
              </View>

              <View style={{ flexDirection: "row", gap: 10 }}>
                <DateTimeField
                  label={t("org.form.endDate")}
                  mode="date"
                  value={endDate}
                  onChange={mark(setEndDate)}
                  icon="cal"
                  placeholder={t("org.form.datePlaceholder")}
                  error={errors.end}
                  minimumDate={startDate ?? new Date()}
                />
                <DateTimeField
                  label={t("org.form.endTime")}
                  mode="time"
                  value={endTime}
                  onChange={mark(setEndTime)}
                  icon="clock"
                  placeholder={t("org.form.timePlaceholder")}
                />
              </View>

              {/* Registration deadline — a real API field, off by default */}
              <View style={{ backgroundColor: p.surface, borderWidth: 1, borderColor: p.border, borderRadius: radii.card, overflow: "hidden" }}>
                <GroupRow first>
                  <View style={{ flex: 1, gap: 3 }}>
                    <Text maxFontSizeMultiplier={1.3} style={type({ weight: 600, size: 14, leading: 1.15, color: p.fg })}>
                      {t("org.form.deadline")}
                    </Text>
                    <Text maxFontSizeMultiplier={1.3} style={type({ weight: 400, size: 11, leading: 1.4, color: p.fgMuted })}>
                      {t(deadlineOn ? "org.form.deadline.on" : "org.form.deadline.off")}
                    </Text>
                  </View>
                  <Toggle
                    on={deadlineOn}
                    label={t("org.form.deadline")}
                    onPress={() => {
                      const next = !deadlineOn;
                      mark(setDeadlineOn)(next);
                      setErrors((prev) => ({ ...prev, deadline: undefined }));
                      // Seed with the start day so the picker opens somewhere useful.
                      if (next && !deadlineDate && startDate) setDeadlineDate(startDate);
                    }}
                  />
                </GroupRow>
                {deadlineOn ? (
                  <View style={{ flexDirection: "row", gap: 10, paddingHorizontal: 14, paddingBottom: 14 }}>
                    <DateTimeField
                      label={t("org.form.date")}
                      mode="date"
                      value={deadlineDate}
                      onChange={mark(setDeadlineDate)}
                      icon="cal"
                      placeholder={t("org.form.datePlaceholder")}
                      error={errors.deadline}
                      maximumDate={startDate ?? undefined}
                    />
                    <DateTimeField
                      label={t("org.form.time")}
                      mode="time"
                      value={deadlineTime}
                      onChange={mark(setDeadlineTime)}
                      icon="clock"
                      placeholder={t("org.form.timePlaceholder")}
                    />
                  </View>
                ) : null}
              </View>

              <Note>{t("org.form.multiDayHint")}</Note>
            </View>
          ) : null}

          {/* ── 4 · Где ───────────────────────────────────────────────────── */}
          {step === 4 ? (
            <View style={{ gap: 18 }}>
              {offline ? (
                <>
                  <View style={{ gap: 7 }}>
                    <Field
                      label={t("org.form.venue")}
                      required
                      value={venue}
                      onChangeText={mark(setVenue)}
                      placeholder={t("org.form.venuePlaceholder")}
                      icon="pin"
                      error={errors.venue}
                      autoCapitalize="sentences"
                    />
                    <LocaleSummary
                      hostLocale={hostLocale}
                      host={venue}
                      values={translations.venue ?? {}}
                      onPress={() => setTrField("venue")}
                    />
                  </View>
                  <Field
                    label={t("org.form.address")}
                    value={address}
                    onChangeText={mark(setAddress)}
                    placeholder={t("org.form.addressPlaceholder")}
                    icon="map"
                    autoCapitalize="sentences"
                  />
                  <Field
                    label={t("org.form.city")}
                    value={city}
                    onChangeText={mark(setCity)}
                    placeholder={t("org.form.cityPlaceholder")}
                    icon="building"
                    autoCapitalize="sentences"
                  />

                  {/* Point on the map — what the public event page and the
                      Discover map need; typed addresses alone give neither. */}
                  <View style={{ gap: 7 }}>
                    <Label>{t("org.form.map.label")}</Label>
                    <AnimatedPressable
                      accessibilityRole="button"
                      accessibilityLabel={t(coords ? "org.form.map.change" : "org.form.map.pick")}
                      haptic="tap"
                      scaleTo={0.98}
                      onPress={() => setMapOpen(true)}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 12,
                        padding: 14,
                        borderRadius: radii.control,
                        backgroundColor: p.surface,
                        borderWidth: 1,
                        borderColor: coords ? accent.base : p.border,
                      }}
                    >
                      <Icon name="pin" size={18} color={coords ? accent.base : p.fgSubtle} />
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text
                          numberOfLines={1}
                          maxFontSizeMultiplier={1.3}
                          style={type({ weight: 500, size: 14, leading: 1.2, color: coords ? p.fg : p.fgMuted })}
                        >
                          {t(coords ? "org.form.map.change" : "org.form.map.pick")}
                        </Text>
                        {coords ? (
                          <Text
                            maxFontSizeMultiplier={1.3}
                            style={[
                              type({ role: "mono", weight: 400, size: 11, leading: 1.3, color: p.fgSubtle }),
                              { marginTop: 3 },
                            ]}
                          >
                            {coords.latitude.toFixed(5)}, {coords.longitude.toFixed(5)}
                          </Text>
                        ) : null}
                      </View>
                      <Icon name="cright" size={18} color={p.fgSubtle} />
                    </AnimatedPressable>
                  </View>
                </>
              ) : null}
              {needsUrl ? (
                <Field
                  label={t("org.form.onlineUrl")}
                  required
                  value={onlineUrl}
                  onChangeText={mark(setOnlineUrl)}
                  placeholder={t("org.form.onlineUrlPlaceholder")}
                  icon="globe"
                  hint={t("org.form.onlineUrlHint")}
                  error={errors.url}
                  keyboardType="url"
                  autoCapitalize="none"
                />
              ) : null}
              {online ? <Note>{t("org.form.onlineOnlyHint")}</Note> : null}
            </View>
          ) : null}

          {/* ── 5 · Публикация ────────────────────────────────────────────── */}
          {step === 5 ? (
            <View style={{ gap: 18 }}>
              <Field
                label={t("org.form.capacity")}
                value={capacity}
                onChangeText={mark(setCapacity)}
                placeholder={t("org.form.capacityPlaceholder")}
                icon="users"
                hint={t("org.form.capacityHint")}
                error={errors.capacity}
                keyboardType="number-pad"
              />

              <View style={{ backgroundColor: p.surface, borderWidth: 1, borderColor: p.border, borderRadius: radii.card, overflow: "hidden" }}>
                <GroupRow first>
                  <Text maxFontSizeMultiplier={1.3} style={[type({ weight: 600, size: 14, leading: 1.15, color: p.fg }), { flex: 1 }]}>
                    {t("org.form.registrationOpen")}
                  </Text>
                  <Toggle on={registrationOpen} label={t("org.form.registrationOpen")} onPress={() => mark(setRegistrationOpen)(!registrationOpen)} />
                </GroupRow>
                <GroupRow>
                  <Text maxFontSizeMultiplier={1.3} style={[type({ weight: 600, size: 14, leading: 1.15, color: p.fg }), { flex: 1 }]}>
                    {t("org.form.comments")}
                  </Text>
                  <Toggle on={commentsEnabled} label={t("org.form.comments")} onPress={() => mark(setCommentsEnabled)(!commentsEnabled)} />
                </GroupRow>
              </View>

              {/* Moderation notice — the platform publishes, not the organizer */}
              <View style={{ padding: 14, borderRadius: radii.card, backgroundColor: accent.soft, borderWidth: 1, borderColor: accent.softHover, gap: 8 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 9 }}>
                  <Icon name="info" size={17} sw={2} color={accent.ink} />
                  <Text maxFontSizeMultiplier={1.3} style={[type({ weight: 600, size: 14, leading: 1.2, color: accent.ink }), { flex: 1 }]}>
                    {t("org.form.moderation.title")}
                  </Text>
                </View>
                <Text maxFontSizeMultiplier={1.3} style={type({ weight: 400, size: 12, leading: 1.5, color: accent.ink })}>
                  {t("org.form.moderation.body")}
                </Text>
              </View>

              {/* Review summary */}
              <View style={{ gap: 8 }}>
                <Text
                  maxFontSizeMultiplier={1.3}
                  style={type({ role: "mono", weight: 600, size: 11, leading: 1, track: 0.12, color: p.fgMuted, transform: "uppercase" })}
                >
                  {t("org.form.review")}
                </Text>
                <View style={{ backgroundColor: p.surface, borderWidth: 1, borderColor: p.border, borderRadius: radii.card, paddingHorizontal: 14 }}>
                  {[
                    { k: t("org.form.name"), v: title.trim() || "—" },
                    {
                      k: t("org.form.review.when"),
                      v: startDate
                        ? `${formatDateStamp((combine(startDate, startTime) as Date).toISOString(), lang)}, ${formatTime((combine(startDate, startTime) as Date).toISOString(), lang)}`
                        : "—",
                    },
                    { k: t("org.form.review.where"), v: online ? t("org.form.format.ONLINE") : venue.trim() || "—" },
                    { k: t("org.form.review.access"), v: t(ACCESS.find((a) => a.key === accessType)?.label ?? "org.form.access.OPEN") },
                    { k: t("org.form.review.price"), v: free ? t("org.form.free") : `${price || "0"} ${currency}` },
                  ].map((r, i) => (
                    <View
                      key={r.k}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 16,
                        paddingVertical: 9,
                        borderTopWidth: i === 0 ? 0 : 1,
                        borderTopColor: p.borderSubtle,
                      }}
                    >
                      <Text maxFontSizeMultiplier={1.3} style={type({ weight: 400, size: 13, leading: 1.2, color: p.fgMuted })}>{r.k}</Text>
                      <Text
                        numberOfLines={1}
                        maxFontSizeMultiplier={1.3}
                        style={[type({ weight: 500, size: 13, leading: 1.2, color: p.fg }), { flexShrink: 1, textAlign: "right" }]}
                      >
                        {r.v}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>

              {!editing ? (
                <AnimatedPressable
                  accessibilityRole="button"
                  haptic="tap"
                  scaleTo={0.97}
                  onPress={() => void finish(false)}
                  style={{ alignSelf: "center", paddingVertical: 8 }}
                >
                  <Text maxFontSizeMultiplier={1.3} style={type({ weight: 600, size: 14, leading: 1, color: p.fgDefault })}>
                    {t("org.form.saveDraftExit")}
                  </Text>
                </AnimatedPressable>
              ) : null}
            </View>
          ) : null}
        </ScrollView>
      )}

      {/* ── footer: back · next ───────────────────────────────────────────── */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          paddingTop: 12,
          paddingBottom: Math.max(insets.bottom, 12),
          paddingHorizontal: gutter,
          backgroundColor: p.surface,
          borderTopWidth: 1,
          borderTopColor: p.border,
        }}
      >
        {step > 1 ? (
          <AnimatedPressable
            accessibilityRole="button"
            accessibilityLabel={t("org.form.back")}
            haptic="tap"
            scaleTo={0.95}
            onPress={onBack}
            style={{
              width: 52,
              height: 52,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: radii.control,
              backgroundColor: p.surface,
              borderWidth: 1,
              borderColor: p.border,
            }}
          >
            <Icon name="cleft" size={20} sw={2} color={p.fg} />
          </AnimatedPressable>
        ) : null}
        <View style={{ flex: 1 }}>
          <Btn full size="lg" variant="primary" loading={busy} onPress={onNext}>
            {step < 5 ? t("org.form.next") : editing ? t("org.form.saveChanges") : t("org.form.submitReview")}
          </Btn>
        </View>
      </View>
      {/* Pick the venue on a Yandex map — fills the address fields that are
          still empty, and never overwrites what the author typed. */}
      <LocationPicker
        visible={mapOpen}
        onClose={() => setMapOpen(false)}
        initial={coords}
        onApply={(pick) => {
          mark(setCoords)({ latitude: pick.latitude, longitude: pick.longitude });
          if (pick.venue && !venue.trim()) setVenue(pick.venue);
          if (pick.address && !address.trim()) setAddress(pick.address);
          if (pick.city && !city.trim()) setCity(pick.city);
        }}
      />

          {/* 2.2 · per-locale copies of the focused field */}
      <TranslationsSheet
        visible={trField !== null}
        onClose={() => setTrField(null)}
        field={trField ?? "title"}
        label={t(TR_LABEL[trField ?? "title"])}
        hostLocale={hostLocale}
        host={trField === "shortDescription" ? shortDescription : trField === "venue" ? venue : title}
        values={trField ? (translations[trField] ?? {}) : {}}
        onChange={(next) => {
          if (!trField) return;
          mark(setTranslations)({ ...translations, [trField]: next });
        }}
      />
    </Screen>
  );
}

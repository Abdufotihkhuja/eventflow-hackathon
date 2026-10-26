import { useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Text, View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useI18n } from "@shared/i18n";
import { accent, gutter, radii, shadow, type, usePalette } from "@shared/theme";
import { goBack } from "@shared/lib/go-back";
import { haptics } from "@shared/lib/haptics";
import { AnimatedPressable, fadeIn, fadeOut, popIn } from "@shared/motion";
import {
  ActionBar,
  Body,
  Btn,
  FootLink,
  Icon,
  IconBtn,
  Screen,
} from "@shared/ui";

type Intent = "attendee" | "organizer";

/**
 * 01 · Intent fork — participant vs a separate organization account. Invited
 * personal users join an existing organization through the invite branch.
 */
export default function IntentScreen(): React.JSX.Element {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const p = usePalette();
  const { t } = useI18n();
  // Reached via Welcome's "Organize events?" link → open on the organizer fork.
  const params = useLocalSearchParams<{ role?: string }>();
  const [intent, setIntent] = useState<Intent>(
    params.role === "organizer" ? "organizer" : "attendee",
  );
  const orgOpen = intent === "organizer";

  const select = (next: Intent) => {
    if (next !== intent) haptics.select();
    setIntent(next);
  };

  const onContinue = () => {
    router.push(intent === "attendee" ? "/signup" : "/create-org");
  };

  return (
    <Screen>
      <View style={{ paddingTop: insets.top + 6, paddingHorizontal: gutter }}>
        <IconBtn
          name="cleft"
          size={40}
          onPress={() => goBack(router, "/welcome")}
          accessibilityLabel={t("a11y.back")}
        />
      </View>
      <Body contentStyle={{ paddingTop: 12 }}>
        <View style={{ marginBottom: 22 }}>
          <Text
            maxFontSizeMultiplier={1.3}
            style={type({
              role: "display",
              weight: 700,
              size: 28,
              leading: 1.06,
              track: -0.03,
              color: p.fg,
            })}
          >
            {t("auth.intent.title")}
          </Text>
          <Text
            style={[
              type({ weight: 400, size: 14, leading: 1.5, color: p.fgMuted }),
              { marginTop: 8 },
            ]}
          >
            {t("auth.intent.sub")}
          </Text>
        </View>

        <View style={{ gap: 12 }}>
          <IntentCard
            icon="compass"
            title={t("auth.intent.attendee.title")}
            sub={t("auth.intent.attendee.sub")}
            active={!orgOpen}
            onPress={() => select("attendee")}
          />
          <IntentCard
            icon="zap"
            title={t("auth.intent.organizer.title")}
            sub={t("auth.intent.organizer.sub")}
            active={orgOpen}
            onPress={() => select("organizer")}
          />
        </View>

        {orgOpen ? (
          <Animated.View
            entering={fadeIn()}
            exiting={fadeOut()}
            style={{
              marginTop: 16,
              padding: 16,
              borderRadius: radii.card,
              backgroundColor: p.sunken,
              borderWidth: 1,
              borderColor: p.borderSubtle,
            }}
          >
            <Text
              style={[
                type({
                  role: "mono",
                  weight: 600,
                  size: 11,
                  leading: 1,
                  track: 0.06,
                  color: p.fgMuted,
                  transform: "uppercase",
                }),
                { marginBottom: 12 },
              ]}
            >
              {t("auth.intent.org.heading")}
            </Text>
            <View style={{ gap: 10 }}>
              <OrgOption
                icon="plus"
                title={t("auth.intent.org.create.title")}
                sub={t("auth.intent.org.create.sub")}
                onPress={() => router.push("/create-org")}
              />
              <OrgOption
                icon="users"
                title={t("auth.intent.org.invite.title")}
                sub={t("auth.intent.org.invite.sub")}
                onPress={() => router.push("/invite-code")}
              />
            </View>
            <View
              style={{
                flexDirection: "row",
                gap: 8,
                marginTop: 13,
                alignItems: "flex-start",
              }}
            >
              <Icon name="info" size={14} color={p.fgSubtle} />
              <Text
                style={[
                  type({
                    weight: 400,
                    size: 12,
                    leading: 1.45,
                    color: p.fgSubtle,
                  }),
                  { flex: 1 },
                ]}
              >
                {t("auth.intent.org.note")}
              </Text>
            </View>
          </Animated.View>
        ) : null}
      </Body>

      <ActionBar>
        <Btn full variant="primary" iconRight="aright" onPress={onContinue}>
          {t("common.continue")}
        </Btn>
        <View style={{ marginTop: 6 }}>
          <FootLink
            action={t("auth.foot.login")}
            onPress={() => router.replace("/login")}
          >
            {t("auth.foot.haveAccount")}
          </FootLink>
        </View>
      </ActionBar>
    </Screen>
  );
}

function IntentCard({
  icon,
  title,
  sub,
  active,
  onPress,
}: {
  icon: string;
  title: string;
  sub: string;
  active: boolean;
  onPress: () => void;
}): React.JSX.Element {
  const p = usePalette();
  return (
    <AnimatedPressable
      onPress={onPress}
      scaleTo={0.98}
      accessibilityRole="radio"
      accessibilityState={{ selected: active }}
      style={[
        {
          flexDirection: "row",
          alignItems: "flex-start",
          gap: 14,
          padding: 18,
          borderRadius: radii.card,
          backgroundColor: active ? accent.soft : p.surface,
          borderWidth: 1.5,
          borderColor: active ? accent.base : p.border,
        },
        active ? null : shadow.xs,
      ]}
    >
      <View
        style={{
          width: 46,
          height: 46,
          borderRadius: 13,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: active ? accent.base : p.sunken,
        }}
      >
        <Icon name={icon} size={23} color={active ? accent.on : p.fg} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          maxFontSizeMultiplier={1.3}
          style={type({
            role: "display",
            weight: 700,
            size: 17,
            leading: 1.15,
            track: -0.02,
            color: active ? accent.ink : p.fg,
          })}
        >
          {title}
        </Text>
        <Text
          style={[
            type({ weight: 500, size: 13, leading: 1.4, color: p.fgMuted }),
            { marginTop: 4 },
          ]}
        >
          {sub}
        </Text>
      </View>
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 999,
          marginTop: 2,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: active ? accent.base : "transparent",
          borderWidth: active ? 0 : 2,
          borderColor: p.border,
        }}
      >
        {active ? (
          // Selection-commit recipe: the check pops in (spring.pop).
          <Animated.View entering={popIn()}>
            <Icon name="check" size={13} color={accent.on} sw={3} />
          </Animated.View>
        ) : null}
      </View>
    </AnimatedPressable>
  );
}

function OrgOption({
  icon,
  title,
  sub,
  onPress,
}: {
  icon: string;
  title: string;
  sub: string;
  onPress: () => void;
}): React.JSX.Element {
  const p = usePalette();
  return (
    <AnimatedPressable
      onPress={onPress}
      haptic="tap"
      scaleTo={0.98}
      accessibilityRole="button"
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        padding: 14,
        borderRadius: 13,
        backgroundColor: p.surface,
        borderWidth: 1,
        borderColor: p.border,
      }}
    >
      <View
        style={{
          width: 38,
          height: 38,
          borderRadius: 11,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: p.sunken,
        }}
      >
        <Icon name={icon} size={19} color={p.fg} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          style={type({ weight: 700, size: 14, leading: 1.2, color: p.fg })}
        >
          {title}
        </Text>
        <Text
          style={[
            type({ weight: 500, size: 12, leading: 1.3, color: p.fgMuted }),
            { marginTop: 2 },
          ]}
        >
          {sub}
        </Text>
      </View>
      <Icon name="cright" size={18} color={p.fgSubtle} />
    </AnimatedPressable>
  );
}

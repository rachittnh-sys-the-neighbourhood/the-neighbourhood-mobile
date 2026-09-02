import { useLocalSearchParams, useNavigation, usePathname, useRouter } from "expo-router";
import { useScreenFocus } from "../../lib/useScreenFocus";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  LayoutChangeEvent,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import { BuildingBanner } from "../../components/BuildingBanner";
import { GuidedTourDialog } from "../../components/GuidedTourDialog";
import { HamburgerIcon, SparkleMark } from "../../components/TabIcons";
import { useAuth } from "../../lib/AuthProvider";
import { computeAge } from "../../lib/childAge";
import { askCopilot, CopilotChatError, type AskMode } from "../../lib/copilotChat";
import * as copilotDb from "../../lib/db/copilot";
import { markFirstRunComplete, markHomeCoachComplete } from "../../lib/firstRun";
import { deriveProfile, STAGE_LABEL } from "../../lib/parentCare";
import { colors, fonts, radius, spacing, typeScale } from "../../lib/theme";
import { useGuidedTourStep } from "../../lib/useGuidedTourStep";

/**
 * Ask — the ONE AI entry point for the whole app.
 *
 * Previously two screens (Child Mode's Copilot and Parent Mode's Copilot),
 * each hardcoded to one subject. Now one screen whose subject comes from
 * how it was opened, not from which "mode" the app was in — there is no
 * mode to be in anymore.
 *
 *   Bare tab tap            → mode "family": general-purpose, any topic.
 *   From Child > Discoveries → mode "child", topic "Discoveries": arrives
 *                              knowing this is about the child.
 *   From You > Care > Sleep → mode "parent", topic "Sleep": arrives
 *                              knowing this is about the parent.
 *
 * A screen that links here passes `mode`/`topic`/`prompt` as route params
 * (the same pattern Home already used to prefill a draft). The context
 * chip below the header makes that visible rather than leaving it as
 * invisible backend plumbing — the parent should be able to see why Ask
 * already seems to know what they mean, and clear it if they don't.
 *
 * Visually neutral (the fixed cream palette, not either zone's tint) on
 * purpose: Child and You are different rooms; Ask is the phone line that
 * reaches into either one, so it shouldn't look like it belongs to just
 * one of them.
 */
type Message = {
  id: string;
  role: "parent" | "copilot";
  text: string;
  /** The mode/topic active when this turn was sent, or undefined for
   *  older/untagged rows and plain "family" mode. Used only to build the
   *  "Recent chats" strip — never shown on the bubble itself. */
  contextMode?: AskMode;
  contextTopic?: string | null;
  at: number;
};

/** One past topic worth jumping back into — the most recent occurrence of
 *  a given (mode, topic) pair within the child's single running thread. */
type RecentTopic = {
  key: string;
  mode: AskMode;
  topic: string;
  at: number;
  anchorMessageId: string;
};

/** "2 days ago" / "just now" — coarse on purpose, this is a jump-back
 *  affordance, not a timestamp anyone needs to the minute. */
function relativeTime(at: number): string {
  const diffMs = Date.now() - at;
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return days === 1 ? "yesterday" : `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return weeks === 1 ? "last week" : `${weeks}w ago`;
  const months = Math.floor(days / 30);
  return months <= 1 ? "last month" : `${months}mo ago`;
}

// Same wording as Home's greeting — kept in sync by hand rather than
// shared, since this is the only other screen that opens on a greeting.
function greetingWord(hour: number): string {
  if (hour < 5) return "Good night";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

/** The composer's send affix — an up-arrow rather than the word "Ask",
 *  so the pill reads as one calm control instead of a form with a button
 *  bolted on. */
function SendArrow({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 19V5M12 5l-6 6M12 5l6 6"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

const PARENT_PROMPTS = [
  "My incision still hurts.",
  "I'm exhausted.",
  "I haven't been eating enough.",
  "Can I start exercising?",
];

// A father's own body isn't recovering from birth, so the default prompts
// (incision, postpartum exercise clearance) don't apply to him — see
// lib/parentCare.ts's "For dads" topics for the same distinction.
const FATHER_PROMPTS = [
  "I'm exhausted.",
  "How do I support her right now?",
  "Is it normal to feel low about this?",
  "How do I bond more with the baby?",
];

export default function Ask() {
  const router = useRouter();
  const navigation = useNavigation();
  const pathname = usePathname();
  const params = useLocalSearchParams<{
    guidedTour?: string;
    next?: string;
    prompt?: string;
    step?: string;
    mode?: string;
    topic?: string;
  }>();
  const { child, parentName, profile: authProfile } = useAuth();
  const isFocused = useScreenFocus();
  const isAskRoute = pathname === "/ask";
  const wantsGuidedTour = params.guidedTour === "1" && params.step === "2" && isFocused && isAskRoute;
  const guidedTour = useGuidedTourStep(2, wantsGuidedTour);
  const afterOnboardingTour = params.next === "milestones";
  const tourNext = afterOnboardingTour ? "&next=milestones" : "";

  const incomingMode: AskMode =
    params.mode === "parent" || params.mode === "child" ? params.mode : "family";
  const [mode, setMode] = useState<AskMode>(incomingMode);
  const [topic, setTopic] = useState<string | undefined>(params.topic);

  const age = child ? computeAge(child.date_of_birth) : null;
  const ageMonths = age?.totalMonths ?? 0;
  const parentProfile = useMemo(
    () => deriveProfile(ageMonths, authProfile),
    [ageMonths, authProfile],
  );

  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [thinking, setThinking] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyOpen, setHistoryOpen] = useState(false);

  // Where each bubble sits in the thread's ScrollView, so a "Recent chats"
  // tap can scroll straight to it instead of just resetting the chip.
  // Populated by each bubble's onLayout; never read until a tap happens.
  const scrollRef = useRef<ScrollView>(null);
  const messagePositions = useRef<Record<string, number>>({});
  const recordPosition = (id: string) => (e: LayoutChangeEvent) => {
    messagePositions.current[id] = e.nativeEvent.layout.y;
  };

  useEffect(() => {
    if (params.prompt) setDraft(params.prompt);
  }, [params.prompt]);

  // Continue the child's most recent conversation rather than always
  // starting blank — see lib/db/copilot.ts. child-scoped (not per-mode),
  // matching the schema: one running history per child, same as any
  // other parent would recognise as "our conversation with Copilot".
  useEffect(() => {
    let alive = true;
    if (!child) {
      setHistoryLoading(false);
      return;
    }
    setHistoryLoading(true);
    copilotDb
      .getOrCreateConversation(child.id)
      .then(async (id) => {
        if (!alive) return;
        setConversationId(id);
        const rows = await copilotDb.getMessages(id);
        if (!alive) return;
        setMessages(
          rows.map((r) => ({
            id: r.id,
            role: r.role,
            text: r.content,
            contextMode: (r.context_mode as AskMode | null) ?? undefined,
            contextTopic: r.context_topic,
            at: Date.parse(r.created_at),
          }))
        );
      })
      .catch(() => {
        // History is a convenience, not a requirement — a fresh
        // conversation still works fine if this fails.
      })
      .finally(() => {
        if (alive) setHistoryLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [child]);

  // The header is owned by (tabs)/_layout.tsx (title + avatar), same as
  // every other tab — this screen alone adds a history button to it,
  // since it alone has a history worth opening.
  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <Pressable
          onPress={() => setHistoryOpen(true)}
          hitSlop={12}
          style={styles.historyButton}
          accessibilityRole="button"
          accessibilityLabel="Chat history"
        >
          <HamburgerIcon />
        </Pressable>
      ),
    });
  }, [navigation]);

  const continueGuidedTour = () => {
    router.replace(`/child?guidedTour=1&step=3${tourNext}`);
  };

  const skipGuidedTour = async () => {
    await Promise.all([markHomeCoachComplete(), markFirstRunComplete()]).catch(() => {});
    router.replace("/home");
  };

  const clearContext = () => {
    setMode("family");
    setTopic(undefined);
  };

  const contextForMode = (): Record<string, string | number | boolean | null> | undefined => {
    if (mode !== "parent") return undefined;
    return {
      role: parentProfile.role,
      weeksPostpartum: parentProfile.weeksPostpartum,
      stage: parentProfile.stage,
      delivery: parentProfile.delivery,
      feeding: parentProfile.feeding,
      diet: parentProfile.diet,
      allergies: parentProfile.allergies.join(", ") || null,
    };
  };

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || thinking) return;
    const history = messages.map((m) => ({ role: m.role, text: m.text }));
    // Captured once per turn — mode/topic can change (e.g. Clear, or a
    // Recent chats tap) before the reply lands, and both halves of this
    // turn should stay tagged with whatever was active when it was asked.
    const turnMode = mode;
    const turnTopic = topic ?? null;
    setMessages((prev) => [
      ...prev,
      {
        id: `${Date.now()}-p`,
        role: "parent",
        text: trimmed,
        contextMode: turnMode,
        contextTopic: turnTopic,
        at: Date.now(),
      },
    ]);
    setDraft("");
    setThinking(true);
    if (conversationId) {
      void copilotDb
        .appendMessage(conversationId, "parent", trimmed, { mode: turnMode, topic: turnTopic })
        .catch(() => {});
    }
    try {
      const reply = await askCopilot({
        message: trimmed,
        history,
        childId: child?.id,
        mode,
        context: contextForMode(),
      });
      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-c`,
          role: "copilot",
          text: reply,
          contextMode: turnMode,
          contextTopic: turnTopic,
          at: Date.now(),
        },
      ]);
      if (conversationId) {
        void copilotDb
          .appendMessage(conversationId, "copilot", reply, { mode: turnMode, topic: turnTopic })
          .catch(() => {});
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-c`,
          role: "copilot",
          text:
            err instanceof CopilotChatError
              ? err.message
              : "Something went wrong reaching Ask. Please try again.",
          contextMode: turnMode,
          contextTopic: turnTopic,
          at: Date.now(),
        },
      ]);
    } finally {
      setThinking(false);
    }
  };

  // Distinct past topics, most recent occurrence of each — the chat
  // history drawer. Family mode (no topic) never appears here; see
  // lib/db/copilot.ts's appendMessage for why that's left untagged.
  const recentTopics = useMemo(() => {
    const byKey = new Map<string, RecentTopic>();
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (!m.contextTopic || !m.contextMode || m.contextMode === "family") continue;
      const key = `${m.contextMode}:${m.contextTopic}`;
      if (byKey.has(key)) continue; // newest→oldest, so the first hit wins
      byKey.set(key, {
        key,
        mode: m.contextMode,
        topic: m.contextTopic,
        at: m.at,
        anchorMessageId: m.id,
      });
    }
    return Array.from(byKey.values())
      .sort((a, b) => b.at - a.at)
      .slice(0, 20);
  }, [messages]);

  const jumpToRecentTopic = (entry: RecentTopic) => {
    setMode(entry.mode);
    setTopic(entry.topic);
    setHistoryOpen(false);
    const y = messagePositions.current[entry.anchorMessageId];
    if (y !== undefined) {
      scrollRef.current?.scrollTo({ y: Math.max(0, y - 16), animated: true });
    }
  };

  // Land on the latest turn, not wherever the thread happens to render —
  // without this a returning conversation opens mid-scroll, its last
  // message hidden behind the composer.
  useEffect(() => {
    if (historyLoading) return;
    scrollRef.current?.scrollToEnd({ animated: false });
  }, [historyLoading, messages.length, thinking]);

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0}
    >
      <View style={styles.buildingBannerWrap}>
        <BuildingBanner />
      </View>

      {topic && (
        <View style={styles.contextChip}>
          <Text style={styles.contextChipText}>
            Asking about: {topic}
            {mode === "parent" ? " (You)" : mode === "child" ? " (Child)" : ""}
          </Text>
          <Pressable onPress={clearContext} hitSlop={8} accessibilityRole="button" accessibilityLabel="Clear context">
            <Text style={styles.contextChipClear}>✕</Text>
          </Pressable>
        </View>
      )}

      <ScrollView
        ref={scrollRef}
        style={styles.thread}
        contentContainerStyle={styles.threadContent}
        keyboardShouldPersistTaps="handled"
      >
        {historyLoading ? (
          <View style={styles.historyLoading}>
            <ActivityIndicator color={colors.warmTaupe} />
          </View>
        ) : messages.length === 0 ? (
          <View style={styles.empty}>
            {mode === "parent" ? (
              <>
                <Text style={styles.emptyEyebrow}>
                  {STAGE_LABEL[parentProfile.stage].toUpperCase()} · WEEK {parentProfile.weeksPostpartum}
                </Text>
                <Text style={styles.emptyTitle}>Ask about you, not them.</Text>
                <Text style={styles.emptyBody}>
                  {parentName ? `${parentName.split(" ")[0]}, this ` : "This "}
                  {parentProfile.role === "father"
                    ? "knows how you're doing too. Your own adjustment, sleep, or how to support her."
                    : "knows your stage, your recovery and what you’ve eaten."}{" "}
                  Nothing you ask here is too small.
                </Text>
                <View style={styles.prompts}>
                  {(parentProfile.role === "father" ? FATHER_PROMPTS : PARENT_PROMPTS).map((prompt) => (
                    <Pressable
                      key={prompt}
                      onPress={() => send(prompt)}
                      style={({ pressed }) => [styles.prompt, pressed && { opacity: 0.65 }]}
                    >
                      <Text style={styles.promptText}>{prompt}</Text>
                    </Pressable>
                  ))}
                </View>
              </>
            ) : mode === "child" ? (
              <>
                <Text style={styles.emptyTitle}>
                  A quiet place for the questions that arrive late.
                </Text>
                <Text style={styles.emptyBody}>
                  {child?.name
                    ? `Sleep, feeding, or a tricky moment. We'll keep ${child.name} in mind.`
                    : "Sleep, feeding, or a tricky moment. Start wherever you are."}
                </Text>
              </>
            ) : (
              <View style={styles.greetingWrap}>
                <SparkleMark size={30} />
                <Text style={[styles.emptyTitle, styles.greetingText]}>
                  {greetingWord(new Date().getHours())}
                  {parentName ? `, ${parentName.split(" ")[0]}` : ""}.
                </Text>
                <Text style={[styles.emptyBody, styles.greetingBody]}>
                  Sleep, feeding, development, your own recovery, or just what to do
                  today. Ask about any of it, and we&rsquo;ll bring the right context.
                </Text>
              </View>
            )}
          </View>
        ) : (
          <>
            {messages.map((m) => (
              <View
                key={m.id}
                onLayout={recordPosition(m.id)}
                style={[styles.bubble, m.role === "parent" ? styles.parentBubble : styles.copilotBubble]}
              >
                <Text style={m.role === "parent" ? styles.parentText : styles.copilotText}>
                  {m.text}
                </Text>
              </View>
            ))}
            {thinking && (
              <View style={[styles.bubble, styles.copilotBubble]}>
                <Text style={styles.copilotText}>…</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* One running thread per child (see lib/db/copilot.ts) — this isn't
          a list of separate conversations, it's a way back to a topic
          already discussed in it. Tapping an entry re-shows that topic's
          chip and scrolls to where it was last talked about, rather than
          losing it the way a bare tab tap into "family" mode otherwise
          would. Presented as a Claude-style history drawer off the
          hamburger button, rather than an always-on strip eating into
          the thread's vertical space. */}
      <Modal
        visible={historyOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setHistoryOpen(false)}
      >
        <Pressable style={styles.drawerBackdrop} onPress={() => setHistoryOpen(false)} />
        <View style={styles.drawer}>
          <Text style={styles.drawerTitle}>Chats</Text>
          <ScrollView contentContainerStyle={styles.drawerList}>
            <Pressable
              onPress={() => {
                clearContext();
                setHistoryOpen(false);
              }}
              style={({ pressed }) => [styles.drawerRowFamily, pressed && { opacity: 0.7 }]}
              accessibilityRole="button"
              accessibilityLabel="Back to family chat"
            >
              <SparkleMark size={16} />
              <Text style={styles.drawerRowFamilyText}>Family chat</Text>
            </Pressable>
            {recentTopics.length === 0 ? (
              <Text style={styles.drawerEmpty}>Topics you ask about will show up here.</Text>
            ) : (
              recentTopics.map((entry) => (
                <Pressable
                  key={entry.key}
                  onPress={() => jumpToRecentTopic(entry)}
                  style={({ pressed }) => [styles.drawerRow, pressed && { opacity: 0.7 }]}
                  accessibilityRole="button"
                  accessibilityLabel={`Jump back to ${entry.topic}`}
                >
                  <View style={styles.drawerRowText}>
                    <Text style={styles.drawerRowTopic} numberOfLines={1}>
                      {entry.topic}
                    </Text>
                    <Text style={styles.drawerRowSub}>{entry.mode === "parent" ? "You" : "Child"}</Text>
                  </View>
                  <Text style={styles.drawerRowTime}>{relativeTime(entry.at)}</Text>
                </Pressable>
              ))
            )}
          </ScrollView>
        </View>
      </Modal>

      <View style={[styles.composer, guidedTour && styles.tourHighlight]}>
        <View style={styles.composerPill}>
          <TextInput
            style={styles.input}
            value={draft}
            onChangeText={setDraft}
            placeholder="What's on your mind?"
            placeholderTextColor={colors.textMuted}
            multiline
            // react-native-web renders this as a <textarea>, which defaults
            // to a 2-row-tall box when no `rows` attribute is set — that's
            // what was pushing the placeholder up off-center. `rows` isn't
            // part of RN's own TextInputProps (native has no such concept),
            // so it's spread in as an untyped, web-only prop rather than
            // widening the type for every platform.
            {...(Platform.OS === "web" ? ({ rows: 1 } as Record<string, unknown>) : {})}
            onSubmitEditing={() => send(draft)}
            editable={!thinking}
          />
          <Pressable
            onPress={() => send(draft)}
            disabled={!draft.trim() || thinking}
            style={[styles.send, (!draft.trim() || thinking) && styles.sendDisabled]}
            accessibilityRole="button"
            accessibilityLabel="Send"
          >
            <SendArrow color={colors.cream} />
          </Pressable>
        </View>
      </View>
      <Text style={styles.disclaimer}>General guidance, not medical advice.</Text>
      {guidedTour && (
        <GuidedTourDialog
          eyebrow="Ask"
          focus="Ask anything"
          title="A second voice, anytime."
          body="Ask about your child or about parenting. With your family's context already in mind."
          step={2}
          total={5}
          primaryTitle="Continue"
          onPrimary={continueGuidedTour}
          onSkip={skipGuidedTour}
        />
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream },
  buildingBannerWrap: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
  },
  thread: { flex: 1 },
  threadContent: {
    padding: spacing.lg,
    gap: spacing.md,
    flexGrow: 1,
  },
  contextChip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  contextChipText: {
    fontFamily: fonts.bodyMedium,
    fontSize: typeScale.caption,
    color: colors.warmTaupe,
  },
  contextChipClear: {
    fontFamily: fonts.bodySemiBold,
    fontSize: typeScale.caption,
    color: colors.textMuted,
    paddingLeft: spacing.sm,
  },
  empty: {
    flex: 1,
    justifyContent: "center",
  },
  historyLoading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  greetingWrap: {
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  greetingText: {
    textAlign: "center",
  },
  greetingBody: {
    textAlign: "center",
    marginTop: spacing.xs,
  },
  emptyEyebrow: {
    fontFamily: fonts.bodySemiBold,
    fontSize: typeScale.caption,
    letterSpacing: 1.4,
    color: colors.warmTaupe,
    marginBottom: spacing.sm,
  },
  emptyTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: typeScale.h1,
    color: colors.charcoal,
    lineHeight: typeScale.h1 * 1.2,
  },
  emptyBody: {
    fontFamily: fonts.body,
    fontSize: typeScale.body,
    lineHeight: typeScale.body * 1.55,
    color: colors.textMuted,
    marginTop: spacing.md,
  },
  prompts: {
    marginTop: spacing.xl,
    gap: spacing.sm,
  },
  prompt: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 3,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  promptText: {
    fontFamily: fonts.body,
    fontSize: typeScale.bodySmall,
    color: colors.charcoal,
  },
  bubble: {
    maxWidth: "82%",
    paddingVertical: spacing.sm + 3,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
  },
  parentBubble: {
    alignSelf: "flex-end",
    backgroundColor: colors.charcoal,
    borderBottomRightRadius: radius.sm / 2,
  },
  copilotBubble: {
    alignSelf: "flex-start",
    backgroundColor: colors.white,
    borderBottomLeftRadius: radius.sm / 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    shadowColor: colors.charcoal,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  parentText: {
    fontFamily: fonts.body,
    fontSize: typeScale.body,
    lineHeight: typeScale.body * 1.5,
    color: colors.cream,
  },
  copilotText: {
    fontFamily: fonts.body,
    fontSize: typeScale.body,
    lineHeight: typeScale.body * 1.5,
    color: colors.charcoal,
  },
  historyButton: {
    marginLeft: spacing.lg,
    padding: spacing.xs,
  },
  drawerBackdrop: {
    flex: 1,
    backgroundColor: "rgba(44, 44, 44, 0.35)",
  },
  drawer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    width: "78%",
    maxWidth: 320,
    backgroundColor: colors.cream,
    paddingTop: Platform.OS === "ios" ? 64 : 32,
    paddingHorizontal: spacing.lg,
    shadowColor: colors.charcoal,
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  drawerTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: typeScale.h2,
    color: colors.charcoal,
    marginBottom: spacing.md,
  },
  drawerList: {
    gap: spacing.xs,
    paddingBottom: spacing.xl,
  },
  drawerRowFamily: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  drawerRowFamilyText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: typeScale.bodySmall,
    color: colors.charcoal,
  },
  drawerEmpty: {
    fontFamily: fonts.body,
    fontSize: typeScale.bodySmall,
    color: colors.textMuted,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
  },
  drawerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
  },
  drawerRowText: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  drawerRowTopic: {
    fontFamily: fonts.bodyMedium,
    fontSize: typeScale.bodySmall,
    color: colors.charcoal,
  },
  drawerRowSub: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  drawerRowTime: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textMuted,
  },
  composer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: "transparent",
    backgroundColor: colors.cream,
  },
  composerPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.white,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingLeft: spacing.md,
    paddingRight: 3,
    paddingVertical: 3,
    shadowColor: colors.charcoal,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  disclaimer: {
    fontFamily: fonts.body,
    fontSize: typeScale.caption,
    color: colors.textMuted,
    textAlign: "center",
    paddingBottom: spacing.sm,
    backgroundColor: colors.cream,
  },
  tourHighlight: {
    borderTopColor: colors.warmTaupe,
    backgroundColor: colors.white,
    shadowColor: colors.charcoal,
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 4,
  },
  input: {
    flex: 1,
    maxHeight: 100,
    paddingVertical: spacing.xs + 2,
    textAlignVertical: "center",
    fontFamily: fonts.body,
    fontSize: typeScale.bodySmall,
    lineHeight: typeScale.bodySmall + 4,
    color: colors.charcoal,
  },
  send: {
    width: 30,
    height: 30,
    borderRadius: radius.pill,
    backgroundColor: colors.charcoal,
    alignItems: "center",
    justifyContent: "center",
  },
  sendDisabled: { opacity: 0.4 },
});

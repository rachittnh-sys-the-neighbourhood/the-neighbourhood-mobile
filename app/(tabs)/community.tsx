import { useLocalSearchParams, usePathname, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { ActionSheetDialog } from "../../components/ActionSheetDialog";
import { BuildingBanner } from "../../components/BuildingBanner";
import { GuidedTourDialog } from "../../components/GuidedTourDialog";
import { useAuth } from "../../lib/AuthProvider";
import { computeAge, stageLabel } from "../../lib/childAge";
import * as communityDb from "../../lib/db/community";
import { COMMUNITY_TOPICS, CommunityTopic, Discussion, TOPIC_LABEL } from "../../lib/db/communityTypes";
import { markFirstRunComplete, markHomeCoachComplete } from "../../lib/firstRun";
import { colors, fonts, radius, spacing, typeScale } from "../../lib/theme";
import { useGuidedTourStep } from "../../lib/useGuidedTourStep";
import { useScreenFocus } from "../../lib/useScreenFocus";

export default function Community() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useLocalSearchParams<{ guidedTour?: string; next?: string; step?: string }>();
  const { child } = useAuth();
  const age = child ? computeAge(child.date_of_birth) : null;
  const ageMonths = age?.totalMonths ?? 12;

  // See child/guide.tsx: only the focused screen on matching route with
  // the right step may show a tour dialog. useGuidedTourStep additionally
  // makes sure step 1 only ever shows once — otherwise tapping the
  // Community tab bar icon after the tour has moved on restores this
  // screen's old ?guidedTour=1&step=1 url and re-shows the card.
  const isFocused = useScreenFocus();
  const isCommunityRoute = pathname === "/community";
  const wantsGuidedTour =
    params.guidedTour === "1" && params.step === "1" && isFocused && isCommunityRoute;
  const guidedTour = useGuidedTourStep(1, wantsGuidedTour);
  const tourNext = params.next === "milestones" ? "&next=milestones" : "";

  const skipGuidedTour = async () => {
    await Promise.all([markHomeCoachComplete(), markFirstRunComplete()]).catch(() => {});
    router.replace("/home");
  };

  const [selectedTopic, setSelectedTopic] = useState<CommunityTopic | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  // Default feed is stage-relevant (±3 months) — "Browse all stages" is an
  // explicit opt-in, never the starting view.
  const [browseAllStages, setBrowseAllStages] = useState(false);
  const [menuDiscussion, setMenuDiscussion] = useState<Discussion | null>(null);
  // Its own mode, not a topic — a save isn't scoped to a topic or a
  // stage, so it sits outside the topic-pill filtering below rather than
  // being shoehorned into `selectedTopic`.
  const [showSaved, setShowSaved] = useState(false);

  const loadDiscussions = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const data = showSaved
        ? await communityDb.getSavedDiscussions()
        : await communityDb.getDiscussionsForAge(
            ageMonths,
            selectedTopic,
            browseAllStages ? 1200 : 3
          );
      setDiscussions(data);
    } catch {
      // A real load failure must not look identical to "no discussions
      // here yet" — the empty state below reads that as an invitation to
      // post, which is the wrong message when the feed simply failed to
      // load.
      setDiscussions([]);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [ageMonths, selectedTopic, browseAllStages, showSaved]);

  useEffect(() => {
    void loadDiscussions();
  }, [loadDiscussions]);

  const filteredDiscussions = discussions.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.title.toLowerCase().includes(q) ||
      item.body.toLowerCase().includes(q) ||
      (item.expert_reply?.expert_name.toLowerCase().includes(q) ?? false)
    );
  });

  const handleToggleSave = async (id: string) => {
    const newSavedState = await communityDb.toggleSaveDiscussion(id);
    setDiscussions((prev) =>
      // Unsaving while looking at the Saved list should drop the card
      // immediately rather than leave an unsaved-looking thread sitting
      // in a list titled "Saved".
      showSaved && !newSavedState
        ? prev.filter((d) => d.id !== id)
        : prev.map((d) => (d.id === id ? { ...d, saved: newSavedState } : d))
    );
  };

  const handleMenu = (discussion: Discussion) => setMenuDiscussion(discussion);

  // Blocking needs a real author to block. Starter content seeded with the
  // app has no account behind it, so the option is left off rather than
  // shown as something that would quietly do nothing.
  const blockableAuthorId = menuDiscussion?.author_id ?? null;

  const menuOptions = menuDiscussion
    ? [
        {
          label: "Report",
          onPress: async () => {
            await communityDb.reportDiscussion(menuDiscussion.id);
            setDiscussions((prev) => prev.filter((d) => d.id !== menuDiscussion.id));
          },
        },
        ...(blockableAuthorId
          ? [
              {
                label: "Block this parent",
                onPress: async () => {
                  await communityDb.blockAuthor(blockableAuthorId);
                  setDiscussions((prev) =>
                    prev.filter((d) => d.author_id !== blockableAuthorId)
                  );
                },
              },
            ]
          : []),
        {
          label: "Escalate: needs urgent attention",
          destructive: true,
          onPress: async () => {
            await communityDb.reportDiscussion(menuDiscussion.id, "escalated");
            setDiscussions((prev) => prev.filter((d) => d.id !== menuDiscussion.id));
          },
        },
      ]
    : [];

  const childStageName = stageLabel(ageMonths);
  // age.label is pluralised for standalone use ("5 months old"), but as a
  // compound adjective the unit goes singular and hyphenated — appending
  // "-olds" to it directly produced "Parents of 5 months-olds". Compound
  // labels ("2 years, 3 months") don't fit the pattern at all, so those
  // fall back to the stage wording rather than being forced into it.
  const peerGroup = age?.label.match(/^(\d+)\s+(day|week|month|year)s?$/);
  const ageContextText = peerGroup
    ? `Parents of ${peerGroup[1]}-${peerGroup[2]}-olds`
    : `Parents in ${childStageName}`;

  return (
    <View style={styles.screen}>
      <FlatList
        data={filteredDiscussions}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.headerArea}>
            <BuildingBanner />

            {/* No "COMMUNITY" eyebrow here: the tab bar's own header already
                says Community directly above this, and a third restatement of
                the word pushed the first real post below the fold. */}
            <Text style={styles.title}>Where parents share & connect</Text>
            <Text style={styles.subtitle}>
              No loud feeds, no algorithmic hype. Just real parents navigating the same stage.
            </Text>

            {/* Which slice of the feed you're looking at, as one quiet line
                rather than a filled card. It's filter state, not a headline —
                the previous banner spent 82px and three stacked lines saying
                what fits on one. */}
            <View style={styles.stageLine}>
              <View style={styles.stageDot} />
              <Text style={styles.stageLineText} numberOfLines={1}>
                {showSaved
                  ? "Discussions you've saved"
                  : browseAllStages
                    ? "All stages"
                    : ageContextText}
              </Text>
              {!showSaved && (
                <>
                  <Text style={styles.stageLineDivider}>·</Text>
                  <Pressable
                    onPress={() => setBrowseAllStages((v) => !v)}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={
                      browseAllStages
                        ? "Back to my child's stage"
                        : "Browse discussions from all stages"
                    }
                  >
                    <Text style={styles.stageLineToggle}>
                      {browseAllStages ? "Back to my stage" : "All stages"}
                    </Text>
                  </Pressable>
                </>
              )}
            </View>

            {/* Search Input */}
            <View style={styles.searchBar}>
              <SearchIcon />
              <TextInput
                style={styles.searchInput}
                placeholder="Search topics, questions, advice…"
                placeholderTextColor={colors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                clearButtonMode="while-editing"
              />
            </View>

            {/* Topic Filter Pills */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.topicScroll}
              contentContainerStyle={styles.topicContainer}
            >
              <Pressable
                onPress={() => setShowSaved((v) => !v)}
                style={[styles.topicChip, styles.savedChip, showSaved && styles.topicChipSelected]}
                accessibilityRole="button"
                accessibilityLabel={showSaved ? "Showing saved discussions" : "Show saved discussions"}
              >
                <BookmarkIcon saved={showSaved} small />
                <Text
                  style={[styles.topicChipText, showSaved && styles.topicChipTextSelected]}
                >
                  Saved
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setShowSaved(false);
                  setSelectedTopic("all");
                }}
                style={[
                  styles.topicChip,
                  !showSaved && selectedTopic === "all" && styles.topicChipSelected,
                ]}
              >
                <Text
                  style={[
                    styles.topicChipText,
                    !showSaved && selectedTopic === "all" && styles.topicChipTextSelected,
                  ]}
                >
                  All Topics
                </Text>
              </Pressable>
              {COMMUNITY_TOPICS.map((topic) => {
                const isSelected = !showSaved && selectedTopic === topic;
                return (
                  <Pressable
                    key={topic}
                    onPress={() => {
                      setShowSaved(false);
                      setSelectedTopic(topic);
                    }}
                    style={[styles.topicChip, isSelected && styles.topicChipSelected]}
                  >
                    <Text
                      style={[
                        styles.topicChipText,
                        isSelected && styles.topicChipTextSelected,
                      ]}
                    >
                      {TOPIC_LABEL[topic]}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* No section heading: the selected pill directly above already
                names what's below it, and "Recent Discussions" over an
                already-highlighted "All Topics" pill was the same word twice. */}
          </View>
        }
        renderItem={({ item }) => (
          <DiscussionCard
            discussion={item}
            onPress={() => router.push(`/community/discussion?id=${item.id}`)}
            onSave={() => handleToggleSave(item.id)}
            onMenu={() => handleMenu(item)}
          />
        )}
        ListEmptyComponent={
          loading ? (
            <View style={styles.emptyWrap}>
              <ActivityIndicator color={colors.warmTaupe} size="small" />
              <Text style={styles.emptyText}>Loading discussions for your stage…</Text>
            </View>
          ) : loadError ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyTitle}>We couldn&rsquo;t load the feed.</Text>
              <Text style={styles.emptyText}>
                Check your connection and try again. Anything you&rsquo;ve posted or saved is
                safe.
              </Text>
              <Pressable
                onPress={() => void loadDiscussions()}
                style={({ pressed }) => [styles.retryButton, pressed && { opacity: 0.75 }]}
                accessibilityRole="button"
              >
                <Text style={styles.retryButtonText}>Try again</Text>
              </Pressable>
            </View>
          ) : showSaved ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyTitle}>Nothing saved yet</Text>
              <Text style={styles.emptyText}>
                Tap the bookmark on any discussion to keep it here for later.
              </Text>
            </View>
          ) : (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyTitle}>No discussions found</Text>
              <Text style={styles.emptyText}>
                Be the first parent to start a conversation in this topic.
              </Text>
            </View>
          )
        }
      />

      {/* Floating Ask Question Button */}
      <Pressable
        style={styles.fab}
        onPress={() => router.push("/community/ask")}
        accessibilityRole="button"
        accessibilityLabel="Ask a Question"
      >
        <PlusIcon />
        <Text style={styles.fabText}>Ask a Question</Text>
      </Pressable>

      {guidedTour && (
        <GuidedTourDialog
          eyebrow="Community"
          focus="Find your people"
          title="You're not doing this alone."
          body="A space for real parent conversations and shared experiences, at your child's stage."
          step={1}
          total={5}
          primaryTitle="Continue"
          onPrimary={() => router.replace(`/ask?guidedTour=1&step=2${tourNext}`)}
          onSkip={skipGuidedTour}
        />
      )}

      <ActionSheetDialog
        visible={!!menuDiscussion}
        title={menuDiscussion?.title}
        options={menuOptions}
        onDismiss={() => setMenuDiscussion(null)}
      />
    </View>
  );
}

function DiscussionCard({
  discussion,
  onPress,
  onSave,
  onMenu,
}: {
  discussion: Discussion;
  onPress: () => void;
  onSave: () => void;
  onMenu: () => void;
}) {
  return (
    <Pressable style={styles.card} onPress={onPress} accessibilityRole="button">
      <View style={styles.cardHeader}>
        <View style={styles.cardTagRow}>
          <Text style={styles.cardTopic}>{TOPIC_LABEL[discussion.topic].toUpperCase()}</Text>
          <Text style={styles.cardAgeTag}>{discussion.author_child_age_months}m stage</Text>
          {discussion.is_resolved && (
            <View style={styles.resolvedPill}>
              <Text style={styles.resolvedPillText}>Resolved</Text>
            </View>
          )}
        </View>

        <View style={styles.cardHeaderActions}>
          <Pressable onPress={onSave} hitSlop={10} accessibilityLabel="Save discussion">
            <BookmarkIcon saved={!!discussion.saved} />
          </Pressable>
          <Pressable onPress={onMenu} hitSlop={10} accessibilityLabel="More options">
            <MoreIcon />
          </Pressable>
        </View>
      </View>

      <Text style={styles.cardTitle} numberOfLines={2}>
        {discussion.title}
      </Text>
      <Text style={styles.cardBody} numberOfLines={2}>
        {discussion.body}
      </Text>

      {/* Expert Preview Badge if available */}
      {discussion.expert_reply && (
        <View style={styles.expertPreview}>
          <View style={styles.expertHeader}>
            <DoctorBadgeIcon />
            <Text style={styles.expertName}>
              {discussion.expert_reply.expert_name} ·{" "}
              <Text style={styles.expertCred}>{discussion.expert_reply.credential}</Text>
            </Text>
            {discussion.expert_reply.is_verified && (
              <View style={styles.verifiedPill}>
                <Text style={styles.verifiedPillText}>Verified</Text>
              </View>
            )}
          </View>
          <Text style={styles.expertSnippet} numberOfLines={2}>
            &ldquo;{discussion.expert_reply.body}&rdquo;
          </Text>
        </View>
      )}

      <View style={styles.cardFooter}>
        <View style={styles.authorBadge}>
          <View style={styles.authorCircle}>
            <Text style={styles.authorInitial}>{discussion.author_initial}</Text>
          </View>
          {/* Just the timestamp — the poster's child age is already the
              "8m stage" tag in this card's header, and saying it twice on
              one card was the densest thing on the screen. */}
          <Text style={styles.authorMeta}>{discussion.created_at}</Text>
        </View>

        <View style={styles.replyCountBadge}>
          <MessageIcon />
          <Text style={styles.replyCountText}>{discussion.reply_count} replies</Text>
        </View>
      </View>
    </Pressable>
  );
}

// Icons
function SearchIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
        stroke={colors.textMuted}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function PlusIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 4.5v15m7.5-7.5h-15"
        stroke={colors.white}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function BookmarkIcon({ saved, small }: { saved: boolean; small?: boolean }) {
  // On the "Saved" filter pill, `saved` means "this filter is active" —
  // once that pill's background goes warmTaupe (see styles.topicChipSelected),
  // the icon needs to flip to white to stay legible, same as the pill's text.
  const color = small && saved ? colors.white : colors.warmTaupe;
  const size = small ? 14 : 18;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={saved ? color : "none"}>
      <Path
        d="M17.5 21l-5.5-3.5L6.5 21V5a2 2 0 012-2h7a2 2 0 012 2v16z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function MoreIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Circle cx="5" cy="12" r="1.6" fill={colors.textMuted} />
      <Circle cx="12" cy="12" r="1.6" fill={colors.textMuted} />
      <Circle cx="19" cy="12" r="1.6" fill={colors.textMuted} />
    </Svg>
  );
}

function MessageIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 21a9 9 0 10-4.5-1.2L3 21l1.2-4.5A9 9 0 0012 21z"
        stroke={colors.textMuted}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function DoctorBadgeIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 12h6m-3-3v6m9-3a9 9 0 11-18 0 9 9 0 0118 0z"
        stroke={colors.sage}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl + 40,
  },
  headerArea: {
    marginBottom: spacing.md,
  },
  title: {
    fontFamily: fonts.bodyBold,
    fontSize: typeScale.h1,
    color: colors.charcoal,
    lineHeight: typeScale.h1 * 1.2,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: typeScale.bodySmall,
    lineHeight: typeScale.bodySmall * 1.45,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },

  // Stage line — one row, no fill, no border.
  stageLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs + 2,
    marginTop: spacing.md,
  },
  stageDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.sage,
  },
  stageLineText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: typeScale.caption,
    color: colors.charcoal,
    flexShrink: 1,
  },
  stageLineDivider: {
    fontFamily: fonts.body,
    fontSize: typeScale.caption,
    color: colors.border,
  },
  stageLineToggle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: typeScale.caption,
    color: colors.warmTaupe,
  },

  // Search Bar
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.md,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: typeScale.bodySmall,
    color: colors.charcoal,
    padding: 0,
  },

  // Topic Filters
  topicScroll: {
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  topicContainer: {
    gap: spacing.xs + 2,
    paddingRight: spacing.md,
  },
  topicChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm - 2,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  savedChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  topicChipSelected: {
    backgroundColor: colors.warmTaupe,
    borderColor: colors.warmTaupe,
  },
  topicChipText: {
    fontFamily: fonts.bodyMedium,
    fontSize: typeScale.caption + 1,
    color: colors.textMuted,
  },
  topicChipTextSelected: {
    color: colors.white,
    fontFamily: fonts.bodySemiBold,
  },


  // Discussion Card
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xs + 2,
  },
  cardHeaderActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  cardTagRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cardTopic: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 9,
    letterSpacing: 1.2,
    color: colors.warmTaupe,
  },
  cardAgeTag: {
    fontFamily: fonts.bodyMedium,
    fontSize: 9,
    color: colors.textMuted,
    backgroundColor: "rgba(0, 0, 0, 0.04)",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.pill,
  },
  resolvedPill: {
    backgroundColor: "rgba(168, 181, 164, 0.28)",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.pill,
  },
  resolvedPillText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 9,
    letterSpacing: 0.4,
    color: "#5E7360",
  },
  cardTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: typeScale.body,
    lineHeight: typeScale.body * 1.3,
    color: colors.charcoal,
  },
  cardBody: {
    fontFamily: fonts.body,
    fontSize: typeScale.bodySmall,
    lineHeight: typeScale.bodySmall * 1.45,
    color: colors.textMuted,
    marginTop: 4,
  },

  // Expert Preview
  expertPreview: {
    backgroundColor: "rgba(168, 181, 164, 0.12)",
    borderRadius: radius.sm,
    padding: spacing.sm + 2,
    marginTop: spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: colors.sage,
  },
  expertHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  expertName: {
    fontFamily: fonts.bodySemiBold,
    fontSize: typeScale.caption,
    color: colors.charcoal,
  },
  expertCred: {
    fontFamily: fonts.body,
    color: colors.warmTaupe,
  },
  verifiedPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 1,
    borderRadius: radius.pill,
    backgroundColor: "rgba(168, 181, 164, 0.28)",
  },
  verifiedPillText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 10,
    letterSpacing: 0.4,
    color: "#5E7360",
  },
  expertSnippet: {
    fontFamily: fonts.serifItalic,
    fontSize: typeScale.caption + 1,
    lineHeight: (typeScale.caption + 1) * 1.4,
    color: colors.charcoal,
    marginTop: 3,
  },

  // Card Footer
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.md,
    paddingTop: spacing.xs + 2,
    borderTopWidth: 1,
    borderTopColor: "rgba(96, 79, 60, 0.08)",
  },
  authorBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs + 2,
  },
  authorCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(139, 115, 85, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  authorInitial: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    color: colors.warmTaupe,
  },
  authorMeta: {
    fontFamily: fonts.body,
    fontSize: typeScale.caption,
    color: colors.textMuted,
  },
  replyCountBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  replyCountText: {
    fontFamily: fonts.bodyMedium,
    fontSize: typeScale.caption,
    color: colors.textMuted,
  },

  // Empty State
  emptyWrap: {
    paddingVertical: spacing.xxl,
    alignItems: "center",
  },
  emptyTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: typeScale.body,
    color: colors.charcoal,
  },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: typeScale.bodySmall,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: 4,
  },
  retryButton: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.sageDark,
  },
  retryButtonText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: typeScale.bodySmall,
    color: colors.white,
  },

  // FAB
  fab: {
    position: "absolute",
    right: spacing.lg,
    bottom: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.charcoal,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 4,
    borderRadius: radius.pill,
    shadowColor: colors.charcoal,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  fabText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: typeScale.bodySmall,
    color: colors.white,
  },
});

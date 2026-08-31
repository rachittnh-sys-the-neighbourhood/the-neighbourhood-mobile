import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { useAuth } from "../../lib/AuthProvider";
import { computeAge } from "../../lib/childAge";
import * as communityDb from "../../lib/db/community";
import { Discussion, Reply, TOPIC_LABEL } from "../../lib/db/communityTypes";
import { currentUserId } from "../../lib/db/session";
import { colors, fonts, radius, spacing, typeScale } from "../../lib/theme";

export default function DiscussionDetail() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const discussionId = params.id ?? "";

  const { child, parentName } = useAuth();
  const age = child ? computeAge(child.date_of_birth) : null;
  const ageMonths = age?.totalMonths ?? 12;

  const [discussion, setDiscussion] = useState<Discussion | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [togglingResolved, setTogglingResolved] = useState(false);

  useEffect(() => {
    void currentUserId().then(setViewerId);
  }, []);

  const loadData = useCallback(async () => {
    if (!discussionId) return;
    setLoading(true);
    try {
      const res = await communityDb.getDiscussionById(discussionId);
      if (res) {
        setDiscussion(res.discussion);
        setReplies(res.replies);
      }
    } finally {
      setLoading(false);
    }
  }, [discussionId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleSendReply = async () => {
    const text = replyText.trim();
    if (!text || !discussion) return;
    setSubmitting(true);
    try {
      const parentInitial = parentName?.trim()?.[0]?.toUpperCase() ?? "P";
      const newReply = await communityDb.addReply({
        discussionId: discussion.id,
        body: text,
        parentInitial,
        childAgeMonths: ageMonths,
      });
      setReplies((prev) => [...prev, newReply]);
      setDiscussion((prev) => (prev ? { ...prev, reply_count: prev.reply_count + 1 } : null));
      setReplyText("");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleResolved = async () => {
    if (!discussion) return;
    const next = !discussion.is_resolved;
    setTogglingResolved(true);
    setDiscussion((prev) => (prev ? { ...prev, is_resolved: next } : null));
    try {
      await communityDb.setDiscussionResolved(discussion.id, next);
    } catch {
      setDiscussion((prev) => (prev ? { ...prev, is_resolved: !next } : null));
    } finally {
      setTogglingResolved(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centeredScreen}>
        <ActivityIndicator color={colors.warmTaupe} size="large" />
      </SafeAreaView>
    );
  }

  if (!discussion) {
    return (
      <SafeAreaView style={styles.centeredScreen}>
        <Text style={styles.notFoundText}>Discussion not found.</Text>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>Return to Community</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      {/* Header bar */}
      <View style={styles.navHeader}>
        <Pressable onPress={() => router.back()} style={styles.backTouch} hitSlop={10}>
          <ChevronLeftIcon />
          <Text style={styles.backLabel}>Community</Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {/* Tag & Stage */}
          <View style={styles.tagRow}>
            <Text style={styles.topicTag}>{TOPIC_LABEL[discussion.topic].toUpperCase()}</Text>
            <Text style={styles.stageTag}>{discussion.author_child_age_months}m stage</Text>
            {discussion.is_resolved && (
              <View style={styles.resolvedTag}>
                <Text style={styles.resolvedTagText}>Resolved</Text>
              </View>
            )}
          </View>

          {/* Question Title & Body */}
          <Text style={styles.discussionTitle}>{discussion.title}</Text>
          <Text style={styles.discussionBody}>{discussion.body}</Text>

          {/* Question Author Meta */}
          <View style={styles.authorMetaRow}>
            <View style={styles.authorCircle}>
              <Text style={styles.authorInitial}>{discussion.author_initial}</Text>
            </View>
            <Text style={styles.authorText}>
              Parent of {discussion.author_child_age_months}m old · {discussion.created_at}
            </Text>
          </View>

          {/* Only the parent who posted this can close it out — nobody
              else's discussion can be marked resolved out from under
              them. */}
          {viewerId && discussion.author_id === viewerId && (
            <Pressable
              onPress={handleToggleResolved}
              disabled={togglingResolved}
              style={({ pressed }) => [
                styles.resolveButton,
                discussion.is_resolved && styles.resolveButtonActive,
                (pressed || togglingResolved) && { opacity: 0.7 },
              ]}
              accessibilityRole="button"
            >
              <Text
                style={[
                  styles.resolveButtonText,
                  discussion.is_resolved && styles.resolveButtonTextActive,
                ]}
              >
                {discussion.is_resolved ? "Resolved · tap to reopen" : "Mark as resolved"}
              </Text>
            </Pressable>
          )}

          <View style={styles.divider} />

          {/* Expert answer card, if present. The "verified" badge is only
              ever shown for a genuinely verified professional — see
              ExpertReply.is_verified in lib/db/communityTypes.ts. */}
          {discussion.expert_reply && (
            <View style={styles.expertCard}>
              <View style={styles.expertTopRow}>
                <View style={styles.expertBadgeRow}>
                  <VerifiedDoctorIcon />
                  <Text style={styles.expertBadgeText}>
                    {discussion.expert_reply.is_verified
                      ? "VERIFIED EXPERT RESPONSE"
                      : "EXPERT RESPONSE"}
                  </Text>
                </View>
              </View>

              <Text style={styles.expertName}>{discussion.expert_reply.expert_name}</Text>
              <Text style={styles.expertTitle}>{discussion.expert_reply.credential}</Text>

              <Text style={styles.expertBody}>{discussion.expert_reply.body}</Text>
              <Text style={styles.expertTime}>{discussion.expert_reply.created_at}</Text>
            </View>
          )}

          {/* Replies Section Header */}
          <Text style={styles.repliesHeader}>
            Parent Responses ({replies.length})
          </Text>

          {replies.length === 0 ? (
            <View style={styles.emptyReplies}>
              <Text style={styles.emptyRepliesText}>
                No replies yet. Share your experience or advice with this parent!
              </Text>
            </View>
          ) : (
            replies.map((reply) => (
              <View key={reply.id} style={styles.replyCard}>
                <View style={styles.replyHeader}>
                  <View style={styles.replyAuthorCircle}>
                    <Text style={styles.replyInitial}>{reply.author_initial}</Text>
                  </View>
                  <View>
                    <Text style={styles.replyAuthorName}>
                      Parent of {reply.author_child_age_months}m old
                    </Text>
                    <Text style={styles.replyTime}>{reply.created_at}</Text>
                  </View>
                </View>
                <Text style={styles.replyBody}>{reply.body}</Text>
              </View>
            ))
          )}
        </ScrollView>

        {/* Reply Composer */}
        <View style={styles.composer}>
          <TextInput
            style={styles.composerInput}
            value={replyText}
            onChangeText={setReplyText}
            placeholder="Share your experience or words of support…"
            placeholderTextColor={colors.textMuted}
            multiline
            maxLength={500}
          />
          <Pressable
            onPress={handleSendReply}
            disabled={!replyText.trim() || submitting}
            style={[
              styles.sendButton,
              (!replyText.trim() || submitting) && styles.sendButtonDisabled,
            ]}
          >
            {submitting ? (
              <ActivityIndicator color={colors.white} size="small" />
            ) : (
              <Text style={styles.sendButtonText}>Reply</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// Icons
function ChevronLeftIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        d="M15 19l-7-7 7-7"
        stroke={colors.warmTaupe}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function VerifiedDoctorIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 12h6m-3-3v6m9-3a9 9 0 11-18 0 9 9 0 0118 0z"
        stroke={colors.sage}
        strokeWidth={2.2}
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
  centeredScreen: {
    flex: 1,
    backgroundColor: colors.cream,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
  notFoundText: {
    fontFamily: fonts.bodyBold,
    fontSize: typeScale.body,
    color: colors.charcoal,
  },
  backButton: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.sageDark,
    borderRadius: radius.pill,
  },
  backButtonText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: typeScale.bodySmall,
    color: colors.white,
  },

  navHeader: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.cream,
  },
  backTouch: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  backLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: typeScale.bodySmall,
    color: colors.warmTaupe,
  },

  container: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },

  tagRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: spacing.xs,
  },
  topicTag: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 10,
    letterSpacing: 1.3,
    color: colors.warmTaupe,
  },
  stageTag: {
    fontFamily: fonts.bodyMedium,
    fontSize: 10,
    color: colors.textMuted,
    backgroundColor: "rgba(0, 0, 0, 0.04)",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.pill,
  },
  resolvedTag: {
    backgroundColor: "rgba(168, 181, 164, 0.28)",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.pill,
  },
  resolvedTagText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 10,
    letterSpacing: 0.4,
    color: "#5E7360",
  },
  resolveButton: {
    marginTop: spacing.md,
    alignSelf: "flex-start",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm - 2,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  resolveButtonActive: {
    backgroundColor: "rgba(168, 181, 164, 0.22)",
    borderColor: "rgba(168, 181, 164, 0.5)",
  },
  resolveButtonText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: typeScale.caption,
    color: colors.warmTaupe,
  },
  resolveButtonTextActive: {
    color: "#5E7360",
  },

  discussionTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: typeScale.h2,
    lineHeight: typeScale.h2 * 1.25,
    color: colors.charcoal,
    marginTop: spacing.xs,
  },
  discussionBody: {
    fontFamily: fonts.body,
    fontSize: typeScale.body,
    lineHeight: typeScale.body * 1.5,
    color: colors.charcoal,
    marginTop: spacing.sm,
  },

  authorMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs + 2,
    marginTop: spacing.md,
  },
  authorCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(139, 115, 85, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  authorInitial: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.warmTaupe,
  },
  authorText: {
    fontFamily: fonts.body,
    fontSize: typeScale.caption + 1,
    color: colors.textMuted,
  },

  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.lg,
  },

  // Expert Card
  expertCard: {
    backgroundColor: "rgba(168, 181, 164, 0.14)",
    borderRadius: radius.md,
    padding: spacing.md + 2,
    borderWidth: 1,
    borderColor: "rgba(168, 181, 164, 0.35)",
    borderLeftWidth: 4,
    borderLeftColor: colors.sage,
    marginBottom: spacing.lg,
  },
  expertTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  expertBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  expertBadgeText: {
    fontFamily: fonts.bodyBold,
    fontSize: 9,
    letterSpacing: 1.2,
    color: colors.sage,
  },
  expertName: {
    fontFamily: fonts.bodyBold,
    fontSize: typeScale.body,
    color: colors.charcoal,
  },
  expertTitle: {
    fontFamily: fonts.bodyMedium,
    fontSize: typeScale.caption,
    color: colors.warmTaupe,
    marginBottom: spacing.sm,
  },
  expertBody: {
    fontFamily: fonts.body,
    fontSize: typeScale.bodySmall,
    lineHeight: typeScale.bodySmall * 1.5,
    color: colors.charcoal,
  },
  expertTime: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },

  // Parent Replies
  repliesHeader: {
    fontFamily: fonts.bodyBold,
    fontSize: typeScale.h3,
    color: colors.charcoal,
    marginBottom: spacing.md,
  },
  emptyReplies: {
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyRepliesText: {
    fontFamily: fonts.body,
    fontSize: typeScale.bodySmall,
    color: colors.textMuted,
    textAlign: "center",
  },

  replyCard: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  replyHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.xs + 2,
  },
  replyAuthorCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(139, 115, 85, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  replyInitial: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.warmTaupe,
  },
  replyAuthorName: {
    fontFamily: fonts.bodySemiBold,
    fontSize: typeScale.caption + 1,
    color: colors.charcoal,
  },
  replyTime: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.textMuted,
  },
  replyBody: {
    fontFamily: fonts.body,
    fontSize: typeScale.bodySmall,
    lineHeight: typeScale.bodySmall * 1.45,
    color: colors.charcoal,
  },

  // Composer
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    backgroundColor: colors.cream,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  composerInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontFamily: fonts.body,
    fontSize: typeScale.bodySmall,
    color: colors.charcoal,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sendButton: {
    backgroundColor: colors.sageDark,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 64,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: typeScale.bodySmall,
    color: colors.white,
  },
});

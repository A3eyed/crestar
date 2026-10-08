// @ts-nocheck
import { useState, useRef, useCallback, useEffect } from "react";
import {
  View,
  TouchableOpacity,
  Text,
  Dimensions,
  Pressable,
  Platform,
  TextInput,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Alert,
  Share,
} from "react-native";
import { useRouter } from "expo-router";
import {
  Heart,
  MessageCircle,
  Share2,
  Plus,
  Check,
  Play,
  Send,
  X,
} from "lucide-react-native";
import { Image } from "expo-image";
import useAuth from "@/utils/auth/useAuth";
import VerifiedBadge from "@/components/VerifiedBadge";
import { authenticatedFetch } from "@/utils/authenticatedFetch";
import TaggedProductAnchor from "@/components/TaggedProductAnchor";

let useVideoPlayer, VideoView;
if (Platform.OS !== "web") {
  try {
    const ExpoVideo = require("expo-video");
    useVideoPlayer = ExpoVideo?.useVideoPlayer;
    VideoView = ExpoVideo?.VideoView;
  } catch (e) {
    console.error("[VideoItem] Failed to load expo-video:", e?.message);
  }
}
const useVideoPlayerSafe =
  typeof useVideoPlayer === "function" ? useVideoPlayer : () => null;
if (!VideoView) VideoView = ({ style }) => <View style={style} />;

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get("window");
const BRAND = "#D4AF37";
const APP_URL = "https://crestarhq.com";

export function VideoItem({ item, isActive, onProductPress }) {
  const router = useRouter();
  const { isAuthenticated, signIn } = useAuth();
  const [liked, setLiked] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [pausedByUser, setPausedByUser] = useState(false);
  const [showPauseIcon, setShowPauseIcon] = useState(false);
  const [showHeart, setShowHeart] = useState(false);
  const [likeCount, setLikeCount] = useState(
    item.likes_count || parseInt(item.likes) || 0
  );
  const [commentCount, setCommentCount] = useState(
    item.comments_count || parseInt(item.comments) || 0
  );
  const [shareCount, setShareCount] = useState(
    item.shares_count || parseInt(item.shares) || 0
  );
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);
  const [postingComment, setPostingComment] = useState(false);
  const taggedItems = item.taggedItems || item.tagged_items || [];
  const hasProduct = taggedItems.length > 0;
  const isVerified = item.isVerified || item.is_verified;
  const creatorId = item.sellerId || item.creatorUserId || item.creator_user_id;
  const lastTap = useRef(0);
  const webVideoRef = useRef(null);
  const pauseIconTimer = useRef(null);
  const heartTimer = useRef(null);

  const setupPlayer = useCallback((p) => {
    p.loop = true;
    p.muted = false;
  }, []);
  const player = useVideoPlayerSafe(
    item.videoUrl || item.video_url,
    setupPlayer
  );

  useEffect(() => {
    if (!isActive) setPausedByUser(false);
  }, [isActive]);

  useEffect(() => {
    if (Platform.OS === "web" || !player) return;
    try {
      player.muted = !isActive;
      if (isActive && !pausedByUser) player.play();
      else player.pause();
    } catch (e) {}
  }, [isActive, pausedByUser, player]);

  useEffect(() => {
    if (Platform.OS !== "web" || !webVideoRef.current) return;
    webVideoRef.current.muted = !isActive;
    if (isActive && !pausedByUser) webVideoRef.current.play().catch(() => {});
    else webVideoRef.current.pause();
  }, [isActive, pausedByUser]);

  const checkLikeStatus = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const response = await authenticatedFetch(
        `/api/videos/like?videoId=${item.id}`
      );
      if (response.ok) setLiked(!!(await response.json()).liked);
    } catch (e) {}
  }, [isAuthenticated, item.id]);

  const checkFollowStatus = useCallback(async () => {
    if (!isAuthenticated || !creatorId) return;
    try {
      const response = await authenticatedFetch(
        `/api/follows?targetId=${creatorId}`
      );
      if (response.ok) setIsFollowing(!!(await response.json()).following);
    } catch (e) {}
  }, [isAuthenticated, creatorId]);

  useEffect(() => {
    checkLikeStatus();
    checkFollowStatus();
  }, [checkLikeStatus, checkFollowStatus]);

  const requireAuth = () => {
    if (isAuthenticated) return true;
    signIn();
    return false;
  };

  const likeVideo = async () => {
    if (!requireAuth()) return;
    const next = !liked;
    setLiked(next);
    setLikeCount((count) => Math.max(0, count + (next ? 1 : -1)));
    try {
      const response = await authenticatedFetch("/api/videos/like", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId: item.id }),
      });
      if (response.ok) setLiked(!!(await response.json()).liked);
    } catch (e) {
      setLiked(!next);
      setLikeCount((count) => Math.max(0, count + (next ? -1 : 1)));
    }
  };

  const burstHeart = () => {
    setShowHeart(true);
    if (heartTimer.current) clearTimeout(heartTimer.current);
    heartTimer.current = setTimeout(() => setShowHeart(false), 700);
  };

  const handleVideoTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 280) {
      lastTap.current = 0;
      burstHeart();
      if (!liked) likeVideo();
      return;
    }
    lastTap.current = now;
    setTimeout(() => {
      if (Date.now() - lastTap.current < 280) return;
      if (pauseIconTimer.current) clearTimeout(pauseIconTimer.current);
      if (Platform.OS === "web") {
        if (!webVideoRef.current) return;
        if (webVideoRef.current.paused) {
          webVideoRef.current.play().catch(() => {});
          setPausedByUser(false);
        } else {
          webVideoRef.current.pause();
          setPausedByUser(true);
          setShowPauseIcon(true);
        }
        return;
      }
      if (!player) return;
      if (player.playing) {
        player.pause();
        setPausedByUser(true);
        setShowPauseIcon(true);
      } else {
        player.play();
        setPausedByUser(false);
        setShowPauseIcon(true);
        pauseIconTimer.current = setTimeout(() => setShowPauseIcon(false), 600);
      }
    }, 280);
  };

  const fetchComments = async () => {
    try {
      setLoadingComments(true);
      const response = await authenticatedFetch(
        `/api/videos/comment?videoId=${item.id}`
      );
      if (response.ok) setComments((await response.json()).comments || []);
    } catch (e) {
    } finally {
      setLoadingComments(false);
    }
  };

  const handleComment = () => {
    if (!requireAuth()) return;
    setShowComments(true);
    fetchComments();
  };

  const handlePostComment = async () => {
    if (!newComment.trim()) return;
    try {
      setPostingComment(true);
      const response = await authenticatedFetch("/api/videos/comment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoId: item.id,
          commentText: newComment.trim(),
        }),
      });
      if (!response.ok) {
        Alert.alert("Error", "Failed to post comment");
        return;
      }
      const data = await response.json();
      setComments((prev) => [data.comment, ...prev]);
      setCommentCount((count) => count + 1);
      setNewComment("");
    } catch (e) {
      Alert.alert("Error", "Failed to post comment");
    } finally {
      setPostingComment(false);
    }
  };

  const handleProfilePress = () => {
    if (!creatorId) return;
    router.push(`/seller/${creatorId}`);
  };

  const handleFollowPress = async () => {
    if (!requireAuth() || !creatorId) return;
    const next = !isFollowing;
    setIsFollowing(next);
    try {
      const response = await authenticatedFetch("/api/follows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetId: creatorId }),
      });
      if (response.ok) setIsFollowing(!!(await response.json()).following);
      else setIsFollowing(!next);
    } catch (e) {
      setIsFollowing(!next);
    }
  };

  const handleShare = async () => {
    try {
      const shareUrl = `${APP_URL}/video/${item.id}`;
      const creatorName =
        item.displayName || item.businessName || `@${item.username}`;
      const result = await Share.share({
        message: `Watch ${creatorName} on Crestar ${shareUrl}`,
        url: shareUrl,
      });
      if (result.action === Share.sharedAction) {
        setShareCount((count) => count + 1);
        authenticatedFetch("/api/videos/share", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ videoId: item.id }),
        }).catch(() => {});
      }
    } catch (e) {}
  };

  return (
    <View
      style={{
        height: SCREEN_HEIGHT,
        width: SCREEN_WIDTH,
        backgroundColor: "#000000",
      }}
    >
      {Platform.OS !== "web" && VideoView && player ? (
        <VideoView
          player={player}
          style={{
            position: "absolute",
            width: SCREEN_WIDTH,
            height: SCREEN_HEIGHT,
          }}
          contentFit="cover"
          nativeControls={false}
        />
      ) : Platform.OS === "web" ? (
        <video
          ref={webVideoRef}
          src={item.videoUrl || item.video_url}
          poster={item.thumbnail}
          loop
          muted={!isActive}
          playsInline
          autoPlay={isActive}
          style={{
            position: "absolute",
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      ) : (
        <Image
          source={{ uri: item.thumbnail || item.videoUrl }}
          style={{
            position: "absolute",
            width: SCREEN_WIDTH,
            height: SCREEN_HEIGHT,
          }}
          contentFit="cover"
        />
      )}
      <Pressable
        onPress={handleVideoTap}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 80,
          height: Math.round(SCREEN_HEIGHT * 0.5),
          zIndex: 2,
        }}
      />
      {showHeart && (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            alignItems: "center",
            justifyContent: "center",
            zIndex: 4,
          }}
        >
          <Heart size={92} color={BRAND} fill={BRAND} />
        </View>
      )}
      {showPauseIcon && !showHeart && (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            alignItems: "center",
            justifyContent: "center",
            zIndex: 3,
          }}
        >
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              backgroundColor: "rgba(0,0,0,0.5)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Play size={32} color="#FFFFFF" fill="#FFFFFF" />
          </View>
        </View>
      )}
      <View
        style={{
          position: "absolute",
          right: 12,
          bottom: 140,
          zIndex: 8,
          gap: 22,
        }}
      >
        <View style={{ alignItems: "center" }}>
          <TouchableOpacity
            onPress={handleProfilePress}
            style={{ marginBottom: 8 }}
          >
            <Image
              source={{
                uri:
                  item.avatar ||
                  item.profile_image ||
                  `https://i.pravatar.cc/150?u=${creatorId}`,
              }}
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                borderWidth: 2,
                borderColor: "#FFFFFF",
              }}
              contentFit="cover"
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleFollowPress}
            style={{
              marginTop: -16,
              width: 24,
              height: 24,
              borderRadius: 12,
              backgroundColor: isFollowing ? "#FFFFFF" : BRAND,
              borderWidth: 2,
              borderColor: "#FFFFFF",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {isFollowing ? (
              <Check size={12} color="#000000" strokeWidth={3} />
            ) : (
              <Plus size={14} color="#000000" strokeWidth={3} />
            )}
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          onPress={likeVideo}
          style={{ alignItems: "center", gap: 4 }}
        >
          <Heart
            size={30}
            color={liked ? BRAND : "#FFFFFF"}
            fill={liked ? BRAND : "transparent"}
          />
          <Text style={{ color: "#FFFFFF", fontSize: 12, fontWeight: "600" }}>
            {likeCount}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleComment}
          style={{ alignItems: "center", gap: 4 }}
        >
          <MessageCircle size={30} color="#FFFFFF" />
          <Text style={{ color: "#FFFFFF", fontSize: 12, fontWeight: "600" }}>
            {commentCount}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleShare}
          style={{ alignItems: "center", gap: 4 }}
        >
          <Share2 size={28} color="#FFFFFF" />
          <Text style={{ color: "#FFFFFF", fontSize: 12, fontWeight: "600" }}>
            {shareCount}
          </Text>
        </TouchableOpacity>
      </View>
      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 80,
          padding: 16,
          paddingBottom: 150,
          zIndex: 5,
        }}
      >
        <TouchableOpacity
          onPress={handleProfilePress}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            marginBottom: 6,
          }}
        >
          <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "700" }}>
            {item.displayName || item.businessName || `@${item.username}`}
          </Text>
          <VerifiedBadge isVerified={isVerified} size={16} />
          {!isFollowing && (
            <TouchableOpacity
              onPress={handleFollowPress}
              style={{
                backgroundColor: "#FFFFFF",
                paddingHorizontal: 14,
                paddingVertical: 5,
                borderRadius: 6,
              }}
            >
              <Text
                style={{ color: "#000000", fontSize: 13, fontWeight: "700" }}
              >
                Follow
              </Text>
            </TouchableOpacity>
          )}
        </TouchableOpacity>
        <Text
          style={{
            color: "rgba(255,255,255,0.9)",
            fontSize: 14,
            lineHeight: 20,
          }}
          numberOfLines={2}
        >
          {item.description || item.caption || ""}
        </Text>
        {hasProduct && (
          <TaggedProductAnchor
            video={item}
            isActive={isActive}
            onProductPress={onProductPress}
            style={{ marginTop: 10 }}
          />
        )}
      </View>
      <Modal
        visible={showComments}
        animationType="slide"
        transparent
        onRequestClose={() => setShowComments(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <Pressable
            style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.55)" }}
            onPress={() => setShowComments(false)}
          />
          <View
            style={{
              backgroundColor: "#111111",
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              maxHeight: SCREEN_HEIGHT * 0.7,
              borderTopWidth: 1,
              borderColor: "rgba(255,255,255,0.12)",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                padding: 16,
                borderBottomWidth: 1,
                borderColor: "rgba(255,255,255,0.1)",
              }}
            >
              <Text
                style={{ color: "#FFFFFF", fontSize: 18, fontWeight: "700" }}
              >
                {commentCount} comments
              </Text>
              <TouchableOpacity onPress={() => setShowComments(false)}>
                <X size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ padding: 16 }}>
              {loadingComments ? (
                <Text
                  style={{
                    color: "rgba(255,255,255,0.5)",
                    textAlign: "center",
                  }}
                >
                  Loading...
                </Text>
              ) : comments.length === 0 ? (
                <Text
                  style={{
                    color: "rgba(255,255,255,0.5)",
                    textAlign: "center",
                  }}
                >
                  No comments yet
                </Text>
              ) : (
                comments.map((comment) => (
                  <View
                    key={comment.id}
                    style={{ marginBottom: 16, flexDirection: "row", gap: 12 }}
                  >
                    <Image
                      source={{
                        uri:
                          comment.user?.profileImage ||
                          `https://i.pravatar.cc/40?u=${comment.user?.id}`,
                      }}
                      style={{ width: 32, height: 32, borderRadius: 16 }}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: "#FFFFFF", fontWeight: "600" }}>
                        @{comment.user?.username || "user"}
                      </Text>
                      <Text
                        style={{ color: "rgba(255,255,255,0.9)", marginTop: 2 }}
                      >
                        {comment.text}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                padding: 16,
                borderTopWidth: 1,
                borderColor: "rgba(255,255,255,0.1)",
              }}
            >
              <TextInput
                placeholder="Add a comment..."
                placeholderTextColor="rgba(255,255,255,0.4)"
                value={newComment}
                onChangeText={setNewComment}
                style={{
                  flex: 1,
                  backgroundColor: "rgba(255,255,255,0.1)",
                  borderRadius: 20,
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  color: "#FFFFFF",
                }}
              />
              <TouchableOpacity
                onPress={handlePostComment}
                disabled={!newComment.trim() || postingComment}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: newComment.trim()
                    ? BRAND
                    : "rgba(255,255,255,0.15)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Send
                  size={18}
                  color={
                    newComment.trim() ? "#000000" : "rgba(255,255,255,0.4)"
                  }
                />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
// @ts-nocheck
import { View, ScrollView, Animated } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useEffect, useRef } from "react";

export function LoadingView({ colors }) {
  const insets = useSafeAreaInsets();
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  const shimmerOpacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.6],
  });

  const SkeletonBox = ({ width, height, borderRadius = 8, style }) => (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: colors.border || "#333",
          opacity: shimmerOpacity,
        },
        style,
      ]}
    />
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style={colors.statusBar} />

      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 12,
          paddingBottom: insets.bottom + 100,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Icons */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            paddingHorizontal: 20,
            marginBottom: 24,
          }}
        >
          <SkeletonBox width={32} height={32} borderRadius={16} />
          <SkeletonBox width={32} height={32} borderRadius={16} />
        </View>

        {/* Profile Avatar */}
        <View style={{ alignItems: "center", marginBottom: 16 }}>
          <SkeletonBox width={96} height={96} borderRadius={48} />
        </View>

        {/* Username & Display Name */}
        <View style={{ alignItems: "center", marginBottom: 12 }}>
          <SkeletonBox width={120} height={20} style={{ marginBottom: 8 }} />
          <SkeletonBox width={80} height={16} />
        </View>

        {/* Stats Row */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "center",
            gap: 32,
            marginBottom: 20,
          }}
        >
          <View style={{ alignItems: "center" }}>
            <SkeletonBox width={40} height={18} style={{ marginBottom: 4 }} />
            <SkeletonBox width={60} height={14} />
          </View>
          <View style={{ alignItems: "center" }}>
            <SkeletonBox width={40} height={18} style={{ marginBottom: 4 }} />
            <SkeletonBox width={60} height={14} />
          </View>
          <View style={{ alignItems: "center" }}>
            <SkeletonBox width={40} height={18} style={{ marginBottom: 4 }} />
            <SkeletonBox width={60} height={14} />
          </View>
        </View>

        {/* Action Buttons */}
        <View
          style={{
            flexDirection: "row",
            paddingHorizontal: 20,
            gap: 8,
            marginBottom: 24,
          }}
        >
          <SkeletonBox width="48%" height={40} />
          <SkeletonBox width="48%" height={40} />
        </View>

        {/* Bio Lines */}
        <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
          <SkeletonBox width="90%" height={14} style={{ marginBottom: 6 }} />
          <SkeletonBox width="70%" height={14} />
        </View>

        {/* Tabs */}
        <View
          style={{
            flexDirection: "row",
            borderBottomWidth: 1,
            borderBottomColor: colors.border || "#333",
            marginBottom: 2,
          }}
        >
          <SkeletonBox
            width={80}
            height={44}
            borderRadius={0}
            style={{ marginRight: 20 }}
          />
          <SkeletonBox
            width={80}
            height={44}
            borderRadius={0}
            style={{ marginRight: 20 }}
          />
          <SkeletonBox width={80} height={44} borderRadius={0} />
        </View>

        {/* Video Grid */}
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            paddingHorizontal: 2,
          }}
        >
          {[...Array(9)].map((_, i) => (
            <SkeletonBox
              key={i}
              width="33.33%"
              height={180}
              borderRadius={0}
              style={{ padding: 1 }}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

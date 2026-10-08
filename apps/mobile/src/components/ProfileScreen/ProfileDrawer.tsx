// @ts-nocheck
import { useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  Animated,
  PanResponder,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { X, ChevronRight, Circle } from "lucide-react-native";
import useLocalization from "@/utils/localization";

export function ProfileDrawer({
  visible,
  drawerAnim,
  drawerWidth,
  drawerItems,
  colors,
  onClose,
}) {
  const insets = useSafeAreaInsets();
  const { t } = useLocalization();
  const items = Array.isArray(drawerItems) ? drawerItems.filter(Boolean) : [];

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) =>
        Math.abs(gestureState.dx) > 10,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dx > 0) drawerAnim.setValue(gestureState.dx);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx > drawerWidth * 0.3) onClose();
        else {
          Animated.spring(drawerAnim, {
            toValue: 0,
            useNativeDriver: true,
            tension: 65,
            friction: 11,
          }).start();
        }
      },
    })
  ).current;

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, flexDirection: "row" }}>
        <TouchableOpacity
          activeOpacity={1}
          onPress={onClose}
          style={{ flex: 1, backgroundColor: colors.overlayBackground }}
        />
        <Animated.View
          {...panResponder.panHandlers}
          style={{
            position: "absolute",
            right: 0,
            top: 0,
            bottom: 0,
            width: drawerWidth,
            backgroundColor: colors.drawerBackground,
            transform: [{ translateX: drawerAnim }],
          }}
        >
          <ScrollView
            contentContainerStyle={{
              paddingTop: insets.top + 20,
              paddingBottom: insets.bottom + 20,
              paddingHorizontal: 20,
            }}
            showsVerticalScrollIndicator={false}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 32,
              }}
            >
              <Text
                style={{ color: colors.text, fontSize: 28, fontWeight: "700" }}
              >
                {t("profile")}
              </Text>
              <TouchableOpacity
                onPress={onClose}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: colors.cardBackgroundAlt,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            {items.map((item, index) => {
              const Icon = item.icon || Circle;
              return (
                <TouchableOpacity
                  key={item.id || item.title || index}
                  onPress={item.onPress}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingVertical: 16,
                    borderBottomWidth: index < items.length - 1 ? 1 : 0,
                    borderBottomColor: colors.borderLight,
                  }}
                >
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      backgroundColor: colors.cardBackgroundAlt,
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 16,
                    }}
                  >
                    <Icon size={22} color={colors.icon} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: colors.text,
                        fontSize: 17,
                        fontWeight: "600",
                        marginBottom: 2,
                      }}
                    >
                      {item.title}
                    </Text>
                    {item.description ? (
                      <Text
                        style={{ color: colors.textTertiary, fontSize: 13 }}
                      >
                        {item.description}
                      </Text>
                    ) : null}
                  </View>
                  {item.badge ? (
                    <View
                      style={{
                        backgroundColor: "#D4AF37",
                        borderRadius: 12,
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        marginRight: 8,
                        minWidth: 24,
                        alignItems: "center",
                      }}
                    >
                      <Text
                        style={{
                          color: "#FFFFFF",
                          fontSize: 12,
                          fontWeight: "700",
                        }}
                      >
                        {item.badge}
                      </Text>
                    </View>
                  ) : null}
                  <ChevronRight size={20} color={colors.textTertiary} />
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

export default ProfileDrawer;
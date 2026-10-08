// @ts-nocheck
import { useState, useRef } from "react";
import { Animated, Dimensions } from "react-native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const DRAWER_WIDTH = SCREEN_WIDTH * 0.75;

export function useDrawer() {
  const [showDrawer, setShowDrawer] = useState(false);
  const drawerAnim = useRef(new Animated.Value(DRAWER_WIDTH)).current;

  const openDrawer = () => {
    setShowDrawer(true);
    Animated.spring(drawerAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
  };

  const closeDrawer = () => {
    Animated.timing(drawerAnim, {
      toValue: DRAWER_WIDTH,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setShowDrawer(false);
    });
  };

  return {
    showDrawer,
    drawerAnim,
    openDrawer,
    closeDrawer,
    DRAWER_WIDTH,
  };
}

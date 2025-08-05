import React from "react";
import { View, Text, ViewStyle } from "react-native";
import HamburgerButton from "./hamburger-button";
import { useTheme } from "@/lib/theme-context";
import { getCurrentTheme } from "@/lib/theme";

interface DrawerTabHeaderProps {
  title: string;
  onMenuPress: () => void;
  isDrawerOpen: boolean;
  backgroundColor?: string;
  textColor?: string;
  style?: ViewStyle;
}

export default function DrawerTabHeader({
  title,
  onMenuPress,
  isDrawerOpen,
  backgroundColor,
  textColor,
  style,
}: DrawerTabHeaderProps) {
  const { isDark } = useTheme();
  const colors = getCurrentTheme(isDark);

  const dynamicStyles = {
    header: {
      padding: 10,
      minHeight: 60,
      backgroundColor: backgroundColor || colors.primary,
    },
    headerContent: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: "600" as const,
      flex: 1,
      textAlign: "center" as const,
      marginRight: 44,
      color: textColor || colors.primaryForeground,
    },
  };

  return (
    <View style={[dynamicStyles.header, style]}>
      <View style={dynamicStyles.headerContent}>
        <HamburgerButton
          onPress={onMenuPress}
          visible={!isDrawerOpen}
          color={textColor || colors.primaryForeground}
        />
        <Text style={dynamicStyles.headerTitle}>{title}</Text>
      </View>
    </View>
  );
}


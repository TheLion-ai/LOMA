import React from "react";
import { View, Text, StyleSheet, ViewStyle } from "react-native";
import HamburgerButton from "./hamburger-button";

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
  backgroundColor = "#3B82F6",
  textColor = "white",
  style,
}: DrawerTabHeaderProps) {
  return (
    <View style={[styles.header, { backgroundColor }, style]}>
      <View style={styles.headerContent}>
        <HamburgerButton
          onPress={onMenuPress}
          visible={!isDrawerOpen}
          color={textColor}
        />
        <Text style={[styles.headerTitle, { color: textColor }]}>{title}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    padding: 10,
    minHeight: 60,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    flex: 1,
    textAlign: "center",
    marginRight: 44,
  },
});
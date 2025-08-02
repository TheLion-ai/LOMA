import React from "react";
import { View, TouchableOpacity, StyleSheet, ViewStyle } from "react-native";
import { FontAwesome } from "@expo/vector-icons";

interface HamburgerButtonProps {
  onPress: () => void;
  visible?: boolean;
  size?: number;
  color?: string;
  style?: ViewStyle;
}

export default function HamburgerButton({
  onPress,
  visible = true,
  size = 24,
  color = "white",
  style,
}: HamburgerButtonProps) {
  return (
    <View style={[styles.burgerButton, style]}>
      {visible && (
        <TouchableOpacity onPress={onPress} style={styles.touchableArea}>
          <FontAwesome name="bars" size={size} color={color} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  burgerButton: {
    width: 44, 
    height: 44, 
    justifyContent: "center",
    alignItems: "center",
  },
  touchableArea: {
    padding: 10,
  },
});
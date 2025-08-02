import * as React from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from "react-native";

type ButtonVariant =
  | "default"
  | "destructive"
  | "outline"
  | "secondary"
  | "ghost"
  | "link";
type ButtonSize = "default" | "sm" | "lg" | "icon";

export interface ButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  onPress?: () => void;
  children?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

const Button = React.forwardRef<
  React.ComponentRef<typeof TouchableOpacity>,
  ButtonProps
>(
  (
    {
      variant = "default",
      size = "default",
      disabled = false,
      onPress,
      children,
      style,
      textStyle,
      ...props
    },
    ref
  ) => {
    const buttonStyle = [
      styles.base,
      styles[`variant_${variant}`],
      styles[`size_${size}`],
      disabled && styles.disabled,
      style,
    ];

    const textStyles = [
      styles.text,
      styles[`text_${variant}`],
      styles[`textSize_${size}`],
      disabled && styles.textDisabled,
      textStyle,
    ];

    return (
      <TouchableOpacity
        ref={ref}
        style={buttonStyle}
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.7}
        {...props}
      >
        <Text style={textStyles}>{children}</Text>
      </TouchableOpacity>
    );
  }
);
Button.displayName = "Button";

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  variant_default: {
    backgroundColor: "#0f172a",
  },
  variant_destructive: {
    backgroundColor: "#dc2626",
  },
  variant_outline: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  variant_secondary: {
    backgroundColor: "#f1f5f9",
  },
  variant_ghost: {
    backgroundColor: "transparent",
  },
  variant_link: {
    backgroundColor: "transparent",
  },
  size_default: {
    height: 40,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  size_sm: {
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  size_lg: {
    height: 44,
    paddingHorizontal: 32,
    borderRadius: 6,
  },
  size_icon: {
    height: 40,
    width: 40,
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
  },
  text_default: {
    color: "#ffffff",
  },
  text_destructive: {
    color: "#ffffff",
  },
  text_outline: {
    color: "#0f172a",
  },
  text_secondary: {
    color: "#0f172a",
  },
  text_ghost: {
    color: "#0f172a",
  },
  text_link: {
    color: "#0f172a",
    textDecorationLine: "underline",
  },
  textSize_default: {
    fontSize: 14,
  },
  textSize_sm: {
    fontSize: 13,
  },
  textSize_lg: {
    fontSize: 16,
  },
  textSize_icon: {
    fontSize: 14,
  },
  textDisabled: {
    opacity: 0.5,
  },
});

export { Button };

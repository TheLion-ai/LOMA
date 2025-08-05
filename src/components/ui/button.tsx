import * as React from "react"
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle } from "react-native"
import { getCurrentTheme, theme } from "@/lib/theme"
import { useTheme } from "@/lib/theme-context"

type ButtonVariant = "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
type ButtonSize = "default" | "sm" | "lg" | "icon"

export interface ButtonProps {
  variant?: ButtonVariant
  size?: ButtonSize
  disabled?: boolean
  onPress?: () => void
  children?: React.ReactNode
  style?: ViewStyle
  textStyle?: TextStyle
}

const Button = React.forwardRef<any, ButtonProps>(
  ({ variant = "default", size = "default", disabled = false, onPress, children, style, textStyle, ...props }, ref) => {
    const { isDark } = useTheme();
    const colors = getCurrentTheme(isDark);
    
    const styles = StyleSheet.create({
      base: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: theme.borderRadius.lg,
        paddingHorizontal: 16,
        paddingVertical: 8,
      },
      variant_default: {
        backgroundColor: colors.primary,
      },
      variant_destructive: {
        backgroundColor: colors.destructive,
      },
      variant_outline: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: colors.border,
      },
      variant_secondary: {
        backgroundColor: colors.secondary,
      },
      variant_ghost: {
        backgroundColor: 'transparent',
      },
      variant_link: {
        backgroundColor: 'transparent',
      },
      size_default: {
        height: 40,
        paddingHorizontal: 16,
        paddingVertical: 8,
      },
      size_sm: {
        height: 36,
        paddingHorizontal: 12,
        borderRadius: theme.borderRadius.lg,
      },
      size_lg: {
        height: 44,
        paddingHorizontal: 32,
        borderRadius: theme.borderRadius.lg,
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
        fontWeight: '500',
        textAlign: 'center',
      },
      text_default: {
        color: colors.primaryForeground,
      },
      text_destructive: {
        color: colors.destructiveForeground,
      },
      text_outline: {
        color: colors.foreground,
      },
      text_secondary: {
        color: colors.secondaryForeground,
      },
      text_ghost: {
        color: colors.foreground,
      },
      text_link: {
        color: colors.foreground,
        textDecorationLine: 'underline',
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

    const buttonStyle = [
      styles.base,
      styles[`variant_${variant}`],
      styles[`size_${size}`],
      disabled && styles.disabled,
      style,
    ]

    const textStyles = [
      styles.text,
      styles[`text_${variant}`],
      styles[`textSize_${size}`],
      disabled && styles.textDisabled,
      textStyle,
    ]

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
    )
  }
)
Button.displayName = "Button"

export { Button }
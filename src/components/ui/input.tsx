import * as React from "react"
import { TextInput as RNTextInput, StyleSheet, TextInputProps as RNTextInputProps, ViewStyle, TextStyle } from "react-native"
import { getCurrentTheme, theme } from "@/lib/theme"
import { useTheme } from "@/lib/theme-context"

export interface InputProps extends RNTextInputProps {
  style?: ViewStyle
  textStyle?: TextStyle
}

const Input = React.forwardRef<RNTextInput, InputProps>(
  ({ style, textStyle, ...props }, ref) => {
    const { isDark } = useTheme();
    const colors = getCurrentTheme(isDark);
    
    const styles = StyleSheet.create({
      input: {
        height: 40,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: theme.borderRadius.lg,
        paddingHorizontal: 12,
        paddingVertical: 8,
        fontSize: 14,
        backgroundColor: colors.input,
        color: colors.foreground,
      },
    });

    return (
      <RNTextInput
        ref={ref}
        style={[styles.input, style, textStyle]}
        placeholderTextColor={colors.mutedForeground}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
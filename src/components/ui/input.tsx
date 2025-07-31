import * as React from "react"
import { TextInput as RNTextInput, StyleSheet, TextInputProps as RNTextInputProps, ViewStyle, TextStyle } from "react-native"

export interface InputProps extends RNTextInputProps {
  style?: ViewStyle
  textStyle?: TextStyle
}

const Input = React.forwardRef<RNTextInput, InputProps>(
  ({ style, textStyle, ...props }, ref) => {
    return (
      <RNTextInput
        ref={ref}
        style={[styles.input, style, textStyle]}
        placeholderTextColor="#94a3b8"
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

const styles = StyleSheet.create({
  input: {
    height: 40,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    backgroundColor: '#ffffff',
    color: '#0f172a',
  },
})

export { Input }
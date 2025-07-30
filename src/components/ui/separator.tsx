import * as React from "react"
import { View, ViewStyle } from "react-native"

interface SeparatorProps {
  style?: ViewStyle
  orientation?: "horizontal" | "vertical"
  decorative?: boolean
}

const Separator = React.forwardRef<View, SeparatorProps>(
  (
    { style, orientation = "horizontal", decorative = true, ...props },
    ref
  ) => (
    <View
      ref={ref}
      style={[
        {
          backgroundColor: '#e2e8f0', // border color
          flexShrink: 0,
        },
        orientation === "horizontal" 
          ? { height: 1, width: '100%' } 
          : { height: '100%', width: 1 },
        style,
      ]}
      {...props}
    />
  )
)
Separator.displayName = "Separator"

export { Separator }

import * as React from "react"
import { View, Image, Text, ViewStyle, ImageStyle, TextStyle } from "react-native"
import { getCurrentTheme } from "@/lib/theme"

interface AvatarProps {
  style?: ViewStyle
  children?: React.ReactNode
}

const Avatar = React.forwardRef<View, AvatarProps>(
  ({ style, children, ...props }, ref) => (
    <View
      ref={ref}
      style={[
        {
          width: 40,
          height: 40,
          borderRadius: 20,
          overflow: 'hidden',
          position: 'relative',
        },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  )
)
Avatar.displayName = "Avatar"

interface AvatarImageProps {
  style?: ImageStyle
  source?: { uri: string } | number
  src?: string
}

const AvatarImage = React.forwardRef<Image, AvatarImageProps>(
  ({ style, source, src, ...props }, ref) => (
    <Image
      ref={ref}
      source={source || (src ? { uri: src } : undefined)}
      style={[
        {
          width: '100%',
          height: '100%',
          aspectRatio: 1,
        },
        style,
      ]}
      {...props}
    />
  )
)
AvatarImage.displayName = "AvatarImage"

interface AvatarFallbackProps {
  style?: ViewStyle
  textStyle?: TextStyle
  children?: React.ReactNode
}

const AvatarFallback = React.forwardRef<View, AvatarFallbackProps>(
  ({ style, textStyle, children, ...props }, ref) => (
    <View
      ref={ref}
      style={[
        {
          flex: 1,
          width: '100%',
          height: '100%',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 20,
          backgroundColor: getCurrentTheme(false).muted,
        },
        style,
      ]}
      {...props}
    >
      {typeof children === 'string' ? (
        <Text
          style={[
            {
              fontSize: 14,
              fontWeight: '500',
              color: getCurrentTheme(false).mutedForeground,
            },
            textStyle,
          ]}
        >
          {children}
        </Text>
      ) : (
        children
      )}
    </View>
  )
)
AvatarFallback.displayName = "AvatarFallback"

export { Avatar, AvatarImage, AvatarFallback }

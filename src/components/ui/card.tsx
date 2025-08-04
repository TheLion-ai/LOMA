import * as React from "react"
import { View, StyleSheet, ViewStyle } from "react-native"
import { getCurrentTheme, theme } from "@/lib/theme"

export interface CardProps {
  children?: React.ReactNode
  style?: ViewStyle
}

const Card = React.forwardRef<View, CardProps>(
  ({ children, style, ...props }, ref) => {
    return (
      <View
        ref={ref}
        style={[styles.card, style]}
        {...props}
      >
        {children}
      </View>
    )
  }
)
Card.displayName = "Card"

const CardHeader = React.forwardRef<View, CardProps>(
  ({ children, style, ...props }, ref) => {
    return (
      <View
        ref={ref}
        style={[styles.cardHeader, style]}
        {...props}
      >
        {children}
      </View>
    )
  }
)
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<View, CardProps>(
  ({ children, style, ...props }, ref) => {
    return (
      <View
        ref={ref}
        style={[styles.cardTitle, style]}
        {...props}
      >
        {children}
      </View>
    )
  }
)
CardTitle.displayName = "CardTitle"

const CardContent = React.forwardRef<View, CardProps>(
  ({ children, style, ...props }, ref) => {
    return (
      <View
        ref={ref}
        style={[styles.cardContent, style]}
        {...props}
      >
        {children}
      </View>
    )
  }
)
CardContent.displayName = "CardContent"

const colors = getCurrentTheme(false);

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 0,
  },
  cardTitle: {
    marginBottom: 8,
  },
  cardContent: {
    padding: 24,
    paddingTop: 0,
  },
})

export { Card, CardHeader, CardTitle, CardContent }
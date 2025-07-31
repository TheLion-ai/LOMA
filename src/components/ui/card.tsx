import * as React from "react"
import { View, StyleSheet, ViewStyle } from "react-native"

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

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
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
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card } from 'react-native-paper';
import { colors, shadows, borderRadius, spacing } from '../../constants/theme';

const StyledCard = ({ 
  children, 
  style, 
  elevation = 'medium',
  padding = 'default',
  margin = 'default',
  borderColor,
  backgroundColor = colors.surface,
  ...props 
}) => {
  const elevationStyle = shadows[elevation] || shadows.medium;
  
  const paddingStyle = {
    default: spacing.md,
    sm: spacing.sm,
    lg: spacing.lg,
    xl: spacing.xl,
    none: 0,
  }[padding] || spacing.md;
  
  const marginStyle = {
    default: spacing.md,
    sm: spacing.sm,
    lg: spacing.lg,
    xl: spacing.xl,
    none: 0,
  }[margin] || spacing.md;

  return (
    <Card
      style={[
        styles.card,
        elevationStyle,
        {
          padding: paddingStyle,
          margin: marginStyle,
          backgroundColor,
          borderColor: borderColor,
          borderWidth: borderColor ? 1 : 0,
        },
        style,
      ]}
      {...props}
    >
      {children}
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,
  },
});

export default StyledCard;
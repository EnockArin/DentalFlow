import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../constants/theme';

const GradientBackground = ({ 
  children, 
  colors: gradientColors = [colors.primary, colors.primaryDark],
  style,
  ...props 
}) => {
  return (
    <LinearGradient
      colors={gradientColors}
      style={[styles.gradient, style]}
      {...props}
    >
      {children}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
});

export default GradientBackground;
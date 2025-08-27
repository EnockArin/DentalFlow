import React from 'react';
import { StyleSheet, View } from 'react-native';

// Hard-coded colors to avoid any imported object freezing issues
const DEFAULT_PRIMARY = '#2E86AB';

const GradientBackground = React.memo(({ 
  children, 
  gradientColors,
  style
}) => {
  // Create a completely new object for styles to avoid any freezing
  const backgroundStyle = {
    flex: 1,
    backgroundColor: (gradientColors && gradientColors[0]) ? String(gradientColors[0]) : DEFAULT_PRIMARY
  };
  
  // Create new style array to avoid any reference issues
  const combinedStyle = style ? [backgroundStyle, style] : backgroundStyle;
  
  return (
    <View style={combinedStyle}>
      {children}
    </View>
  );
});

GradientBackground.displayName = 'GradientBackground';

export default GradientBackground;
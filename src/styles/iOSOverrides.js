import { Platform, StyleSheet } from 'react-native';

// iOS-specific style overrides to prevent form validation artifacts
export const iOSStyleOverrides = Platform.OS === 'ios' ? StyleSheet.create({
  // Override for TextInput to remove validation indicators
  textInputOverride: {
    // Disable iOS form validation appearance
    appearance: 'none',
    WebkitAppearance: 'none',
    MozAppearance: 'none',
  },
  // Override for Button to remove validation indicators  
  buttonOverride: {
    appearance: 'none',
    WebkitAppearance: 'none',
    MozAppearance: 'none',
    outline: 'none',
    border: 'none',
  },
  // Container override to disable form features
  containerOverride: {
    WebkitUserSelect: 'none',
    WebkitTapHighlightColor: 'transparent',
  }
}) : {};

export default iOSStyleOverrides;
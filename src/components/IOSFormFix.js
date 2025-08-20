import { Platform, UIManager } from 'react-native';

// iOS Form Fix Component
// This component applies iOS-specific fixes to prevent form validation artifacts
export const applyIOSFormFixes = () => {
  if (Platform.OS === 'ios') {
    // Disable iOS autocorrection and form validation globally
    if (UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(false);
    }
  }
};

// Default props for TextInput components to prevent iOS artifacts
export const defaultTextInputProps = {
  // Try different autoComplete values for iOS
  autoComplete: Platform.OS === 'ios' ? 'username-new' : 'off',
  textContentType: Platform.OS === 'ios' ? 'username' : 'none',
  autoCorrect: false,
  spellCheck: false,
  clearButtonMode: 'never',
  ...(Platform.OS === 'ios' && {
    // iOS-specific props to disable form features
    keyboardAppearance: 'default',
    enablesReturnKeyAutomatically: false,
    clearTextOnFocus: false,
    selectTextOnFocus: false,
    // More iOS-specific properties
    passwordRules: null,
    smartInsertDelete: false,
    smartQuotesType: 'no',
    smartDashesType: 'no',
  }),
};

export default { applyIOSFormFixes, defaultTextInputProps };
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

// Comprehensive props to prevent form validation checkboxes and indicators
export const defaultTextInputProps = {
  // Force disable all autoComplete and validation
  autoComplete: 'off',
  textContentType: 'none',
  autoCorrect: false,
  spellCheck: false,
  clearButtonMode: 'never',
  // Critical: Remove all right accessory views that show validation icons
  right: null,
  ...(Platform.OS === 'ios' && {
    // iOS-specific comprehensive form prevention
    keyboardAppearance: 'default',
    enablesReturnKeyAutomatically: false,
    clearTextOnFocus: false,
    selectTextOnFocus: false,
    passwordRules: null,
    smartInsertDelete: false,
    smartQuotesType: 'no',
    smartDashesType: 'no',
    // Additional iOS-specific validation prevention
    dataDetectorTypes: 'none',
    contextMenuHidden: true,
    // Force remove any system-added accessories
    rightView: null,
    rightViewMode: 'never',
    leftView: null,
    leftViewMode: 'never',
  }),
  ...(Platform.OS === 'android' && {
    // Android-specific validation prevention
    importantForAutofill: 'no',
    autoCompleteType: 'off',
    // Remove any right accessories on Android
    rightView: null,
    leftView: null,
  }),
};

// NUCLEAR checkbox prevention props with highest priority
export const checkboxPreventionProps = {
  // NUCLEAR: Remove ALL accessories
  left: undefined,
  right: undefined,
  rightView: undefined,
  rightViewMode: undefined,
  leftView: undefined, 
  leftViewMode: undefined,
  autoComplete: 'off',
  textContentType: 'none',
  autoCorrect: false,
  spellCheck: false,
  clearButtonMode: 'never',
  error: false,
  render: undefined,
  ...(Platform.OS === 'ios' && {
    dataDetectorTypes: 'none',
    contextMenuHidden: true,
    smartInsertDelete: false,
    smartQuotesType: 'no',
    smartDashesType: 'no',
    passwordRules: null,
  }),
  ...(Platform.OS === 'android' && {
    // CRITICAL: Android autofill prevention
    importantForAutofill: 'no',
    autoCompleteType: 'off',
    showSoftInputOnFocus: true,
  }),
};

// Container props to disable form validation at container level
export const containerPreventionProps = {
  ...Platform.select({
    android: {
      importantForAutofill: 'noExcludeDescendants',
      focusable: false,
      focusableInTouchMode: false,
    },
    ios: {
      accessibilityElementsHidden: true,
    },
    web: {
      'data-form-validation': 'off',
      'data-autofill': 'off',
      autoComplete: 'off',
    },
    default: {},
  }),
};

export default { applyIOSFormFixes, defaultTextInputProps, checkboxPreventionProps, containerPreventionProps };
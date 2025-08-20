import React from 'react';
import { Platform } from 'react-native';
import { TextInput } from 'react-native-paper';

// Custom TextInput component with iOS fixes built-in
const CustomTextInput = (props) => {
  const iosFixProps = Platform.OS === 'ios' ? {
    // Comprehensive iOS form prevention
    autoComplete: 'new-password', // This often works better than 'off'
    textContentType: 'oneTimeCode', // Prevents iOS from adding validation
    autoCorrect: false,
    spellCheck: false,
    clearButtonMode: 'never',
    enablesReturnKeyAutomatically: false,
    clearTextOnFocus: false,
    selectTextOnFocus: false,
    smartInsertDelete: false,
    smartQuotesType: 'no',
    smartDashesType: 'no',
    keyboardAppearance: 'default',
    // Remove right accessory by default
    right: null,
  } : {
    autoComplete: 'off',
    textContentType: 'none',
    autoCorrect: false,
    spellCheck: false,
    right: null,
  };

  return (
    <TextInput
      {...iosFixProps}
      {...props}
      // Allow props to override our defaults if needed
    />
  );
};

export default CustomTextInput;
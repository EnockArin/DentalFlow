import React, { useRef, useEffect } from 'react';
import { Platform, View, StyleSheet } from 'react-native';
import { TextInput } from 'react-native-paper';
import { checkboxPreventionProps } from '../IOSFormFix';

// NUCLEAR OPTION: Custom TextInput that completely removes ALL Paper accessories
const CustomTextInput = (props) => {
  const textInputRef = useRef(null);

  // NUCLEAR OPTION: Force remove any validation elements after render
  useEffect(() => {
    const timer = setTimeout(() => {
      if (textInputRef.current && Platform.OS === 'web') {
        const inputElement = textInputRef.current;
        // Find and destroy any validation checkboxes
        if (inputElement._component && inputElement._component.querySelector) {
          const validationElements = inputElement._component.querySelectorAll(
            '[style*="position: absolute"], [class*="validation"], [class*="checkbox"], [data-testid*="check"], ::before, ::after'
          );
          validationElements.forEach(el => {
            el.style.display = 'none';
            el.style.visibility = 'hidden';
            el.style.opacity = '0';
            el.remove();
          });
        }
      }
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  // COMPLETELY strip out any accessory props that could create checkboxes
  const {
    left,
    right,
    leftView,
    rightView,
    leftViewMode,
    rightViewMode,
    error,
    ...cleanProps
  } = props;

  const nuclearPreventionProps = {
    // NUCLEAR: Force disable ALL form validation and accessories
    autoComplete: 'off',
    textContentType: 'none',
    autoCorrect: false,
    spellCheck: false,
    clearButtonMode: 'never',
    // CRITICAL: COMPLETELY REMOVE all accessory props
    left: undefined,
    right: undefined,
    leftView: undefined,
    rightView: undefined,
    leftViewMode: undefined,
    rightViewMode: undefined,
    // NUCLEAR: Force disable error state that shows validation
    error: false,
    // NUCLEAR: Disable any possible validation styling
    disabled: false,
    render: undefined,
    ...(Platform.OS === 'ios' && {
      // iOS-specific COMPLETE form prevention
      keyboardAppearance: 'default',
      enablesReturnKeyAutomatically: false,
      clearTextOnFocus: false,
      selectTextOnFocus: false,
      smartInsertDelete: false,
      smartQuotesType: 'no',
      smartDashesType: 'no',
      dataDetectorTypes: 'none',
      contextMenuHidden: true,
      passwordRules: null,
    }),
    ...(Platform.OS === 'android' && {
      // Android-specific COMPLETE validation prevention
      importantForAutofill: 'no',
      autoCompleteType: 'off',
      showSoftInputOnFocus: true,
    }),
    ...(Platform.OS === 'web' && {
      // Web-specific COMPLETE prevention
      'data-validation': 'off',
      'data-checkbox': 'off',
      'data-testid': 'clean-input',
    }),
  };

  // Wrap in container with NUCLEAR hiding styles
  return (
    <View style={nuclearHideStyles.container}>
      <TextInput
        ref={textInputRef}
        {...nuclearPreventionProps}
        {...cleanProps}
        // FINAL NUCLEAR OVERRIDE: These CANNOT be overridden by ANY prop
        left={undefined}
        right={undefined}
        leftView={undefined}
        rightView={undefined}
        leftViewMode={undefined}
        rightViewMode={undefined}
        autoComplete="off"
        textContentType="none"
        error={false}
        style={[
          nuclearHideStyles.input,
          cleanProps.style
        ]}
        contentStyle={[
          nuclearHideStyles.content,
          cleanProps.contentStyle
        ]}
        render={undefined}
      />
    </View>
  );
};

// NUCLEAR styles to completely hide ANY possible validation elements
const nuclearHideStyles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
    // NUCLEAR: Prevent ANY child from being positioned absolutely
    ...Platform.select({
      web: {
        '& *[style*="position: absolute"]': {
          display: 'none !important',
          visibility: 'hidden !important',
          opacity: '0 !important',
        },
        '& *[class*="validation"]': {
          display: 'none !important',
        },
        '& *[class*="checkbox"]': {
          display: 'none !important',
        },
        '& *[class*="indicator"]': {
          display: 'none !important',
        },
        '& ::before': {
          display: 'none !important',
        },
        '& ::after': {
          display: 'none !important',
        },
        // NUCLEAR: Hide React Native Paper internal elements
        '& div[class*="right"]': {
          display: 'none !important',
        },
        '& span[class*="right"]': {
          display: 'none !important',
        }
      }
    })
  },
  input: {
    position: 'relative',
    // NUCLEAR: Remove ALL possible pseudo-elements
    ...Platform.select({
      web: {
        '&::after': {
          display: 'none !important',
          content: 'none !important',
        },
        '&::before': {
          display: 'none !important',
          content: 'none !important',
        }
      }
    })
  },
  content: {
    overflow: 'hidden',
    // NUCLEAR: Ensure no validation elements can appear in content
    ...Platform.select({
      web: {
        '&::after': {
          display: 'none !important',
        },
        '&::before': {
          display: 'none !important',
        }
      }
    })
  }
});

export default CustomTextInput;
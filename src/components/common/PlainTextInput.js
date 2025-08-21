import React, { useState } from 'react';
import { TextInput as RNTextInput, View, Text, StyleSheet, Platform } from 'react-native';
import { useTheme } from 'react-native-paper';

// FALLBACK OPTION: Pure React Native TextInput with Material Design styling
// This completely bypasses React Native Paper and uses zero validation elements
const PlainTextInput = ({
  label,
  value,
  onChangeText,
  style,
  error,
  mode = 'outlined',
  multiline = false,
  secureTextEntry = false,
  keyboardType = 'default',
  placeholder,
  disabled = false,
  autoCapitalize = 'sentences',
  outlineColor,
  activeOutlineColor,
  onFocus,
  onBlur,
  ...restProps
}) => {
  const theme = useTheme();
  const [isFocused, setIsFocused] = useState(false);

  const handleFocus = (e) => {
    setIsFocused(true);
    if (onFocus) {
      onFocus(e);
    }
  };

  const handleBlur = (e) => {
    setIsFocused(false);
    if (onBlur) {
      onBlur(e);
    }
  };

  // Material Design styling that matches React Native Paper
  const getInputContainerStyle = () => {
    return {
      borderWidth: 1,
      borderRadius: 4,
      borderColor: error 
        ? theme.colors.error 
        : isFocused 
          ? (activeOutlineColor || theme.colors.primary)
          : (outlineColor || theme.colors.outline),
      backgroundColor: theme.colors.surface,
      minHeight: 56,
      paddingHorizontal: 14,
      paddingVertical: multiline ? 8 : 16,
      flexDirection: 'row',
      alignItems: multiline ? 'flex-start' : 'center',
    };
  };

  const getLabelStyle = () => {
    const hasContent = value && value.length > 0;
    return {
      position: 'absolute',
      left: 14,
      backgroundColor: theme.colors.surface,
      paddingHorizontal: 4,
      fontSize: isFocused || hasContent ? 12 : 16,
      color: error 
        ? theme.colors.error 
        : isFocused 
          ? (activeOutlineColor || theme.colors.primary)
          : theme.colors.onSurfaceVariant,
      top: isFocused || hasContent ? -6 : 16,
      zIndex: 1,
      pointerEvents: 'none',
    };
  };

  return (
    <View style={[styles.container, style]}>
      <View style={getInputContainerStyle()}>
        <RNTextInput
          value={value}
          onChangeText={onChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          style={styles.input}
          multiline={multiline}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          placeholder={!label ? placeholder : undefined}
          placeholderTextColor={theme.colors.onSurfaceVariant}
          editable={!disabled}
          autoCapitalize={autoCapitalize}
          // AGGRESSIVE: Force disable ALL validation and autofill
          autoComplete="off"
          textContentType="none"
          autoCorrect={false}
          spellCheck={false}
          importantForAutofill="no"
          autoCompleteType="off"
          clearButtonMode="never"
          dataDetectorTypes="none"
          contextMenuHidden={true}
          smartInsertDelete={false}
          smartQuotesType="no"
          smartDashesType="no"
          passwordRules={null}
          // CRITICAL: NO accessories allowed
          rightView={null}
          rightViewMode="never"
          leftView={null}
          leftViewMode="never"
          // NUCLEAR: Remove any possible validation props
          accessibilityRole="none"
          accessibilityActions={[]}
          {...restProps}
        />
      </View>
      
      {label && (
        <Text style={getLabelStyle()}>
          {label}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    position: 'relative',
    // NUCLEAR: Prevent any validation elements
    overflow: 'hidden',
    ...Platform.select({
      web: {
        '&::before': {
          display: 'none !important',
        },
        '&::after': {
          display: 'none !important',
        }
      }
    })
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 0,
    margin: 0,
    // NUCLEAR: Remove any system styling
    includeFontPadding: false,
    textAlignVertical: 'center',
    ...Platform.select({
      web: {
        outline: 'none',
        border: 'none',
        background: 'transparent',
        '&::placeholder': {
          opacity: 0.6,
        },
        '&::-webkit-input-placeholder': {
          opacity: 0.6,
        },
        '&::-moz-placeholder': {
          opacity: 0.6,
        },
        '&:-ms-input-placeholder': {
          opacity: 0.6,
        },
        // NUCLEAR: Remove ALL possible pseudo-elements
        '&::before': {
          display: 'none !important',
        },
        '&::after': {
          display: 'none !important',
        },
        '&::-webkit-search-decoration': {
          display: 'none !important',
        },
        '&::-webkit-search-cancel-button': {
          display: 'none !important',
        },
        '&::-webkit-search-results-button': {
          display: 'none !important',
        },
        '&::-webkit-search-results-decoration': {
          display: 'none !important',
        }
      }
    })
  },
});

export default PlainTextInput;
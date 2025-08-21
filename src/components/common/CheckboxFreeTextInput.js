import React from 'react';
import { TextInput as RNTextInput, View, Text, StyleSheet, Platform } from 'react-native';
import { useTheme } from 'react-native-paper';

// NUCLEAR OPTION: Complete bypass of React Native Paper TextInput
// This creates a custom input that looks like Material Design but has ZERO validation elements
const CheckboxFreeTextInput = ({
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
  left,
  right,
  disabled = false,
  autoCapitalize = 'sentences',
  outlineColor,
  activeOutlineColor,
  ...restProps
}) => {
  const theme = useTheme();
  const [isFocused, setIsFocused] = React.useState(false);

  const handleFocus = (e) => {
    setIsFocused(true);
    if (restProps.onFocus) {
      restProps.onFocus(e);
    }
  };

  const handleBlur = (e) => {
    setIsFocused(false);
    if (restProps.onBlur) {
      restProps.onBlur(e);
    }
  };

  // Custom styles that mimic React Native Paper but prevent ANY validation UI
  const inputStyles = StyleSheet.create({
    container: {
      marginVertical: 4,
      position: 'relative',
      // AGGRESSIVE: Prevent any child elements from being absolutely positioned
      overflow: 'hidden',
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
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
      // CRITICAL: Ensure no right accessories can appear
      position: 'relative',
    },
    input: {
      flex: 1,
      fontSize: 16,
      color: theme.colors.onSurface,
      paddingVertical: multiline ? 8 : 16,
      // AGGRESSIVE: Remove any possible validation styling
      textAlign: 'left',
      includeFontPadding: false,
      // CRITICAL: Override any system-added accessories
      right: undefined,
      accessibilityRole: 'none',
    },
    label: {
      position: 'absolute',
      left: 14,
      backgroundColor: theme.colors.surface,
      paddingHorizontal: 4,
      fontSize: isFocused || value ? 12 : 16,
      color: error 
        ? theme.colors.error 
        : isFocused 
          ? (activeOutlineColor || theme.colors.primary)
          : theme.colors.onSurfaceVariant,
      top: isFocused || value ? -6 : 16,
      zIndex: 1,
    },
    leftContainer: {
      marginRight: 12,
    },
    // AGGRESSIVE: Hide any possible right container
    rightContainer: {
      display: 'none',
      opacity: 0,
      width: 0,
      height: 0,
      overflow: 'hidden',
    },
  });

  return (
    <View style={[inputStyles.container, style]}>
      <View style={inputStyles.inputContainer}>
        {left && <View style={inputStyles.leftContainer}>{left}</View>}
        
        <RNTextInput
          value={value}
          onChangeText={onChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          style={inputStyles.input}
          multiline={multiline}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.onSurfaceVariant}
          editable={!disabled}
          autoCapitalize={autoCapitalize}
          // AGGRESSIVE: Force disable all validation and autofill
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
          // CRITICAL: Completely prevent any right accessories
          rightView={null}
          rightViewMode="never"
          leftView={null}
          leftViewMode="never"
          {...restProps}
          // FINAL OVERRIDE: These cannot be changed
          right={undefined}
          accessibilityActions={[]}
          accessibilityRole="none"
        />
        
        {/* INTENTIONALLY EMPTY - No right container allowed */}
        <View style={inputStyles.rightContainer} />
      </View>
      
      {label && (
        <Text style={inputStyles.label} pointerEvents="none">
          {label}
        </Text>
      )}
    </View>
  );
};

export default CheckboxFreeTextInput;
import React, { useState } from 'react';
import { View, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView, Text } from 'react-native';
import { Button, Card, Title, Paragraph, TextInput } from 'react-native-paper';
import CustomTextInput from '../components/common/CustomTextInput';
import { useDispatch, useSelector } from 'react-redux';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth } from '../config/firebase';
import { loginStart, loginSuccess, loginFailure } from '../store/slices/authSlice';
import GradientBackground from '../components/common/GradientBackground';
import { colors, spacing, typography, borderRadius, shadows, components } from '../constants/theme';
import { globalFormStyles } from '../styles/globalFormFixes';
import { validateEmail, validatePassword, validateText, sanitizeInput } from '../utils/validation';

const RegisterScreen = ({ navigation }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const dispatch = useDispatch();
  const { loading } = useSelector((state) => state.auth);


  const validateForm = () => {
    const newErrors = {};

    // First Name validation
    const firstNameValidation = validateText(formData.firstName, { 
      required: true, 
      maxLength: 50, 
      label: 'First name' 
    });
    if (!firstNameValidation.isValid) {
      newErrors.firstName = firstNameValidation.message;
    }

    // Last Name validation
    const lastNameValidation = validateText(formData.lastName, { 
      required: true, 
      maxLength: 50, 
      label: 'Last name' 
    });
    if (!lastNameValidation.isValid) {
      newErrors.lastName = lastNameValidation.message;
    }

    // Email validation
    const emailValidation = validateEmail(formData.email);
    if (!emailValidation.isValid) {
      newErrors.email = emailValidation.message;
    }

    // Password validation
    const passwordValidation = validatePassword(formData.password);
    if (!passwordValidation.isValid) {
      newErrors.password = passwordValidation.message;
    }

    // Confirm Password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validateForm()) {
      return;
    }

    dispatch(loginStart());
    
    try {
      // Sanitize input data before processing
      const sanitizedEmail = sanitizeInput(formData.email.trim());
      const sanitizedFirstName = sanitizeInput(formData.firstName.trim());
      const sanitizedLastName = sanitizeInput(formData.lastName.trim());
      
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        sanitizedEmail, 
        formData.password
      );
      
      const user = userCredential.user;
      
      // Update user profile with display name
      await updateProfile(user, {
        displayName: `${sanitizedFirstName} ${sanitizedLastName}`,
      });
      
      dispatch(loginSuccess({
        uid: user.uid,
        email: user.email,
        displayName: `${formData.firstName.trim()} ${formData.lastName.trim()}`,
      }));

      Alert.alert('Success', 'Account created successfully! Welcome to DentalFlow!');
    } catch (error) {
      let errorMessage = 'Registration failed. Please try again.';
      
      switch (error.code) {
        case 'auth/email-already-in-use':
          errorMessage = 'An account with this email already exists.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Invalid email address.';
          break;
        case 'auth/weak-password':
          errorMessage = 'Password is too weak. Please choose a stronger password.';
          break;
        case 'auth/network-request-failed':
          errorMessage = 'Network error. Please check your connection.';
          break;
        default:
          errorMessage = error.message;
      }
      
      dispatch(loginFailure(errorMessage));
      Alert.alert('Registration Error', errorMessage);
    }
  };

  const updateFormData = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <GradientBackground gradientColors={[colors.primary, colors.primaryDark]}>
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            {/* Logo Section */}
            <View style={styles.logoSection}>
              <View style={styles.logoContainer}>
                <Title style={styles.logoEmoji}>🦷</Title>
              </View>
              <Title style={styles.title}>Join DentalFlow</Title>
              <Paragraph style={styles.subtitle}>
                Create your professional inventory account
              </Paragraph>
            </View>

            {/* Registration Card */}
            <Card style={styles.card}>
              <Card.Content style={styles.cardContent}>
                <Title style={styles.cardTitle}>Create Account</Title>
                <Paragraph style={styles.cardSubtitle}>
                  Get started with your dental inventory management
                </Paragraph>
                
                <View style={[styles.inputContainer, globalFormStyles.formContainer]}>
                  {/* Name Fields Row */}
                  <View style={styles.nameRow}>
                    <View style={styles.nameField}>
                      <CustomTextInput
                        label="First Name"
                        value={formData.firstName}
                        onChangeText={(text) => updateFormData('firstName', text)}
                        mode="outlined"
                        style={[styles.input, globalFormStyles.hideValidationIndicators]}
                        autoCapitalize="words"
                        autoComplete="off"
                        textContentType="none"
                        autoCorrect={false}
                        spellCheck={false}
                        outlineColor={colors.borderLight}
                        activeOutlineColor={colors.primary}
                        error={!!errors.firstName}
                        right={null}
                      />
                      {!!errors.firstName && (
                        <Text style={styles.errorText}>
                          {errors.firstName}
                        </Text>
                      )}
                    </View>
                    
                    <View style={styles.nameField}>
                      <CustomTextInput
                        label="Last Name"
                        value={formData.lastName}
                        onChangeText={(text) => updateFormData('lastName', text)}
                        mode="outlined"
                        style={[styles.input, globalFormStyles.hideValidationIndicators]}
                        autoCapitalize="words"
                        autoComplete="off"
                        textContentType="none"
                        autoCorrect={false}
                        spellCheck={false}
                        outlineColor={colors.borderLight}
                        activeOutlineColor={colors.primary}
                        error={!!errors.lastName}
                        right={null}
                      />
                      {!!errors.lastName && (
                        <Text style={styles.errorText}>
                          {errors.lastName}
                        </Text>
                      )}
                    </View>
                  </View>

                  {/* Email Field */}
                  <CustomTextInput
                    label="Email Address"
                    value={formData.email}
                    onChangeText={(text) => updateFormData('email', text)}
                    mode="outlined"
                    style={[styles.input, globalFormStyles.hideValidationIndicators]}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="off"
                    textContentType="none"
                    autoCorrect={false}
                    spellCheck={false}
                    outlineColor={colors.borderLight}
                    activeOutlineColor={colors.primary}
                    error={!!errors.email}
                    right={null}
                  />
                  {!!errors.email && (
                    <Text style={styles.errorText}>
                      {errors.email}
                    </Text>
                  )}
                  
                  {/* Password Field */}
                  <View style={styles.inputWithIcon}>
                    <CustomTextInput
                      label="Password"
                      value={formData.password}
                      onChangeText={(text) => updateFormData('password', text)}
                      mode="outlined"
                      secureTextEntry={!showPassword}
                      style={[styles.input, styles.inputWithRightIcon, globalFormStyles.hideValidationIndicators]}
                      autoComplete="off"
                      textContentType="none"
                      autoCorrect={false}
                      spellCheck={false}
                      outlineColor={colors.borderLight}
                      activeOutlineColor={colors.primary}
                      error={!!errors.password}
                      right={null}
                    />
                    <View style={styles.inputIconRight}>
                      <Text 
                        style={styles.passwordToggleText}
                        onPress={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? 'Hide' : 'Show'}
                      </Text>
                    </View>
                  </View>
                  
                  {/* Password Requirements Note */}
                  {!errors.password && (
                    <Text style={styles.passwordHint}>
                      Password must be at least 8 characters long
                    </Text>
                  )}
                  
                  {!!errors.password && (
                    <Text style={styles.errorText}>
                      {errors.password}
                    </Text>
                  )}

                  {/* Confirm Password Field */}
                  <View style={styles.inputWithIcon}>
                    <CustomTextInput
                      label="Confirm Password"
                      value={formData.confirmPassword}
                      onChangeText={(text) => updateFormData('confirmPassword', text)}
                      mode="outlined"
                      secureTextEntry={!showConfirmPassword}
                      style={[styles.input, styles.inputWithRightIcon, globalFormStyles.hideValidationIndicators]}
                      autoComplete="off"
                      textContentType="none"
                      autoCorrect={false}
                      spellCheck={false}
                      outlineColor={colors.borderLight}
                      activeOutlineColor={colors.primary}
                      error={!!errors.confirmPassword}
                      right={null}
                    />
                    <View style={styles.inputIconRight}>
                      <Text 
                        style={styles.passwordToggleText}
                        onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? 'Hide' : 'Show'}
                      </Text>
                    </View>
                  </View>
                  {!!errors.confirmPassword && (
                    <Text style={styles.errorText}>
                      {errors.confirmPassword}
                    </Text>
                  )}
                </View>
                
                <Button
                  mode="contained"
                  onPress={handleRegister}
                  loading={loading}
                  disabled={loading}
                  style={styles.button}
                  contentStyle={styles.buttonContent}
                  buttonColor={colors.primary}
                >
                  {loading ? 'Creating Account...' : 'Create Account'}
                </Button>

                <View style={styles.loginPrompt}>
                  <Paragraph style={styles.loginText}>
                    Already have an account?
                  </Paragraph>
                  <Button
                    mode="text"
                    onPress={() => navigation.goBack()}
                    textColor={colors.primary}
                    style={styles.loginButton}
                  >
                    Sign In
                  </Button>
                </View>
              </Card.Content>
            </Card>

            {/* Footer */}
            <View style={styles.footer}>
              <Paragraph style={styles.footerText}>
                By creating an account, you agree to our terms and privacy policy
              </Paragraph>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </GradientBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  content: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
    ...shadows.medium,
  },
  logoEmoji: {
    fontSize: 40,
    margin: 0,
  },
  title: {
    fontSize: typography.fontSize.xxxl,
    fontWeight: typography.fontWeight.bold,
    color: colors.white,
    textAlign: 'center',
    marginBottom: spacing.sm,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: typography.fontSize.md,
    color: colors.white,
    textAlign: 'center',
    opacity: 0.9,
    fontWeight: typography.fontWeight.medium,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.white,
    ...shadows.large,
  },
  cardContent: {
    padding: spacing.xl,
  },
  cardTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  cardSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  inputContainer: {
    marginBottom: spacing.lg,
  },
  nameRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  nameField: {
    flex: 1,
  },
  input: {
    marginBottom: spacing.xs,
    backgroundColor: colors.surface,
  },
  inputWithIcon: {
    position: 'relative',
  },
  inputWithRightIcon: {
    paddingRight: 50,
  },
  inputIconRight: {
    position: 'absolute',
    right: 12,
    top: '50%',
    transform: [{ translateY: -12 }],
    zIndex: 2,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 2,
  },
  passwordToggleText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.primary,
    textAlign: 'center',
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
  },
  errorText: {
    color: colors.danger,
    fontSize: typography.fontSize.sm,
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },
  passwordHint: {
    marginBottom: spacing.xs,
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    opacity: 0.8,
  },
  button: {
    marginTop: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primary,
  },
  buttonContent: {
    height: components.button.height,
    paddingHorizontal: spacing.lg,
  },
  loginPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  loginText: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
  loginButton: {
    marginLeft: spacing.xs,
  },
  footer: {
    marginTop: spacing.xxl,
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  footerText: {
    fontSize: typography.fontSize.xs,
    color: colors.white,
    opacity: 0.8,
    textAlign: 'center',
    lineHeight: typography.lineHeight.relaxed * typography.fontSize.xs,
  },
});

export default RegisterScreen;
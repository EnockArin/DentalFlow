import React, { useState } from 'react';
import { View, StyleSheet, Alert, KeyboardAvoidingView, Platform, Animated, ScrollView, Text } from 'react-native';
import { Button, Card, Title, Paragraph, HelperText, TextInput } from 'react-native-paper';
import CustomTextInput from '../components/common/CustomTextInput';
import { useDispatch, useSelector } from 'react-redux';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth } from '../config/firebase';
import { loginStart, loginSuccess, loginFailure } from '../store/slices/authSlice';
import GradientBackground from '../components/common/GradientBackground';
import { colors, spacing, typography, borderRadius, shadows, components } from '../constants/theme';
import { globalFormStyles } from '../styles/globalFormFixes';

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
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));
  
  const dispatch = useDispatch();
  const { loading } = useSelector((state) => state.auth);

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const validateForm = () => {
    const newErrors = {};

    // First Name validation
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }

    // Last Name validation
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
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
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        formData.email.trim(), 
        formData.password
      );
      
      const user = userCredential.user;
      
      // Update user profile with display name
      await updateProfile(user, {
        displayName: `${formData.firstName.trim()} ${formData.lastName.trim()}`,
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
    <GradientBackground colors={[colors.primary, colors.primaryDark]}>
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View 
            style={[
              styles.content,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
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
                      <HelperText type="error" visible={!!errors.firstName} style={styles.helperText}>
                        {errors.firstName}
                      </HelperText>
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
                      <HelperText type="error" visible={!!errors.lastName} style={styles.helperText}>
                        {errors.lastName}
                      </HelperText>
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
                  <HelperText type="error" visible={!!errors.email} style={styles.helperText}>
                    {errors.email}
                  </HelperText>
                  
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
                  <HelperText type="error" visible={!!errors.password} style={styles.helperText}>
                    {errors.password}
                  </HelperText>

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
                  <HelperText type="error" visible={!!errors.confirmPassword} style={styles.helperText}>
                    {errors.confirmPassword}
                  </HelperText>
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
          </Animated.View>
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
  helperText: {
    marginBottom: spacing.sm,
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
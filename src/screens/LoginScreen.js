import React, { useState } from 'react';
import { View, StyleSheet, Alert, KeyboardAvoidingView, Platform, Text } from 'react-native';
import { Button, Card, Title, Paragraph, TextInput } from 'react-native-paper';
import CustomTextInput from '../components/common/CustomTextInput';
import { useDispatch, useSelector } from 'react-redux';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../config/firebase';
import { loginStart, loginSuccess, loginFailure } from '../store/slices/authSlice';
import GradientBackground from '../components/common/GradientBackground';
import { colors, spacing, typography, borderRadius, shadows, components } from '../constants/theme';
import { globalFormStyles } from '../styles/globalFormFixes';
import { containerPreventionProps } from '../components/IOSFormFix';

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const dispatch = useDispatch();
  const { loading, error } = useSelector((state) => state.auth);


  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    dispatch(loginStart());
    
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const user = userCredential.user;
      
      dispatch(loginSuccess({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
      }));
    } catch (error) {
      let errorMessage = 'Login failed. Please try again.';
      
      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = 'No account found with this email.';
          break;
        case 'auth/wrong-password':
          errorMessage = 'Incorrect password.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Invalid email address.';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Too many failed attempts. Please try again later.';
          break;
        default:
          errorMessage = error.message;
      }
      
      dispatch(loginFailure(errorMessage));
      Alert.alert('Login Error', errorMessage);
    }
  };

  const handleForgotPassword = () => {
    navigation.navigate('ForgotPassword');
  };

  return (
    <GradientBackground gradientColors={[colors.primary, colors.primaryDark]}>
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.content}>
          {/* Logo Section */}
          <View style={styles.logoSection}>
            <Title style={styles.title}>DentalFlow</Title>
            <Paragraph style={styles.subtitle}>
              Professional Inventory Management
            </Paragraph>
          </View>

          {/* Login Card */}
          <Card style={styles.card}>
            <Card.Content style={styles.cardContent}>
              <Title style={styles.cardTitle}>Welcome Back</Title>
              <Paragraph style={styles.cardSubtitle}>
                Sign in to access your inventory
              </Paragraph>
              
              <View style={[styles.inputContainer, globalFormStyles.formContainer]} {...containerPreventionProps}>
                <CustomTextInput
                  label="Email Address"
                  value={email}
                  onChangeText={setEmail}
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
                />
                
                <View style={styles.inputWithIcon}>
                  <CustomTextInput
                    label="Password"
                    value={password}
                    onChangeText={setPassword}
                    mode="outlined"
                    secureTextEntry={!showPassword}
                    style={[styles.input, styles.inputWithRightIcon, globalFormStyles.hideValidationIndicators]}
                    autoComplete="off"
                    textContentType="none"
                    autoCorrect={false}
                    spellCheck={false}
                    outlineColor={colors.borderLight}
                    activeOutlineColor={colors.primary}
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
              </View>

              {error && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}
              
              <Button
                mode="contained"
                onPress={handleLogin}
                loading={loading}
                disabled={loading}
                style={styles.button}
                contentStyle={styles.buttonContent}
                buttonColor={colors.primary}
              >
                {loading ? 'Signing In...' : 'Sign In'}
              </Button>

              {/* Forgot Password */}
              <Button
                mode="text"
                onPress={handleForgotPassword}
                textColor={colors.textSecondary}
                style={styles.forgotPasswordButton}
                disabled={loading}
              >
                Forgot Password?
              </Button>

              {/* Register Prompt */}
              <View style={styles.registerPrompt}>
                <Paragraph style={styles.registerText}>
                  Don't have an account?
                </Paragraph>
                <Button
                  mode="text"
                  onPress={() => navigation.navigate('Register')}
                  textColor={colors.primary}
                  style={styles.registerButton}
                >
                  Create Account
                </Button>
              </View>
            </Card.Content>
          </Card>

          {/* Footer */}
          <View style={styles.footer}>
            <Paragraph style={styles.footerText}>
              Secure • Fast
            </Paragraph>
          </View>
        </View>
      </KeyboardAvoidingView>
    </GradientBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
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
  inputWithIcon: {
    position: 'relative',
    marginBottom: spacing.md,
  },
  inputIconLeft: {
    position: 'absolute',
    left: 12,
    top: '50%',
    transform: [{ translateY: -12 }],
    zIndex: 2,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 2,
  },
  iconText: {
    fontSize: 20,
    textAlign: 'center',
  },
  input: {
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
  },
  inputWithLeftIcon: {
    paddingLeft: 50,
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
  button: {
    marginTop: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primary,
  },
  buttonContent: {
    height: components.button.height,
    paddingHorizontal: spacing.lg,
  },
  forgotPasswordButton: {
    marginTop: spacing.sm,
    alignSelf: 'center',
  },
  errorContainer: {
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    padding: spacing.sm,
    backgroundColor: colors.dangerLight + '20',
    borderRadius: borderRadius.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.danger,
  },
  errorText: {
    color: colors.danger,
    fontSize: typography.fontSize.sm,
    textAlign: 'center',
    fontWeight: typography.fontWeight.medium,
  },
  footer: {
    marginTop: spacing.xxl,
    alignItems: 'center',
  },
  footerText: {
    fontSize: typography.fontSize.sm,
    color: colors.white,
    opacity: 0.8,
    fontWeight: typography.fontWeight.medium,
  },
  registerPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  registerText: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
  registerButton: {
    marginLeft: spacing.xs,
  },
});

export default LoginScreen;
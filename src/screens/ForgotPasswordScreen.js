import React, { useState } from 'react';
import { View, StyleSheet, Alert, KeyboardAvoidingView, Platform, Animated } from 'react-native';
import { Button, Card, Title, Paragraph, TextInput } from 'react-native-paper';
import CustomTextInput from '../components/common/CustomTextInput';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../config/firebase';
import GradientBackground from '../components/common/GradientBackground';
import { colors, spacing, typography, borderRadius, shadows } from '../constants/theme';
import { globalFormStyles } from '../styles/globalFormFixes';
import { containerPreventionProps } from '../components/IOSFormFix';
import { validateEmail, sanitizeInput } from '../utils/validation';

const ForgotPasswordScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));

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


  const handleResetPassword = async () => {
    // Validate email using comprehensive validation
    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      Alert.alert('Email Error', emailValidation.message);
      return;
    }

    setLoading(true);
    
    // Sanitize email input
    const sanitizedEmail = sanitizeInput(email.trim());
    console.log('🔄 Attempting to send password reset email to:', sanitizedEmail);

    try {
      await sendPasswordResetEmail(auth, sanitizedEmail);
      console.log('✅ Password reset email sent successfully to:', sanitizedEmail);
      
      Alert.alert(
        'Reset Email Sent',
        `A password reset email has been sent to ${email.trim()}. Please check your inbox (and spam/junk folder) and follow the instructions to reset your password.\n\nIf you don't receive the email within a few minutes, please try again.`,
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack()
          }
        ]
      );
    } catch (error) {
      console.log('❌ Password reset error:', error.code, error.message);
      
      let errorMessage = 'Failed to send reset email. Please try again.';
      
      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = 'No account found with this email address. Please check the email or create a new account.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Please enter a valid email address.';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Too many requests. Please try again later.';
          break;
        case 'auth/network-request-failed':
          errorMessage = 'Network error. Please check your internet connection.';
          break;
        case 'auth/invalid-action-code':
          errorMessage = 'The action code is invalid. Please try again.';
          break;
        default:
          errorMessage = `Error: ${error.message || 'An error occurred. Please try again.'}`;
      }
      
      Alert.alert('Reset Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <GradientBackground>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
        {...containerPreventionProps}
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
          <Card style={styles.card}>
            <Card.Content style={styles.cardContent}>
              {/* Header */}
              <View style={styles.header}>
                <Title style={styles.title}>Reset Password</Title>
                <Paragraph style={styles.subtitle}>
                  Enter your email address and we'll send you instructions to reset your password.
                </Paragraph>
              </View>

              {/* Form */}
              <View style={styles.form}>
                <CustomTextInput
                  label="Email Address"
                  value={email}
                  onChangeText={setEmail}
                  mode="outlined"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  textContentType="emailAddress"
                  style={styles.input}
                  placeholder="Enter your email address"
                  left={<TextInput.Icon icon="email-outline" />}
                />

                {/* Reset Button */}
                <Button
                  mode="contained"
                  onPress={handleResetPassword}
                  loading={loading}
                  disabled={loading}
                  style={styles.resetButton}
                  contentStyle={styles.resetButtonContent}
                >
                  Send Reset Email
                </Button>

                {/* Back to Login */}
                <Button
                  mode="text"
                  onPress={() => navigation.goBack()}
                  disabled={loading}
                  style={styles.backButton}
                  textColor={colors.primary}
                >
                  Back to Login
                </Button>
              </View>
            </Card.Content>
          </Card>
        </Animated.View>
      </KeyboardAvoidingView>
    </GradientBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    ...globalFormStyles.container,
  },
  content: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  card: {
    borderRadius: borderRadius.xl,
    ...shadows.large,
    backgroundColor: colors.surface,
  },
  cardContent: {
    padding: spacing.xxl,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  title: {
    fontSize: typography.fontSize.xxl,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: typography.fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  form: {
    gap: spacing.lg,
  },
  input: {
    backgroundColor: colors.background,
  },
  resetButton: {
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primary,
    marginTop: spacing.sm,
  },
  resetButtonContent: {
    height: 50,
    justifyContent: 'center',
  },
  backButton: {
    marginTop: spacing.sm,
  },
});

export default ForgotPasswordScreen;
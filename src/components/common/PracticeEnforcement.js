import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { 
  Card, 
  Title, 
  Paragraph, 
  Button, 
  Portal, 
  Dialog 
} from 'react-native-paper';
import { useSelector } from 'react-redux';
import { addDoc, collection, Timestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { ensureOwnership } from '../../utils/security';
import CustomTextInput from './CustomTextInput';
import { colors, spacing, borderRadius, typography, shadows } from '../../constants/theme';
import { globalFormStyles } from '../../styles/globalFormFixes';

const PracticeEnforcement = ({ children, showEnforcement = true }) => {
  const { practices } = useSelector((state) => state.practices);
  const { user } = useSelector((state) => state.auth);
  const [showCreatePracticeDialog, setShowCreatePracticeDialog] = useState(false);
  const [practiceForm, setPracticeForm] = useState({
    name: '',
    description: '',
    address: '',
  });
  const [creating, setCreating] = useState(false);

  const hasPractices = practices && practices.length > 0;

  const handleCreatePractice = async () => {
    if (!practiceForm.name.trim()) {
      Alert.alert('Required Field', 'Please enter a practice name');
      return;
    }

    setCreating(true);
    try {
      const practiceData = {
        name: practiceForm.name.trim(),
        type: 'practice',
        description: practiceForm.description.trim(),
        address: practiceForm.address.trim(),
        practiceId: user?.uid,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      const securedPracticeData = ensureOwnership(practiceData);
      await addDoc(collection(db, 'practices'), securedPracticeData);
      
      // The real-time listener will automatically update Redux state
      Alert.alert('Success', 'Practice created successfully! You can now access inventory management.');
      setShowCreatePracticeDialog(false);
      setPracticeForm({
        name: '',
        description: '',
        address: '',
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to create practice. Please try again.');
      console.error('Error creating practice:', error);
    } finally {
      setCreating(false);
    }
  };

  if (!showEnforcement || hasPractices) {
    return children;
  }

  return (
    <View style={styles.container}>
      <View style={styles.enforcementContainer}>
        <Card style={styles.enforcementCard}>
          <Card.Content style={styles.enforcementContent}>
            <View style={styles.iconContainer}>
              <Title style={styles.enforcementIcon}>🦷</Title>
            </View>
            <Title style={styles.enforcementTitle}>Create Your First Practice</Title>
            <Paragraph style={styles.enforcementDescription}>
              Before you can manage your inventory, you need to create at least one dental practice. 
              This helps organize and track your inventory items properly.
            </Paragraph>
            <Button
              mode="contained"
              onPress={() => setShowCreatePracticeDialog(true)}
              style={styles.createButton}
              buttonColor={colors.primary}
              loading={creating}
              disabled={creating}
            >
              Create Practice
            </Button>
          </Card.Content>
        </Card>
      </View>

      <Portal>
        <Dialog 
          visible={showCreatePracticeDialog} 
          onDismiss={() => !creating && setShowCreatePracticeDialog(false)}
          style={styles.createDialog}
          dismissable={!creating}
        >
          <Dialog.Title>Create Your Practice</Dialog.Title>
          <Dialog.Content>
            <View style={[styles.form, globalFormStyles.formContainer]}>
              <CustomTextInput
                label="Practice Name *"
                value={practiceForm.name}
                onChangeText={(text) => setPracticeForm(prev => ({ ...prev, name: text }))}
                style={[globalFormStyles.input, styles.input]}
                mode="outlined"
                placeholder="e.g., Downtown Dental Practice, Smith Family Dentistry"
                outlineColor={colors.borderLight}
                activeOutlineColor={colors.primary}
                disabled={creating}
              />
              
              <CustomTextInput
                label="Description (Optional)"
                value={practiceForm.description}
                onChangeText={(text) => setPracticeForm(prev => ({ ...prev, description: text }))}
                style={[globalFormStyles.input, styles.input]}
                mode="outlined"
                multiline
                numberOfLines={2}
                placeholder="Brief description of your practice"
                outlineColor={colors.borderLight}
                activeOutlineColor={colors.primary}
                disabled={creating}
              />
              
              <CustomTextInput
                label="Address (Optional)"
                value={practiceForm.address}
                onChangeText={(text) => setPracticeForm(prev => ({ ...prev, address: text }))}
                style={[globalFormStyles.input, styles.input]}
                mode="outlined"
                multiline
                numberOfLines={2}
                placeholder="Practice address or location details"
                outlineColor={colors.borderLight}
                activeOutlineColor={colors.primary}
                disabled={creating}
              />
            </View>
          </Dialog.Content>
          <Dialog.Actions>
            <Button 
              onPress={() => {
                setShowCreatePracticeDialog(false);
                setPracticeForm({
                  name: '',
                  description: '',
                  address: '',
                });
              }}
              disabled={creating}
            >
              Cancel
            </Button>
            <Button 
              onPress={handleCreatePractice} 
              textColor={colors.primary}
              disabled={!practiceForm.name.trim() || creating}
              loading={creating}
            >
              Create Practice
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  enforcementContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  enforcementCard: {
    borderRadius: borderRadius.xl,
    ...shadows.large,
    maxWidth: 400,
    width: '100%',
  },
  enforcementContent: {
    padding: spacing.xxl,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: spacing.lg,
  },
  enforcementIcon: {
    fontSize: 64,
    textAlign: 'center',
  },
  enforcementTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  enforcementDescription: {
    fontSize: typography.fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: typography.lineHeight.relaxed * typography.fontSize.md,
    marginBottom: spacing.xl,
  },
  createButton: {
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.xl,
    minWidth: 180,
  },
  createDialog: {
    maxHeight: '80%',
  },
  form: {
    gap: spacing.md,
  },
  input: {
    marginBottom: spacing.sm,
  },
});

export default PracticeEnforcement;
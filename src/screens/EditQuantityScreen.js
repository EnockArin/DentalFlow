import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Animated } from 'react-native';
import { 
  Button, 
  Card, 
  Title,
  Paragraph,
  Surface,
  Text
} from 'react-native-paper';
import CustomTextInput from '../components/common/CustomTextInput';
import { colors, spacing, borderRadius, typography, shadows, components } from '../constants/theme';
import { globalFormStyles } from '../styles/globalFormFixes';

const EditQuantityScreen = ({ navigation, route }) => {
  const { item, onUpdate } = route.params;
  const [editQuantity, setEditQuantity] = useState('');
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(30));

  useEffect(() => {
    // Initialize the quantity based on item type
    if (item) {
      if (item.type === 'manual') {
        setEditQuantity(item.quantity.toString());
      } else {
        // For low stock items, use custom quantity if set, otherwise use suggested order quantity
        const suggestedOrder = Math.max(item.minStockLevel * 2 - item.currentQuantity, item.minStockLevel);
        setEditQuantity(suggestedOrder.toString());
      }
    }
  }, [item]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleUpdate = () => {
    if (!editQuantity.trim() || isNaN(parseInt(editQuantity)) || parseInt(editQuantity) <= 0) {
      Alert.alert('Invalid Quantity', 'Please enter a valid positive number');
      return;
    }

    const newQuantity = parseInt(editQuantity);
    onUpdate(item, newQuantity);
    navigation.goBack();
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  if (!item) {
    return null;
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Animated.View style={[
        styles.animatedContainer,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}>
        {/* Header Section */}
        <Surface style={styles.headerCard}>
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <View style={styles.headerIcon}>
                <Text style={styles.headerIconText}>✏️</Text>
              </View>
              <View style={styles.headerText}>
                <Title style={styles.title}>
                  Edit {item.type === 'manual' ? 'Quantity' : 'Suggested Order'}
                </Title>
                <Paragraph style={styles.subtitle}>
                  {item.productName}
                </Paragraph>
              </View>
            </View>
          </View>
        </Surface>

        {/* Form Section */}
        <Card style={styles.formCard}>
          <Card.Content style={[styles.formContent, globalFormStyles.formContainer]}>
            <View style={styles.section}>
              <Title style={styles.sectionTitle}>Quantity Information</Title>
              
              <CustomTextInput
                label={item.type === 'manual' ? 'Quantity' : 'Suggested Order Quantity'}
                value={editQuantity}
                onChangeText={setEditQuantity}
                mode="outlined"
                keyboardType="number-pad"
                style={[styles.input, globalFormStyles.hideValidationIndicators]}
                autoComplete="off"
                textContentType="none"
                autoCorrect={false}
                spellCheck={false}
                right={null}
                selectTextOnFocus={true}
                clearTextOnFocus={false}
                placeholder="Enter quantity"
                autoFocus={true}
                outlineColor={colors.borderLight}
                activeOutlineColor={colors.primary}
              />

              {item.type !== 'manual' && (
                <Card style={styles.infoCard}>
                  <Card.Content>
                    <Title style={styles.infoTitle}>Item Details</Title>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Current Stock:</Text>
                      <Text style={styles.infoValue}>{item.currentQuantity}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Minimum Level:</Text>
                      <Text style={styles.infoValue}>{item.minStockLevel}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Default Suggestion:</Text>
                      <Text style={styles.infoValue}>
                        {Math.max(item.minStockLevel * 2 - item.currentQuantity, item.minStockLevel)}
                      </Text>
                    </View>
                    {item.cost && (
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Unit Cost:</Text>
                        <Text style={styles.infoValue}>£{item.cost.toFixed(2)}</Text>
                      </View>
                    )}
                  </Card.Content>
                </Card>
              )}

              {item.type === 'manual' && item.cost && (
                <View style={styles.costInfo}>
                  <Text style={styles.costText}>
                    Unit Cost: £{item.cost.toFixed(2)}
                  </Text>
                  <Text style={styles.totalText}>
                    Total: £{(item.cost * (parseInt(editQuantity) || 0)).toFixed(2)}
                  </Text>
                </View>
              )}
            </View>
          </Card.Content>
        </Card>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <Button
            mode="contained"
            onPress={handleUpdate}
            style={styles.updateButton}
            contentStyle={styles.buttonContent}
            buttonColor={colors.primary}
            textColor={colors.white}
          >
            Update Quantity
          </Button>

          <Button
            mode="outlined"
            onPress={handleCancel}
            style={styles.cancelButton}
            contentStyle={styles.buttonContent}
            textColor={colors.textSecondary}
          >
            Cancel
          </Button>
        </View>
      </Animated.View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  animatedContainer: {
    flex: 1,
    padding: spacing.md,
  },
  headerCard: {
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
    ...shadows.small,
  },
  header: {
    padding: spacing.lg,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: spacing.md,
    backgroundColor: colors.primaryLight + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerIconText: {
    fontSize: 20,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
  formCard: {
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
    backgroundColor: colors.surface,
    ...shadows.medium,
  },
  formContent: {
    padding: spacing.lg,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  input: {
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
  },
  infoCard: {
    marginTop: spacing.md,
    backgroundColor: colors.primaryLight + '10',
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  infoTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.primary,
    marginBottom: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  infoLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    fontWeight: typography.fontWeight.medium,
  },
  infoValue: {
    fontSize: typography.fontSize.sm,
    color: colors.textPrimary,
    fontWeight: typography.fontWeight.semibold,
  },
  costInfo: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.successLight + '10',
    borderRadius: borderRadius.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.success,
  },
  costText: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  totalText: {
    fontSize: typography.fontSize.md,
    color: colors.success,
    fontWeight: typography.fontWeight.semibold,
  },
  buttonContainer: {
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  updateButton: {
    borderRadius: borderRadius.lg,
    ...shadows.small,
  },
  cancelButton: {
    borderRadius: borderRadius.lg,
    borderColor: colors.border,
  },
  buttonContent: {
    height: 48,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default EditQuantityScreen;
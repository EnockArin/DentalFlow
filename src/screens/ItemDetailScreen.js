import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Animated, TouchableOpacity } from 'react-native';
import { 
  TextInput, 
  Button, 
  Card, 
  Title,
  HelperText,
  Divider,
  IconButton,
  Paragraph,
  Surface,
  Chip
} from 'react-native-paper';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { addDoc, collection, updateDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useSelector } from 'react-redux';
import { colors, spacing, borderRadius, typography, shadows, components } from '../constants/theme';

const ItemDetailScreen = ({ navigation, route }) => {
  const { user } = useSelector((state) => state.auth);
  const item = route.params?.item;
  const scannedBarcode = route.params?.barcode;
  const isEditing = !!item;

  const [formData, setFormData] = useState({
    productName: '',
    barcode: '',
    currentQuantity: '',
    minStockLevel: '',
    location: '',
    expiryDate: null,
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(30));

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

  useEffect(() => {
    if (item) {
      setFormData({
        productName: item.productName || '',
        barcode: item.barcode || '',
        currentQuantity: item.currentQuantity?.toString() || '',
        minStockLevel: item.minStockLevel?.toString() || '',
        location: item.location || '',
        expiryDate: item.expiryDate || null,
      });
    } else if (scannedBarcode) {
      setFormData(prev => ({
        ...prev,
        barcode: scannedBarcode,
      }));
    }
  }, [item, scannedBarcode]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.productName.trim()) {
      newErrors.productName = 'Product name is required';
    }

    if (!formData.currentQuantity.trim()) {
      newErrors.currentQuantity = 'Current quantity is required';
    } else if (isNaN(parseInt(formData.currentQuantity)) || parseInt(formData.currentQuantity) < 0) {
      newErrors.currentQuantity = 'Must be a valid positive number';
    }

    if (!formData.minStockLevel.trim()) {
      newErrors.minStockLevel = 'Minimum stock level is required';
    } else if (isNaN(parseInt(formData.minStockLevel)) || parseInt(formData.minStockLevel) < 0) {
      newErrors.minStockLevel = 'Must be a valid positive number';
    }

    if (formData.barcode && !/^\d+$/.test(formData.barcode)) {
      newErrors.barcode = 'Barcode must contain only numbers';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const itemData = {
        productName: formData.productName.trim(),
        barcode: formData.barcode.trim(),
        currentQuantity: parseInt(formData.currentQuantity),
        minStockLevel: parseInt(formData.minStockLevel),
        location: formData.location.trim(),
        expiryDate: formData.expiryDate ? Timestamp.fromDate(formData.expiryDate) : null,
        practiceId: user?.uid, // Link to user's practice
        lastUpdated: Timestamp.now(),
      };

      if (isEditing) {
        await updateDoc(doc(db, 'inventory', item.id), itemData);
        Alert.alert('Success', 'Item updated successfully');
      } else {
        itemData.createdAt = Timestamp.now();
        await addDoc(collection(db, 'inventory'), itemData);
        Alert.alert('Success', 'Item added successfully');
      }

      navigation.goBack();
    } catch (error) {
      console.error('Error saving item:', error);
      Alert.alert('Error', 'Failed to save item. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const showDatePicker = () => {
    setDatePickerVisibility(true);
  };

  const hideDatePicker = () => {
    setDatePickerVisibility(false);
  };

  const handleConfirmDate = (date) => {
    setFormData(prev => ({ ...prev, expiryDate: date }));
    hideDatePicker();
  };

  const formatDate = (date) => {
    if (!date) return 'Select expiry date';
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

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
              <IconButton
                icon={isEditing ? 'pencil' : 'plus-circle'}
                size={32}
                iconColor={colors.primary}
                style={styles.headerIcon}
              />
              <View style={styles.headerText}>
                <Title style={styles.title}>
                  {isEditing ? 'Edit Item' : 'Add New Item'}
                </Title>
                <Paragraph style={styles.subtitle}>
                  {isEditing ? 'Update inventory information' : 'Enter product details'}
                </Paragraph>
              </View>
            </View>
            {scannedBarcode && (
              <Chip 
                icon="barcode-scan" 
                style={styles.scannedChip}
                textStyle={styles.scannedChipText}
              >
                Scanned
              </Chip>
            )}
          </View>
        </Surface>

        {/* Form Section */}
        <Card style={styles.formCard}>
          <Card.Content style={styles.formContent}>
            {/* Product Information */}
            <View style={styles.section}>
              <Title style={styles.sectionTitle}>Product Information</Title>
              <Divider style={styles.sectionDivider} />
              
              <TextInput
                label="Product Name"
                value={formData.productName}
                onChangeText={(text) => setFormData(prev => ({ ...prev, productName: text }))}
                mode="outlined"
                style={styles.input}
                error={!!errors.productName}
                left={<TextInput.Icon icon="package" />}
                outlineColor={colors.borderLight}
                activeOutlineColor={colors.primary}
                autoComplete="new-password"
                textContentType="oneTimeCode"
                autoCorrect={false}
                spellCheck={false}
                right={null}
              />
              <HelperText type="error" visible={!!errors.productName} style={styles.helperText}>
                {errors.productName}
              </HelperText>

              <TextInput
                label="Barcode (Optional)"
                value={formData.barcode}
                onChangeText={(text) => setFormData(prev => ({ ...prev, barcode: text }))}
                mode="outlined"
                style={styles.input}
                keyboardType="numeric"
                error={!!errors.barcode}
                left={<TextInput.Icon icon="barcode" />}
                outlineColor={colors.borderLight}
                activeOutlineColor={colors.primary}
                autoComplete="new-password"
                textContentType="oneTimeCode"
                autoCorrect={false}
                spellCheck={false}
                right={
                  <TextInput.Icon 
                    icon="barcode-scan" 
                    onPress={() => navigation.navigate('Scanner', { returnScreen: 'ItemDetail' })}
                  />
                }
              />
              <HelperText type="error" visible={!!errors.barcode} style={styles.helperText}>
                {errors.barcode}
              </HelperText>
            </View>

            {/* Quantity Information */}
            <View style={styles.section}>
              <Title style={styles.sectionTitle}>Quantity & Stock</Title>
              <Divider style={styles.sectionDivider} />
              
              <View style={styles.row}>
                <View style={styles.halfInput}>
                  <TextInput
                    label="Current Quantity"
                    value={formData.currentQuantity}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, currentQuantity: text }))}
                    mode="outlined"
                    keyboardType="numeric"
                    error={!!errors.currentQuantity}
                    left={<TextInput.Icon icon="counter" />}
                    outlineColor={colors.borderLight}
                    activeOutlineColor={colors.primary}
                    autoComplete="off"
                    textContentType="none"
                    autoCorrect={false}
                    spellCheck={false}
                    right={null}
                  />
                  <HelperText type="error" visible={!!errors.currentQuantity} style={styles.helperText}>
                    {errors.currentQuantity}
                  </HelperText>
                </View>

                <View style={styles.halfInput}>
                  <TextInput
                    label="Min Stock Level"
                    value={formData.minStockLevel}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, minStockLevel: text }))}
                    mode="outlined"
                    keyboardType="numeric"
                    error={!!errors.minStockLevel}
                    left={<TextInput.Icon icon="alert-outline" />}
                    outlineColor={colors.borderLight}
                    activeOutlineColor={colors.primary}
                    autoComplete="off"
                    textContentType="none"
                    autoCorrect={false}
                    spellCheck={false}
                    right={null}
                  />
                  <HelperText type="error" visible={!!errors.minStockLevel} style={styles.helperText}>
                    {errors.minStockLevel}
                  </HelperText>
                </View>
              </View>
            </View>

            {/* Location & Expiry */}
            <View style={styles.section}>
              <Title style={styles.sectionTitle}>Location & Expiry</Title>
              <Divider style={styles.sectionDivider} />
              
              <TextInput
                label="Storage Location (Optional)"
                value={formData.location}
                onChangeText={(text) => setFormData(prev => ({ ...prev, location: text }))}
                mode="outlined"
                style={styles.input}
                placeholder="e.g., Cabinet A, Drawer 2, Shelf B"
                left={<TextInput.Icon icon="map-marker" />}
                outlineColor={colors.borderLight}
                activeOutlineColor={colors.primary}
                autoComplete="new-password"
                textContentType="oneTimeCode"
                autoCorrect={false}
                spellCheck={false}
                right={null}
              />

              <TouchableOpacity onPress={showDatePicker}>
                <Surface style={styles.datePickerSurface}>
                  <View style={styles.datePickerContent}>
                    <IconButton
                      icon="calendar"
                      size={24}
                      iconColor={formData.expiryDate ? colors.primary : colors.textSecondary}
                      style={styles.dateIcon}
                    />
                    <View style={styles.dateTextContainer}>
                      <Paragraph style={styles.dateLabel}>Expiry Date (Optional)</Paragraph>
                      <Title style={[
                        styles.dateValue,
                        { color: formData.expiryDate ? colors.textPrimary : colors.textSecondary }
                      ]}>
                        {formatDate(formData.expiryDate)}
                      </Title>
                    </View>
                    <IconButton
                      icon="chevron-right"
                      size={20}
                      iconColor={colors.textSecondary}
                    />
                  </View>
                </Surface>
              </TouchableOpacity>
            </View>

            <DateTimePickerModal
              isVisible={isDatePickerVisible}
              mode="date"
              minimumDate={new Date()}
              onConfirm={handleConfirmDate}
              onCancel={hideDatePicker}
            />
          </Card.Content>
        </Card>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <Button
            mode="contained"
            onPress={handleSave}
            loading={loading}
            disabled={loading}
            style={styles.saveButton}
            contentStyle={styles.buttonContent}
            buttonColor={colors.primary}
            icon={isEditing ? 'content-save' : 'plus'}
          >
            {loading ? 'Saving...' : (isEditing ? 'Update Item' : 'Add Item')}
          </Button>

          <Button
            mode="outlined"
            onPress={() => navigation.goBack()}
            disabled={loading}
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
    margin: 0,
    marginRight: spacing.md,
    backgroundColor: colors.primaryLight + '20',
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
  scannedChip: {
    backgroundColor: colors.successLight + '20',
    borderColor: colors.success,
  },
  scannedChipText: {
    color: colors.success,
    fontWeight: typography.fontWeight.medium,
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
    marginBottom: spacing.sm,
  },
  sectionDivider: {
    marginBottom: spacing.lg,
    backgroundColor: colors.borderLight,
  },
  input: {
    marginBottom: spacing.xs,
    backgroundColor: colors.surface,
  },
  helperText: {
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  halfInput: {
    flex: 1,
  },
  datePickerSurface: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.surface,
    marginBottom: spacing.md,
  },
  datePickerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  dateIcon: {
    margin: 0,
    marginRight: spacing.sm,
  },
  dateTextContainer: {
    flex: 1,
  },
  dateLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  dateValue: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
  },
  buttonContainer: {
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  saveButton: {
    borderRadius: borderRadius.lg,
  },
  cancelButton: {
    borderRadius: borderRadius.lg,
    borderColor: colors.border,
  },
  buttonContent: {
    height: components.button.height,
    paddingHorizontal: spacing.lg,
  },
});

export default ItemDetailScreen;
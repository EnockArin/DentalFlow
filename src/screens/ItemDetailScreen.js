import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Animated, TouchableOpacity, Image, Text } from 'react-native';
import { 
  Button, 
  Card, 
  Title,
  HelperText,
  Divider,
  Paragraph,
  Surface,
  Chip,
  TextInput
} from 'react-native-paper';
import CustomTextInput from '../components/common/CustomTextInput';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { addDoc, collection, updateDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useSelector } from 'react-redux';
import { colors, spacing, borderRadius, typography, shadows, components } from '../constants/theme';
import { globalFormStyles } from '../styles/globalFormFixes';

const ItemDetailScreen = ({ navigation, route }) => {
  const { user } = useSelector((state) => state.auth);
  const { locations } = useSelector((state) => state.locations);
  const item = route.params?.item;
  const scannedBarcode = route.params?.barcode;
  const isEditing = !!item;

  const [formData, setFormData] = useState({
    productName: '',
    barcode: '',
    currentQuantity: '',
    minStockLevel: '',
    locationId: '',
    locationName: '',
    cost: '',
    description: '',
    imageUri: null,
    expiryDate: null,
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(30));

  // Initialize form data when editing
  useEffect(() => {
    if (item) {
      setFormData({
        productName: item.productName || '',
        barcode: item.barcode || '',
        currentQuantity: '', // Leave blank when editing since we're adding stock
        minStockLevel: item.minStockLevel?.toString() || '',
        locationId: item.locationId || '',
        locationName: item.locationName || item.location || '',
        cost: item.cost?.toString() || '',
        description: item.description || '',
        imageUri: item.imageUri || null,
        expiryDate: item.expiryDate || null,
      });
    }
    
    if (scannedBarcode) {
      setFormData(prev => ({ ...prev, barcode: scannedBarcode }));
    }
  }, [item, scannedBarcode]);

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
        currentQuantity: '', // Leave blank when editing since we're adding stock
        minStockLevel: item.minStockLevel?.toString() || '',
        locationId: item.locationId || '',
        locationName: item.locationName || item.location || '',
        cost: item.cost?.toString() || '',
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

    if (formData.cost && (isNaN(parseFloat(formData.cost)) || parseFloat(formData.cost) < 0)) {
      newErrors.cost = 'Cost must be a valid positive number';
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
        productName: (formData.productName || '').trim(),
        name: (formData.productName || '').trim(), // Duplicate for compatibility
        barcode: (formData.barcode || '').trim(),
        currentQuantity: parseInt(formData.currentQuantity) || 0,
        minStockLevel: parseInt(formData.minStockLevel) || 0,
        locationId: formData.locationId || null,
        locationName: (formData.locationName || '').trim(),
        location: (formData.locationName || '').trim(), // Legacy field for compatibility
        cost: parseFloat(formData.cost) || 0,
        description: (formData.description || '').trim(),
        imageUri: formData.imageUri || null,
        expiryDate: formData.expiryDate ? Timestamp.fromDate(formData.expiryDate) : null,
        practiceId: user?.uid, // Link to user's practice
        lastUpdated: Timestamp.now(),
      };

      if (isEditing) {
        // When editing, add the entered quantity to existing stock
        const quantityToAdd = parseInt(formData.currentQuantity) || 0;
        itemData.currentQuantity = (item.currentQuantity || 0) + quantityToAdd;
        
        await updateDoc(doc(db, 'inventory', item.id), itemData);
        Alert.alert('Success', `Item updated successfully. Added ${quantityToAdd} to stock.`);
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
              <TouchableOpacity
                icon={isEditing ? 'pencil' : 'plus-circle'}
                size={32}
                
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
          <Card.Content style={[styles.formContent, globalFormStyles.formContainer]}>
            {/* Product Information */}
            <View style={styles.section}>
              <Title style={styles.sectionTitle}>Product Information</Title>
              <Divider style={styles.sectionDivider} />
              
              <CustomTextInput
                label="Product Name"
                value={formData.productName}
                onChangeText={(text) => setFormData(prev => ({ ...prev, productName: text }))}
                mode="outlined"
                style={[styles.input, globalFormStyles.hideValidationIndicators]}
                error={!!errors.productName}
                left={<TextInput.Icon  />}
                outlineColor={colors.borderLight}
                activeOutlineColor={colors.primary}
                autoComplete="off"
                textContentType="none"
                autoCorrect={false}
                spellCheck={false}
                right={null}
              />
              <HelperText type="error" visible={!!errors.productName} style={styles.helperText}>
                {errors.productName}
              </HelperText>

              <CustomTextInput
                label="Barcode (Optional)"
                value={formData.barcode}
                onChangeText={(text) => setFormData(prev => ({ ...prev, barcode: text }))}
                mode="outlined"
                style={[styles.input, globalFormStyles.hideValidationIndicators]}
                keyboardType="numeric"
                error={!!errors.barcode}
                left={<TextInput.Icon  />}
                outlineColor={colors.borderLight}
                activeOutlineColor={colors.primary}
                autoComplete="off"
                textContentType="none"
                autoCorrect={false}
                spellCheck={false}
                right={
                  <TextInput.Icon 
                     
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
                  <CustomTextInput
                    label={isEditing ? "Stock to Add" : "Initial Stock Quantity"}
                    value={formData.currentQuantity}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, currentQuantity: text }))}
                    mode="outlined"
                    keyboardType="numeric"
                    error={!!errors.currentQuantity}
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
                  {isEditing && (
                    <HelperText type="info" style={styles.helperText}>
                      Current stock: {item.currentQuantity || 0}. Enter amount to add.
                    </HelperText>
                  )}
                </View>

                <View style={styles.halfInput}>
                  <CustomTextInput
                    label="Min Stock Level"
                    value={formData.minStockLevel}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, minStockLevel: text }))}
                    mode="outlined"
                    keyboardType="numeric"
                    error={!!errors.minStockLevel}
                    left={<TextInput.Icon  />}
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
              
              <CustomTextInput
                label="Storage Location (Optional)"
                value={formData.location}
                onChangeText={(text) => setFormData(prev => ({ ...prev, location: text }))}
                mode="outlined"
                style={[styles.input, globalFormStyles.hideValidationIndicators]}
                placeholder="e.g., Cabinet A, Drawer 2, Shelf B"
                left={<TextInput.Icon  />}
                outlineColor={colors.borderLight}
                activeOutlineColor={colors.primary}
                autoComplete="off"
                textContentType="none"
                autoCorrect={false}
                spellCheck={false}
                right={null}
              />

              <CustomTextInput
                label="Cost per Unit (£)"
                value={formData.cost}
                onChangeText={(text) => setFormData(prev => ({ ...prev, cost: text }))}
                mode="outlined"
                style={[styles.input, globalFormStyles.hideValidationIndicators]}
                keyboardType="decimal-pad"
                placeholder="0.00"
                error={!!errors.cost}
                left={<Text style={styles.currencyIcon}>£</Text>}
                outlineColor={colors.borderLight}
                activeOutlineColor={colors.primary}
                autoComplete="off"
                textContentType="none"
                autoCorrect={false}
                spellCheck={false}
                right={null}
              />
              <HelperText type="error" visible={!!errors.cost} style={styles.helperText}>
                {errors.cost}
              </HelperText>

              <CustomTextInput
                label="Description (Optional)"
                value={formData.description}
                onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
                mode="outlined"
                multiline
                numberOfLines={3}
                style={[styles.input, styles.descriptionInput, globalFormStyles.hideValidationIndicators]}
                placeholder="Add notes, specifications, or other details about this item..."
                outlineColor={colors.borderLight}
                activeOutlineColor={colors.primary}
                autoComplete="off"
                textContentType="none"
                autoCorrect={false}
                spellCheck={false}
                right={null}
              />

              {/* Image Picker */}
              <TouchableOpacity onPress={() => Alert.alert('Image Picker', 'Image picker functionality will be added here')}>
                <Surface style={styles.imagePickerSurface}>
                  <View style={styles.imagePickerContent}>
                    {formData.imageUri ? (
                      <Image source={{ uri: formData.imageUri }} style={styles.itemImage} />
                    ) : (
                      <View style={styles.imagePlaceholder}>
                        <Text style={styles.imagePlaceholderIcon}>📸</Text>
                        <Paragraph style={styles.imagePlaceholderText}>
                          Tap to add item photo
                        </Paragraph>
                      </View>
                    )}
                  </View>
                </Surface>
              </TouchableOpacity>

              <TouchableOpacity onPress={showDatePicker}>
                <Surface style={styles.datePickerSurface}>
                  <View style={styles.datePickerContent}>
                    <TouchableOpacity
                      
                      size={24}
                      
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
                    <TouchableOpacity
                      
                      size={20}
                      
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
          <TouchableOpacity
            onPress={handleSave}
            disabled={loading}
            style={[styles.saveButton, loading && styles.disabledButton]}
            activeOpacity={0.8}
          >
            <Text style={styles.saveButtonIcon}>
              {loading ? '⏳' : (isEditing ? '💾' : '+')}
            </Text>
            <Text style={styles.saveButtonText}>
              {loading ? 'Saving...' : (isEditing ? 'Update Item' : 'Add Item')}
            </Text>
          </TouchableOpacity>

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
  // New field styles
  descriptionInput: {
    minHeight: 80,
    textAlignVertical: 'top',
    paddingTop: spacing.md,
  },
  imagePickerSurface: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderStyle: 'dashed',
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  imagePickerContent: {
    minHeight: 120,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
  },
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePlaceholderIcon: {
    fontSize: 32,
    marginBottom: spacing.xs,
  },
  imagePlaceholderText: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  itemImage: {
    width: 120,
    height: 120,
    borderRadius: borderRadius.md,
    resizeMode: 'cover',
  },
  buttonContainer: {
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    minHeight: components.button.height,
  },
  disabledButton: {
    backgroundColor: colors.gray,
    opacity: 0.6,
  },
  saveButtonIcon: {
    fontSize: 18,
    marginRight: spacing.sm,
  },
  saveButtonText: {
    color: colors.white,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
  },
  cancelButton: {
    borderRadius: borderRadius.lg,
    borderColor: colors.border,
  },
  buttonContent: {
    height: components.button.height,
    paddingHorizontal: spacing.lg,
  },
  currencyIcon: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
});

export default ItemDetailScreen;
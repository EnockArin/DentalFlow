import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity, Image, Text, Animated } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { 
  Button, 
  Card, 
  Title,
  Divider,
  Paragraph,
  Surface,
  Chip,
  TextInput,
  Dialog,
  Portal
} from 'react-native-paper';
import CustomTextInput from '../components/common/CustomTextInput';
import PracticePicker from '../components/common/PracticePicker';
import PracticeEnforcement from '../components/common/PracticeEnforcement';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { addDoc, collection, updateDoc, doc, Timestamp, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../config/firebase';
import { verifyOwnership, ensureOwnership } from '../utils/security';
import { useSelector } from 'react-redux';
import { colors, spacing, borderRadius, typography, shadows, components } from '../constants/theme';
import { globalFormStyles } from '../styles/globalFormFixes';

const ItemDetailScreen = ({ navigation, route }) => {
  const { user } = useSelector((state) => state.auth);
  const { practices } = useSelector((state) => state.practices);
  const item = route.params?.item;
  const scannedBarcode = route.params?.barcode;
  const apiData = route.params?.apiData;
  const isEditing = !!item;

  const [formData, setFormData] = useState({
    productName: '',
    barcode: '',
    currentQuantity: '',
    minStockLevel: '',
    practiceId: '',
    practiceName: '',
    cost: '',
    description: '',
    imageUri: null,
    expiryDate: null,
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(30));

  // Initialize form data when editing or with API data
  useEffect(() => {
    if (item) {
      setFormData({
        productName: item.productName || '',
        barcode: item.barcode || '',
        currentQuantity: '', // Leave blank when editing since we're adding stock
        minStockLevel: item.minStockLevel?.toString() || '',
        practiceId: item.assignedPracticeId || item.practiceId || '',
        practiceName: item.practiceName || item.practice || '',
        cost: item.cost?.toString() || '',
        description: item.description || '',
        imageUri: item.imageUri || null,
        expiryDate: item.expiryDate || null,
      });
    } else if (apiData && apiData.success) {
      // Pre-populate with API data for new items
      setFormData(prev => ({
        ...prev,
        productName: apiData.productName || route.params?.productName || '',
        description: apiData.description || route.params?.description || '',
        barcode: scannedBarcode || '',
        // Set some reasonable defaults for new items from API
        currentQuantity: '1',
        minStockLevel: '5',
        cost: '', // User will need to enter cost manually
      }));
    } else {
      // Handle individual params (backwards compatibility)
      if (route.params?.productName) {
        setFormData(prev => ({ ...prev, productName: route.params.productName }));
      }
      if (route.params?.description) {
        setFormData(prev => ({ ...prev, description: route.params.description }));
      }
      if (scannedBarcode) {
        setFormData(prev => ({ ...prev, barcode: scannedBarcode }));
      }
    }
  }, [item, scannedBarcode, apiData, route.params]);

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

  // Auto-populate practice field when only one practice exists
  useEffect(() => {
    if (!isEditing && practices && practices.length === 1 && !formData.practiceId) {
      const singlePractice = practices[0];
      setFormData(prev => ({ 
        ...prev, 
        practiceId: singlePractice.practiceId,
        practiceName: singlePractice.name
      }));
    }
  }, [practices, formData.practiceId, isEditing]);


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

    // Make cost mandatory for new items
    if (!formData.cost || !formData.cost.trim()) {
      newErrors.cost = 'Cost per unit is required';
    } else if (isNaN(parseFloat(formData.cost)) || parseFloat(formData.cost) < 0) {
      newErrors.cost = 'Cost must be a valid positive number';
    }

    // Practice selection is always mandatory
    if (!formData.practiceId) {
      newErrors.practiceId = 'Please select a practice';
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
        assignedPracticeId: formData.practiceId || null, // The practice this item is assigned to
        practiceName: (formData.practiceName || '').trim(),
        practice: (formData.practiceName || '').trim(), // Legacy field for compatibility
        cost: parseFloat(formData.cost) || 0,
        description: (formData.description || '').trim(),
        imageUri: formData.imageUri || null,
        expiryDate: formData.expiryDate ? Timestamp.fromDate(formData.expiryDate) : null,
        lastUpdated: Timestamp.now(),
      };

      if (isEditing) {
        // SECURITY FIX: Verify ownership before updating
        const hasPermission = await verifyOwnership('inventory', item.id);
        if (!hasPermission) {
          Alert.alert('Access Denied', 'You do not have permission to modify this item.');
          return;
        }

        // When editing, add the entered quantity to existing stock
        const quantityToAdd = parseInt(formData.currentQuantity) || 0;
        itemData.currentQuantity = (item.currentQuantity || 0) + quantityToAdd;
        itemData.lastModifiedBy = user?.uid;
        
        await updateDoc(doc(db, 'inventory', item.id), itemData);
        Alert.alert('Success', `Item updated successfully. Added ${quantityToAdd} to stock.`);
      } else {
        // SECURITY FIX: Ensure ownership for new items
        const securedItemData = ensureOwnership(itemData);
        securedItemData.createdAt = Timestamp.now();
        await addDoc(collection(db, 'inventory'), securedItemData);
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

  const handleDelete = async () => {
    if (!isEditing || !item) {
      Alert.alert('Error', 'Cannot delete - item not found.');
      return;
    }

    setLoading(true);

    try {
      // SECURITY CHECK: Verify ownership before deleting
      const hasPermission = await verifyOwnership('inventory', item.id);
      if (!hasPermission) {
        Alert.alert('Access Denied', 'You do not have permission to delete this item.');
        setLoading(false);
        return;
      }

      // Delete the item from Firestore
      await deleteDoc(doc(db, 'inventory', item.id));
      
      setShowDeleteDialog(false);
      Alert.alert(
        'Item Deleted', 
        `"${item.productName}" has been successfully deleted from your inventory.`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('Error deleting item:', error);
      Alert.alert('Error', 'Failed to delete item. Please try again.');
      setLoading(false);
    }
  };

  const confirmDelete = () => {
    Alert.alert(
      'Delete Item',
      `Are you sure you want to delete "${item?.productName || 'this item'}" from your inventory?\n\nThis action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => setShowDeleteDialog(true)
        }
      ]
    );
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

  const pickImage = async () => {
    // Request permission to access media library
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'We need camera roll permissions to select an image.');
      return;
    }

    Alert.alert(
      'Select Image',
      'Choose how you want to add an image',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Camera', onPress: () => takePhoto() },
        { text: 'Photo Library', onPress: () => selectFromLibrary() }
      ]
    );
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'We need camera permissions to take a photo.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      await uploadImage(result.assets[0]);
    }
  };

  const selectFromLibrary = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      await uploadImage(result.assets[0]);
    }
  };

  const uploadImage = async (imageAsset) => {
    setImageUploading(true);
    try {
      const response = await fetch(imageAsset.uri);
      const blob = await response.blob();
      
      // Create a unique filename
      const filename = `inventory/${user?.uid}/${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
      const storageRef = ref(storage, filename);
      
      // Upload the image
      await uploadBytes(storageRef, blob);
      
      // Get the download URL
      const downloadURL = await getDownloadURL(storageRef);
      
      // Update form data with the image URL
      setFormData(prev => ({ ...prev, imageUri: downloadURL }));
      
      Alert.alert('Success', 'Image uploaded successfully!');
    } catch (error) {
      console.error('Image upload error:', error);
      Alert.alert('Upload Failed', 'Failed to upload image. Please try again.');
    } finally {
      setImageUploading(false);
    }
  };

  const removeImage = async () => {
    if (formData.imageUri) {
      Alert.alert(
        'Remove Image',
        'Are you sure you want to remove this image?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: async () => {
              // If it's a Firebase Storage URL, try to delete it
              if (formData.imageUri.includes('firebase')) {
                try {
                  const storageRef = ref(storage, formData.imageUri);
                  await deleteObject(storageRef);
                } catch (error) {
                  console.log('Could not delete old image:', error);
                  // Continue anyway - the URL might be invalid
                }
              }
              setFormData(prev => ({ ...prev, imageUri: null }));
            }
          }
        ]
      );
    }
  };

  return (
    <PracticeEnforcement>
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
                <Text style={styles.headerIconText}>
                  {isEditing ? '✏️' : '➕'}
                </Text>
              </View>
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

        {/* API Data Info Card */}
        {apiData && apiData.success && !isEditing && (
          <Card style={[styles.formCard, { backgroundColor: colors.primaryLight + '15', marginBottom: spacing.md }]}>
            <Card.Content>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
                <Text style={{ fontSize: 20, marginRight: spacing.sm }}>🔍</Text>
                <Title style={[styles.sectionTitle, { color: colors.primary, marginBottom: 0 }]}>
                  Product Information Found
                </Title>
              </View>
              <Text style={{ fontSize: 14, color: colors.textSecondary, lineHeight: 20, marginBottom: spacing.sm }}>
                Product details have been automatically filled from our database. You can edit them below and add inventory-specific information.
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
                {apiData.brand && (
                  <Chip style={{ backgroundColor: colors.primary + '20' }}>
                    <Text style={{ fontSize: 12, color: colors.primary }}>
                      Brand: {apiData.brand}
                    </Text>
                  </Chip>
                )}
                {apiData.category && (
                  <Chip style={{ backgroundColor: colors.primary + '20' }}>
                    <Text style={{ fontSize: 12, color: colors.primary }}>
                      Category: {apiData.category}
                    </Text>
                  </Chip>
                )}
                {apiData.size && (
                  <Chip style={{ backgroundColor: colors.primary + '20' }}>
                    <Text style={{ fontSize: 12, color: colors.primary }}>
                      Size: {apiData.size}
                    </Text>
                  </Chip>
                )}
              </View>
            </Card.Content>
          </Card>
        )}

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
                left={<TextInput.Icon icon="package-variant" />}
                outlineColor={colors.borderLight}
                activeOutlineColor={colors.primary}
                autoComplete="off"
                textContentType="none"
                autoCorrect={false}
                spellCheck={false}
                right={null}
              />
              {errors.productName && (
                <Text style={styles.errorText}>
                  {errors.productName}
                </Text>
              )}

              <CustomTextInput
                label="Barcode (Optional)"
                value={formData.barcode}
                onChangeText={(text) => setFormData(prev => ({ ...prev, barcode: text }))}
                mode="outlined"
                style={[styles.input, globalFormStyles.hideValidationIndicators]}
                keyboardType="numeric"
                error={!!errors.barcode}
                left={<TextInput.Icon icon="barcode" />}
                outlineColor={colors.borderLight}
                activeOutlineColor={colors.primary}
                autoComplete="off"
                textContentType="none"
                autoCorrect={false}
                spellCheck={false}
                right={
                  <TextInput.Icon 
                    icon="barcode-scan"
                    onPress={() => navigation.navigate('Scanner', { returnScreen: 'ItemDetail' })}
                  />
                }
              />
              {errors.barcode && (
                <Text style={styles.errorText}>
                  {errors.barcode}
                </Text>
              )}
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
                  {errors.currentQuantity && (
                    <Text style={styles.errorText}>
                      {errors.currentQuantity}
                    </Text>
                  )}
                  {isEditing && (
                    <Text style={styles.infoText}>
                      Current stock: {item.currentQuantity || 0}. Enter amount to add.
                    </Text>
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
                    left={<TextInput.Icon icon="alert-outline" />}
                    outlineColor={colors.borderLight}
                    activeOutlineColor={colors.primary}
                    autoComplete="off"
                    textContentType="none"
                    autoCorrect={false}
                    spellCheck={false}
                    right={null}
                  />
                  {errors.minStockLevel && (
                    <Text style={styles.errorText}>
                      {errors.minStockLevel}
                    </Text>
                  )}
                </View>
              </View>
            </View>

            {/* Practice & Expiry */}
            <View style={styles.section}>
              <Title style={styles.sectionTitle}>Practice & Expiry *</Title>
              <Divider style={styles.sectionDivider} />
              
              <PracticePicker
                value={formData.practiceId}
                onSelect={(practiceId, practiceName) => 
                  setFormData(prev => ({ 
                    ...prev, 
                    practiceId, 
                    practiceName 
                  }))
                }
                placeholder="Select practice *"
                style={styles.input}
              />
              {errors.practiceId && (
                <Text style={styles.errorText}>
                  {errors.practiceId}
                </Text>
              )}

              <CustomTextInput
                label="Cost per Unit (£) *"
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
              {errors.cost && (
                <Text style={styles.errorText}>
                  {errors.cost}
                </Text>
              )}

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
              <TouchableOpacity onPress={pickImage} disabled={imageUploading}>
                <Surface style={styles.imagePickerSurface}>
                  <View style={styles.imagePickerContent}>
                    {imageUploading ? (
                      <View style={styles.imagePlaceholder}>
                        <Text style={styles.imagePlaceholderIcon}>⏳</Text>
                        <Paragraph style={styles.imagePlaceholderText}>
                          Uploading image...
                        </Paragraph>
                      </View>
                    ) : formData.imageUri ? (
                      <View style={styles.imageContainer}>
                        <Image source={{ uri: formData.imageUri }} style={styles.itemImage} />
                        <TouchableOpacity 
                          style={styles.removeImageButton} 
                          onPress={removeImage}
                        >
                          <Text style={styles.removeImageText}>✕</Text>
                        </TouchableOpacity>
                      </View>
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
                    <View style={styles.dateIcon}>
                      <Text style={styles.dateIconText}>📅</Text>
                    </View>
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
                      onPress={() => setFormData(prev => ({ ...prev, expiryDate: null }))}
                      style={styles.clearDateButton}
                    >
                      <Text style={styles.clearDateText}>✕</Text>
                    </TouchableOpacity>
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

        {/* Required Fields Note */}
        <Card style={[styles.formCard, { backgroundColor: colors.warningLight + '10' }]}>
          <Card.Content style={{ paddingVertical: spacing.sm }}>
            <Text style={{ fontSize: 12, color: colors.textSecondary, textAlign: 'center' }}>
              * Required fields
            </Text>
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

          {/* Delete Button - Only show when editing */}
          {isEditing && (
            <TouchableOpacity
              onPress={confirmDelete}
              disabled={loading}
              style={[styles.deleteButton, loading && styles.disabledButton]}
              activeOpacity={0.8}
            >
              <Text style={styles.deleteButtonIcon}>🗑️</Text>
              <Text style={styles.deleteButtonText}>Delete Item</Text>
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>

      {/* Delete Confirmation Dialog */}
      <Portal>
        <Dialog visible={showDeleteDialog} onDismiss={() => setShowDeleteDialog(false)}>
          <Dialog.Title>⚠️ Final Confirmation</Dialog.Title>
          <Dialog.Content>
            <Paragraph style={{ marginBottom: 16 }}>
              You are about to permanently delete "{item?.productName}" from your inventory.
            </Paragraph>
            <Paragraph style={{ fontWeight: 'bold', color: colors.danger || '#ef4444' }}>
              This action cannot be undone!
            </Paragraph>
            <Paragraph style={{ marginTop: 16, fontSize: 14, color: colors.textSecondary }}>
              Current stock: {item?.currentQuantity || 0} units
            </Paragraph>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowDeleteDialog(false)}>Cancel</Button>
            <Button 
              onPress={handleDelete}
              disabled={loading}
              buttonColor={colors.danger || '#ef4444'}
              textColor={colors.white}
            >
              {loading ? 'Deleting...' : 'Delete Forever'}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </ScrollView>
    </PracticeEnforcement>
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
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  dateIconText: {
    fontSize: 18,
  },
  clearDateButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.gray + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearDateText: {
    fontSize: 12,
    color: colors.gray,
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
  errorText: {
    color: colors.danger,
    fontSize: typography.fontSize.sm,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  infoText: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.sm,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
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
  imageContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemImage: {
    width: 120,
    height: 120,
    borderRadius: borderRadius.md,
    resizeMode: 'cover',
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.danger,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.small,
  },
  removeImageText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: typography.fontWeight.bold,
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
    height: 48,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.danger || '#ef4444',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    marginTop: spacing.sm,
    ...shadows.small,
  },
  deleteButtonIcon: {
    fontSize: 18,
    marginRight: spacing.sm,
  },
  deleteButtonText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.white,
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
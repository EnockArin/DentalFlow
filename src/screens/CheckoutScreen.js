import React, { useState, useEffect } from 'react';
import { View, FlatList, StyleSheet, Alert, Animated, TouchableOpacity, Modal } from 'react-native';
import { 
  Searchbar, 
  FAB, 
  Chip, 
  Text,
  ActivityIndicator,
  Card,
  Title,
  Paragraph,
  Badge,
  Surface,
  Button,
  TextInput
} from 'react-native-paper';
import CustomTextInput from '../components/common/CustomTextInput';
import { useDispatch, useSelector } from 'react-redux';
import { deleteDoc, doc, updateDoc, addDoc, collection, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { colors, spacing, borderRadius, typography, shadows, components } from '../constants/theme';
import { globalFormStyles } from '../styles/globalFormFixes';

const CheckoutScreen = ({ navigation, route }) => {
  const dispatch = useDispatch();
  const { items, loading } = useSelector((state) => state.inventory);
  const { user } = useSelector((state) => state.auth);
  
  // Check for scanned item from barcode scanner
  const { scannedItem, barcode } = route.params || {};
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [fadeAnim] = useState(new Animated.Value(0));
  
  // Checkout specific states
  const [checkoutItems, setCheckoutItems] = useState([]); // Items selected for checkout
  const [quantityModalVisible, setQuantityModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [checkoutQuantity, setCheckoutQuantity] = useState('1');
  const [processingCheckout, setProcessingCheckout] = useState(false);
  
  // Multi-item checkout states
  const [multiCheckoutMode, setMultiCheckoutMode] = useState(false);
  const [selectedForCheckout, setSelectedForCheckout] = useState([]);
  const [multiCheckoutQuantities, setMultiCheckoutQuantities] = useState({});

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  // Handle scanned item from barcode scanner
  useEffect(() => {
    if (scannedItem) {
      // Automatically open the quantity modal for the scanned item
      setSelectedItem(scannedItem);
      setCheckoutQuantity('1');
      setQuantityModalVisible(true);
    }
  }, [scannedItem]);

  // Filter and search items
  const filteredItems = items.filter(item => {
    const matchesSearch = item.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.barcode?.includes(searchQuery) ||
                         item.location?.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (filter === 'all') return matchesSearch;
    if (filter === 'in-stock') return matchesSearch && item.currentQuantity > 0;
    if (filter === 'low-stock') return matchesSearch && item.currentQuantity <= item.minStockLevel && item.currentQuantity > 0;
    
    return matchesSearch;
  });

  // Handle item selection for checkout
  const handleItemSelect = (item) => {
    if (item.currentQuantity <= 0) {
      Alert.alert('Out of Stock', 'This item is currently out of stock and cannot be checked out.');
      return;
    }
    
    setSelectedItem(item);
    setCheckoutQuantity('1');
    setQuantityModalVisible(true);
  };

  // Add item to checkout list
  const addToCheckout = () => {
    const quantity = parseInt(checkoutQuantity);
    
    if (!quantity || quantity <= 0) {
      Alert.alert('Invalid Quantity', 'Please enter a valid quantity to checkout.');
      return;
    }
    
    if (quantity > selectedItem.currentQuantity) {
      Alert.alert('Insufficient Stock', `Only ${selectedItem.currentQuantity} items available in stock.`);
      return;
    }

    const existingItemIndex = checkoutItems.findIndex(item => item.id === selectedItem.id);
    
    if (existingItemIndex >= 0) {
      // Update existing item quantity
      const updatedItems = [...checkoutItems];
      const totalQuantity = updatedItems[existingItemIndex].checkoutQuantity + quantity;
      
      if (totalQuantity > selectedItem.currentQuantity) {
        Alert.alert('Insufficient Stock', `Total checkout quantity would exceed available stock (${selectedItem.currentQuantity}).`);
        return;
      }
      
      updatedItems[existingItemIndex].checkoutQuantity = totalQuantity;
      setCheckoutItems(updatedItems);
    } else {
      // Add new item to checkout
      setCheckoutItems(prev => [...prev, {
        ...selectedItem,
        checkoutQuantity: quantity
      }]);
    }
    
    setQuantityModalVisible(false);
    setSelectedItem(null);
    setCheckoutQuantity('1');
  };

  // Remove item from checkout list
  const removeFromCheckout = (itemId) => {
    setCheckoutItems(prev => prev.filter(item => item.id !== itemId));
  };

  // Multi-checkout functions
  const toggleMultiCheckoutMode = () => {
    setMultiCheckoutMode(!multiCheckoutMode);
    if (multiCheckoutMode) {
      setSelectedForCheckout([]);
      setMultiCheckoutQuantities({});
    }
  };

  const toggleItemForCheckout = (item) => {
    setSelectedForCheckout(prev => {
      const isSelected = prev.some(selected => selected.id === item.id);
      if (isSelected) {
        // Remove item
        const newQuantities = { ...multiCheckoutQuantities };
        delete newQuantities[item.id];
        setMultiCheckoutQuantities(newQuantities);
        return prev.filter(selected => selected.id !== item.id);
      } else {
        // Add item
        setMultiCheckoutQuantities(prev => ({
          ...prev,
          [item.id]: '1'
        }));
        return [...prev, item];
      }
    });
  };

  const updateMultiCheckoutQuantity = (itemId, quantity) => {
    setMultiCheckoutQuantities(prev => ({
      ...prev,
      [itemId]: quantity
    }));
  };

  const addMultipleToCheckout = () => {
    if (selectedForCheckout.length === 0) {
      Alert.alert('No Items Selected', 'Please select at least one item to checkout.');
      return;
    }

    let hasErrors = false;
    const validItems = [];

    for (const item of selectedForCheckout) {
      const quantity = parseInt(multiCheckoutQuantities[item.id]) || 1;
      
      if (quantity <= 0) {
        Alert.alert('Invalid Quantity', `Invalid quantity for ${item.productName}. Please enter a valid quantity.`);
        hasErrors = true;
        break;
      }
      
      if (quantity > item.currentQuantity) {
        Alert.alert('Insufficient Stock', `Only ${item.currentQuantity} items available for ${item.productName}.`);
        hasErrors = true;
        break;
      }

      // Check if item already exists in checkout list
      const existingItemIndex = checkoutItems.findIndex(checkoutItem => checkoutItem.id === item.id);
      
      if (existingItemIndex >= 0) {
        const totalQuantity = checkoutItems[existingItemIndex].checkoutQuantity + quantity;
        
        if (totalQuantity > item.currentQuantity) {
          Alert.alert('Insufficient Stock', `Total checkout quantity would exceed available stock for ${item.productName} (${item.currentQuantity} available).`);
          hasErrors = true;
          break;
        }
        
        // Update existing item
        const updatedItems = [...checkoutItems];
        updatedItems[existingItemIndex].checkoutQuantity = totalQuantity;
        validItems.push(() => setCheckoutItems(updatedItems));
      } else {
        // Add new item
        validItems.push(() => setCheckoutItems(prev => [...prev, {
          ...item,
          checkoutQuantity: quantity
        }]));
      }
    }

    if (!hasErrors) {
      // Apply all updates
      validItems.forEach(updateFn => updateFn());
      
      // Reset multi-checkout state
      setSelectedForCheckout([]);
      setMultiCheckoutQuantities({});
      setMultiCheckoutMode(false);
      
      Alert.alert('Success', `Added ${selectedForCheckout.length} items to checkout list.`);
    }
  };

  // Process checkout - update inventory quantities
  const processCheckout = async () => {
    if (checkoutItems.length === 0) {
      Alert.alert('No Items', 'Please select items to checkout first.');
      return;
    }

    Alert.alert(
      'Confirm Checkout',
      `Are you sure you want to checkout ${checkoutItems.length} item(s)?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Checkout', onPress: performCheckout }
      ]
    );
  };

  const performCheckout = async () => {
    setProcessingCheckout(true);
    
    try {
      // Update each item's quantity in Firestore
      for (const checkoutItem of checkoutItems) {
        const newQuantity = checkoutItem.currentQuantity - checkoutItem.checkoutQuantity;
        
        await updateDoc(doc(db, 'inventory', checkoutItem.id), {
          currentQuantity: newQuantity,
          lastUpdated: Timestamp.now(),
        });
      }
      
      // Log checkout transaction
      await addDoc(collection(db, 'transactions'), {
        type: 'checkout',
        items: checkoutItems.map(item => ({
          productName: item.productName,
          barcode: item.barcode,
          quantity: item.checkoutQuantity,
          itemId: item.id
        })),
        totalItems: checkoutItems.reduce((sum, item) => sum + item.checkoutQuantity, 0),
        userId: user?.uid,
        timestamp: Timestamp.now(),
      });

      Alert.alert('Success', 'Items checked out successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
      
      setCheckoutItems([]);
      
    } catch (error) {
      console.error('Checkout error:', error);
      Alert.alert('Error', 'Failed to process checkout. Please try again.');
    } finally {
      setProcessingCheckout(false);
    }
  };

  const renderCheckoutItem = ({ item }) => (
    <Card style={styles.checkoutItemCard}>
      <Card.Content style={styles.checkoutItemContent}>
        <View style={styles.checkoutItemInfo}>
          <Title style={styles.checkoutItemName} numberOfLines={1}>
            {item.productName}
          </Title>
          <Paragraph style={styles.checkoutItemDetails}>
            Checkout: {item.checkoutQuantity} / {item.currentQuantity} available
          </Paragraph>
        </View>
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => removeFromCheckout(item.id)}
        >
          <Text style={styles.removeButtonText}>✕</Text>
        </TouchableOpacity>
      </Card.Content>
    </Card>
  );

  const renderInventoryItem = ({ item, index }) => {
    const isSelected = multiCheckoutMode && selectedForCheckout.some(selected => selected.id === item.id);
    
    return (
      <Animated.View
        style={[
          styles.itemContainer,
          {
            opacity: fadeAnim,
            transform: [{
              translateY: fadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [50, 0],
              })
            }]
          }
        ]}
      >
        <TouchableOpacity
          onPress={() => multiCheckoutMode ? toggleItemForCheckout(item) : handleItemSelect(item)}
          activeOpacity={0.7}
          disabled={item.currentQuantity === 0}
        >
          <Card style={[
            styles.itemCard, 
            item.currentQuantity === 0 && styles.outOfStockCard,
            isSelected && styles.selectedItemCard
          ]}>
            <Card.Content style={styles.cardContent}>
              {multiCheckoutMode && (
                <View style={styles.multiCheckoutHeader}>
                  <View style={[
                    styles.checkbox, 
                    isSelected && styles.checkedBox
                  ]}>
                    {isSelected && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                </View>
              )}
              
              <View style={styles.itemHeader}>
                <View style={styles.itemTitleSection}>
                  <View style={styles.titleContainer}>
                    <Title style={styles.itemTitle} numberOfLines={1}>
                      {item.productName}
                    </Title>
                    <Paragraph style={styles.itemBarcode}>
                      {item.barcode || 'No barcode'}
                    </Paragraph>
                  </View>
                </View>
                <Badge
                  style={[styles.stockBadge, { 
                    backgroundColor: item.currentQuantity > item.minStockLevel 
                      ? colors.success 
                      : item.currentQuantity > 0 
                        ? colors.warning 
                        : colors.danger 
                  }]}
                  size={8}
                />
              </View>

              <View style={styles.itemInfo}>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Stock:</Text>
                  <Text style={styles.infoText}>
                    {item.currentQuantity}/{item.minStockLevel}
                  </Text>
                </View>
                
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Location:</Text>
                  <Text style={styles.infoText} numberOfLines={1}>
                    {item.location || 'No location'}
                  </Text>
                </View>
              </View>

              {isSelected && multiCheckoutMode && (
                <View style={styles.quantityInputContainer}>
                  <Text style={styles.quantityLabel}>Quantity:</Text>
                  <CustomTextInput
                    value={multiCheckoutQuantities[item.id] || '1'}
                    onChangeText={(text) => updateMultiCheckoutQuantity(item.id, text)}
                    mode="outlined"
                    keyboardType="numeric"
                    style={styles.multiQuantityInput}
                    outlineColor={colors.borderLight}
                    activeOutlineColor={colors.primary}
                    dense
                    right={null}
                  />
                </View>
              )}

              {item.currentQuantity === 0 && (
                <Chip 
                  mode="flat" 
                  style={styles.outOfStockChip}
                  textStyle={styles.outOfStockChipText}
                  compact
                >
                  Out of Stock
                </Chip>
              )}
            </Card.Content>
          </Card>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const totalCheckoutItems = checkoutItems.reduce((sum, item) => sum + item.checkoutQuantity, 0);

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search items to checkout..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchbar}
          inputStyle={styles.searchInput}
        />
      </View>
      
      {/* Filter Chips */}
      <View style={styles.filterContainer}>
        <Chip
          selected={filter === 'all'}
          onPress={() => setFilter('all')}
          style={[styles.filterChip, filter === 'all' && styles.selectedFilterChip]}
          textStyle={filter === 'all' ? styles.selectedFilterText : styles.filterText}
        >
          All Items
        </Chip>
        <Chip
          selected={filter === 'in-stock'}
          onPress={() => setFilter('in-stock')}
          style={[styles.filterChip, filter === 'in-stock' && styles.selectedFilterChip]}
          textStyle={filter === 'in-stock' ? styles.selectedFilterText : styles.filterText}
        >
          In Stock
        </Chip>
        <Chip
          selected={filter === 'low-stock'}
          onPress={() => setFilter('low-stock')}
          style={[styles.filterChip, filter === 'low-stock' && styles.selectedFilterChip]}
          textStyle={filter === 'low-stock' ? styles.selectedFilterText : styles.filterText}
        >
          Low Stock
        </Chip>
      </View>

      {/* Multi-Checkout Controls */}
      <View style={styles.multiCheckoutHeader}>
        <Button
          mode={multiCheckoutMode ? "contained" : "outlined"}
          onPress={toggleMultiCheckoutMode}
          style={styles.multiCheckoutToggle}
          buttonColor={multiCheckoutMode ? colors.primary : colors.surface}
          textColor={multiCheckoutMode ? colors.white : colors.primary}
        >
          {multiCheckoutMode ? 'Exit Multi-Select' : 'Multi-Select'}
        </Button>
        
        {multiCheckoutMode && selectedForCheckout.length > 0 && (
          <Button
            mode="contained"
            onPress={addMultipleToCheckout}
            style={styles.addMultipleButton}
            buttonColor={colors.success}
          >
            Add {selectedForCheckout.length} Items
          </Button>
        )}
      </View>

      {/* Checkout Summary */}
      {checkoutItems.length > 0 && (
        <Surface style={styles.checkoutSummary}>
          <View style={styles.summaryHeader}>
            <Title style={styles.summaryTitle}>Checkout Items ({totalCheckoutItems})</Title>
          </View>
          <FlatList
            data={checkoutItems}
            renderItem={renderCheckoutItem}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.checkoutList}
          />
        </Surface>
      )}

      {/* Items List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Paragraph style={styles.loadingText}>Loading inventory...</Paragraph>
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          renderItem={renderInventoryItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Checkout FAB */}
      {checkoutItems.length > 0 && (
        <FAB
          style={[styles.fabCheckout, { backgroundColor: colors.success }]}
          label={`Checkout (${totalCheckoutItems})`}
          onPress={processCheckout}
          loading={processingCheckout}
          color={colors.white}
        />
      )}

      {/* Quantity Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={quantityModalVisible}
        onRequestClose={() => setQuantityModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Surface style={styles.modalSurface}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Title style={styles.modalTitle}>Checkout Quantity</Title>
                <Paragraph style={styles.modalSubtitle}>
                  {selectedItem?.productName}
                </Paragraph>
                <Paragraph style={styles.stockInfo}>
                  Available: {selectedItem?.currentQuantity} items
                </Paragraph>
              </View>

              <CustomTextInput
                label="Quantity to Checkout"
                value={checkoutQuantity}
                onChangeText={setCheckoutQuantity}
                mode="outlined"
                keyboardType="numeric"
                style={[styles.quantityInput, globalFormStyles.hideValidationIndicators]}
                outlineColor={colors.borderLight}
                activeOutlineColor={colors.primary}
                autoComplete="off"
                textContentType="none"
                autoCorrect={false}
                spellCheck={false}
                right={null}
              />

              <View style={styles.modalButtons}>
                <Button
                  mode="outlined"
                  onPress={() => setQuantityModalVisible(false)}
                  style={styles.cancelButton}
                  textColor={colors.textSecondary}
                >
                  Cancel
                </Button>
                <Button
                  mode="contained"
                  onPress={addToCheckout}
                  style={styles.addButton}
                  buttonColor={colors.primary}
                >
                  Add to Checkout
                </Button>
              </View>
            </View>
          </Surface>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  searchContainer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  searchbar: {
    backgroundColor: colors.surface,
    elevation: 0,
    borderRadius: borderRadius.md,
  },
  searchInput: {
    fontSize: typography.fontSize.md,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.xs,
  },
  filterChip: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  selectedFilterChip: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterText: {
    color: colors.textSecondary,
  },
  selectedFilterText: {
    color: colors.white,
  },
  checkoutSummary: {
    margin: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.successLight + '10',
    borderWidth: 1,
    borderColor: colors.success + '30',
  },
  summaryHeader: {
    marginBottom: spacing.sm,
  },
  summaryTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.success,
  },
  checkoutList: {
    maxHeight: 80,
  },
  checkoutItemCard: {
    marginRight: spacing.sm,
    minWidth: 200,
    backgroundColor: colors.surface,
  },
  checkoutItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  checkoutItemInfo: {
    flex: 1,
  },
  checkoutItemName: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: spacing.xs,
  },
  checkoutItemDetails: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
  },
  removeButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.danger + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeButtonText: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: 'bold',
  },
  listContainer: {
    paddingHorizontal: spacing.md,
    paddingBottom: 120,
  },
  itemContainer: {
    marginBottom: spacing.sm,
  },
  itemCard: {
    backgroundColor: colors.surface,
    ...shadows.small,
  },
  outOfStockCard: {
    opacity: 0.6,
  },
  cardContent: {
    paddingVertical: spacing.md,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  itemTitleSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  titleContainer: {
    flex: 1,
  },
  itemTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  itemBarcode: {
    fontSize: typography.fontSize.xs,
    color: colors.textLight,
  },
  stockBadge: {
    alignSelf: 'flex-start',
  },
  itemInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoItem: {
    flex: 1,
  },
  infoLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    fontWeight: typography.fontWeight.medium,
  },
  infoText: {
    fontSize: typography.fontSize.sm,
    color: colors.textPrimary,
    marginTop: spacing.xs,
  },
  outOfStockChip: {
    alignSelf: 'flex-start',
    backgroundColor: colors.danger + '20',
    marginTop: spacing.sm,
  },
  outOfStockChipText: {
    color: colors.danger,
    fontSize: typography.fontSize.xs,
  },
  multiCheckoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  multiCheckoutToggle: {
    borderColor: colors.primary,
  },
  addMultipleButton: {
    marginLeft: spacing.sm,
  },
  selectedItemCard: {
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.primary + '05',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.borderLight,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    top: -spacing.sm,
    right: -spacing.sm,
    zIndex: 1,
  },
  checkedBox: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkmark: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  quantityInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  quantityLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    marginRight: spacing.sm,
    minWidth: 60,
  },
  multiQuantityInput: {
    flex: 1,
    height: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    marginTop: spacing.md,
    color: colors.textSecondary,
  },
  fabCheckout: {
    position: 'absolute',
    margin: spacing.md,
    right: 0,
    bottom: 0,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: spacing.lg,
  },
  modalSurface: {
    borderRadius: borderRadius.lg,
    width: '100%',
    maxWidth: 400,
    overflow: 'hidden',
    ...shadows.large,
  },
  modalContent: {
    padding: spacing.lg,
  },
  modalHeader: {
    marginBottom: spacing.lg,
  },
  modalTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  modalSubtitle: {
    fontSize: typography.fontSize.md,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  stockInfo: {
    fontSize: typography.fontSize.sm,
    color: colors.primary,
    fontWeight: typography.fontWeight.medium,
  },
  quantityInput: {
    marginBottom: spacing.lg,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  cancelButton: {
    flex: 1,
    borderColor: colors.border,
  },
  addButton: {
    flex: 1,
  },
});

export default CheckoutScreen;
import React, { useEffect, useState } from 'react';
import { View, FlatList, StyleSheet, Alert, Animated, TouchableOpacity, Modal, Share } from 'react-native';
import { 
  Searchbar, 
  List, 
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
import { colors, spacing, borderRadius, typography, shadows, statusColors } from '../constants/theme';
import { globalFormStyles } from '../styles/globalFormFixes';

const InventoryListScreen = ({ navigation, route }) => {
  const dispatch = useDispatch();
  const { items, loading } = useSelector((state) => state.inventory);
  const { user } = useSelector((state) => state.auth);
  const { locations } = useSelector((state) => state.locations);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState(route.params?.filter || 'all');
  const [selectedLocationId, setSelectedLocationId] = useState(route.params?.locationId || '');
  const showCheckoutMode = route.params?.showCheckoutMode || false;
  const [fadeAnim] = useState(new Animated.Value(0));
  
  // Quick Actions Modal State
  const [quickActionsVisible, setQuickActionsVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [adjustmentQuantity, setAdjustmentQuantity] = useState('1');
  const [adjustmentLoading, setAdjustmentLoading] = useState(false);
  
  // Checkout Options Modal State
  const [checkoutOptionsVisible, setCheckoutOptionsVisible] = useState(false);
  
  // Add Item Options Modal State
  const [addItemOptionsVisible, setAddItemOptionsVisible] = useState(false);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    // Auto-show checkout info when coming from dashboard
    if (showCheckoutMode) {
      Alert.alert(
        'Manual Checkout Mode',
        'Long-press any item to checkout (remove from inventory), or use the regular checkout button for existing items.',
        [{ text: 'Got it!' }]
      );
    }
  }, [showCheckoutMode]);

  // Inventory data is now managed globally in AppNavigator
  // No need for a local listener here

  const handleItemLongPress = (item) => {
    setSelectedItem(item);
    setQuickActionsVisible(true);
    setAdjustmentQuantity('1');
  };

  const handleStockAdjustment = async (type) => {
    if (!adjustmentQuantity.trim() || isNaN(parseInt(adjustmentQuantity)) || parseInt(adjustmentQuantity) <= 0) {
      Alert.alert('Invalid Quantity', 'Please enter a valid positive number');
      return;
    }

    const quantityChange = parseInt(adjustmentQuantity);
    const newQuantity = type === 'in' 
      ? selectedItem.currentQuantity + quantityChange
      : selectedItem.currentQuantity - quantityChange;

    if (newQuantity < 0) {
      Alert.alert('Invalid Operation', 'Not enough stock to check out this quantity');
      return;
    }

    setAdjustmentLoading(true);

    try {
      // Update inventory item
      const itemRef = doc(db, 'inventory', selectedItem.id);
      await updateDoc(itemRef, { 
        currentQuantity: newQuantity,
        lastUpdated: Timestamp.now()
      });

      // Log stock movement
      await addDoc(collection(db, 'stockLog'), {
        inventoryId: selectedItem.id,
        userId: user?.uid,
        userEmail: user?.email,
        changeType: type,
        quantityChanged: quantityChange,
        previousQuantity: selectedItem.currentQuantity,
        newQuantity: newQuantity,
        timestamp: Timestamp.now(),
        productName: selectedItem.productName,
      });

      Alert.alert(
        'Success',
        type === 'in' 
          ? `Checked in ${quantityChange} units\n\nNew quantity: ${newQuantity}`
          : `Checked out ${quantityChange} units of ${selectedItem.productName}\n\nRemaining quantity: ${newQuantity}`,
        [{ text: 'OK', onPress: () => setQuickActionsVisible(false) }]
      );
      
      setAdjustmentQuantity('1');
    } catch (error) {
      console.error('Error updating stock:', error);
      Alert.alert('Error', 'Failed to update stock. Please try again.');
    } finally {
      setAdjustmentLoading(false);
    }
  };

  const handleDeleteItem = async (itemId, itemName) => {
    Alert.alert(
      'Delete Item',
      `Are you sure you want to delete "${itemName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'inventory', itemId));
              Alert.alert('Success', 'Item deleted successfully');
            } catch (error) {
              console.error('Error deleting item:', error);
              Alert.alert('Error', 'Failed to delete item');
            }
          },
        },
      ]
    );
  };

  const getFilteredItems = () => {
    let filteredItems = items.filter((item) => {
      // Text search filter
      const matchesSearch = item.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.barcode?.includes(searchQuery) ||
        (item.locationName || item.location || '').toLowerCase().includes(searchQuery.toLowerCase());
      
      // Location filter
      const matchesLocation = !selectedLocationId || item.locationId === selectedLocationId;
      
      return matchesSearch && matchesLocation;
    });

    switch (filter) {
      case 'lowStock':
        filteredItems = filteredItems.filter(item => 
          item.currentQuantity <= item.minStockLevel
        );
        break;
      case 'expiring':
        filteredItems = filteredItems.filter(item => {
          if (!item.expiryDate) return false;
          const daysUntilExpiry = Math.ceil(
            (item.expiryDate - new Date()) / (1000 * 60 * 60 * 24)
          );
          return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
        });
        break;
      default:
        break;
    }

    return filteredItems.sort((a, b) => a.productName.localeCompare(b.productName));
  };

  const getItemStatus = (item) => {
    if (item.currentQuantity <= 0) {
      return { 
        icon: 'close-circle', 
        color: statusColors.outOfStock, 
        label: 'Out of Stock',
        bgColor: colors.dangerLight + '20' 
      };
    }
    if (item.currentQuantity <= item.minStockLevel) {
      return { 
        icon: 'alert-circle', 
        color: statusColors.lowStock, 
        label: 'Low Stock',
        bgColor: colors.warningLight + '20'
      };
    }
    if (item.expiryDate) {
      const daysUntilExpiry = Math.ceil(
        (item.expiryDate - new Date()) / (1000 * 60 * 60 * 24)
      );
      if (daysUntilExpiry <= 30 && daysUntilExpiry > 0) {
        return { 
          icon: 'clock-alert', 
          color: colors.warning, 
          label: `Expires in ${daysUntilExpiry}d`,
          bgColor: colors.warningLight + '15'
        };
      }
    }
    return { 
      icon: 'check-circle', 
      color: statusColors.inStock, 
      label: 'In Stock',
      bgColor: colors.successLight + '15'
    };
  };

  const formatExpiryDate = (expiryDate) => {
    if (!expiryDate) return 'No expiry';
    return expiryDate.toLocaleDateString();
  };

  const exportToCSV = async () => {
    try {
      const filteredItems = getFilteredItems();
      
      if (filteredItems.length === 0) {
        Alert.alert('No Data', 'No items to export');
        return;
      }

      // CSV Header
      let csvContent = 'Product Name,Barcode,Current Quantity,Min Stock Level,Location,Expiry Date,Status\n';
      
      // CSV Data
      filteredItems.forEach(item => {
        const status = getItemStatus(item);
        const escapedName = `"${item.productName.replace(/"/g, '""')}"`;
        const barcode = item.barcode || '';
        const location = item.locationName || item.location || '';
        const expiryDate = formatExpiryDate(item.expiryDate);
        
        csvContent += `${escapedName},${barcode},${item.currentQuantity},${item.minStockLevel},"${location}","${expiryDate}","${status.label}"\n`;
      });

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `inventory_export_${timestamp}.csv`;
      
      await Share.share({
        message: csvContent,
        title: `Inventory Export - ${filename}`,
        subject: filename,
      });
      
    } catch (error) {
      console.error('Error exporting CSV:', error);
      Alert.alert('Export Error', 'Failed to export inventory data');
    }
  };

  const renderItem = ({ item, index }) => {
    const status = getItemStatus(item);
    
    return (
      <Animated.View 
        style={[
          {
            opacity: fadeAnim,
            transform: [{
              translateY: fadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [50, 0],
              }),
            }],
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => navigation.navigate('ItemDetail', { item })}
          onLongPress={() => handleItemLongPress(item)}
          activeOpacity={0.7}
        >
          <Card style={[styles.itemCard, { backgroundColor: status.bgColor }]}>
            <Card.Content style={styles.cardContent}>
              {/* Header Row */}
              <View style={styles.itemHeader}>
                <View style={styles.itemTitleSection}>
                  <TouchableOpacity
                    icon={status.icon}
                    size={24}
                    
                    style={styles.statusIcon}
                  />
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
                  style={[styles.statusBadge, { backgroundColor: status.color }]}
                  size={8}
                />
              </View>

              {/* Info Row */}
              <View style={styles.itemInfo}>
                <View style={styles.infoItem}>
                  <TouchableOpacity  size={16}  style={styles.infoIcon} />
                  <Text style={styles.infoText}>
                    {item.currentQuantity}/{item.minStockLevel}
                  </Text>
                </View>
                
                <View style={styles.infoItem}>
                  <TouchableOpacity  size={16}  style={styles.infoIcon} />
                  <Text style={styles.infoText} numberOfLines={1}>
                    {item.locationName || item.location || 'No location'}
                  </Text>
                </View>
                
                <View style={styles.infoItem}>
                  <TouchableOpacity  size={16}  style={styles.infoIcon} />
                  <Text style={[styles.infoText, styles.expiryText]} numberOfLines={1}>
                    {formatExpiryDate(item.expiryDate)}
                  </Text>
                </View>
              </View>

              {/* Status Label */}
              <View style={styles.statusRow}>
                <Chip 
                  mode="flat" 
                  style={[styles.statusChip, { backgroundColor: status.color + '20' }]}
                  textStyle={[styles.statusChipText, { color: status.color }]}
                  compact
                >
                  {status.label}
                </Chip>
                <TouchableOpacity
                  
                  size={20}
                  
                  style={styles.chevronIcon}
                />
              </View>
            </Card.Content>
          </Card>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading inventory...</Text>
      </View>
    );
  }

  const filteredItems = getFilteredItems();

  // Count items for filter chips (considering location filter)
  const locationFilteredItems = selectedLocationId 
    ? items.filter(item => item.locationId === selectedLocationId)
    : items;
    
  const lowStockCount = locationFilteredItems.filter(item => item.currentQuantity <= item.minStockLevel).length;
  const expiringCount = locationFilteredItems.filter(item => {
    if (!item.expiryDate) return false;
    const daysUntilExpiry = Math.ceil(
      (item.expiryDate - new Date()) / (1000 * 60 * 60 * 24)
    );
    return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
  }).length;

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search by name, barcode, location..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchbar}
          inputStyle={styles.searchInput}
          
        />
      </View>
      
      {/* Location Filter */}
      {locations.length > 0 && (
        <View style={styles.locationContainer}>
          <Text style={styles.locationLabel}>Filter by Location:</Text>
          <View style={styles.locationScroll}>
            <TouchableOpacity
              style={[
                styles.locationChip,
                !selectedLocationId && styles.selectedLocationChip
              ]}
              onPress={() => setSelectedLocationId('')}
            >
              <Text style={[
                styles.locationChipText,
                !selectedLocationId && styles.selectedLocationChipText
              ]}>
                All Locations
              </Text>
            </TouchableOpacity>
            {locations.map((location) => (
              <TouchableOpacity
                key={location.id}
                style={[
                  styles.locationChip,
                  selectedLocationId === location.id && styles.selectedLocationChip
                ]}
                onPress={() => setSelectedLocationId(location.id)}
              >
                <Text style={[
                  styles.locationChipText,
                  selectedLocationId === location.id && styles.selectedLocationChipText
                ]}>
                  {location.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
      
      {/* Filter Chips */}
      <View style={styles.filterContainer}>
        <Chip
          selected={filter === 'all'}
          onPress={() => setFilter('all')}
          style={[styles.filterChip, filter === 'all' && styles.selectedChip]}
          textStyle={filter === 'all' ? styles.selectedChipText : styles.chipText}
          mode={filter === 'all' ? 'flat' : 'outlined'}
        >
          All ({locationFilteredItems.length})
        </Chip>
        <Chip
          selected={filter === 'lowStock'}
          onPress={() => setFilter('lowStock')}
          style={[styles.filterChip, filter === 'lowStock' && styles.selectedChip]}
          textStyle={filter === 'lowStock' ? styles.selectedChipText : styles.chipText}
          mode={filter === 'lowStock' ? 'flat' : 'outlined'}
        >
          Low Stock ({lowStockCount})
        </Chip>
        <Chip
          selected={filter === 'expiring'}
          onPress={() => setFilter('expiring')}
          style={[styles.filterChip, filter === 'expiring' && styles.selectedChip]}
          textStyle={filter === 'expiring' ? styles.selectedChipText : styles.chipText}
          mode={filter === 'expiring' ? 'flat' : 'outlined'}
        >
          Expiring ({expiringCount})
        </Chip>
      </View>
      
      {/* Export Button */}
      <View style={styles.exportContainer}>
        <Button
          mode="outlined"
          compact
          onPress={exportToCSV}
          style={styles.exportButton}
          contentStyle={styles.exportButtonContent}
        >
          Export CSV
        </Button>
      </View>

      {/* Content */}
      {filteredItems.length === 0 ? (
        <View style={styles.emptyContainer}>
          <TouchableOpacity
            icon={searchQuery ? 'magnify-close' : 'package-variant-closed'}
            size={64}
            
            style={styles.emptyIcon}
          />
          <Title style={styles.emptyTitle}>
            {searchQuery ? 'No items found' : 'No inventory items'}
          </Title>
          <Paragraph style={styles.emptySubtext}>
            {searchQuery 
              ? 'Try adjusting your search terms or filters' 
              : 'Tap the + button to add your first item'
            }
          </Paragraph>
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}

      {/* Floating Action Buttons */}
      <TouchableOpacity
        style={[styles.fabAdd, { backgroundColor: colors.primary }]}
        onPress={() => setAddItemOptionsVisible(true)}
        activeOpacity={0.8}
      >
        <Text style={styles.fabIcon}>+</Text>
        <Text style={styles.fabLabel}>Add Item</Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.fabScan, { backgroundColor: colors.danger }]}
        onPress={() => setCheckoutOptionsVisible(true)}
        activeOpacity={0.8}
      >
        <Text style={styles.fabIcon}>📦</Text>
        <Text style={styles.fabLabel}>Checkout</Text>
      </TouchableOpacity>

      {/* Quick Actions Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={quickActionsVisible}
        onRequestClose={() => setQuickActionsVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Surface style={styles.modalSurface}>
            <View style={styles.modalContent}>
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <View style={styles.modalHeaderContent}>
                  <TouchableOpacity
                    
                    size={32}
                    
                    style={styles.modalHeaderIcon}
                  />
                  <View style={styles.modalHeaderText}>
                    <Title style={styles.modalTitle}>Quick Actions</Title>
                    <Paragraph style={styles.modalSubtitle}>
                      Adjust stock for {selectedItem?.productName}
                    </Paragraph>
                  </View>
                </View>
              </View>
              
              {/* Current Stock Info */}
              <View style={styles.stockInfo}>
                <Title style={styles.currentStockTitle}>Current Stock</Title>
                <Title style={[styles.currentStockValue, { color: colors.primary }]}>
                  {selectedItem?.currentQuantity} units
                </Title>
              </View>

              {/* Quantity Input */}
              <View style={[styles.quantitySection, globalFormStyles.formContainer]}>
                <Paragraph style={styles.quantityLabel}>Adjustment Quantity</Paragraph>
                <CustomTextInput
                  value={adjustmentQuantity}
                  onChangeText={setAdjustmentQuantity}
                  mode="outlined"
                  keyboardType="numeric"
                  style={[styles.quantityInput, globalFormStyles.hideValidationIndicators]}
                  left={<TextInput.Icon  />}
                  outlineColor={colors.borderLight}
                  activeOutlineColor={colors.primary}
                  autoComplete="off"
                  textContentType="none"
                  autoCorrect={false}
                  spellCheck={false}
                  right={null}
                />
              </View>

              {/* Action Buttons */}
              <View style={styles.modalActions}>
                <Button
                  mode="contained"
                  onPress={() => handleStockAdjustment('in')}
                  loading={adjustmentLoading && 'in'}
                  disabled={adjustmentLoading}
                  style={[styles.actionButton, styles.checkInButton]}
                  buttonColor={colors.success}
                  
                >
                  Check In
                </Button>

                <Button
                  mode="contained"
                  onPress={() => handleStockAdjustment('out')}
                  loading={adjustmentLoading && 'out'}
                  disabled={adjustmentLoading}
                  style={[styles.actionButton, styles.checkOutButton]}
                  buttonColor={colors.danger}
                  
                >
                  Checkout
                </Button>
              </View>

              {/* Additional Actions */}
              <View style={styles.additionalActions}>
                <Button
                  mode="outlined"
                  onPress={() => {
                    setQuickActionsVisible(false);
                    navigation.navigate('ItemDetail', { item: selectedItem });
                  }}
                  disabled={adjustmentLoading}
                  style={styles.editButton}
                  textColor={colors.primary}
                  
                >
                  Edit Item
                </Button>

                <Button
                  mode="text"
                  onPress={() => {
                    setQuickActionsVisible(false);
                    handleDeleteItem(selectedItem?.id, selectedItem?.productName);
                  }}
                  disabled={adjustmentLoading}
                  textColor={colors.danger}
                  
                >
                  Delete
                </Button>
              </View>

              <Button
                mode="text"
                onPress={() => setQuickActionsVisible(false)}
                disabled={adjustmentLoading}
                style={styles.cancelButton}
                textColor={colors.textSecondary}
              >
                Cancel
              </Button>
            </View>
          </Surface>
        </View>
      </Modal>

      {/* Checkout Options Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={checkoutOptionsVisible}
        onRequestClose={() => setCheckoutOptionsVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Surface style={styles.modalSurface}>
            <View style={styles.modalContent}>
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <View style={styles.modalHeaderContent}>
                  <View style={styles.modalHeaderIcon}>
                    <Text style={styles.checkoutIcon}>📤</Text>
                  </View>
                  <View style={styles.modalHeaderText}>
                    <Title style={styles.modalTitle}>Checkout Options</Title>
                    <Paragraph style={styles.modalSubtitle}>
                      Choose how you'd like to checkout items
                    </Paragraph>
                  </View>
                </View>
              </View>

              {/* Options */}
              <View style={styles.checkoutOptionsContainer}>
                <TouchableOpacity 
                  style={styles.checkoutOption}
                  onPress={() => {
                    setCheckoutOptionsVisible(false);
                    navigation.navigate('Scanner');
                  }}
                >
                  <View style={styles.optionIconContainer}>
                    <Text style={styles.optionIcon}>📱</Text>
                  </View>
                  <View style={styles.optionContent}>
                    <Title style={styles.optionTitle}>Scan Barcode</Title>
                    <Paragraph style={styles.optionDescription}>
                      Use camera to scan item barcodes for quick checkout
                    </Paragraph>
                  </View>
                  <Text style={styles.optionChevron}>›</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.checkoutOption}
                  onPress={() => {
                    setCheckoutOptionsVisible(false);
                    navigation.navigate('Checkout');
                  }}
                >
                  <View style={styles.optionIconContainer}>
                    <Text style={styles.optionIcon}>📋</Text>
                  </View>
                  <View style={styles.optionContent}>
                    <Title style={styles.optionTitle}>Manual Checkout</Title>
                    <Paragraph style={styles.optionDescription}>
                      Browse inventory list and manually select items to checkout
                    </Paragraph>
                  </View>
                  <Text style={styles.optionChevron}>›</Text>
                </TouchableOpacity>
              </View>

              <Button
                mode="text"
                onPress={() => setCheckoutOptionsVisible(false)}
                style={styles.cancelButton}
                textColor={colors.textSecondary}
              >
                Cancel
              </Button>
            </View>
          </Surface>
        </View>
      </Modal>

      {/* Add Item Options Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={addItemOptionsVisible}
        onRequestClose={() => setAddItemOptionsVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Surface style={styles.modalSurface}>
            <View style={styles.modalContent}>
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <View style={styles.modalHeaderContent}>
                  <View style={styles.modalHeaderIcon}>
                    <Text style={styles.addItemIcon}>📦</Text>
                  </View>
                  <View style={styles.modalHeaderText}>
                    <Title style={styles.modalTitle}>Add Item</Title>
                    <Paragraph style={styles.modalSubtitle}>
                      Choose how you'd like to add a new item
                    </Paragraph>
                  </View>
                </View>
              </View>

              {/* Options */}
              <View style={styles.addItemOptionsContainer}>
                <TouchableOpacity 
                  style={styles.addItemOption}
                  onPress={() => {
                    setAddItemOptionsVisible(false);
                    navigation.navigate('Scanner');
                  }}
                >
                  <View style={styles.optionIconContainer}>
                    <Text style={styles.optionIcon}>📱</Text>
                  </View>
                  <View style={styles.optionContent}>
                    <Title style={styles.optionTitle}>Scan Barcode</Title>
                    <Paragraph style={styles.optionDescription}>
                      Use camera to scan barcode and auto-fill item details
                    </Paragraph>
                  </View>
                  <Text style={styles.optionChevron}>›</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.addItemOption}
                  onPress={() => {
                    setAddItemOptionsVisible(false);
                    navigation.navigate('ItemDetail');
                  }}
                >
                  <View style={styles.optionIconContainer}>
                    <Text style={styles.optionIcon}>✏️</Text>
                  </View>
                  <View style={styles.optionContent}>
                    <Title style={styles.optionTitle}>Manual Entry</Title>
                    <Paragraph style={styles.optionDescription}>
                      Manually enter all item details using a form
                    </Paragraph>
                  </View>
                  <Text style={styles.optionChevron}>›</Text>
                </TouchableOpacity>
              </View>

              <Button
                mode="text"
                onPress={() => setAddItemOptionsVisible(false)}
                style={styles.cancelButton}
                textColor={colors.textSecondary}
              >
                Cancel
              </Button>
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
    borderRadius: borderRadius.lg,
    ...shadows.small,
  },
  searchInput: {
    fontSize: typography.fontSize.md,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  exportContainer: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    alignItems: 'flex-end',
  },
  exportButton: {
    borderColor: colors.success || '#4caf50',
    minWidth: 100,
  },
  exportButtonContent: {
    height: 36,
    paddingHorizontal: 16,
  },
  filterChip: {
    borderRadius: borderRadius.lg,
    borderColor: colors.border,
  },
  selectedChip: {
    backgroundColor: colors.primary,
  },
  chipText: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.sm,
  },
  selectedChipText: {
    color: colors.white,
    fontWeight: typography.fontWeight.medium,
  },
  list: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  listContent: {
    paddingBottom: 120, // Space for FABs
    paddingTop: spacing.sm,
  },
  separator: {
    height: spacing.sm,
  },
  itemCard: {
    borderRadius: borderRadius.lg,
    ...shadows.small,
    backgroundColor: colors.surface,
  },
  cardContent: {
    padding: spacing.md,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  itemTitleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusIcon: {
    margin: 0,
    marginRight: spacing.sm,
  },
  titleContainer: {
    flex: 1,
  },
  itemTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    lineHeight: typography.lineHeight.tight * typography.fontSize.md,
  },
  itemBarcode: {
    fontSize: typography.fontSize.xs,
    color: colors.textLight,
    fontFamily: 'monospace',
  },
  statusBadge: {
    marginTop: spacing.xs,
  },
  itemInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.xs,
  },
  infoIcon: {
    margin: 0,
    marginRight: spacing.xs,
  },
  infoText: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    fontWeight: typography.fontWeight.medium,
    flex: 1,
  },
  expiryText: {
    color: colors.textLight,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusChip: {
    borderRadius: borderRadius.md,
  },
  statusChipText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
  },
  chevronIcon: {
    margin: 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: spacing.md,
    color: colors.textSecondary,
    fontSize: typography.fontSize.md,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
  },
  emptyIcon: {
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontSize: typography.fontSize.xl,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.sm,
    fontWeight: typography.fontWeight.semibold,
  },
  emptySubtext: {
    fontSize: typography.fontSize.md,
    color: colors.textLight,
    textAlign: 'center',
    lineHeight: typography.lineHeight.relaxed * typography.fontSize.md,
  },
  fabAdd: {
    position: 'absolute',
    margin: spacing.md,
    right: 0,
    bottom: 0,
    width: 80,
    height: 64,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.large,
  },
  fabScan: {
    position: 'absolute',
    margin: spacing.md,
    right: 0,
    bottom: 80,
    width: 80,
    height: 64,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.large,
  },
  fabIcon: {
    fontSize: 20,
    color: colors.white,
    marginBottom: 2,
  },
  fabLabel: {
    fontSize: 10,
    color: colors.white,
    fontWeight: typography.fontWeight.medium,
    textAlign: 'center',
  },
  // Quick Actions Modal Styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: spacing.md,
  },
  modalSurface: {
    width: '100%',
    maxWidth: 400,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.surface,
    ...shadows.large,
  },
  modalContent: {
    padding: spacing.xl,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  modalHeaderIcon: {
    margin: 0,
    marginRight: spacing.md,
    backgroundColor: colors.primaryLight + '20',
  },
  modalHeaderText: {
    flex: 1,
  },
  modalTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  modalSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
  stockInfo: {
    alignItems: 'center',
    backgroundColor: colors.lightGray,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  currentStockTitle: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  currentStockValue: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
  },
  quantitySection: {
    marginBottom: spacing.lg,
  },
  quantityLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  quantityInput: {
    backgroundColor: colors.surface,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  actionButton: {
    flex: 1,
    borderRadius: borderRadius.lg,
  },
  checkInButton: {
    // Styles handled by buttonColor prop
  },
  checkOutButton: {
    // Styles handled by buttonColor prop
  },
  additionalActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  editButton: {
    flex: 1,
    borderColor: colors.primary,
  },
  cancelButton: {
    alignSelf: 'center',
  },
  // Checkout Options Modal Styles
  checkoutIcon: {
    fontSize: 24,
    textAlign: 'center',
  },
  checkoutOptionsContainer: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  checkoutOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  // Add Item Options Modal Styles
  addItemIcon: {
    fontSize: 24,
    textAlign: 'center',
  },
  addItemOptionsContainer: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  addItemOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  optionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryLight + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  optionIcon: {
    fontSize: 24,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  optionDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    lineHeight: typography.lineHeight.relaxed * typography.fontSize.sm,
  },
  optionChevron: {
    fontSize: 24,
    color: colors.textLight,
    marginLeft: spacing.sm,
  },
  // Location Filter Styles
  locationContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  locationLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  locationScroll: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  locationChip: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: spacing.xs,
  },
  selectedLocationChip: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  locationChipText: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
  selectedLocationChipText: {
    color: colors.white,
    fontWeight: typography.fontWeight.medium,
  },
});

export default InventoryListScreen;
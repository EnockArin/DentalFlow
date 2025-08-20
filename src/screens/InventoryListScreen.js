import React, { useEffect, useState } from 'react';
import { View, FlatList, StyleSheet, Alert, Animated, TouchableOpacity, Modal } from 'react-native';
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
  IconButton,
  Badge,
  Surface,
  TextInput,
  Button
} from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { deleteDoc, doc, updateDoc, addDoc, collection, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { colors, spacing, borderRadius, typography, shadows, statusColors } from '../constants/theme';

const InventoryListScreen = ({ navigation, route }) => {
  const dispatch = useDispatch();
  const { items, loading } = useSelector((state) => state.inventory);
  const { user } = useSelector((state) => state.auth);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState(route.params?.filter || 'all');
  const showCheckoutMode = route.params?.showCheckoutMode || false;
  const [fadeAnim] = useState(new Animated.Value(0));
  
  // Quick Actions Modal State
  const [quickActionsVisible, setQuickActionsVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [adjustmentQuantity, setAdjustmentQuantity] = useState('1');
  const [adjustmentLoading, setAdjustmentLoading] = useState(false);

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
    let filteredItems = items.filter((item) =>
      item.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.barcode?.includes(searchQuery) ||
      item.location?.toLowerCase().includes(searchQuery.toLowerCase())
    );

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
                  <IconButton
                    icon={status.icon}
                    size={24}
                    iconColor={status.color}
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
                  <IconButton icon="package" size={16} iconColor={colors.textSecondary} style={styles.infoIcon} />
                  <Text style={styles.infoText}>
                    {item.currentQuantity}/{item.minStockLevel}
                  </Text>
                </View>
                
                <View style={styles.infoItem}>
                  <IconButton icon="map-marker" size={16} iconColor={colors.textSecondary} style={styles.infoIcon} />
                  <Text style={styles.infoText} numberOfLines={1}>
                    {item.location || 'No location'}
                  </Text>
                </View>
                
                <View style={styles.infoItem}>
                  <IconButton icon="calendar" size={16} iconColor={colors.textSecondary} style={styles.infoIcon} />
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
                <IconButton
                  icon="chevron-right"
                  size={20}
                  iconColor={colors.textSecondary}
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

  const lowStockCount = items.filter(item => item.currentQuantity <= item.minStockLevel).length;
  const expiringCount = items.filter(item => {
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
          icon="magnify"
          clearIcon="close"
          traileringIcon={() => (
            <IconButton
              icon="filter-variant"
              size={20}
              iconColor={colors.primary}
              onPress={() => {/* TODO: Add filter modal */}}
            />
          )}
        />
      </View>
      
      {/* Filter Chips */}
      <View style={styles.filterContainer}>
        <Chip
          selected={filter === 'all'}
          onPress={() => setFilter('all')}
          style={[styles.filterChip, filter === 'all' && styles.selectedChip]}
          textStyle={filter === 'all' ? styles.selectedChipText : styles.chipText}
          mode={filter === 'all' ? 'flat' : 'outlined'}
        >
          All ({items.length})
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

      {/* Content */}
      {filteredItems.length === 0 ? (
        <View style={styles.emptyContainer}>
          <IconButton
            icon={searchQuery ? 'magnify-close' : 'package-variant-closed'}
            size={64}
            iconColor={colors.textLight}
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
      <FAB
        style={[styles.fabAdd, { backgroundColor: colors.primary }]}
        icon="plus"
        onPress={() => navigation.navigate('ItemDetail')}
        color={colors.white}
      />
      
      <FAB
        style={[styles.fabScan, { backgroundColor: colors.secondary }]}
        icon="barcode-scan"
        onPress={() => navigation.navigate('Scanner')}
        color={colors.white}
      />

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
                  <IconButton
                    icon="package"
                    size={32}
                    iconColor={colors.primary}
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
              <View style={styles.quantitySection}>
                <Paragraph style={styles.quantityLabel}>Adjustment Quantity</Paragraph>
                <TextInput
                  value={adjustmentQuantity}
                  onChangeText={setAdjustmentQuantity}
                  mode="outlined"
                  keyboardType="numeric"
                  style={styles.quantityInput}
                  left={<TextInput.Icon icon="counter" />}
                  outlineColor={colors.borderLight}
                  activeOutlineColor={colors.primary}
                  autoComplete="new-password"
                  textContentType="oneTimeCode"
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
                  icon="plus"
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
                  icon="cart-remove"
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
                  icon="pencil"
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
                  icon="delete"
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
    borderRadius: borderRadius.round,
    ...shadows.large,
  },
  fabScan: {
    position: 'absolute',
    margin: spacing.md,
    right: 0,
    bottom: 80,
    borderRadius: borderRadius.round,
    ...shadows.large,
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
});

export default InventoryListScreen;
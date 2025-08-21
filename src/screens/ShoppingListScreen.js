import React, { useState, useEffect } from 'react';
import { View, FlatList, StyleSheet, Share, Alert, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { 
  List, 
  Text, 
  Card, 
  Button, 
  Chip,
  ActivityIndicator,
  Divider,
  FAB,
  Surface,
  Title,
  Paragraph,
  Searchbar,
  TextInput
} from 'react-native-paper';
import CustomTextInput from '../components/common/CustomTextInput';
import { useSelector } from 'react-redux';
import { colors } from '../constants/theme';

const ShoppingListScreen = ({ navigation }) => {
  const { items, loading } = useSelector((state) => state.inventory);
  
  // Shopping list states
  const [manualItems, setManualItems] = useState([]); // Manually added items
  const [addItemModalVisible, setAddItemModalVisible] = useState(false);
  const [inventoryModalVisible, setInventoryModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [newItemName, setNewItemName] = useState('');
  const [newItemQuantity, setNewItemQuantity] = useState('1');
  const [newItemNotes, setNewItemNotes] = useState('');
  
  // Filter items where current quantity is at or below minimum stock level
  const lowStockItems = items.filter(item => 
    item.currentQuantity <= item.minStockLevel
  );

  const totalLowStockValue = lowStockItems.length;
  const criticalItems = lowStockItems.filter(item => 
    item.currentQuantity === 0
  );
  const urgentItems = lowStockItems.filter(item => 
    item.currentQuantity > 0 && item.currentQuantity <= item.minStockLevel * 0.5
  );

  // Combine low stock items with manual items
  const combinedShoppingList = [
    ...lowStockItems.map(item => ({ ...item, type: 'lowstock' })),
    ...manualItems.map(item => ({ ...item, type: 'manual' }))
  ];

  // Functions for manual item management
  const addManualItem = () => {
    if (!newItemName.trim()) {
      Alert.alert('Invalid Input', 'Please enter an item name.');
      return;
    }

    const quantity = parseInt(newItemQuantity) || 1;
    const newItem = {
      id: `manual_${Date.now()}`,
      productName: newItemName.trim(),
      quantity: quantity,
      notes: newItemNotes.trim(),
      type: 'manual',
      dateAdded: new Date().toISOString()
    };

    setManualItems(prev => [...prev, newItem]);
    resetModalForms();
    setAddItemModalVisible(false);
  };

  const resetModalForms = () => {
    setNewItemName('');
    setNewItemQuantity('1');
    setNewItemNotes('');
    setSearchQuery('');
  };

  const handleCancelAddItem = () => {
    resetModalForms();
    setAddItemModalVisible(false);
  };

  const handleCancelInventoryModal = () => {
    resetModalForms();
    setInventoryModalVisible(false);
  };

  const removeManualItem = (itemId) => {
    setManualItems(prev => prev.filter(item => item.id !== itemId));
  };

  const addInventoryItemToList = (inventoryItem) => {
    // Check if already in manual list
    const existingManual = manualItems.find(item => 
      item.inventoryId === inventoryItem.id
    );
    
    if (existingManual) {
      Alert.alert('Already Added', 'This item is already in your shopping list.');
      return;
    }

    // Check if already in low stock list
    const isLowStock = lowStockItems.some(item => item.id === inventoryItem.id);
    if (isLowStock) {
      Alert.alert('Already Included', 'This item is already included due to low stock.');
      return;
    }

    const manualItem = {
      id: `manual_inv_${Date.now()}`,
      productName: inventoryItem.productName,
      quantity: 1,
      notes: 'Added manually',
      type: 'manual',
      inventoryId: inventoryItem.id,
      barcode: inventoryItem.barcode,
      location: inventoryItem.location,
      dateAdded: new Date().toISOString()
    };

    setManualItems(prev => [...prev, manualItem]);
    setInventoryModalVisible(false);
  };

  const generateShoppingListText = () => {
    if (combinedShoppingList.length === 0) {
      return 'Your shopping list is empty.';
    }

    let text = 'DENTAL PRACTICE SHOPPING LIST\n';
    text += `Generated: ${new Date().toLocaleDateString()}\n`;
    text += `Total Items to Order: ${combinedShoppingList.length}\n\n`;

    if (criticalItems.length > 0) {
      text += '🔴 CRITICAL - OUT OF STOCK:\n';
      criticalItems.forEach(item => {
        const needed = Math.max(item.minStockLevel * 2 - item.currentQuantity, item.minStockLevel);
        text += `• ${item.productName} (Current: ${item.currentQuantity}, Suggested: ${needed})\n`;
        if (item.location) text += `  Location: ${item.location}\n`;
        if (item.barcode) text += `  Barcode: ${item.barcode}\n`;
      });
      text += '\n';
    }

    if (urgentItems.length > 0) {
      text += '🟡 URGENT - LOW STOCK:\n';
      urgentItems.forEach(item => {
        const needed = Math.max(item.minStockLevel * 2 - item.currentQuantity, item.minStockLevel);
        text += `• ${item.productName} (Current: ${item.currentQuantity}, Min: ${item.minStockLevel}, Suggested: ${needed})\n`;
        if (item.location) text += `  Location: ${item.location}\n`;
        if (item.barcode) text += `  Barcode: ${item.barcode}\n`;
      });
      text += '\n';
    }

    const normalLowStock = lowStockItems.filter(item => 
      !criticalItems.includes(item) && !urgentItems.includes(item)
    );

    if (normalLowStock.length > 0) {
      text += '🟠 LOW STOCK:\n';
      normalLowStock.forEach(item => {
        const needed = Math.max(item.minStockLevel * 2 - item.currentQuantity, item.minStockLevel);
        text += `• ${item.productName} (Current: ${item.currentQuantity}, Min: ${item.minStockLevel}, Suggested: ${needed})\n`;
        if (item.location) text += `  Location: ${item.location}\n`;
        if (item.barcode) text += `  Barcode: ${item.barcode}\n`;
      });
      text += '\n';
    }

    if (manualItems.length > 0) {
      text += '📝 MANUALLY ADDED ITEMS:\n';
      manualItems.forEach(item => {
        text += `• ${item.productName} (Qty: ${item.quantity})\n`;
        if (item.notes) text += `  Notes: ${item.notes}\n`;
        if (item.barcode) text += `  Barcode: ${item.barcode}\n`;
        if (item.location) text += `  Location: ${item.location}\n`;
      });
    }

    return text;
  };

  const handleShareShoppingList = async () => {
    try {
      const shoppingListText = generateShoppingListText();
      await Share.share({
        message: shoppingListText,
        title: 'Dental Practice Shopping List',
      });
    } catch (error) {
      console.error('Error sharing shopping list:', error);
      Alert.alert('Error', 'Failed to share shopping list');
    }
  };

  const getItemPriority = (item) => {
    if (item.currentQuantity === 0) return 'critical';
    if (item.currentQuantity <= item.minStockLevel * 0.5) return 'urgent';
    return 'low';
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'critical': return '#f44336';
      case 'urgent': return '#ff9800';
      default: return '#2196F3';
    }
  };

  const getPriorityLabel = (priority) => {
    switch (priority) {
      case 'critical': return 'OUT OF STOCK';
      case 'urgent': return 'URGENT';
      default: return 'LOW STOCK';
    }
  };

  const renderItem = ({ item }) => {
    if (item.type === 'manual') {
      // Render manual items
      return (
        <Card style={[styles.itemCard, { borderLeftColor: '#6366f1' }]}>
          <Card.Content>
            <View style={styles.itemHeader}>
              <Text style={styles.itemName}>{item.productName}</Text>
              <View style={styles.chipContainer}>
                <Chip 
                  mode="outlined" 
                  style={[styles.priorityChip, { borderColor: '#6366f1', backgroundColor: '#6366f1' + '20' }]}
                  textStyle={{ color: '#6366f1', fontSize: 10 }}
                >
                  MANUAL
                </Chip>
                <TouchableOpacity
                  style={styles.deleteManualButton}
                  onPress={() => removeManualItem(item.id)}
                >
                  <Text style={styles.deleteButtonText}>×</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.itemDetails}>
              <Text style={styles.stockInfo}>
                Quantity: {item.quantity}
              </Text>
              {item.notes && (
                <Text style={styles.suggestion}>
                  Notes: {item.notes}
                </Text>
              )}
              {item.location && (
                <Text style={styles.location}>Location: {item.location}</Text>
              )}
              {item.barcode && (
                <Text style={styles.barcode}>Barcode: {item.barcode}</Text>
              )}
              <Text style={styles.dateAdded}>
                Added: {new Date(item.dateAdded).toLocaleDateString()}
              </Text>
            </View>
          </Card.Content>
        </Card>
      );
    } else {
      // Render low stock items
      const priority = getItemPriority(item);
      const suggestedOrder = Math.max(item.minStockLevel * 2 - item.currentQuantity, item.minStockLevel);

      return (
        <Card style={[styles.itemCard, { borderLeftColor: getPriorityColor(priority) }]}>
          <Card.Content>
            <View style={styles.itemHeader}>
              <Text style={styles.itemName}>{item.productName}</Text>
              <Chip 
                mode="outlined" 
                style={[styles.priorityChip, { borderColor: getPriorityColor(priority) }]}
                textStyle={{ color: getPriorityColor(priority), fontSize: 10 }}
              >
                {getPriorityLabel(priority)}
              </Chip>
            </View>

            <View style={styles.itemDetails}>
              <Text style={styles.stockInfo}>
                Current: {item.currentQuantity} | Min: {item.minStockLevel}
              </Text>
              <Text style={styles.suggestion}>
                Suggested order: {suggestedOrder} units
              </Text>
              {item.location && (
                <Text style={styles.location}>Location: {item.location}</Text>
              )}
              {item.barcode && (
                <Text style={styles.barcode}>Barcode: {item.barcode}</Text>
              )}
            </View>

            <Button
              mode="outlined"
              compact
              onPress={() => navigation.navigate('ItemDetail', { item })}
              style={styles.editButton}
            >
              Edit Item
            </Button>
          </Card.Content>
        </Card>
      );
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading shopping list...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Card style={styles.summaryCard}>
        <Card.Content>
          <Text style={styles.summaryTitle}>Shopping List Summary</Text>
          <Divider style={styles.divider} />
          
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryNumber}>{combinedShoppingList.length}</Text>
              <Text style={styles.summaryLabel}>Total Items</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryNumber, { color: '#f44336' }]}>
                {criticalItems.length}
              </Text>
              <Text style={styles.summaryLabel}>Out of Stock</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryNumber, { color: '#6366f1' }]}>
                {manualItems.length}
              </Text>
              <Text style={styles.summaryLabel}>Manual</Text>
            </View>
          </View>

          {combinedShoppingList.length > 0 && (
            <Button
              mode="contained"
              onPress={handleShareShoppingList}
              style={styles.shareButton}
              
            >
              Share Shopping List
            </Button>
          )}
        </Card.Content>
      </Card>

      {combinedShoppingList.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Card.Content style={styles.emptyContent}>
            <Text style={styles.emptyIcon}>✅</Text>
            <Text style={styles.emptyTitle}>All Stocked Up!</Text>
            <Text style={styles.emptyText}>
              No items currently need restocking. Great job maintaining your inventory!
            </Text>
            <Button
              mode="outlined"
              onPress={() => navigation.navigate('Inventory')}
              style={styles.emptyButton}
            >
              View Full Inventory
            </Button>
          </Card.Content>
        </Card>
      ) : (
        <FlatList
          data={combinedShoppingList.sort((a, b) => {
            // Sort manual items first, then by priority for low stock items
            if (a.type === 'manual' && b.type === 'lowstock') return -1;
            if (a.type === 'lowstock' && b.type === 'manual') return 1;
            if (a.type === 'manual' && b.type === 'manual') {
              return a.productName.localeCompare(b.productName);
            }
            
            // Both are low stock items, sort by priority
            const priorityOrder = { critical: 0, urgent: 1, low: 2 };
            const aPriority = getItemPriority(a);
            const bPriority = getItemPriority(b);
            
            if (priorityOrder[aPriority] !== priorityOrder[bPriority]) {
              return priorityOrder[aPriority] - priorityOrder[bPriority];
            }
            
            return a.productName.localeCompare(b.productName);
          })}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Floating Action Buttons with Labels */}
      <View style={styles.fabContainer}>
        <View style={styles.fabWithLabel}>
          <View style={styles.fabLabelContainer}>
            <Text style={styles.fabLabel}>Add Custom Item</Text>
          </View>
          <FAB
            style={[styles.fab, { backgroundColor: colors.primary }]}
            icon={() => <Text style={styles.fabIcon}>+</Text>}
            onPress={() => setAddItemModalVisible(true)}
            color={colors.white}
          />
        </View>
        
        <View style={styles.fabWithLabel}>
          <View style={styles.fabLabelContainer}>
            <Text style={styles.fabLabel}>Add from Inventory</Text>
          </View>
          <FAB
            style={[styles.fabInventory, { backgroundColor: colors.secondary }]}
            icon={() => <Text style={styles.fabIcon}>📦</Text>}
            onPress={() => setInventoryModalVisible(true)}
            color={colors.white}
            size="small"
          />
        </View>
      </View>

      {/* Add Manual Item Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={addItemModalVisible}
        onRequestClose={handleCancelAddItem}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={handleCancelAddItem}
        >
          <TouchableOpacity 
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <Surface style={styles.modalSurface}>
              <ScrollView 
                style={styles.modalScrollView}
                contentContainerStyle={styles.modalScrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                <View style={styles.modalContent}>
                  <Title style={styles.modalTitle}>Add Custom Item</Title>
                  <Paragraph style={styles.modalSubtitle}>
                    Create a custom shopping list item with any name, quantity, and notes. This item won't be linked to your inventory.
                  </Paragraph>

                  <CustomTextInput
                    label="Item Name"
                    value={newItemName}
                    onChangeText={setNewItemName}
                    mode="outlined"
                    style={styles.input}
                    autoComplete="off"
                    textContentType="none"
                    autoCorrect={false}
                    spellCheck={false}
                    right={null}
                  />

                  <CustomTextInput
                    label="Quantity"
                    value={newItemQuantity}
                    onChangeText={setNewItemQuantity}
                    mode="outlined"
                    keyboardType="numeric"
                    style={styles.input}
                    autoComplete="off"
                    textContentType="none"
                    autoCorrect={false}
                    spellCheck={false}
                    right={null}
                  />

                  <CustomTextInput
                    label="Notes (optional)"
                    value={newItemNotes}
                    onChangeText={setNewItemNotes}
                    mode="outlined"
                    multiline
                    numberOfLines={3}
                    style={styles.input}
                    autoComplete="off"
                    textContentType="none"
                    autoCorrect={false}
                    spellCheck={false}
                    right={null}
                  />

                  <View style={styles.modalButtons}>
                    <Button
                      mode="outlined"
                      onPress={handleCancelAddItem}
                      style={styles.cancelButton}
                    >
                      Cancel
                    </Button>
                    <Button
                      mode="contained"
                      onPress={addManualItem}
                      style={styles.addButton}
                    >
                      Add Item
                    </Button>
                  </View>
                </View>
              </ScrollView>
            </Surface>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Add from Inventory Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={inventoryModalVisible}
        onRequestClose={handleCancelInventoryModal}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={handleCancelInventoryModal}
        >
          <TouchableOpacity 
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <Surface style={styles.modalSurface}>
              <ScrollView 
                style={styles.modalScrollView}
                contentContainerStyle={styles.inventoryModalScrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                <View style={styles.inventoryModalContent}>
                  <View style={styles.modalHeader}>
                    <Title style={styles.modalTitle}>Add from Inventory</Title>
                    <Paragraph style={styles.modalSubtitle}>
                      Select existing inventory items to add to your shopping list. These items will show current stock levels and locations.
                    </Paragraph>
                  </View>

                  <Searchbar
                    placeholder="Search by item name, location, or barcode..."
                    onChangeText={setSearchQuery}
                    value={searchQuery}
                    style={styles.searchbar}
                  />
                  
                  <View style={styles.inventoryHeader}>
                    <Text style={styles.inventoryHeaderText}>
                      {items.filter(item => 
                        item.productName.toLowerCase().includes(searchQuery.toLowerCase())
                      ).length} items available
                    </Text>
                  </View>

                  {items.filter(item => 
                    item.productName.toLowerCase().includes(searchQuery.toLowerCase())
                  ).map((item) => (
                    <TouchableOpacity 
                      key={item.id}
                      style={styles.inventoryItem}
                      onPress={() => addInventoryItemToList(item)}
                    >
                      <View style={styles.inventoryItemContent}>
                        <Text style={styles.inventoryItemName}>{item.productName}</Text>
                        <Text style={styles.inventoryItemStock}>Stock: {item.currentQuantity}</Text>
                        {item.location && (
                          <Text style={styles.inventoryItemLocation}>{item.location}</Text>
                        )}
                        {item.barcode && (
                          <Text style={styles.inventoryItemBarcode}>Barcode: {item.barcode}</Text>
                        )}
                      </View>
                      <Text style={styles.inventoryItemChevron}>›</Text>
                    </TouchableOpacity>
                  ))}

                  <View style={styles.modalFooter}>
                    <Button
                      mode="outlined"
                      onPress={handleCancelInventoryModal}
                      style={styles.closeButton}
                    >
                      Close
                    </Button>
                  </View>
                </View>
              </ScrollView>
            </Surface>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: '#666',
  },
  summaryCard: {
    margin: 16,
    elevation: 4,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2196F3',
    marginBottom: 8,
  },
  divider: {
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  shareButton: {
    marginTop: 8,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 16,
  },
  itemCard: {
    marginHorizontal: 16,
    marginVertical: 4,
    borderLeftWidth: 4,
    elevation: 2,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemName: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 8,
  },
  priorityChip: {
    height: 24,
  },
  itemDetails: {
    marginBottom: 12,
  },
  stockInfo: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  suggestion: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2196F3',
    marginBottom: 4,
  },
  location: {
    fontSize: 12,
    color: '#888',
    marginBottom: 2,
  },
  barcode: {
    fontSize: 12,
    color: '#888',
    fontFamily: 'monospace',
  },
  editButton: {
    alignSelf: 'flex-start',
  },
  emptyCard: {
    margin: 16,
    marginTop: 32,
  },
  emptyContent: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4caf50',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  emptyButton: {
    minWidth: 150,
  },
  // Manual item styles
  chipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deleteManualButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#f44336',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    lineHeight: 16,
  },
  dateAdded: {
    fontSize: 11,
    color: '#888',
    marginTop: 4,
  },
  // FAB styles
  fabContainer: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    alignItems: 'flex-end',
  },
  fabWithLabel: {
    alignItems: 'center',
    marginBottom: 12,
  },
  fabLabelContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 8,
    minWidth: 120,
  },
  fabLabel: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  fab: {
    borderRadius: 28,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  fabInventory: {
    borderRadius: 24,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  fabIcon: {
    fontSize: 24,
    color: 'white',
    fontWeight: 'bold',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 8,
    paddingTop: 40,
    paddingBottom: 40,
  },
  modalSurface: {
    borderRadius: 12,
    width: '100%',
    maxWidth: 450,
    maxHeight: '95%',
    minHeight: '80%',
    backgroundColor: 'white',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  modalScrollView: {
    flex: 1,
    maxHeight: '100%',
  },
  modalScrollContent: {
    padding: 20,
    paddingBottom: 30,
    flexGrow: 1,
  },
  modalContent: {
    minHeight: 400,
  },
  inventoryModalContent: {
    minHeight: 400,
  },
  inventoryModalScrollContent: {
    padding: 20,
    paddingBottom: 30,
    flexGrow: 1,
  },
  modalHeader: {
    marginBottom: 16,
  },
  modalFooter: {
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    marginTop: 24,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
    color: colors.textPrimary,
  },
  modalSubtitle: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 22,
    paddingHorizontal: 8,
  },
  input: {
    marginBottom: 20,
    backgroundColor: 'white',
    minHeight: 60,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 32,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  cancelButton: {
    flex: 1,
  },
  addButton: {
    flex: 1,
  },
  closeButton: {
    marginTop: 16,
  },
  searchbar: {
    marginBottom: 12,
    backgroundColor: 'white',
    elevation: 0,
  },
  inventoryHeader: {
    paddingHorizontal: 4,
    marginBottom: 12,
  },
  inventoryHeaderText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  inventoryList: {
    marginBottom: 16,
    minHeight: 350,
    maxHeight: 600,
    flex: 1,
  },
  inventoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: 'white',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  inventoryItemContent: {
    flex: 1,
  },
  inventoryItemName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  inventoryItemStock: {
    fontSize: 14,
    color: '#666',
  },
  inventoryItemLocation: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  inventoryItemChevron: {
    fontSize: 20,
    color: '#666',
  },
  inventoryItemBarcode: {
    fontSize: 11,
    color: '#888',
    fontFamily: 'monospace',
    marginTop: 2,
  },
});

export default ShoppingListScreen;
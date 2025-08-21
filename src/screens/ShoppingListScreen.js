import React, { useState, useEffect } from 'react';
import { View, FlatList, StyleSheet, Share, Alert, Modal, TouchableOpacity, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  const [addItemOptionsVisible, setAddItemOptionsVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [newItemName, setNewItemName] = useState('');
  const [newItemQuantity, setNewItemQuantity] = useState('1');
  const [newItemNotes, setNewItemNotes] = useState('');
  
  // Saved shopping lists states
  const [savedLists, setSavedLists] = useState([]);
  const [saveListModalVisible, setSaveListModalVisible] = useState(false);
  const [loadListModalVisible, setLoadListModalVisible] = useState(false);
  const [listName, setListName] = useState('');
  
  // Quantity editing states
  const [quantityEditModalVisible, setQuantityEditModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editQuantity, setEditQuantity] = useState('');
  const [customQuantities, setCustomQuantities] = useState({}); // Store custom quantities for low stock items
  
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

  // Load saved lists on component mount
  useEffect(() => {
    loadSavedLists();
  }, []);

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

  const exportShoppingListToCSV = async () => {
    try {
      if (combinedShoppingList.length === 0) {
        Alert.alert('No Data', 'No items to export in shopping list');
        return;
      }

      // CSV Header
      let csvContent = 'Product Name,Type,Current Quantity,Min Stock Level,Suggested/Required Quantity,Priority,Location,Barcode,Notes\n';
      
      // CSV Data
      combinedShoppingList.forEach(item => {
        if (item.type === 'manual') {
          // Manual items
          const escapedName = `"${item.productName.replace(/"/g, '""')}"`;
          const notes = (item.notes || '').replace(/"/g, '""');
          const location = (item.location || '').replace(/"/g, '""');
          const barcode = item.barcode || '';
          
          csvContent += `${escapedName},"Manual","-","-","${item.quantity}","Manual","${location}","${barcode}","${notes}"\n`;
        } else {
          // Low stock items
          const escapedName = `"${item.productName.replace(/"/g, '""')}"`;
          const priority = getItemPriority(item);
          const priorityLabel = getPriorityLabel(priority);
          const suggestedOrder = customQuantities[item.id] || Math.max(item.minStockLevel * 2 - item.currentQuantity, item.minStockLevel);
          const location = (item.locationName || item.location || '').replace(/"/g, '""');
          const barcode = item.barcode || '';
          
          csvContent += `${escapedName},"Low Stock","${item.currentQuantity}","${item.minStockLevel}","${suggestedOrder}","${priorityLabel}","${location}","${barcode}",""\n`;
        }
      });

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `shopping_list_export_${timestamp}.csv`;
      
      await Share.share({
        message: csvContent,
        title: `Shopping List Export - ${filename}`,
        subject: filename,
      });
      
    } catch (error) {
      console.error('Error exporting shopping list CSV:', error);
      Alert.alert('Export Error', 'Failed to export shopping list data');
    }
  };

  // Saved shopping lists functions
  const loadSavedLists = async () => {
    try {
      const saved = await AsyncStorage.getItem('savedShoppingLists');
      if (saved) {
        setSavedLists(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Error loading saved lists:', error);
    }
  };

  const saveCurrentList = async () => {
    if (!listName.trim()) {
      Alert.alert('Invalid Name', 'Please enter a name for the shopping list.');
      return;
    }

    if (combinedShoppingList.length === 0) {
      Alert.alert('Empty List', 'Cannot save an empty shopping list.');
      return;
    }

    try {
      const newSavedList = {
        id: `saved_${Date.now()}`,
        name: listName.trim(),
        dateCreated: new Date().toISOString(),
        manualItems: [...manualItems],
        lowStockSnapshot: lowStockItems.map(item => ({
          ...item,
          type: 'lowstock',
          snapshotDate: new Date().toISOString()
        })),
        totalItems: combinedShoppingList.length
      };

      const updatedLists = [...savedLists, newSavedList];
      await AsyncStorage.setItem('savedShoppingLists', JSON.stringify(updatedLists));
      setSavedLists(updatedLists);
      setListName('');
      setSaveListModalVisible(false);
      
      Alert.alert(
        'Success', 
        `Shopping list "${newSavedList.name}" has been saved!`
      );
    } catch (error) {
      console.error('Error saving list:', error);
      Alert.alert('Error', 'Failed to save shopping list');
    }
  };

  const loadSavedList = async (savedList) => {
    try {
      // Load manual items from saved list
      setManualItems([...savedList.manualItems]);
      setLoadListModalVisible(false);
      
      Alert.alert(
        'Success', 
        `Loaded shopping list "${savedList.name}"\n\n` +
        `${savedList.manualItems.length} manual items have been added to your current list.\n\n` +
        `Note: Low stock items are calculated dynamically based on current inventory levels.`
      );
    } catch (error) {
      console.error('Error loading list:', error);
      Alert.alert('Error', 'Failed to load shopping list');
    }
  };

  const deleteSavedList = async (listId) => {
    try {
      const updatedLists = savedLists.filter(list => list.id !== listId);
      await AsyncStorage.setItem('savedShoppingLists', JSON.stringify(updatedLists));
      setSavedLists(updatedLists);
      Alert.alert('Success', 'Shopping list deleted');
    } catch (error) {
      console.error('Error deleting list:', error);
      Alert.alert('Error', 'Failed to delete shopping list');
    }
  };

  // Quantity editing functions
  const openQuantityEditor = (item) => {
    setEditingItem(item);
    if (item.type === 'manual') {
      setEditQuantity(item.quantity.toString());
    } else {
      // For low stock items, use custom quantity if set, otherwise use suggested order quantity
      const customQty = customQuantities[item.id];
      const suggestedOrder = Math.max(item.minStockLevel * 2 - item.currentQuantity, item.minStockLevel);
      setEditQuantity((customQty || suggestedOrder).toString());
    }
    setQuantityEditModalVisible(true);
  };

  const updateItemQuantity = () => {
    if (!editQuantity.trim() || isNaN(parseInt(editQuantity)) || parseInt(editQuantity) <= 0) {
      Alert.alert('Invalid Quantity', 'Please enter a valid positive number');
      return;
    }

    const newQuantity = parseInt(editQuantity);

    if (editingItem.type === 'manual') {
      // Update manual item quantity
      setManualItems(prev => prev.map(item => 
        item.id === editingItem.id 
          ? { ...item, quantity: newQuantity }
          : item
      ));
    } else {
      // For low stock items, store custom quantity in the customQuantities state
      setCustomQuantities(prev => ({
        ...prev,
        [editingItem.id]: newQuantity
      }));
    }

    setQuantityEditModalVisible(false);
    setEditingItem(null);
    setEditQuantity('');
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
              <TouchableOpacity
                style={styles.deleteManualButton}
                onPress={() => removeManualItem(item.id)}
              >
                <Text style={styles.deleteButtonText}>×</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.itemDetails}>
              <Text style={styles.stockInfo}>
                Quantity: {item.quantity}
              </Text>
              <Button
                mode="outlined"
                compact
                onPress={() => openQuantityEditor(item)}
                style={styles.quantityButton}
                contentStyle={styles.quantityButtonContent}
                labelStyle={styles.quantityButtonLabel}
              >
                Edit Quantity
              </Button>
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
                Suggested order: {customQuantities[item.id] || suggestedOrder} units
              </Text>
              <Button
                mode="outlined"
                compact
                onPress={() => openQuantityEditor(item)}
                style={styles.quantityButton}
                contentStyle={styles.quantityButtonContent}
                labelStyle={styles.quantityButtonLabel}
              >
                Edit Quantity
              </Button>
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
            <View style={styles.summaryButtonsContainer}>
              <Button
                mode="contained"
                onPress={handleShareShoppingList}
                style={[styles.summaryButton, styles.shareButton]}
              >
                Share
              </Button>
              <Button
                mode="outlined"
                onPress={() => setSaveListModalVisible(true)}
                style={[styles.summaryButton, styles.saveButton]}
              >
                Save
              </Button>
              <Button
                mode="outlined"
                onPress={exportShoppingListToCSV}
                style={[styles.summaryButton, styles.csvExportButton]}
              >
                Export CSV
              </Button>
            </View>
          )}
          
          {savedLists.length > 0 && (
            <Button
              mode="text"
              onPress={() => setLoadListModalVisible(true)}
              style={styles.loadButton}
            >
              Load Saved List ({savedLists.length})
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
            <Text style={styles.fabLabel}>Add Item</Text>
          </View>
          <FAB
            style={[styles.fab, { backgroundColor: colors.primary }]}
            icon={() => <Text style={styles.fabIcon}>+</Text>}
            onPress={() => setAddItemOptionsVisible(true)}
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

      {/* Add Item Options Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={addItemOptionsVisible}
        onRequestClose={() => setAddItemOptionsVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setAddItemOptionsVisible(false)}
        >
          <TouchableOpacity 
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <Surface style={styles.modalSurface}>
              <View style={styles.modalContent}>
                {/* Modal Header */}
                <View style={styles.modalHeader}>
                  <Title style={styles.modalTitle}>Add Item</Title>
                  <Paragraph style={styles.modalSubtitle}>
                    Choose how you'd like to add a new item to your shopping list
                  </Paragraph>
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
                        Use camera to scan barcode and add to shopping list
                      </Paragraph>
                    </View>
                    <Text style={styles.optionChevron}>›</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.addItemOption}
                    onPress={() => {
                      setAddItemOptionsVisible(false);
                      setAddItemModalVisible(true);
                    }}
                  >
                    <View style={styles.optionIconContainer}>
                      <Text style={styles.optionIcon}>✏️</Text>
                    </View>
                    <View style={styles.optionContent}>
                      <Title style={styles.optionTitle}>Manual Entry</Title>
                      <Paragraph style={styles.optionDescription}>
                        Manually enter custom item details for shopping list
                      </Paragraph>
                    </View>
                    <Text style={styles.optionChevron}>›</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.modalButtons}>
                  <Button
                    mode="outlined"
                    onPress={() => setAddItemOptionsVisible(false)}
                    style={styles.cancelButton}
                  >
                    Cancel
                  </Button>
                </View>
              </View>
            </Surface>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Save Shopping List Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={saveListModalVisible}
        onRequestClose={() => setSaveListModalVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSaveListModalVisible(false)}
        >
          <TouchableOpacity 
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <Surface style={styles.modalSurface}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Title style={styles.modalTitle}>Save Shopping List</Title>
                  <Paragraph style={styles.modalSubtitle}>
                    Save your current shopping list to load later
                  </Paragraph>
                </View>

                <CustomTextInput
                  label="List Name"
                  value={listName}
                  onChangeText={setListName}
                  mode="outlined"
                  style={styles.input}
                  placeholder="e.g., Monthly Restocking, Emergency Supplies"
                  autoComplete="off"
                  textContentType="none"
                  autoCorrect={false}
                  spellCheck={false}
                  right={null}
                />

                <View style={styles.saveListInfo}>
                  <Text style={styles.saveInfoTitle}>What will be saved:</Text>
                  <Text style={styles.saveInfoText}>• {manualItems.length} manual items</Text>
                  <Text style={styles.saveInfoText}>• Current low stock snapshot ({lowStockItems.length} items)</Text>
                  <Text style={styles.saveInfoNote}>
                    Note: Low stock items are recalculated when loading, manual items are restored exactly.
                  </Text>
                </View>

                <View style={styles.modalButtons}>
                  <Button
                    mode="outlined"
                    onPress={() => {
                      setListName('');
                      setSaveListModalVisible(false);
                    }}
                    style={styles.cancelButton}
                  >
                    Cancel
                  </Button>
                  <Button
                    mode="contained"
                    onPress={saveCurrentList}
                    style={styles.addButton}
                  >
                    Save List
                  </Button>
                </View>
              </View>
            </Surface>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Load Shopping List Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={loadListModalVisible}
        onRequestClose={() => setLoadListModalVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setLoadListModalVisible(false)}
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
              >
                <View style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                    <Title style={styles.modalTitle}>Load Saved Shopping List</Title>
                    <Paragraph style={styles.modalSubtitle}>
                      Select a saved shopping list to load
                    </Paragraph>
                  </View>

                  {savedLists.length === 0 ? (
                    <View style={styles.noSavedListsContainer}>
                      <Text style={styles.noSavedListsText}>No saved shopping lists found.</Text>
                    </View>
                  ) : (
                    <View style={styles.savedListsContainer}>
                      {savedLists.map((savedList) => (
                        <View key={savedList.id} style={styles.savedListItem}>
                          <TouchableOpacity 
                            style={styles.savedListContent}
                            onPress={() => loadSavedList(savedList)}
                          >
                            <View style={styles.savedListInfo}>
                              <Text style={styles.savedListName}>{savedList.name}</Text>
                              <Text style={styles.savedListDate}>
                                Created: {new Date(savedList.dateCreated).toLocaleDateString()}
                              </Text>
                              <Text style={styles.savedListItems}>
                                {savedList.totalItems} items • {savedList.manualItems.length} manual
                              </Text>
                            </View>
                            <Text style={styles.savedListChevron}>›</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.deleteListButton}
                            onPress={() => {
                              Alert.alert(
                                'Delete List',
                                `Delete "${savedList.name}"?`,
                                [
                                  { text: 'Cancel', style: 'cancel' },
                                  { text: 'Delete', style: 'destructive', onPress: () => deleteSavedList(savedList.id) }
                                ]
                              );
                            }}
                          >
                            <Text style={styles.deleteButtonText}>×</Text>
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  )}

                  <View style={styles.modalButtons}>
                    <Button
                      mode="outlined"
                      onPress={() => setLoadListModalVisible(false)}
                      style={styles.cancelButton}
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

      {/* Edit Quantity Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={quantityEditModalVisible}
        onRequestClose={() => setQuantityEditModalVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setQuantityEditModalVisible(false)}
        >
          <TouchableOpacity 
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <Surface style={styles.modalSurface}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Title style={styles.modalTitle}>
                    Edit {editingItem?.type === 'manual' ? 'Quantity' : 'Suggested Order'}
                  </Title>
                  <Paragraph style={styles.modalSubtitle}>
                    {editingItem?.productName}
                  </Paragraph>
                </View>

                <CustomTextInput
                  label={editingItem?.type === 'manual' ? 'Quantity' : 'Suggested Order Quantity'}
                  value={editQuantity}
                  onChangeText={setEditQuantity}
                  mode="outlined"
                  keyboardType="numeric"
                  style={styles.input}
                  autoComplete="off"
                  textContentType="none"
                  autoCorrect={false}
                  spellCheck={false}
                  right={null}
                />

                {editingItem?.type !== 'manual' && (
                  <View style={styles.quantityInfo}>
                    <Text style={styles.quantityInfoTitle}>Item Details:</Text>
                    <Text style={styles.quantityInfoText}>Current Stock: {editingItem?.currentQuantity}</Text>
                    <Text style={styles.quantityInfoText}>Minimum Level: {editingItem?.minStockLevel}</Text>
                    <Text style={styles.quantityInfoText}>
                      Default Suggestion: {editingItem ? Math.max(editingItem.minStockLevel * 2 - editingItem.currentQuantity, editingItem.minStockLevel) : 0}
                    </Text>
                  </View>
                )}

                <View style={styles.modalButtons}>
                  <Button
                    mode="outlined"
                    onPress={() => {
                      setQuantityEditModalVisible(false);
                      setEditingItem(null);
                      setEditQuantity('');
                    }}
                    style={styles.cancelButton}
                  >
                    Cancel
                  </Button>
                  <Button
                    mode="contained"
                    onPress={updateItemQuantity}
                    style={styles.addButton}
                  >
                    Update
                  </Button>
                </View>
              </View>
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
  summaryButtonsContainer: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
  },
  summaryButton: {
    flex: 1,
  },
  shareButton: {
    // Styles handled by summaryButton
  },
  saveButton: {
    // Styles handled by summaryButton
  },
  csvExportButton: {
    borderColor: colors.success || '#4caf50',
  },
  loadButton: {
    marginTop: 8,
    alignSelf: 'center',
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
  quantityButton: {
    borderColor: colors.primary || '#2196F3',
    alignSelf: 'flex-start',
    marginTop: 4,
    marginBottom: 8,
    minWidth: 120,
  },
  quantityButtonContent: {
    height: 52,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonLabel: {
    fontSize: 14,
    marginHorizontal: 0,
    fontWeight: '500',
    lineHeight: 22,
  },
  editButton: {
    borderColor: colors.secondary || '#666',
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
  // Add Item Options Modal Styles
  addItemOptionsContainer: {
    gap: 12,
    marginBottom: 24,
  },
  addItemOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  optionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  optionIcon: {
    fontSize: 24,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary || '#333',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  optionChevron: {
    fontSize: 24,
    color: '#999',
    marginLeft: 8,
  },
  // Save/Load Lists Modal Styles
  saveListInfo: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
  },
  saveInfoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary || '#333',
    marginBottom: 8,
  },
  saveInfoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  saveInfoNote: {
    fontSize: 12,
    color: '#888',
    fontStyle: 'italic',
    marginTop: 8,
    lineHeight: 16,
  },
  savedListsContainer: {
    gap: 8,
    marginBottom: 20,
  },
  savedListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  savedListContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  savedListInfo: {
    flex: 1,
  },
  savedListName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary || '#333',
    marginBottom: 4,
  },
  savedListDate: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  savedListItems: {
    fontSize: 12,
    color: '#888',
  },
  savedListChevron: {
    fontSize: 20,
    color: '#999',
    marginLeft: 8,
  },
  deleteListButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f44336',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  noSavedListsContainer: {
    alignItems: 'center',
    padding: 20,
    marginBottom: 20,
  },
  noSavedListsText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  // Quantity editing styles
  quantityInfo: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
  },
  quantityInfoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary || '#333',
    marginBottom: 8,
  },
  quantityInfoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
});

export default ShoppingListScreen;
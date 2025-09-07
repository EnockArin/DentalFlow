import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  FlatList, 
  Alert 
} from 'react-native';
import { 
  Text, 
  Title, 
  Paragraph, 
  Button, 
  Card, 
  Searchbar,
  Surface
} from 'react-native-paper';
import CustomTextInput from '../components/common/CustomTextInput';
import { useSelector } from 'react-redux';
import { colors, spacing, typography, borderRadius, shadows } from '../constants/theme';

const ShoppingListAddItemScreen = ({ navigation, route }) => {
  const { items, loading } = useSelector((state) => state.inventory);
  const { onAddManualItem, onAddMultipleItems } = route.params || {};
  
  // Manual entry states
  const [newItemName, setNewItemName] = useState('');
  const [newItemQuantity, setNewItemQuantity] = useState('1');
  const [newItemCost, setNewItemCost] = useState('');
  const [newItemNotes, setNewItemNotes] = useState('');
  
  // Multi-item selection states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItems, setSelectedItems] = useState([]);
  const [multiItemQuantities, setMultiItemQuantities] = useState({});
  
  const [currentMode, setCurrentMode] = useState('options'); // 'options', 'manual', 'multi'

  const resetManualForm = () => {
    setNewItemName('');
    setNewItemQuantity('1');
    setNewItemCost('');
    setNewItemNotes('');
  };

  const resetMultiForm = () => {
    setSelectedItems([]);
    setMultiItemQuantities({});
    setSearchQuery('');
  };

  const handleAddManualItem = () => {
    if (!newItemName.trim()) {
      Alert.alert('Invalid Input', 'Please enter an item name.');
      return;
    }

    const quantity = parseInt(newItemQuantity) || 1;
    const cost = parseFloat(newItemCost) || 0;
    const newItem = {
      id: `manual_${Date.now()}`,
      productName: newItemName.trim(),
      quantity: quantity,
      cost: cost,
      notes: newItemNotes.trim(),
      type: 'manual',
      dateAdded: new Date().toISOString()
    };

    if (onAddManualItem) {
      onAddManualItem(newItem);
    }
    
    resetManualForm();
    navigation.goBack();
    Alert.alert('Success', `Added "${newItem.productName}" to your shopping list.`);
  };

  const toggleItemSelection = (item) => {
    setSelectedItems(prev => {
      const isSelected = prev.some(selected => selected.id === item.id);
      if (isSelected) {
        // Remove item
        const newQuantities = { ...multiItemQuantities };
        delete newQuantities[item.id];
        setMultiItemQuantities(newQuantities);
        return prev.filter(selected => selected.id !== item.id);
      } else {
        // Add item
        setMultiItemQuantities(prev => ({
          ...prev,
          [item.id]: '1'
        }));
        return [...prev, item];
      }
    });
  };

  const updateItemQuantity = (itemId, quantity) => {
    setMultiItemQuantities(prev => ({
      ...prev,
      [itemId]: quantity
    }));
  };

  const handleAddMultipleItems = () => {
    if (selectedItems.length === 0) {
      Alert.alert('No Items Selected', 'Please select at least one item to add.');
      return;
    }

    const newItems = selectedItems.map(item => ({
      id: `manual_${Date.now()}_${item.id}`,
      productName: item.productName,
      quantity: parseInt(multiItemQuantities[item.id]) || 1,
      cost: item.cost || item.unitCost || 0,
      notes: `From inventory: ${item.description || 'No description'}`,
      type: 'manual',
      dateAdded: new Date().toISOString(),
      originalItem: item
    }));

    if (onAddMultipleItems) {
      onAddMultipleItems(newItems);
    }
    
    resetMultiForm();
    navigation.goBack();
    Alert.alert('Success', `Added ${newItems.length} items to your shopping list.`);
  };

  const handleScanBarcode = () => {
    navigation.navigate('Scanner', {
      forShoppingList: true,
      onAddToShoppingList: (newItem) => {
        if (onAddManualItem) {
          onAddManualItem(newItem);
        }
      }
    });
  };

  const renderOptionsView = () => (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <Title style={styles.title}>Add Item to Shopping List</Title>
        <Paragraph style={styles.subtitle}>
          Choose how you'd like to add a new item to your shopping list
        </Paragraph>
      </View>

      <View style={styles.optionsContainer}>
        <TouchableOpacity 
          style={styles.optionCard}
          onPress={handleScanBarcode}
        >
          <Card style={styles.card}>
            <Card.Content style={styles.cardContent}>
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
            </Card.Content>
          </Card>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.optionCard}
          onPress={() => setCurrentMode('manual')}
        >
          <Card style={styles.card}>
            <Card.Content style={styles.cardContent}>
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
            </Card.Content>
          </Card>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.optionCard}
          onPress={() => setCurrentMode('multi')}
        >
          <Card style={styles.card}>
            <Card.Content style={styles.cardContent}>
              <View style={styles.optionIconContainer}>
                <Text style={styles.optionIcon}>📦</Text>
              </View>
              <View style={styles.optionContent}>
                <Title style={styles.optionTitle}>Add Multiple Items</Title>
                <Paragraph style={styles.optionDescription}>
                  Select multiple items from inventory to add at once
                </Paragraph>
              </View>
              <Text style={styles.optionChevron}>›</Text>
            </Card.Content>
          </Card>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderManualEntry = () => (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <Title style={styles.title}>Add Custom Item</Title>
        <Paragraph style={styles.subtitle}>
          Create a custom shopping list item with any name, quantity, and notes
        </Paragraph>
      </View>

      <View style={styles.formContainer}>
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

        <View style={styles.rowInputs}>
          <CustomTextInput
            label="Quantity"
            value={newItemQuantity}
            onChangeText={setNewItemQuantity}
            mode="outlined"
            keyboardType="numeric"
            style={[styles.input, styles.halfInput]}
            autoComplete="off"
            textContentType="none"
            autoCorrect={false}
            spellCheck={false}
            right={null}
          />
          <CustomTextInput
            label="Unit Cost (£)"
            value={newItemCost}
            onChangeText={setNewItemCost}
            mode="outlined"
            keyboardType="decimal-pad"
            style={[styles.input, styles.halfInput]}
            placeholder="0.00"
            autoComplete="off"
            textContentType="none"
            autoCorrect={false}
            spellCheck={false}
            right={null}
          />
        </View>

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
      </View>

      <View style={styles.buttonContainer}>
        <Button
          mode="contained"
          onPress={handleAddManualItem}
          style={styles.primaryButton}
          contentStyle={styles.buttonContent}
        >
          Add Item
        </Button>
        <Button
          mode="outlined"
          onPress={() => setCurrentMode('options')}
          style={styles.secondaryButton}
          contentStyle={styles.buttonContent}
        >
          Back to Options
        </Button>
      </View>
    </ScrollView>
  );

  const renderMultiItemSelection = () => (
    <View style={styles.container}>
      <View style={styles.header}>
        <Title style={styles.title}>Add Multiple Items</Title>
        <Paragraph style={styles.subtitle}>
          Select items from your inventory to add to shopping list
        </Paragraph>
      </View>

      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search inventory items..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchBar}
        />
      </View>

      {selectedItems.length > 0 && (
        <View style={styles.selectedItemsSummary}>
          <Text style={styles.selectedItemsText}>
            {selectedItems.length} item{selectedItems.length !== 1 ? 's' : ''} selected
          </Text>
          <Button
            mode="text"
            onPress={() => {
              setSelectedItems([]);
              setMultiItemQuantities({});
            }}
            textColor={colors.textSecondary}
            compact
          >
            Clear All
          </Button>
        </View>
      )}

      <FlatList
        data={items.filter(item =>
          item.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()))
        )}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const isSelected = selectedItems.some(selected => selected.id === item.id);
          return (
            <TouchableOpacity
              style={[
                styles.multiItemSelectionItem,
                isSelected && styles.selectedMultiItem
              ]}
              onPress={() => toggleItemSelection(item)}
            >
              <View style={styles.multiItemContent}>
                <View style={styles.multiItemInfo}>
                  <Text style={styles.multiItemName}>{item.productName}</Text>
                  <Text style={styles.multiItemDescription}>
                    {item.description || 'No description'}
                  </Text>
                  <Text style={styles.multiItemStock}>
                    Stock: {item.currentQuantity}
                    {(item.cost || item.unitCost) && (
                      <Text style={styles.multiItemCost}> • Unit Cost: £{((item.cost || item.unitCost) || 0).toFixed(2)}</Text>
                    )}
                  </Text>
                </View>
                
                {isSelected && (
                  <View style={styles.quantityInputContainer}>
                    <Text style={styles.quantityLabel}>Qty:</Text>
                    <CustomTextInput
                      value={multiItemQuantities[item.id] || '1'}
                      onChangeText={(value) => updateItemQuantity(item.id, value)}
                      keyboardType="numeric"
                      style={styles.quantityInput}
                      autoComplete="off"
                      textContentType="none"
                      autoCorrect={false}
                      spellCheck={false}
                    />
                  </View>
                )}
                
                <View style={[
                  styles.selectionIndicator,
                  isSelected && styles.selectedIndicator
                ]}>
                  {isSelected && <Text style={styles.checkmark}>✓</Text>}
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
        style={styles.multiItemsList}
        showsVerticalScrollIndicator={false}
      />

      <View style={styles.multiItemActions}>
        {selectedItems.length > 0 && (
          <Button
            mode="contained"
            onPress={handleAddMultipleItems}
            style={styles.addMultiItemsButton}
            contentStyle={styles.buttonContent}
          >
            Add {selectedItems.length} Item{selectedItems.length !== 1 ? 's' : ''} to List
          </Button>
        )}
        
        <Button
          mode="outlined"
          onPress={() => setCurrentMode('options')}
          style={styles.secondaryButton}
          contentStyle={styles.buttonContent}
        >
          Back to Options
        </Button>
      </View>
    </View>
  );

  return (
    <Surface style={styles.surface}>
      <View style={styles.customHeader}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {currentMode === 'manual' ? 'Manual Entry' :
           currentMode === 'multi' ? 'Multiple Items' :
           'Add Item'}
        </Text>
        <View style={styles.headerSpacer} />
      </View>
      
      {currentMode === 'options' && renderOptionsView()}
      {currentMode === 'manual' && renderManualEntry()}
      {currentMode === 'multi' && renderMultiItemSelection()}
    </Surface>
  );
};

const styles = StyleSheet.create({
  surface: {
    flex: 1,
    backgroundColor: colors.background || '#f5f5f5',
  },
  customHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary || '#2196F3',
    paddingTop: spacing.lg + 20, // Account for status bar
  },
  backButton: {
    padding: spacing.sm,
    marginRight: spacing.sm,
  },
  backArrow: {
    fontSize: 24,
    color: colors.white || '#ffffff',
    fontWeight: 'bold',
  },
  headerTitle: {
    flex: 1,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.white || '#ffffff',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40, // Balance the back button
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  header: {
    marginBottom: spacing.xl,
    alignItems: 'center',
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: typography.fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  optionsContainer: {
    gap: spacing.md,
  },
  optionCard: {
    marginBottom: spacing.sm,
  },
  card: {
    borderRadius: borderRadius.lg,
    elevation: 2,
    ...shadows.small,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
  },
  optionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  optionIcon: {
    fontSize: 28,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  optionDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  optionChevron: {
    fontSize: 28,
    color: colors.textTertiary,
    marginLeft: spacing.sm,
  },
  formContainer: {
    marginBottom: spacing.xl,
  },
  input: {
    marginBottom: spacing.lg,
    backgroundColor: colors.surface,
  },
  rowInputs: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  halfInput: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  buttonContainer: {
    gap: spacing.md,
  },
  primaryButton: {
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primary,
  },
  secondaryButton: {
    borderRadius: borderRadius.lg,
    borderColor: colors.borderMedium,
  },
  buttonContent: {
    height: 48,
    paddingHorizontal: spacing.lg,
  },
  searchContainer: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  searchBar: {
    backgroundColor: colors.surface,
    elevation: 1,
  },
  selectedItemsSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary + '10',
    marginBottom: spacing.sm,
  },
  selectedItemsText: {
    fontSize: typography.fontSize.sm,
    color: colors.primary,
    fontWeight: typography.fontWeight.medium,
  },
  multiItemsList: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  multiItemSelectionItem: {
    backgroundColor: colors.surface,
    marginVertical: spacing.xs,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    elevation: 1,
  },
  selectedMultiItem: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '05',
  },
  multiItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  multiItemInfo: {
    flex: 1,
  },
  multiItemName: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  multiItemDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  multiItemStock: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
  multiItemCost: {
    fontSize: typography.fontSize.xs,
    color: colors.success || '#4caf50',
    fontWeight: typography.fontWeight.medium,
  },
  quantityInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  quantityLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    marginRight: spacing.sm,
  },
  quantityInput: {
    width: 60,
    height: 40,
  },
  selectionIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedIndicator: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkmark: {
    color: colors.white,
    fontSize: 12,
    fontWeight: typography.fontWeight.bold,
  },
  multiItemActions: {
    flexDirection: 'column',
    gap: spacing.md,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    backgroundColor: colors.surface,
  },
  addMultiItemsButton: {
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primary,
  },
});

export default ShoppingListAddItemScreen;
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity, FlatList } from 'react-native';
import { 
  TextInput, 
  Button, 
  Card, 
  Title, 
  Paragraph,
  List,
  IconButton,
  Chip,
  Text,
  Dialog,
  Portal,
  Searchbar,
  ActivityIndicator,
  FAB
} from 'react-native-paper';
import CustomTextInput from '../components/common/CustomTextInput';
import { useDispatch, useSelector } from 'react-redux';
import { addDoc, updateDoc, doc, collection, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { clearActiveKit } from '../store/slices/treatmentKitsSlice';
import { colors, spacing, borderRadius, typography, shadows } from '../constants/theme';
import { globalFormStyles } from '../styles/globalFormFixes';

const TreatmentKitDetailScreen = ({ navigation, route }) => {
  const dispatch = useDispatch();
  const { activeKit } = useSelector((state) => state.treatmentKits);
  const { items: inventoryItems } = useSelector((state) => state.inventory);
  const { user } = useSelector((state) => state.auth);
  
  const isEditing = !!route.params?.kitId;
  
  const [kitName, setKitName] = useState('');
  const [kitDescription, setKitDescription] = useState('');
  const [selectedItems, setSelectedItems] = useState([]);
  const [saving, setSaving] = useState(false);
  const [itemSearchQuery, setItemSearchQuery] = useState('');
  const [showItemPicker, setShowItemPicker] = useState(false);
  const [editingItemIndex, setEditingItemIndex] = useState(null);
  const [editQuantity, setEditQuantity] = useState('');

  const predefinedTemplates = [
    {
      name: 'Crown Preparation',
      description: 'Standard supplies for crown prep procedure',
      items: [
        { name: 'Anesthetic Cartridge', quantity: 2, unit: 'units' },
        { name: 'Diamond Bur', quantity: 3, unit: 'units' },
        { name: 'Impression Material', quantity: 1, unit: 'kit' },
        { name: 'Temporary Crown', quantity: 1, unit: 'unit' },
        { name: 'Temporary Cement', quantity: 1, unit: 'tube' },
      ]
    },
    {
      name: 'Root Canal',
      description: 'Complete endodontic treatment supplies',
      items: [
        { name: 'Rubber Dam', quantity: 1, unit: 'unit' },
        { name: 'K-Files Set', quantity: 1, unit: 'set' },
        { name: 'Gutta Percha Points', quantity: 10, unit: 'units' },
        { name: 'Sealer', quantity: 1, unit: 'tube' },
        { name: 'Paper Points', quantity: 20, unit: 'units' },
      ]
    },
    {
      name: 'Extraction',
      description: 'Tooth extraction supplies',
      items: [
        { name: 'Anesthetic Cartridge', quantity: 2, unit: 'units' },
        { name: 'Gauze', quantity: 10, unit: 'pieces' },
        { name: 'Suture', quantity: 1, unit: 'pack' },
        { name: 'Extraction Forceps', quantity: 1, unit: 'unit' },
      ]
    },
    {
      name: 'Filling',
      description: 'Composite filling procedure',
      items: [
        { name: 'Composite Resin', quantity: 1, unit: 'syringe' },
        { name: 'Bonding Agent', quantity: 1, unit: 'bottle' },
        { name: 'Etching Gel', quantity: 1, unit: 'syringe' },
        { name: 'Matrix Band', quantity: 1, unit: 'unit' },
        { name: 'Wedges', quantity: 2, unit: 'units' },
      ]
    }
  ];

  useEffect(() => {
    if (activeKit) {
      setKitName(activeKit.name || '');
      setKitDescription(activeKit.description || '');
      
      // Clean existing items to ensure no undefined values
      const cleanedItems = (activeKit.items || []).map(item => ({
        inventoryId: item.inventoryId || null,
        name: item.name || '',
        quantity: item.quantity || 1,
        unit: item.unit || 'unit',
        category: item.category || null,
        needsMapping: item.needsMapping || false
      }));
      
      setSelectedItems(cleanedItems);
    }
  }, [activeKit]);

  useEffect(() => {
    return () => {
      dispatch(clearActiveKit());
    };
  }, [dispatch]);

  const handleAddItem = (inventoryItem) => {
    const existingIndex = selectedItems.findIndex(item => item.inventoryId === inventoryItem.id);
    
    if (existingIndex >= 0) {
      Alert.alert('Item Already Added', 'This item is already in the kit. You can edit its quantity.');
      return;
    }
    
    setSelectedItems([...selectedItems, {
      inventoryId: inventoryItem.id || null,
      name: inventoryItem.productName || inventoryItem.name || '',
      quantity: 1,
      unit: inventoryItem.unit || 'unit',
      category: inventoryItem.category || null
    }]);
    
    setShowItemPicker(false);
    setItemSearchQuery('');
  };

  const handleRemoveItem = (index) => {
    const newItems = [...selectedItems];
    newItems.splice(index, 1);
    setSelectedItems(newItems);
  };

  const handleUpdateQuantity = (index, newQuantity) => {
    if (newQuantity === '' || isNaN(parseInt(newQuantity)) || parseInt(newQuantity) <= 0) {
      Alert.alert('Invalid Quantity', 'Please enter a valid positive number');
      return;
    }
    
    const newItems = [...selectedItems];
    newItems[index].quantity = parseInt(newQuantity);
    setSelectedItems(newItems);
    setEditingItemIndex(null);
    setEditQuantity('');
  };

  const handleApplyTemplate = (template) => {
    Alert.alert(
      'Apply Template',
      `This will replace current items with the "${template.name}" template. Continue?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Apply',
          onPress: () => {
            setKitName(template.name);
            setKitDescription(template.description);
            
            const templateItems = template.items.map(item => {
              const inventoryMatch = (inventoryItems || []).find(inv => 
                (inv.productName || inv.name || '').toLowerCase().includes(item.name.toLowerCase())
              );
              
              return {
                inventoryId: inventoryMatch?.id || null,
                name: item.name || '',
                quantity: item.quantity || 1,
                unit: item.unit || 'unit',
                category: inventoryMatch?.category || null,
                needsMapping: !inventoryMatch
              };
            });
            
            setSelectedItems(templateItems);
            
            const unmappedCount = templateItems.filter(item => item.needsMapping).length;
            if (unmappedCount > 0) {
              Alert.alert(
                'Template Applied',
                `${unmappedCount} items need to be mapped to your inventory. Items marked in yellow need attention.`
              );
            }
          }
        }
      ]
    );
  };

  const handleSave = async () => {
    if (!kitName.trim()) {
      Alert.alert('Required Field', 'Please enter a kit name');
      return;
    }
    
    if (selectedItems.length === 0) {
      Alert.alert('No Items', 'Please add at least one item to the kit');
      return;
    }
    
    const unmappedItems = selectedItems.filter(item => !item.inventoryId);
    if (unmappedItems.length > 0) {
      Alert.alert(
        'Unmapped Items',
        `${unmappedItems.length} items are not linked to inventory. Please map them first.`
      );
      return;
    }
    
    setSaving(true);
    
    try {
      // Clean the selected items to remove any undefined values
      const cleanedItems = selectedItems.map(item => ({
        inventoryId: item.inventoryId || null,
        name: item.name || '',
        quantity: item.quantity || 1,
        unit: item.unit || 'unit',
        category: item.category || null
      }));

      const kitData = {
        name: kitName.trim(),
        description: kitDescription.trim() || '',
        items: cleanedItems,
        userId: user?.uid || null,
        updatedAt: Timestamp.now(),
      };
      
      if (isEditing && activeKit?.id) {
        await updateDoc(doc(db, 'treatmentKits', activeKit.id), kitData);
        Alert.alert('Success', 'Treatment kit updated successfully');
      } else {
        await addDoc(collection(db, 'treatmentKits'), {
          ...kitData,
          createdAt: Timestamp.now(),
          usageCount: 0,
          lastUsed: null
        });
        Alert.alert('Success', 'Treatment kit created successfully');
      }
      
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to save treatment kit');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const filteredInventory = (inventoryItems || []).filter(item => {
    const searchLower = (itemSearchQuery || '').toLowerCase();
    const itemName = (item.productName || item.name || '').toLowerCase();
    const itemCategory = (item.category || '').toLowerCase();
    
    return itemName.includes(searchLower) || itemCategory.includes(searchLower);
  });

  const renderSelectedItem = ({ item, index }) => (
    <Card style={[styles.itemCard, item.needsMapping && styles.unmappedCard]}>
      <Card.Content style={styles.itemContent}>
        <View style={styles.itemHeader}>
          <View style={styles.itemInfo}>
            <Text style={styles.itemName}>{item.name}</Text>
            {item.needsMapping && (
              <Text style={styles.unmappedLabel}>⚠️ Not in inventory</Text>
            )}
          </View>
          <TouchableOpacity
            onPress={() => handleRemoveItem(index)}
            style={styles.removeButton}
          >
            <Text style={styles.removeButtonText}>×</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.quantityRow}>
          {editingItemIndex === index ? (
            <View style={styles.editQuantityContainer}>
              <TextInput
                value={editQuantity}
                onChangeText={setEditQuantity}
                keyboardType="numeric"
                style={styles.quantityInput}
                mode="outlined"
                dense
                autoFocus
              />
              <IconButton
                icon="check"
                size={20}
                onPress={() => handleUpdateQuantity(index, editQuantity)}
                iconColor={colors.success}
              />
              <TouchableOpacity
                onPress={() => {
                  setEditingItemIndex(null);
                  setEditQuantity('');
                }}
                style={styles.removeButtonSmall}
              >
                <Text style={styles.removeButtonTextSmall}>×</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              onPress={() => {
                setEditingItemIndex(index);
                setEditQuantity(item.quantity.toString());
              }}
              style={styles.quantityChip}
            >
              <Chip style={styles.quantityChipInner}>
                {item.quantity} {item.unit}
              </Chip>
            </TouchableOpacity>
          )}
        </View>
      </Card.Content>
    </Card>
  );

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <Card style={styles.formCard}>
          <Card.Content>
            <Title style={styles.sectionTitle}>Kit Information</Title>
            
            <CustomTextInput
              label="Kit Name *"
              value={kitName}
              onChangeText={setKitName}
              style={[globalFormStyles.input, styles.input]}
              mode="outlined"
              placeholder="e.g., Crown Preparation"
            />
            
            <CustomTextInput
              label="Description"
              value={kitDescription}
              onChangeText={setKitDescription}
              style={[globalFormStyles.input, styles.input]}
              mode="outlined"
              multiline
              numberOfLines={3}
              placeholder="Brief description of the procedure"
            />
          </Card.Content>
        </Card>

        <Card style={styles.templatesCard}>
          <Card.Content>
            <Title style={styles.sectionTitle}>Quick Templates</Title>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {predefinedTemplates.map((template, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => handleApplyTemplate(template)}
                  style={styles.templateChip}
                >
                  <Chip style={styles.templateChipInner}>
                    {template.name}
                  </Chip>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Card.Content>
        </Card>

        <Card style={styles.itemsCard}>
          <Card.Content>
            <View style={styles.itemsHeader}>
              <Title style={styles.sectionTitle}>Kit Items ({selectedItems.length})</Title>
              <Button
                mode="contained"
                onPress={() => setShowItemPicker(true)}
                icon="plus"
                compact
                buttonColor={colors.primary}
              >
                Add Item
              </Button>
            </View>
            
            {selectedItems.length === 0 ? (
              <View style={styles.emptyItems}>
                <Text style={styles.emptyText}>No items added yet</Text>
                <Text style={styles.emptySubtext}>Tap "Add Item" to select from inventory</Text>
              </View>
            ) : (
              <FlatList
                data={selectedItems}
                renderItem={renderSelectedItem}
                keyExtractor={(item, index) => index.toString()}
                scrollEnabled={false}
              />
            )}
          </Card.Content>
        </Card>

        <View style={styles.buttonContainer}>
          <Button
            mode="outlined"
            onPress={() => navigation.goBack()}
            style={styles.button}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            mode="contained"
            onPress={handleSave}
            style={styles.button}
            loading={saving}
            disabled={saving}
            buttonColor={colors.primary}
          >
            {isEditing ? 'Update Kit' : 'Create Kit'}
          </Button>
        </View>
      </ScrollView>

      <Portal>
        <Dialog visible={showItemPicker} onDismiss={() => setShowItemPicker(false)} style={styles.dialog}>
          <Dialog.Title>Select Items from Inventory</Dialog.Title>
          <Dialog.Content style={styles.dialogContent}>
            <Searchbar
              placeholder="Search inventory..."
              onChangeText={setItemSearchQuery}
              value={itemSearchQuery}
              style={styles.searchbar}
            />
            
            <ScrollView style={styles.inventoryList}>
              {filteredInventory.map(item => (
                <List.Item
                  key={item.id}
                  title={item.productName || item.name || 'Unnamed Item'}
                  description={`Stock: ${item.currentQuantity || 0} ${item.unit || 'units'} • ${item.category || 'Uncategorized'}`}
                  onPress={() => handleAddItem(item)}
                  left={props => <List.Icon {...props} icon="package-variant" />}
                  style={styles.inventoryItem}
                  disabled={selectedItems.some(selected => selected.inventoryId === item.id)}
                />
              ))}
            </ScrollView>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowItemPicker(false)}>Close</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  formCard: {
    margin: spacing.md,
    borderRadius: borderRadius.lg,
    ...shadows.medium,
  },
  templatesCard: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
    ...shadows.medium,
  },
  itemsCard: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
    ...shadows.medium,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  input: {
    marginBottom: spacing.md,
  },
  templateChip: {
    marginRight: spacing.sm,
  },
  templateChipInner: {
    backgroundColor: (colors.primaryLight || '#A4CDF0') + '20',
  },
  itemsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  itemCard: {
    marginBottom: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
  },
  unmappedCard: {
    backgroundColor: (colors.warningLight || '#F8C471') + '10',
    borderLeftWidth: 3,
    borderLeftColor: colors.warning || '#F39C12',
  },
  itemContent: {
    padding: spacing.sm,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    color: colors.textPrimary,
  },
  unmappedLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.warning,
    marginTop: 2,
  },
  removeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.dangerLight + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.sm,
  },
  removeButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.danger,
    lineHeight: 20,
  },
  removeButtonSmall: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.dangerLight + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.xs,
  },
  removeButtonTextSmall: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.danger,
    lineHeight: 16,
  },
  quantityRow: {
    marginTop: spacing.sm,
  },
  quantityChip: {
    alignSelf: 'flex-start',
  },
  quantityChipInner: {
    backgroundColor: colors.lightGray,
  },
  editQuantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityInput: {
    width: 80,
    height: 35,
  },
  emptyItems: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: typography.fontSize.md,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  emptySubtext: {
    fontSize: typography.fontSize.sm,
    color: colors.textTertiary,
  },
  buttonContainer: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.md,
  },
  button: {
    flex: 1,
    borderRadius: borderRadius.lg,
  },
  dialog: {
    maxHeight: '80%',
  },
  dialogContent: {
    height: 400,
  },
  searchbar: {
    marginBottom: spacing.md,
    elevation: 0,
    backgroundColor: colors.lightGray,
  },
  inventoryList: {
    flex: 1,
  },
  inventoryItem: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
});

export default TreatmentKitDetailScreen;
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity, FlatList } from 'react-native';
import { 
  Card, 
  Title, 
  Paragraph, 
  Button,
  Text,
  Searchbar,
  Chip,
  List,
  ActivityIndicator,
  Portal,
  Dialog
} from 'react-native-paper';
import CustomTextInput from '../components/common/CustomTextInput';
import { useDispatch, useSelector } from 'react-redux';
import { collection, onSnapshot, updateDoc, doc, addDoc, Timestamp, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import { addTransfer } from '../store/slices/practicesSlice';
import { colors, spacing, borderRadius, typography, shadows } from '../constants/theme';
import { globalFormStyles } from '../styles/globalFormFixes';

const StockTransferScreen = ({ navigation, route }) => {
  const dispatch = useDispatch();
  const { practices } = useSelector((state) => state.practices);
  const { items } = useSelector((state) => state.inventory);
  const { user } = useSelector((state) => state.auth);
  
  const fromPracticeId = route?.params?.fromPracticeId;
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItems, setSelectedItems] = useState([]);
  const [transferQuantities, setTransferQuantities] = useState({});
  const [destinationPracticeId, setDestinationPracticeId] = useState('');
  const [transferNotes, setTransferNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmDialogVisible, setConfirmDialogVisible] = useState(false);

  // Get available source practices (practices with inventory)
  const sourcePractices = practices.filter(practice => 
    items.some(item => (item.assignedPracticeId || item.practiceId) === practice.id)
  );

  // Get current source practice
  const [sourcePracticeId, setSourcePracticeId] = useState(fromPracticeId || '');
  
  // Get items available at the selected source practice
  const sourceItems = items.filter(item => 
    (item.assignedPracticeId || item.practiceId) === sourcePracticeId &&
    item.currentQuantity > 0
  );

  // Filter items based on search
  const filteredItems = sourceItems.filter(item =>
    (item.productName || '').toLowerCase().includes((searchQuery || '').toLowerCase()) ||
    (item.barcode || '').toLowerCase().includes((searchQuery || '').toLowerCase())
  );

  // Get available destination practices (exclude source practice)
  const destinationPractices = practices.filter(practice => practice.id !== sourcePracticeId);

  const getPracticeName = (practiceId) => {
    const practice = practices.find(practice => practice.id === practiceId);
    return practice ? practice.name : 'Unknown Practice';
  };

  const handleItemToggle = (item) => {
    const isSelected = selectedItems.some(selected => selected.id === item.id);
    
    if (isSelected) {
      setSelectedItems(prev => prev.filter(selected => selected.id !== item.id));
      setTransferQuantities(prev => {
        const newQuantities = { ...prev };
        delete newQuantities[item.id];
        return newQuantities;
      });
    } else {
      setSelectedItems(prev => [...prev, item]);
      setTransferQuantities(prev => ({
        ...prev,
        [item.id]: 1
      }));
    }
  };

  const handleQuantityChange = (itemId, quantity) => {
    const numQuantity = parseInt(quantity) || 0;
    setTransferQuantities(prev => ({
      ...prev,
      [itemId]: numQuantity
    }));
  };

  const validateTransfer = () => {
    if (!sourcePracticeId) {
      Alert.alert('Required Field', 'Please select a source practice');
      return false;
    }
    
    if (!destinationPracticeId) {
      Alert.alert('Required Field', 'Please select a destination practice');
      return false;
    }
    
    if (selectedItems.length === 0) {
      Alert.alert('No Items Selected', 'Please select at least one item to transfer');
      return false;
    }

    // Validate quantities
    for (const item of selectedItems) {
      const transferQty = transferQuantities[item.id] || 0;
      if (transferQty <= 0) {
        Alert.alert('Invalid Quantity', `Please enter a valid quantity for ${item.productName}`);
        return false;
      }
      if (transferQty > item.currentQuantity) {
        Alert.alert('Insufficient Stock', `Not enough stock for ${item.productName}. Available: ${item.currentQuantity}`);
        return false;
      }
    }

    return true;
  };

  const handleTransferConfirm = async () => {
    if (!validateTransfer()) return;

    setLoading(true);
    try {
      // Create transfer record
      const transferData = {
        fromPracticeId: sourcePracticeId,
        fromPracticeName: getPracticeName(sourcePracticeId),
        toPracticeId: destinationPracticeId,
        toPracticeName: getPracticeName(destinationPracticeId),
        items: selectedItems.map(item => ({
          id: item.id,
          productName: item.productName,
          barcode: item.barcode,
          transferredQuantity: transferQuantities[item.id],
          unitCost: item.cost || 0,
        })),
        notes: transferNotes.trim(),
        transferredBy: user?.displayName || user?.email || 'Unknown',
        transferredAt: Timestamp.now(),
        practiceId: user?.uid,
      };

      // Add transfer record to history
      const transferRef = await addDoc(collection(db, 'stockTransfers'), transferData);
      dispatch(addTransfer({ ...transferData, id: transferRef.id }));

      // Update inventory quantities
      const updatePromises = selectedItems.map(async (item) => {
        const transferQty = transferQuantities[item.id];
        
        // Reduce quantity at source location
        await updateDoc(doc(db, 'inventory', item.id), {
          currentQuantity: item.currentQuantity - transferQty,
          updatedAt: Timestamp.now(),
        });

        // Check if item already exists at destination location
        const destinationItemQuery = query(
          collection(db, 'inventory'),
          where('productName', '==', item.productName),
          where('barcode', '==', item.barcode || ''),
          where('assignedPracticeId', '==', destinationPracticeId),
          where('practiceId', '==', user?.uid)
        );

        return new Promise((resolve) => {
          const unsubscribe = onSnapshot(destinationItemQuery, async (snapshot) => {
            unsubscribe(); // Unsubscribe immediately
            
            if (snapshot.docs.length > 0) {
              // Item exists at destination - increase quantity
              const existingItem = snapshot.docs[0];
              const currentQty = existingItem.data().currentQuantity || 0;
              
              await updateDoc(existingItem.ref, {
                currentQuantity: currentQty + transferQty,
                updatedAt: Timestamp.now(),
              });
            } else {
              // Item doesn't exist at destination - create new item
              await addDoc(collection(db, 'inventory'), {
                ...item,
                id: undefined, // Remove the old ID
                assignedPracticeId: destinationPracticeId, // Use new field for practice assignment
                practiceId: user?.uid, // Keep user ownership for security
                practiceName: getPracticeName(destinationPracticeId),
                currentQuantity: transferQty,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
              });
            }
            resolve();
          });
        });
      });

      await Promise.all(updatePromises);

      Alert.alert('Success', 'Stock transfer completed successfully', [
        {
          text: 'OK',
          onPress: () => navigation.goBack()
        }
      ]);

    } catch (error) {
      console.error('Transfer error:', error);
      Alert.alert('Error', 'Failed to complete stock transfer');
    } finally {
      setLoading(false);
      setConfirmDialogVisible(false);
    }
  };

  const renderPracticeSelector = (title, selectedId, onSelect, practiceList) => (
    <View style={styles.selectorContainer}>
      <Text style={styles.selectorTitle}>{title}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.practiceScroll}>
        {practiceList.map((practice) => (
          <TouchableOpacity
            key={practice.id}
            onPress={() => onSelect(practice.id)}
            style={[
              styles.practiceChip,
              selectedId === practice.id && styles.selectedPracticeChip
            ]}
          >
            <Text style={[
              styles.practiceLabel,
              selectedId === practice.id && styles.selectedPracticeLabel
            ]}>
              {practice.name}
            </Text>
            <Text style={styles.practiceTypeLabel}>{practice.type}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderItemCard = (item) => {
    const isSelected = selectedItems.some(selected => selected.id === item.id);
    const transferQty = transferQuantities[item.id] || 1;

    return (
      <Card key={item.id} style={[styles.itemCard, isSelected && styles.selectedItemCard]}>
        <TouchableOpacity onPress={() => handleItemToggle(item)}>
          <Card.Content style={styles.itemContent}>
            <View style={styles.itemHeader}>
              <View style={styles.itemInfo}>
                <Title style={styles.itemName}>{item.productName}</Title>
                {item.barcode && (
                  <Paragraph style={styles.itemBarcode}>Barcode: {item.barcode}</Paragraph>
                )}
                <Paragraph style={styles.itemStock}>
                  Available: {item.currentQuantity} {item.unit || 'units'}
                </Paragraph>
              </View>
              <View style={[styles.checkbox, isSelected && styles.checkedBox]}>
                {isSelected && <Text style={styles.checkmark}>✓</Text>}
              </View>
            </View>
            
            {isSelected && (
              <View style={styles.quantityContainer}>
                <Text style={styles.quantityLabel}>Transfer Quantity:</Text>
                <View style={styles.quantityInputContainer}>
                  <TouchableOpacity
                    onPress={() => handleQuantityChange(item.id, Math.max(1, transferQty - 1))}
                    style={styles.quantityButton}
                  >
                    <Text style={styles.quantityButtonText}>-</Text>
                  </TouchableOpacity>
                  <CustomTextInput
                    value={transferQty.toString()}
                    onChangeText={(text) => handleQuantityChange(item.id, text)}
                    style={styles.quantityInput}
                    keyboardType="numeric"
                    textAlign="center"
                  />
                  <TouchableOpacity
                    onPress={() => handleQuantityChange(item.id, Math.min(item.currentQuantity, transferQty + 1))}
                    style={styles.quantityButton}
                  >
                    <Text style={styles.quantityButtonText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </Card.Content>
        </TouchableOpacity>
      </Card>
    );
  };

  const getTotalItemsToTransfer = () => {
    return Object.values(transferQuantities).reduce((sum, qty) => sum + qty, 0);
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Source Practice Selection */}
        {renderPracticeSelector(
          'From Practice', 
          sourcePracticeId, 
          setSourcePracticeId, 
          sourcePractices
        )}

        {/* Destination Practice Selection */}
        {sourcePracticeId && renderPracticeSelector(
          'To Practice', 
          destinationPracticeId, 
          setDestinationPracticeId, 
          destinationPractices
        )}

        {/* Items Selection */}
        {sourcePracticeId && (
          <View style={styles.itemsSection}>
            <Text style={styles.sectionTitle}>Select Items to Transfer</Text>
            
            <Searchbar
              placeholder="Search inventory items..."
              onChangeText={setSearchQuery}
              value={searchQuery}
              style={styles.searchbar}
            />

            {filteredItems.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  {sourceItems.length === 0 
                    ? 'No items available at selected practice'
                    : 'No items match your search'
                  }
                </Text>
              </View>
            ) : (
              <View style={styles.itemsList}>
                {filteredItems.map(renderItemCard)}
              </View>
            )}
          </View>
        )}

        {/* Transfer Notes */}
        {selectedItems.length > 0 && (
          <View style={styles.notesSection}>
            <CustomTextInput
              label="Transfer Notes (Optional)"
              value={transferNotes}
              onChangeText={setTransferNotes}
              style={[styles.notesInput, globalFormStyles.input]}
              mode="outlined"
              multiline
              numberOfLines={3}
              placeholder="Add any notes about this transfer..."
            />
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Transfer Summary & Button */}
      {selectedItems.length > 0 && destinationPracticeId && (
        <View style={styles.bottomContainer}>
          <Card style={styles.summaryCard}>
            <Card.Content style={styles.summaryContent}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Items:</Text>
                <Text style={styles.summaryValue}>{selectedItems.length}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Total Quantity:</Text>
                <Text style={styles.summaryValue}>{getTotalItemsToTransfer()}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>From:</Text>
                <Text style={styles.summaryValue}>{getPracticeName(sourcePracticeId)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>To:</Text>
                <Text style={styles.summaryValue}>{getPracticeName(destinationPracticeId)}</Text>
              </View>
            </Card.Content>
          </Card>
          
          <Button
            mode="contained"
            onPress={() => setConfirmDialogVisible(true)}
            loading={loading}
            disabled={loading}
            style={styles.transferButton}
            buttonColor={colors.primary}
          >
            Confirm Transfer
          </Button>
        </View>
      )}

      {/* Confirmation Dialog */}
      <Portal>
        <Dialog visible={confirmDialogVisible} onDismiss={() => setConfirmDialogVisible(false)}>
          <Dialog.Title>Confirm Stock Transfer</Dialog.Title>
          <Dialog.Content>
            <Paragraph>
              Transfer {selectedItems.length} items ({getTotalItemsToTransfer()} total quantity) 
              from {getPracticeName(sourcePracticeId)} to {getPracticeName(destinationPracticeId)}?
            </Paragraph>
            {transferNotes.trim() && (
              <Paragraph style={styles.dialogNotes}>
                Notes: {transferNotes.trim()}
              </Paragraph>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setConfirmDialogVisible(false)}>Cancel</Button>
            <Button onPress={handleTransferConfirm} loading={loading} textColor={colors.primary}>
              Confirm Transfer
            </Button>
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
  content: {
    flex: 1,
  },
  selectorContainer: {
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  selectorTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  practiceScroll: {
    marginBottom: spacing.sm,
  },
  practiceChip: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
    minWidth: 100,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  selectedPracticeChip: {
    backgroundColor: colors.primaryLight + '30',
    borderColor: colors.primary,
  },
  practiceLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.textPrimary,
  },
  selectedPracticeLabel: {
    color: colors.primary,
  },
  practiceTypeLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  itemsSection: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  searchbar: {
    marginBottom: spacing.md,
    elevation: 2,
  },
  itemsList: {
    gap: spacing.sm,
  },
  itemCard: {
    borderRadius: borderRadius.lg,
    ...shadows.small,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  selectedItemCard: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight + '10',
  },
  itemContent: {
    padding: spacing.md,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  itemBarcode: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  itemStock: {
    fontSize: typography.fontSize.sm,
    color: colors.textTertiary,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.sm,
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
  quantityContainer: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  quantityLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  quantityInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryLight + '30',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: spacing.sm,
  },
  quantityButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
  },
  quantityInput: {
    width: 80,
    textAlign: 'center',
  },
  notesSection: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  notesInput: {
    marginBottom: spacing.sm,
  },
  emptyContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: typography.fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  bottomContainer: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  summaryCard: {
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
  },
  summaryContent: {
    padding: spacing.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  summaryLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
  summaryValue: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.textPrimary,
  },
  transferButton: {
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.xs,
  },
  dialogNotes: {
    marginTop: spacing.md,
    fontStyle: 'italic',
    color: colors.textSecondary,
  },
});

export default StockTransferScreen;
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity, Modal, TextInput } from 'react-native';
import { 
  FAB, 
  Card, 
  Title, 
  Paragraph, 
  Searchbar, 
  Chip,
  List,
  Badge,
  Button,
  Text,
  ActivityIndicator,
  IconButton,
  Portal,
  Dialog
} from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { collection, onSnapshot, deleteDoc, doc, addDoc, updateDoc, Timestamp, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import { verifyOwnership, verifyMultipleOwnership } from '../utils/security';
import { setKits, setLoading, setActiveKit } from '../store/slices/treatmentKitsSlice';
import { colors, spacing, borderRadius, typography, shadows } from '../constants/theme';

const TreatmentKitsScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { kits, loading } = useSelector((state) => state.treatmentKits);
  const { user } = useSelector((state) => state.auth);
  const { items } = useSelector((state) => state.inventory);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [kitToDelete, setKitToDelete] = useState(null);
  const [checkoutDialogVisible, setCheckoutDialogVisible] = useState(false);
  const [selectedKit, setSelectedKit] = useState(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const predefinedKits = [
    { name: 'Crown Preparation', icon: '👑', color: colors.primary || '#2E86AB' },
    { name: 'Root Canal', icon: '🦷', color: colors.danger || '#E74C3C' },
    { name: 'Extraction', icon: '🔧', color: colors.warning || '#F39C12' },
    { name: 'Filling', icon: '🔨', color: colors.success || '#2ECC71' },
    { name: 'Cleaning', icon: '✨', color: colors.info || '#3498DB' },
    { name: 'Whitening', icon: '⚪', color: colors.secondary || '#F24236' },
  ];

  useEffect(() => {
    if (!user?.uid) return;

    dispatch(setLoading(true));
    
    const q = query(collection(db, 'treatmentKits'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const kitsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        lastUsed: doc.data().lastUsed?.toDate(),
      }));
      dispatch(setKits(kitsData));
      dispatch(setLoading(false));
    }, (error) => {
      console.error('Error fetching treatment kits:', error);
      dispatch(setLoading(false));
    });

    return () => unsubscribe();
  }, [user, dispatch]);

  const filteredKits = (kits || []).filter(kit => 
    (kit.name || '').toLowerCase().includes((searchQuery || '').toLowerCase()) ||
    (kit.description || '').toLowerCase().includes((searchQuery || '').toLowerCase())
  );

  const handleCreateKit = () => {
    navigation.navigate('TreatmentKitDetail');
  };

  const handleEditKit = (kit) => {
    dispatch(setActiveKit(kit));
    navigation.navigate('TreatmentKitDetail', { kitId: kit.id });
  };

  const handleDeleteKit = async () => {
    if (!kitToDelete) return;
    
    try {
      // SECURITY FIX: Verify ownership before deleting
      const hasPermission = await verifyOwnership('treatmentKits', kitToDelete.id);
      if (!hasPermission) {
        Alert.alert('Access Denied', 'You do not have permission to delete this kit.');
        return;
      }

      await deleteDoc(doc(db, 'treatmentKits', kitToDelete.id));
      Alert.alert('Success', 'Treatment kit deleted successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to delete treatment kit');
      console.error(error);
    } finally {
      setDeleteDialogVisible(false);
      setKitToDelete(null);
    }
  };

  const confirmDelete = (kit) => {
    setKitToDelete(kit);
    setDeleteDialogVisible(true);
  };

  const handleQuickCheckout = (kit) => {
    setSelectedKit(kit);
    setCheckoutDialogVisible(true);
  };

  const performCheckout = async () => {
    if (!selectedKit) return;
    
    setCheckoutLoading(true);
    
    try {
      const insufficientItems = [];
      const updatePromises = [];
      
      for (const kitItem of selectedKit.items) {
        const inventoryItem = items.find(item => item.id === kitItem.inventoryId);
        
        if (!inventoryItem) {
          insufficientItems.push(kitItem.name);
          continue;
        }
        
        const newQuantity = inventoryItem.currentQuantity - kitItem.quantity;
        
        if (newQuantity < 0) {
          insufficientItems.push(`${kitItem.name} (need ${kitItem.quantity}, have ${inventoryItem.currentQuantity})`);
        } else {
          updatePromises.push(
            (async () => {
              // SECURITY FIX: Verify ownership before updating inventory
              const hasPermission = await verifyOwnership('inventory', kitItem.inventoryId);
              if (!hasPermission) {
                throw new Error(`Access denied for inventory item: ${kitItem.name}`);
              }
              return updateDoc(doc(db, 'inventory', kitItem.inventoryId), {
                currentQuantity: newQuantity,
                lastUpdated: Timestamp.now(),
                lastModifiedBy: user?.uid
              });
            })()
          );
          
          updatePromises.push(
            addDoc(collection(db, 'stockLog'), {
              inventoryId: kitItem.inventoryId,
              userId: user?.uid,
              userName: user?.email,
              type: 'checkout',
              quantity: kitItem.quantity,
              previousQuantity: inventoryItem.currentQuantity,
              newQuantity: newQuantity,
              reason: `Treatment Kit: ${selectedKit.name}`,
              timestamp: Timestamp.now()
            })
          );
        }
      }
      
      if (insufficientItems.length > 0) {
        Alert.alert(
          'Insufficient Stock',
          `Cannot complete checkout. Insufficient stock for:\n${insufficientItems.join('\n')}`,
          [{ text: 'OK' }]
        );
        setCheckoutLoading(false);
        return;
      }
      
      await Promise.all(updatePromises);
      
      // SECURITY FIX: Verify ownership before updating kit
      const hasPermission = await verifyOwnership('treatmentKits', selectedKit.id);
      if (!hasPermission) {
        Alert.alert('Access Denied', 'You do not have permission to update this kit.');
        return;
      }

      await updateDoc(doc(db, 'treatmentKits', selectedKit.id), {
        lastUsed: Timestamp.now(),
        usageCount: (selectedKit.usageCount || 0) + 1,
        lastModifiedBy: user?.uid
      });
      
      Alert.alert('Success', `All items from "${selectedKit.name}" kit checked out successfully`);
      setCheckoutDialogVisible(false);
      setSelectedKit(null);
    } catch (error) {
      Alert.alert('Error', 'Failed to checkout items');
      console.error(error);
    } finally {
      setCheckoutLoading(false);
    }
  };

  const renderKitCard = (kit) => {
    const predefined = predefinedKits.find(p => p.name === kit.name);
    const totalItems = kit.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
    
    return (
      <Card key={kit.id} style={styles.kitCard}>
        <TouchableOpacity onPress={() => handleEditKit(kit)}>
          <Card.Content style={styles.kitContent}>
            <View style={styles.kitHeader}>
              <View style={styles.kitTitleRow}>
                <Text style={styles.kitIcon}>{predefined?.icon || '📦'}</Text>
                <View style={styles.kitInfo}>
                  <Title style={styles.kitName}>{kit.name}</Title>
                  {kit.description && (
                    <Paragraph style={styles.kitDescription}>{kit.description}</Paragraph>
                  )}
                </View>
              </View>
              <TouchableOpacity
                onPress={() => confirmDelete(kit)}
                style={styles.menuButton}
              >
                <Text style={styles.menuButtonText}>⋮</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.kitStats}>
              <Chip 
                style={[styles.statChip, { backgroundColor: (colors.primaryLight || '#A4CDF0') + '20' }]}
                textStyle={{ color: colors.primary || '#2E86AB', fontSize: 12 }}
              >
                {kit.items?.length || 0} items
              </Chip>
              <Chip 
                style={[styles.statChip, { backgroundColor: (colors.successLight || '#58D68D') + '20' }]}
                textStyle={{ color: colors.success || '#2ECC71', fontSize: 12 }}
              >
                {totalItems} total qty
              </Chip>
              {kit.usageCount > 0 && (
                <Chip 
                  style={[styles.statChip, { backgroundColor: (colors.infoLight || '#85C1E9') + '20' }]}
                  textStyle={{ color: colors.info || '#3498DB', fontSize: 12 }}
                >
                  Used {kit.usageCount}x
                </Chip>
              )}
            </View>
            
            <View style={styles.kitActions}>
              <TouchableOpacity
                onPress={() => handleQuickCheckout(kit)}
                style={styles.checkoutButton}
              >
                <Text style={styles.checkoutButtonIcon}>🛒</Text>
                <Text style={styles.checkoutButtonText}>Quick Checkout</Text>
              </TouchableOpacity>
              <Button
                mode="outlined"
                onPress={() => handleEditKit(kit)}
                style={styles.editButton}
                textColor={colors.primary}
              >
                Edit
              </Button>
            </View>
          </Card.Content>
        </TouchableOpacity>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          placeholder="Search treatment kits..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchInput}
          placeholderTextColor={colors.textSecondary}
        />
      </View>
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : filteredKits.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🏥</Text>
          <Title style={styles.emptyTitle}>No Treatment Kits</Title>
          <Paragraph style={styles.emptyText}>
            Create pre-configured supply lists for common procedures
          </Paragraph>
          <Button
            mode="contained"
            onPress={handleCreateKit}
            style={styles.emptyButton}
            buttonColor={colors.primary}
          >
            Create First Kit
          </Button>
        </View>
      ) : (
        <ScrollView style={styles.listContainer} showsVerticalScrollIndicator={false}>
          {filteredKits.map(renderKitCard)}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}
      
      <TouchableOpacity
        style={styles.fab}
        onPress={handleCreateKit}
        activeOpacity={0.8}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
      
      <Portal>
        <Dialog visible={deleteDialogVisible} onDismiss={() => setDeleteDialogVisible(false)}>
          <Dialog.Title>Delete Treatment Kit</Dialog.Title>
          <Dialog.Content>
            <Paragraph>Are you sure you want to delete "{kitToDelete?.name}"?</Paragraph>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDeleteDialogVisible(false)}>Cancel</Button>
            <Button onPress={handleDeleteKit} textColor={colors.danger}>Delete</Button>
          </Dialog.Actions>
        </Dialog>
        
        <Dialog visible={checkoutDialogVisible} onDismiss={() => setCheckoutDialogVisible(false)}>
          <Dialog.Title>Quick Checkout</Dialog.Title>
          <Dialog.Content>
            <Paragraph>
              Checkout all items in "{selectedKit?.name}" kit?
            </Paragraph>
            {selectedKit?.items?.map((item, index) => (
              <View key={index} style={styles.checkoutItem}>
                <Text>• {item.name}: {item.quantity} {item.unit}</Text>
              </View>
            ))}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setCheckoutDialogVisible(false)} disabled={checkoutLoading}>
              Cancel
            </Button>
            <Button 
              onPress={performCheckout} 
              textColor={colors.primary}
              loading={checkoutLoading}
              disabled={checkoutLoading}
            >
              Checkout All
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    margin: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    elevation: 2,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  searchIcon: {
    fontSize: 18,
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.fontSize.md,
    color: colors.textPrimary,
    paddingVertical: spacing.xs,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    flex: 1,
    padding: spacing.md,
  },
  kitCard: {
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
    ...shadows.medium,
  },
  kitContent: {
    padding: spacing.md,
  },
  kitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  kitTitleRow: {
    flexDirection: 'row',
    flex: 1,
  },
  kitIcon: {
    fontSize: 32,
    marginRight: spacing.md,
  },
  kitInfo: {
    flex: 1,
  },
  kitName: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  kitDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
  menuButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.gray,
    lineHeight: 18,
  },
  kitStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  statChip: {
    height: 28,
  },
  kitActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  checkoutButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  checkoutButtonIcon: {
    fontSize: 16,
    marginRight: spacing.sm,
  },
  checkoutButtonText: {
    color: colors.white,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
  },
  editButton: {
    borderRadius: borderRadius.md,
    borderColor: colors.primary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: typography.fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  emptyButton: {
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.xl,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: colors.black,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  fabText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.white,
    lineHeight: 24,
  },
  checkoutItem: {
    paddingVertical: spacing.xs,
  },
});

export default TreatmentKitsScreen;
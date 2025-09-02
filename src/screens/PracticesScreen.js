import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
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
  Portal,
  Dialog,
  TextInput as PaperTextInput
} from 'react-native-paper';
import CustomTextInput from '../components/common/CustomTextInput';
import { useDispatch, useSelector } from 'react-redux';
import { collection, onSnapshot, deleteDoc, doc, addDoc, updateDoc, Timestamp, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import { verifyOwnership, ensureOwnership } from '../utils/security';
import { setPractices, setLoading, addPractice, updatePractice } from '../store/slices/practicesSlice';
import { colors, spacing, borderRadius, typography, shadows } from '../constants/theme';
import { globalFormStyles } from '../styles/globalFormFixes';

const PracticesScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { practices, loading } = useSelector((state) => state.practices);
  const { user } = useSelector((state) => state.auth);
  const { items } = useSelector((state) => state.inventory);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [practiceToDelete, setPracticeToDelete] = useState(null);
  const [editDialogVisible, setEditDialogVisible] = useState(false);
  const [editingPractice, setEditingPractice] = useState(null);
  const [practiceForm, setPracticeForm] = useState({
    name: '',
    type: 'practice',
    description: '',
    address: '',
  });

  const practiceTypes = [
    { value: 'practice', label: 'Practice', icon: '🦷' },
  ];

  useEffect(() => {
    if (!user?.uid) return;

    dispatch(setLoading(true));
    
    const q = query(collection(db, 'practices'), where('practiceId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const practicesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
      }));
      dispatch(setPractices(practicesData));
      dispatch(setLoading(false));
    }, (error) => {
      console.error('Error fetching practices:', error);
      dispatch(setLoading(false));
    });

    return () => unsubscribe();
  }, [user, dispatch]);

  const filteredPractices = (practices || []).filter(practice =>
    (practice.name || '').toLowerCase().includes((searchQuery || '').toLowerCase()) ||
    (practice.type || '').toLowerCase().includes((searchQuery || '').toLowerCase())
  );

  const getPracticeInventoryCount = (practiceId) => {
    return items.filter(item => (item.assignedPracticeId || item.practiceId) === practiceId).length;
  };

  const getPracticeLowStockCount = (practiceId) => {
    return items.filter(item => 
      (item.assignedPracticeId || item.practiceId) === practiceId && 
      item.currentQuantity <= item.minStockLevel
    ).length;
  };

  const handleCreatePractice = () => {
    setEditingPractice(null);
    setPracticeForm({
      name: '',
      type: 'practice',
      description: '',
      address: '',
    });
    setEditDialogVisible(true);
  };

  const handleEditPractice = (practice) => {
    setEditingPractice(practice);
    setPracticeForm({
      name: practice.name || '',
      type: practice.type || 'practice',
      description: practice.description || '',
      address: practice.address || '',
    });
    setEditDialogVisible(true);
  };

  const handleSavePractice = async () => {
    if (!practiceForm.name.trim()) {
      Alert.alert('Required Field', 'Please enter a practice name');
      return;
    }

    try {
      const practiceData = {
        name: practiceForm.name.trim(),
        type: practiceForm.type,
        description: practiceForm.description.trim(),
        address: practiceForm.address.trim(),
        practiceId: user?.uid,
        updatedAt: Timestamp.now(),
      };

      if (editingPractice) {
        // SECURITY FIX: Verify ownership before updating
        const hasPermission = await verifyOwnership('practices', editingPractice.id);
        if (!hasPermission) {
          Alert.alert('Access Denied', 'You do not have permission to modify this practice.');
          return;
        }
        
        await updateDoc(doc(db, 'practices', editingPractice.id), {
          ...practiceData,
          lastModifiedBy: user?.uid
        });
        Alert.alert('Success', 'Practice updated successfully');
      } else {
        // SECURITY FIX: Ensure ownership for new practices
        const securedPracticeData = ensureOwnership({
          ...practiceData,
          createdAt: Timestamp.now(),
        });
        await addDoc(collection(db, 'practices'), securedPracticeData);
        Alert.alert('Success', 'Practice created successfully');
      }

      setEditDialogVisible(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to save practice');
      console.error(error);
    }
  };

  const handleDeletePractice = async () => {
    if (!practiceToDelete) return;
    
    // Check if practice has inventory items
    const practiceItems = items.filter(item => (item.assignedPracticeId || item.practiceId) === practiceToDelete.id);
    if (practiceItems.length > 0) {
      Alert.alert(
        'Cannot Delete Practice',
        `This practice has ${practiceItems.length} inventory items. Please transfer or remove all items before deleting the practice.`
      );
      setDeleteDialogVisible(false);
      return;
    }
    
    try {
      // SECURITY FIX: Verify ownership before deleting
      const hasPermission = await verifyOwnership('practices', practiceToDelete.id);
      if (!hasPermission) {
        Alert.alert('Access Denied', 'You do not have permission to delete this practice.');
        return;
      }

      await deleteDoc(doc(db, 'practices', practiceToDelete.id));
      Alert.alert('Success', 'Practice deleted successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to delete practice');
      console.error(error);
    } finally {
      setDeleteDialogVisible(false);
      setPracticeToDelete(null);
    }
  };

  const confirmDelete = (practice) => {
    setPracticeToDelete(practice);
    setDeleteDialogVisible(true);
  };

  const getPracticeTypeInfo = (type) => {
    return practiceTypes.find(t => t.value === type) || practiceTypes[0];
  };

  const renderPracticeCard = (practice) => {
    const typeInfo = getPracticeTypeInfo(practice.type);
    const inventoryCount = getPracticeInventoryCount(practice.id);
    const lowStockCount = getPracticeLowStockCount(practice.id);
    
    return (
      <Card key={practice.id} style={styles.practiceCard}>
        <TouchableOpacity onPress={() => handleEditPractice(practice)}>
          <Card.Content style={styles.practiceContent}>
            <View style={styles.practiceHeader}>
              <View style={styles.practiceTitleRow}>
                <Text style={styles.practiceIcon}>{typeInfo.icon}</Text>
                <View style={styles.practiceInfo}>
                  <Title style={styles.practiceName}>{practice.name}</Title>
                  <Paragraph style={styles.practiceType}>{typeInfo.label}</Paragraph>
                  {practice.description && (
                    <Paragraph style={styles.practiceDescription}>{practice.description}</Paragraph>
                  )}
                </View>
              </View>
              <TouchableOpacity
                onPress={() => confirmDelete(practice)}
                style={styles.deleteButton}
              >
                <Text style={styles.deleteButtonText}>×</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.practiceStats}>
              <Chip 
                style={[styles.statChip, { backgroundColor: (colors.primaryLight || '#A4CDF0') + '20' }]}
                textStyle={{ color: colors.primary || '#2E86AB', fontSize: 12 }}
              >
                {inventoryCount} items
              </Chip>
              {lowStockCount > 0 && (
                <Chip 
                  style={[styles.statChip, { backgroundColor: (colors.warningLight || '#F8C471') + '20' }]}
                  textStyle={{ color: colors.warning || '#F39C12', fontSize: 12 }}
                >
                  {lowStockCount} low stock
                </Chip>
              )}
            </View>
            
            <View style={styles.practiceActions}>
              <Button
                mode="outlined"
                onPress={() => navigation.navigate('Inventory', { practiceId: practice.id })}
                style={styles.actionButton}
                textColor={colors.primary}
                compact
              >
                View Inventory
              </Button>
              <Button
                mode="outlined"
                onPress={() => navigation.navigate('StockTransfer', { fromPracticeId: practice.id })}
                style={styles.actionButton}
                textColor={colors.secondary}
                compact
              >
                Transfer Stock
              </Button>
            </View>
          </Card.Content>
        </TouchableOpacity>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      <Searchbar
        placeholder="Search practices..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchbar}
        icon={() => null}
      />
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : filteredPractices.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🦷</Text>
          <Title style={styles.emptyTitle}>No Practices</Title>
          <Paragraph style={styles.emptyText}>
            Create at least one practice to organize and manage your inventory
          </Paragraph>
          <Button
            mode="contained"
            onPress={handleCreatePractice}
            style={styles.emptyButton}
            buttonColor={colors.primary}
          >
            Create First Practice
          </Button>
        </View>
      ) : (
        <ScrollView style={styles.listContainer} showsVerticalScrollIndicator={false}>
          {filteredPractices.map(renderPracticeCard)}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}
      
      <TouchableOpacity
        style={styles.fab}
        onPress={handleCreatePractice}
        activeOpacity={0.8}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
      
      <Portal>
        <Dialog visible={deleteDialogVisible} onDismiss={() => setDeleteDialogVisible(false)}>
          <Dialog.Title>Delete Practice</Dialog.Title>
          <Dialog.Content>
            <Paragraph>Are you sure you want to delete "{practiceToDelete?.name}"?</Paragraph>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDeleteDialogVisible(false)}>Cancel</Button>
            <Button onPress={handleDeletePractice} textColor={colors.danger}>Delete</Button>
          </Dialog.Actions>
        </Dialog>
        
        <Dialog visible={editDialogVisible} onDismiss={() => setEditDialogVisible(false)} style={styles.editDialog}>
          <Dialog.Title>{editingPractice ? 'Edit Practice' : 'New Practice'}</Dialog.Title>
          <Dialog.Content>
            <View style={[styles.form, globalFormStyles.formContainer]}>
              <CustomTextInput
                label="Practice Name *"
                value={practiceForm.name}
                onChangeText={(text) => setPracticeForm(prev => ({ ...prev, name: text }))}
                style={[globalFormStyles.input, styles.input]}
                mode="outlined"
                placeholder="e.g., Downtown Dental Practice, Smith Family Dentistry"
              />
              
              <Text style={styles.fieldLabel}>Practice Type</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeSelector}>
                {practiceTypes.map((type) => (
                  <TouchableOpacity
                    key={type.value}
                    onPress={() => setPracticeForm(prev => ({ ...prev, type: type.value }))}
                    style={[
                      styles.typeChip,
                      practiceForm.type === type.value && styles.selectedTypeChip
                    ]}
                  >
                    <Text style={styles.typeIcon}>{type.icon}</Text>
                    <Text style={[
                      styles.typeLabel,
                      practiceForm.type === type.value && styles.selectedTypeLabel
                    ]}>
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              
              <CustomTextInput
                label="Description"
                value={practiceForm.description}
                onChangeText={(text) => setPracticeForm(prev => ({ ...prev, description: text }))}
                style={[globalFormStyles.input, styles.input]}
                mode="outlined"
                multiline
                numberOfLines={3}
                placeholder="Brief description or notes"
              />
              
              <CustomTextInput
                label="Address/Practice Details"
                value={practiceForm.address}
                onChangeText={(text) => setPracticeForm(prev => ({ ...prev, address: text }))}
                style={[globalFormStyles.input, styles.input]}
                mode="outlined"
                multiline
                numberOfLines={2}
                placeholder="Address, building, floor details"
              />
            </View>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setEditDialogVisible(false)}>Cancel</Button>
            <Button onPress={handleSavePractice} textColor={colors.primary}>
              {editingPractice ? 'Update' : 'Create'}
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
  searchbar: {
    margin: spacing.md,
    elevation: 2,
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
  practiceCard: {
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
    ...shadows.medium,
  },
  practiceContent: {
    padding: spacing.md,
  },
  practiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  practiceTitleRow: {
    flexDirection: 'row',
    flex: 1,
  },
  practiceIcon: {
    fontSize: 32,
    marginRight: spacing.md,
  },
  practiceInfo: {
    flex: 1,
  },
  practiceName: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  practiceType: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  practiceDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.textTertiary,
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.dangerLight + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.sm,
  },
  deleteButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.danger,
    lineHeight: 20,
  },
  practiceStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  statChip: {
    height: 28,
  },
  practiceActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
    borderRadius: borderRadius.md,
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
  editDialog: {
    maxHeight: '80%',
  },
  form: {
    gap: spacing.md,
  },
  input: {
    marginBottom: spacing.sm,
  },
  fieldLabel: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  typeSelector: {
    marginBottom: spacing.md,
  },
  typeChip: {
    backgroundColor: colors.lightGray,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
    alignItems: 'center',
    minWidth: 100,
  },
  selectedTypeChip: {
    backgroundColor: colors.primaryLight + '30',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  typeIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  typeLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  selectedTypeLabel: {
    color: colors.primary,
    fontWeight: typography.fontWeight.medium,
  },
});

export default PracticesScreen;
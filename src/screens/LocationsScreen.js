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
import { setLocations, setLoading, addLocation, updateLocation } from '../store/slices/locationsSlice';
import { colors, spacing, borderRadius, typography, shadows } from '../constants/theme';
import { globalFormStyles } from '../styles/globalFormFixes';

const LocationsScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { locations, loading } = useSelector((state) => state.locations);
  const { user } = useSelector((state) => state.auth);
  const { items } = useSelector((state) => state.inventory);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [locationToDelete, setLocationToDelete] = useState(null);
  const [editDialogVisible, setEditDialogVisible] = useState(false);
  const [editingLocation, setEditingLocation] = useState(null);
  const [locationForm, setLocationForm] = useState({
    name: '',
    type: 'operatory',
    description: '',
    address: '',
  });

  const locationTypes = [
    { value: 'operatory', label: 'Operatory', icon: '🦷' },
    { value: 'clinic', label: 'Clinic', icon: '🏥' },
    { value: 'storage', label: 'Storage', icon: '📦' },
    { value: 'sterilization', label: 'Sterilization', icon: '🧪' },
    { value: 'lab', label: 'Lab', icon: '🔬' },
  ];

  useEffect(() => {
    if (!user?.uid) return;

    dispatch(setLoading(true));
    
    const q = query(collection(db, 'locations'), where('practiceId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const locationsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
      }));
      dispatch(setLocations(locationsData));
      dispatch(setLoading(false));
    }, (error) => {
      console.error('Error fetching locations:', error);
      dispatch(setLoading(false));
    });

    return () => unsubscribe();
  }, [user, dispatch]);

  const filteredLocations = (locations || []).filter(location =>
    (location.name || '').toLowerCase().includes((searchQuery || '').toLowerCase()) ||
    (location.type || '').toLowerCase().includes((searchQuery || '').toLowerCase())
  );

  const getLocationInventoryCount = (locationId) => {
    return items.filter(item => item.locationId === locationId).length;
  };

  const getLocationLowStockCount = (locationId) => {
    return items.filter(item => 
      item.locationId === locationId && 
      item.currentQuantity <= item.minStockLevel
    ).length;
  };

  const handleCreateLocation = () => {
    setEditingLocation(null);
    setLocationForm({
      name: '',
      type: 'operatory',
      description: '',
      address: '',
    });
    setEditDialogVisible(true);
  };

  const handleEditLocation = (location) => {
    setEditingLocation(location);
    setLocationForm({
      name: location.name || '',
      type: location.type || 'operatory',
      description: location.description || '',
      address: location.address || '',
    });
    setEditDialogVisible(true);
  };

  const handleSaveLocation = async () => {
    if (!locationForm.name.trim()) {
      Alert.alert('Required Field', 'Please enter a location name');
      return;
    }

    try {
      const locationData = {
        name: locationForm.name.trim(),
        type: locationForm.type,
        description: locationForm.description.trim(),
        address: locationForm.address.trim(),
        practiceId: user?.uid,
        updatedAt: Timestamp.now(),
      };

      if (editingLocation) {
        // SECURITY FIX: Verify ownership before updating
        const hasPermission = await verifyOwnership('locations', editingLocation.id);
        if (!hasPermission) {
          Alert.alert('Access Denied', 'You do not have permission to modify this location.');
          return;
        }
        
        await updateDoc(doc(db, 'locations', editingLocation.id), {
          ...locationData,
          lastModifiedBy: user?.uid
        });
        Alert.alert('Success', 'Location updated successfully');
      } else {
        // SECURITY FIX: Ensure ownership for new locations
        const securedLocationData = ensureOwnership({
          ...locationData,
          createdAt: Timestamp.now(),
        });
        await addDoc(collection(db, 'locations'), securedLocationData);
        Alert.alert('Success', 'Location created successfully');
      }

      setEditDialogVisible(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to save location');
      console.error(error);
    }
  };

  const handleDeleteLocation = async () => {
    if (!locationToDelete) return;
    
    // Check if location has inventory items
    const locationItems = items.filter(item => item.locationId === locationToDelete.id);
    if (locationItems.length > 0) {
      Alert.alert(
        'Cannot Delete Location',
        `This location has ${locationItems.length} inventory items. Please transfer or remove all items before deleting the location.`
      );
      setDeleteDialogVisible(false);
      return;
    }
    
    try {
      // SECURITY FIX: Verify ownership before deleting
      const hasPermission = await verifyOwnership('locations', locationToDelete.id);
      if (!hasPermission) {
        Alert.alert('Access Denied', 'You do not have permission to delete this location.');
        return;
      }

      await deleteDoc(doc(db, 'locations', locationToDelete.id));
      Alert.alert('Success', 'Location deleted successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to delete location');
      console.error(error);
    } finally {
      setDeleteDialogVisible(false);
      setLocationToDelete(null);
    }
  };

  const confirmDelete = (location) => {
    setLocationToDelete(location);
    setDeleteDialogVisible(true);
  };

  const getLocationTypeInfo = (type) => {
    return locationTypes.find(t => t.value === type) || locationTypes[0];
  };

  const renderLocationCard = (location) => {
    const typeInfo = getLocationTypeInfo(location.type);
    const inventoryCount = getLocationInventoryCount(location.id);
    const lowStockCount = getLocationLowStockCount(location.id);
    
    return (
      <Card key={location.id} style={styles.locationCard}>
        <TouchableOpacity onPress={() => handleEditLocation(location)}>
          <Card.Content style={styles.locationContent}>
            <View style={styles.locationHeader}>
              <View style={styles.locationTitleRow}>
                <Text style={styles.locationIcon}>{typeInfo.icon}</Text>
                <View style={styles.locationInfo}>
                  <Title style={styles.locationName}>{location.name}</Title>
                  <Paragraph style={styles.locationType}>{typeInfo.label}</Paragraph>
                  {location.description && (
                    <Paragraph style={styles.locationDescription}>{location.description}</Paragraph>
                  )}
                </View>
              </View>
              <TouchableOpacity
                onPress={() => confirmDelete(location)}
                style={styles.deleteButton}
              >
                <Text style={styles.deleteButtonText}>×</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.locationStats}>
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
            
            <View style={styles.locationActions}>
              <Button
                mode="outlined"
                onPress={() => navigation.navigate('Inventory', { locationId: location.id })}
                style={styles.actionButton}
                textColor={colors.primary}
                compact
              >
                View Inventory
              </Button>
              <Button
                mode="outlined"
                onPress={() => navigation.navigate('StockTransfer', { fromLocationId: location.id })}
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
        placeholder="Search locations..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchbar}
      />
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : filteredLocations.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🏥</Text>
          <Title style={styles.emptyTitle}>No Locations</Title>
          <Paragraph style={styles.emptyText}>
            Create operatories, clinics, or storage areas to organize your inventory
          </Paragraph>
          <Button
            mode="contained"
            onPress={handleCreateLocation}
            style={styles.emptyButton}
            buttonColor={colors.primary}
          >
            Create First Location
          </Button>
        </View>
      ) : (
        <ScrollView style={styles.listContainer} showsVerticalScrollIndicator={false}>
          {filteredLocations.map(renderLocationCard)}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}
      
      <TouchableOpacity
        style={styles.fab}
        onPress={handleCreateLocation}
        activeOpacity={0.8}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
      
      <Portal>
        <Dialog visible={deleteDialogVisible} onDismiss={() => setDeleteDialogVisible(false)}>
          <Dialog.Title>Delete Location</Dialog.Title>
          <Dialog.Content>
            <Paragraph>Are you sure you want to delete "{locationToDelete?.name}"?</Paragraph>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDeleteDialogVisible(false)}>Cancel</Button>
            <Button onPress={handleDeleteLocation} textColor={colors.danger}>Delete</Button>
          </Dialog.Actions>
        </Dialog>
        
        <Dialog visible={editDialogVisible} onDismiss={() => setEditDialogVisible(false)} style={styles.editDialog}>
          <Dialog.Title>{editingLocation ? 'Edit Location' : 'New Location'}</Dialog.Title>
          <Dialog.Content>
            <View style={[styles.form, globalFormStyles.formContainer]}>
              <CustomTextInput
                label="Location Name *"
                value={locationForm.name}
                onChangeText={(text) => setLocationForm(prev => ({ ...prev, name: text }))}
                style={[globalFormStyles.input, styles.input]}
                mode="outlined"
                placeholder="e.g., Operatory 1, Main Clinic"
              />
              
              <Text style={styles.fieldLabel}>Location Type</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeSelector}>
                {locationTypes.map((type) => (
                  <TouchableOpacity
                    key={type.value}
                    onPress={() => setLocationForm(prev => ({ ...prev, type: type.value }))}
                    style={[
                      styles.typeChip,
                      locationForm.type === type.value && styles.selectedTypeChip
                    ]}
                  >
                    <Text style={styles.typeIcon}>{type.icon}</Text>
                    <Text style={[
                      styles.typeLabel,
                      locationForm.type === type.value && styles.selectedTypeLabel
                    ]}>
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              
              <CustomTextInput
                label="Description"
                value={locationForm.description}
                onChangeText={(text) => setLocationForm(prev => ({ ...prev, description: text }))}
                style={[globalFormStyles.input, styles.input]}
                mode="outlined"
                multiline
                numberOfLines={3}
                placeholder="Brief description or notes"
              />
              
              <CustomTextInput
                label="Address/Location Details"
                value={locationForm.address}
                onChangeText={(text) => setLocationForm(prev => ({ ...prev, address: text }))}
                style={[globalFormStyles.input, styles.input]}
                mode="outlined"
                multiline
                numberOfLines={2}
                placeholder="Building, floor, room details"
              />
            </View>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setEditDialogVisible(false)}>Cancel</Button>
            <Button onPress={handleSaveLocation} textColor={colors.primary}>
              {editingLocation ? 'Update' : 'Create'}
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
  locationCard: {
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
    ...shadows.medium,
  },
  locationContent: {
    padding: spacing.md,
  },
  locationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  locationTitleRow: {
    flexDirection: 'row',
    flex: 1,
  },
  locationIcon: {
    fontSize: 32,
    marginRight: spacing.md,
  },
  locationInfo: {
    flex: 1,
  },
  locationName: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  locationType: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  locationDescription: {
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
  locationStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  statChip: {
    height: 28,
  },
  locationActions: {
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

export default LocationsScreen;
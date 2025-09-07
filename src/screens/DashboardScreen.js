import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Animated, Text, TouchableOpacity, Modal, Alert } from 'react-native';
import { Card, Title, Paragraph, Button, Divider, Portal, Dialog, TextInput as PaperTextInput } from 'react-native-paper';
import CustomTextInput from '../components/common/CustomTextInput';
import { useSelector, useDispatch } from 'react-redux';
import { signOut } from 'firebase/auth';
import { auth, db } from '../config/firebase';
import { addDoc, collection, Timestamp } from 'firebase/firestore';
import { logout } from '../store/slices/authSlice';
import { ensureOwnership } from '../utils/security';
import { colors, spacing, borderRadius, typography, shadows, components } from '../constants/theme';
import { globalFormStyles } from '../styles/globalFormFixes';

const DashboardScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { lowStockItems, items } = useSelector((state) => state.inventory);
  const { practices } = useSelector((state) => state.practices);
  
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(30));
  const [selectedPracticeId, setSelectedPracticeId] = useState('all');
  const [showPracticeMenu, setShowPracticeMenu] = useState(false);
  const [showCheckInOutModal, setShowCheckInOutModal] = useState(false);
  const [showCreatePracticeModal, setShowCreatePracticeModal] = useState(false);
  const [newPracticeForm, setNewPracticeForm] = useState({
    name: '',
    type: 'practice',
    description: '',
    address: '',
  });

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Auto-select single practice when there's only one practice
  useEffect(() => {
    if (practices && practices.length === 1 && selectedPracticeId === 'all') {
      setSelectedPracticeId(practices[0].id);
    }
  }, [practices, selectedPracticeId]);

  const handleLogout = async () => {
    try {
      // Sign out from Firebase
      await signOut(auth);
      dispatch(logout());
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Filter items based on selected practice
  const filteredItems = selectedPracticeId === 'all' 
    ? items 
    : items.filter(item => (item.assignedPracticeId || item.practiceId) === selectedPracticeId);

  const filteredLowStockItems = selectedPracticeId === 'all'
    ? lowStockItems
    : lowStockItems.filter(item => (item.assignedPracticeId || item.practiceId) === selectedPracticeId);

  const expiringItems = filteredItems.filter(item => {
    if (!item.expiryDate) return false;
    const daysUntilExpiry = Math.ceil(
      (item.expiryDate - new Date()) / (1000 * 60 * 60 * 24)
    );
    return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
  });

  // Get selected practice name
  const getSelectedPracticeName = () => {
    if (selectedPracticeId === 'all') return 'All Practices';
    const practice = practices.find(practice => practice.id === selectedPracticeId);
    return practice ? practice.name : 'All Practices';
  };

  const practiceTypes = [
    { value: 'practice', label: 'Practice', icon: '🦷' },
  ];

  const handleCreatePractice = async () => {
    if (!newPracticeForm.name.trim()) {
      Alert.alert('Required Field', 'Please enter a practice name');
      return;
    }

    try {
      const practiceData = {
        name: newPracticeForm.name.trim(),
        type: newPracticeForm.type,
        description: newPracticeForm.description.trim(),
        address: newPracticeForm.address.trim(),
        practiceId: user?.uid,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      const securedPracticeData = ensureOwnership(practiceData);
      await addDoc(collection(db, 'practices'), securedPracticeData);
      
      Alert.alert('Success', 'Practice created successfully!');
      setShowCreatePracticeModal(false);
      setNewPracticeForm({
        name: '',
        type: 'practice',
        description: '',
        address: '',
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to create practice');
      console.error('Error creating practice:', error);
    }
  };

  // Practice-specific analytics
  const getPracticeStats = (practiceId) => {
    const practiceItems = items.filter(item => (item.assignedPracticeId || item.practiceId) === practiceId);
    const lowStockItems = practiceItems.filter(item => item.currentQuantity <= item.minStockLevel);
    return {
      totalItems: practiceItems.length,
      lowStockCount: lowStockItems.length,
      lowStockItems,
    };
  };

  const getPracticeName = (practiceId) => {
    const practice = practices.find(practice => practice.id === practiceId);
    return practice ? practice.name : 'Unknown Practice';
  };

  // Get practices with low stock alerts
  const practicesWithLowStock = practices
    .map(practice => ({
      ...practice,
      stats: getPracticeStats(practice.id)
    }))
    .filter(practice => practice.stats.lowStockCount > 0);

  const quickActions = [
    {
      title: 'Scan Barcode',
      action: () => navigation.navigate('Scanner'),
      mode: 'outlined',
      color: colors.primary,
    },
    {
      title: 'Manual Check In/Out',
      action: () => setShowCheckInOutModal(true),
      mode: 'outlined',
      color: colors.primary,
    },
  ];


  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Animated.View style={[{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.userInfo}>
              <Title style={styles.welcomeTitle}>
                Welcome back{user?.displayName ? `, ${user.displayName.split(' ')[0]}` : ''}!
              </Title>
            </View>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('Settings')} style={styles.settingsButton}>
            <Text style={styles.headerIcon}>⚙️</Text>
          </TouchableOpacity>
        </View>

        {/* Practice Filter */}
        <View style={styles.practiceFilterContainer}>
          <Text style={styles.practiceFilterLabel}>View inventory for:</Text>
          <TouchableOpacity
            style={styles.practiceDropdown}
            onPress={() => setShowPracticeMenu(true)}
          >
            <Text style={styles.practiceDropdownText}>{getSelectedPracticeName()}</Text>
            <Text style={styles.dropdownArrow}>▼</Text>
          </TouchableOpacity>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <TouchableOpacity
            onPress={() => navigation.navigate('Inventory')}
            activeOpacity={0.7}
            style={styles.statCardWrapper}
          >
            <Card style={[styles.statCard, styles.totalItemsCard]}>
              <Card.Content style={styles.statContent}>
                <Title style={[styles.statNumber, { color: colors.primary }]}>
                  {filteredItems.length}
                </Title>
                <Paragraph style={styles.statLabel}>View Inventory</Paragraph>
              </Card.Content>
            </Card>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate('Inventory', { filter: 'lowStock' })}
            activeOpacity={0.7}
            style={styles.statCardWrapper}
          >
            <Card style={[styles.statCard, styles.lowStockCard]}>
              <Card.Content style={styles.statContent}>
                <Title style={[styles.statNumber, { color: colors.warning }]}>
                  {filteredLowStockItems.length}
                </Title>
                <Paragraph style={styles.statLabel}>Low Stock</Paragraph>
              </Card.Content>
            </Card>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate('Inventory', { filter: 'expiring' })}
            activeOpacity={0.7}
            style={styles.statCardWrapper}
          >
            <Card style={[styles.statCard, styles.expiringCard]}>
              <Card.Content style={styles.statContent}>
                <Title style={[styles.statNumber, { color: colors.danger }]}>
                  {expiringItems.length}
                </Title>
                <Paragraph style={styles.statLabel}>Expiring Soon</Paragraph>
              </Card.Content>
            </Card>
          </TouchableOpacity>
        </View>

        {/* Quick Actions */}
        <Card style={styles.actionCard}>
          <Card.Content style={styles.actionContent}>
            <View style={styles.actionHeader}>
              <Title style={styles.actionTitle}>Quick Actions</Title>
            </View>
            
            <View style={styles.actionGrid}>
              {quickActions.map((action, index) => (
                <View key={index} style={styles.buttonWithInfo}>
                  <Button
                    mode={action.mode}
                    onPress={action.action}
                    style={[
                      styles.actionButton,
                      action.mode === 'contained' && { backgroundColor: action.color }
                    ]}
                    buttonColor={action.mode === 'contained' ? action.color : undefined}
                    textColor={action.mode === 'contained' ? colors.white : action.color}
                    contentStyle={styles.actionButtonContent}
                  >
                    {action.title}
                  </Button>
                  <TouchableOpacity
                    style={styles.infoIcon}
                    onPress={() => {
                      if (action.title === 'Scan Barcode') {
                        Alert.alert('Scan Barcode', 'Use your camera to scan product barcodes for quick inventory check-in/out and shopping list additions');
                      } else if (action.title === 'Manual Check In/Out') {
                        Alert.alert('Manual Check In/Out', 'Manually add items to inventory (check-in) or remove items from stock (check-out) without scanning');
                      }
                    }}
                  >
                    <Text style={styles.infoIconText}>ⓘ</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </Card.Content>
        </Card>

        {/* Management Tools */}
        <Card style={styles.actionCard}>
          <Card.Content style={styles.actionContent}>
            <View style={styles.actionHeader}>
              <Title style={styles.actionTitle}>Management Tools</Title>
            </View>
            
            <View style={styles.actionGrid}>
              <View style={styles.buttonWithInfo}>
                <Button
                  mode="outlined"
                  onPress={() => navigation.navigate('TreatmentKits')}
                  style={styles.actionButton}
                  contentStyle={styles.actionButtonContent}
                >
                  Treatment Kits
                </Button>
                <TouchableOpacity
                  style={styles.infoIcon}
                  onPress={() => Alert.alert('Treatment Kits', 'Create and manage standardized kits of dental supplies for common procedures')}
                >
                  <Text style={styles.infoIconText}>ⓘ</Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.buttonWithInfo}>
                <Button
                  mode="outlined"
                  onPress={() => navigation.navigate('ShoppingList')}
                  style={[
                    styles.actionButton,
                    filteredLowStockItems.length > 0 && styles.badgeButton
                  ]}
                  contentStyle={styles.actionButtonContent}
                >
                  {`Shopping List ${filteredLowStockItems.length > 0 ? `(${filteredLowStockItems.length})` : ''}`}
                </Button>
                <TouchableOpacity
                  style={styles.infoIcon}
                  onPress={() => Alert.alert('Shopping List', 'View and manage items that need to be reordered based on low stock levels')}
                >
                  <Text style={styles.infoIconText}>ⓘ</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Expiring Items Alert */}
        {expiringItems.length > 0 && (
          <Card style={styles.alertCard}>
            <Card.Content style={styles.alertContent}>
              <View style={styles.alertHeader}>
                <View style={styles.alertText}>
                  <Title style={styles.alertTitle}>Expiring Soon</Title>
                  <Paragraph style={styles.alertDescription}>
                    {expiringItems.length} items expire within 30 days
                  </Paragraph>
                </View>
              </View>
              <Button
                mode="text"
                onPress={() => navigation.navigate('Inventory', { filter: 'expiring' })}
                textColor={colors.warning}
                style={styles.alertButton}
              >
                View Items
              </Button>
            </Card.Content>
          </Card>
        )}

        {/* Practice-Specific Low Stock Alerts */}
        {practicesWithLowStock.length > 0 && (
          <Card style={styles.practiceAlertsCard}>
            <Card.Content style={styles.practiceAlertsContent}>
              <View style={styles.practiceAlertsHeader}>
                <View style={styles.practiceAlertsText}>
                  <Title style={styles.practiceAlertsTitle}>Low Stock by Practice</Title>
                  <Paragraph style={styles.practiceAlertsDescription}>
                    {practicesWithLowStock.length} practices have low stock items
                  </Paragraph>
                </View>
              </View>
              
              <View style={styles.practiceAlertsList}>
                {practicesWithLowStock.map((practice) => (
                  <TouchableOpacity
                    key={practice.id}
                    style={styles.practiceAlertItem}
                    onPress={() => navigation.navigate('Inventory', { practiceId: practice.id, filter: 'lowStock' })}
                  >
                    <View style={styles.practiceAlertInfo}>
                      <Text style={styles.practiceAlertName}>{practice.name}</Text>
                      <Text style={styles.practiceAlertType}>{practice.type}</Text>
                      <Text style={styles.practiceAlertCount}>
                        {practice.stats.lowStockCount} low stock items
                      </Text>
                    </View>
                    <View style={styles.practiceAlertBadge}>
                      <Text style={styles.practiceAlertBadgeText}>
                        {practice.stats.lowStockCount}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>

              <Button
                mode="text"
                onPress={() => navigation.navigate('Practices')}
                textColor={colors.danger}
                style={styles.alertButton}
              >
                Manage Practices
              </Button>
            </Card.Content>
          </Card>
        )}

        {/* Logout Button */}
        <Button
          mode="outlined"
          onPress={handleLogout}
          style={styles.logoutButton}
          textColor={colors.danger}
          contentStyle={styles.logoutButtonContent}
        >
          Logout
        </Button>
      </Animated.View>


      {/* Practice Filter Modal */}
      <Modal
        visible={showPracticeMenu}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowPracticeMenu(false)}
      >
        <TouchableOpacity
          style={styles.practiceModalOverlay}
          activeOpacity={1}
          onPress={() => setShowPracticeMenu(false)}
        >
          <View style={styles.practiceMenuContainer}>
            <View style={styles.practiceMenuContent}>
              <TouchableOpacity
                style={[
                  styles.practiceMenuItem,
                  selectedPracticeId === 'all' && styles.selectedPracticeItem
                ]}
                onPress={() => {
                  setSelectedPracticeId('all');
                  setShowPracticeMenu(false);
                }}
              >
                <Text style={[
                  styles.practiceMenuText,
                  selectedPracticeId === 'all' && styles.selectedPracticeText
                ]}>All Practices</Text>
                {selectedPracticeId === 'all' && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </TouchableOpacity>
              {practices.map((practice, index) => (
                <TouchableOpacity
                  key={practice.id}
                  style={[
                    styles.practiceMenuItem,
                    selectedPracticeId === practice.id && styles.selectedPracticeItem
                  ]}
                  onPress={() => {
                    setSelectedPracticeId(practice.id);
                    setShowPracticeMenu(false);
                  }}
                >
                  <View style={styles.practiceItemContent}>
                    <Text style={[
                      styles.practiceMenuText,
                      selectedPracticeId === practice.id && styles.selectedPracticeText
                    ]}>{practice.name}</Text>
                    <Text style={styles.practiceTypeText}>{practice.type}</Text>
                  </View>
                  {selectedPracticeId === practice.id && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
              
              {/* Add New Practice Option */}
              <TouchableOpacity
                style={[styles.practiceMenuItem, styles.addPracticeItem]}
                onPress={() => {
                  setShowPracticeMenu(false);
                  setShowCreatePracticeModal(true);
                }}
              >
                <View style={styles.practiceItemContent}>
                  <Text style={styles.addPracticeText}>+ Add New Practice</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Check In/Out Options Modal */}
      <Modal
        visible={showCheckInOutModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCheckInOutModal(false)}
      >
        <TouchableOpacity
          style={styles.checkInOutModalOverlay}
          activeOpacity={1}
          onPress={() => setShowCheckInOutModal(false)}
        >
          <View style={styles.checkInOutModalContainer}>
            <View style={styles.checkInOutModalContent}>
              <Title style={styles.checkInOutModalTitle}>Manual Inventory Management</Title>
              <Paragraph style={styles.checkInOutModalSubtitle}>
                Choose an option to manage your inventory
              </Paragraph>
              
              <View style={styles.checkInOutOptions}>
                <TouchableOpacity
                  style={[styles.checkInOutOption, styles.checkInOption]}
                  onPress={() => {
                    setShowCheckInOutModal(false);
                    navigation.navigate('ItemDetail');
                  }}
                >
                  <Title style={styles.checkInOutOptionTitle}>Check In Item</Title>
                  <Paragraph style={styles.checkInOutOptionDescription}>
                    Add new item to inventory or increase stock
                  </Paragraph>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.checkInOutOption, styles.checkOutOption]}
                  onPress={() => {
                    setShowCheckInOutModal(false);
                    navigation.navigate('Checkout');
                  }}
                >
                  <Title style={styles.checkInOutOptionTitle}>Check Out Item</Title>
                  <Paragraph style={styles.checkInOutOptionDescription}>
                    Remove item from inventory or reduce stock
                  </Paragraph>
                </TouchableOpacity>
              </View>
              
              <Button
                mode="outlined"
                onPress={() => setShowCheckInOutModal(false)}
                style={styles.checkInOutModalCancelButton}
                textColor={colors.textSecondary}
              >
                Cancel
              </Button>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Create Practice Modal */}
      <Portal>
        <Dialog 
          visible={showCreatePracticeModal} 
          onDismiss={() => setShowCreatePracticeModal(false)}
          style={styles.createPracticeDialog}
        >
          <Dialog.Title>Add New Practice</Dialog.Title>
          <Dialog.Content>
            <View style={[styles.createPracticeForm, globalFormStyles.formContainer]}>
              <CustomTextInput
                label="Practice Name *"
                value={newPracticeForm.name}
                onChangeText={(text) => setNewPracticeForm(prev => ({ ...prev, name: text }))}
                style={[globalFormStyles.input, styles.createPracticeInput]}
                mode="outlined"
                placeholder="e.g., Downtown Dental Practice"
                outlineColor={colors.borderLight}
                activeOutlineColor={colors.primary}
              />
              
              <Text style={styles.fieldLabel}>Practice Type</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeSelector}>
                {practiceTypes.map((type) => (
                  <TouchableOpacity
                    key={type.value}
                    onPress={() => setNewPracticeForm(prev => ({ ...prev, type: type.value }))}
                    style={[
                      styles.typeChip,
                      newPracticeForm.type === type.value && styles.selectedTypeChip
                    ]}
                  >
                    <Text style={styles.typeIcon}>{type.icon}</Text>
                    <Text style={[
                      styles.typeLabel,
                      newPracticeForm.type === type.value && styles.selectedTypeLabel
                    ]}>
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              
              <CustomTextInput
                label="Description (Optional)"
                value={newPracticeForm.description}
                onChangeText={(text) => setNewPracticeForm(prev => ({ ...prev, description: text }))}
                style={[globalFormStyles.input, styles.createPracticeInput]}
                mode="outlined"
                multiline
                numberOfLines={2}
                placeholder="Brief description or notes"
                outlineColor={colors.borderLight}
                activeOutlineColor={colors.primary}
              />
            </View>
          </Dialog.Content>
          <Dialog.Actions>
            <Button 
              onPress={() => {
                setShowCreatePracticeModal(false);
                setNewPracticeForm({
                  name: '',
                  type: 'practice',
                  description: '',
                  address: '',
                });
              }}
            >
              Cancel
            </Button>
            <Button 
              onPress={handleCreatePractice} 
              textColor={colors.primary}
              disabled={!newPracticeForm.name.trim()}
            >
              Create Practice
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
    paddingVertical: spacing.md,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userInfo: {
    flex: 1,
  },
  welcomeTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  userEmail: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    fontWeight: typography.fontWeight.medium,
  },
  settingsButton: {
    backgroundColor: colors.lightGray,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 40,
    minHeight: 40,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  statCardWrapper: {
    flex: 1,
  },
  statCard: {
    borderRadius: borderRadius.lg,
    ...shadows.medium,
    height: 120,
    justifyContent: 'center',
  },
  totalItemsCard: {
    backgroundColor: colors.primaryLight + '10',
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  lowStockCard: {
    backgroundColor: colors.warningLight + '10',
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
  },
  expiringCard: {
    backgroundColor: colors.dangerLight + '10',
    borderLeftWidth: 4,
    borderLeftColor: colors.danger,
  },
  statContent: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    height: '100%',
  },
  statNumber: {
    fontSize: typography.fontSize.xxxl,
    fontWeight: typography.fontWeight.bold,
    marginBottom: spacing.xs,
  },
  statLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    fontWeight: typography.fontWeight.medium,
    textAlign: 'center',
    numberOfLines: 2,
    flexWrap: 'wrap',
  },
  actionCard: {
    marginBottom: spacing.xl,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
    ...shadows.medium,
  },
  actionContent: {
    padding: spacing.lg,
  },
  actionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  actionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
  },
  actionGrid: {
    gap: spacing.md,
  },
  actionButton: {
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
    minWidth: 120,
  },
  actionButtonContent: {
    height: 48,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeButton: {
    borderColor: colors.warning,
    borderWidth: 2,
  },
  buttonWithInfo: {
    position: 'relative',
    marginBottom: spacing.sm,
  },
  infoIcon: {
    position: 'absolute',
    top: 4,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  infoIconText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: typography.fontWeight.bold,
  },
  alertCard: {
    marginBottom: spacing.xl,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.warningLight + '15',
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
    ...shadows.small,
  },
  alertContent: {
    padding: spacing.lg,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  alertIcon: {
    margin: 0,
    marginRight: spacing.sm,
  },
  alertText: {
    flex: 1,
  },
  alertTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.warning,
    marginBottom: spacing.xs,
  },
  alertDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
  alertButton: {
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
  },
  logoutButton: {
    marginTop: spacing.lg,
    marginBottom: spacing.xxl,
    borderRadius: borderRadius.lg,
    borderColor: colors.danger,
  },
  logoutButtonContent: {
    height: 48,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Emoji icon styles
  headerIcon: {
    fontSize: 26,
    textAlign: 'center',
    color: colors.text,
  },
  // Practice Alerts Styles
  practiceAlertsCard: {
    marginBottom: spacing.xl,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.dangerLight + '15',
    borderLeftWidth: 4,
    borderLeftColor: colors.danger,
    ...shadows.small,
  },
  practiceAlertsContent: {
    padding: spacing.lg,
  },
  practiceAlertsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  practiceAlertsIcon: {
    fontSize: 20,
    textAlign: 'center',
    marginRight: spacing.sm,
  },
  practiceAlertsText: {
    flex: 1,
  },
  practiceAlertsTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.danger,
    marginBottom: spacing.xs,
  },
  practiceAlertsDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
  practiceAlertsList: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  practiceAlertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  practiceAlertInfo: {
    flex: 1,
  },
  practiceAlertName: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  practiceAlertType: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    textTransform: 'capitalize',
    marginBottom: spacing.xs,
  },
  practiceAlertCount: {
    fontSize: typography.fontSize.xs,
    color: colors.danger,
    fontWeight: typography.fontWeight.medium,
  },
  practiceAlertBadge: {
    backgroundColor: colors.danger,
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.sm,
  },
  practiceAlertBadgeText: {
    fontSize: 11,
    fontWeight: typography.fontWeight.bold,
    color: colors.white,
  },
  // Modal Overlay Styles
  practiceModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 80,
    paddingRight: spacing.md,
  },
  checkInOutModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  // Practice Filter Styles
  practiceFilterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginBottom: spacing.lg,
    borderRadius: borderRadius.lg,
    ...shadows.small,
  },
  practiceFilterLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    fontWeight: typography.fontWeight.medium,
  },
  practiceDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.lightGray,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    minWidth: 150,
  },
  practiceDropdownText: {
    fontSize: typography.fontSize.sm,
    color: colors.textPrimary,
    fontWeight: typography.fontWeight.medium,
    flex: 1,
  },
  dropdownArrow: {
    fontSize: 12,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
  },
  // Practice Menu Modal Styles
  practiceMenuContainer: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    ...shadows.large,
    minWidth: 250,
    maxHeight: 300,
  },
  practiceMenuContent: {
    paddingVertical: spacing.sm,
  },
  practiceMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  lastPracticeMenuItem: {
    borderBottomWidth: 0,
  },
  selectedPracticeItem: {
    backgroundColor: colors.primaryLight + '20',
  },
  practiceItemContent: {
    flex: 1,
  },
  practiceMenuText: {
    fontSize: typography.fontSize.md,
    color: colors.textPrimary,
    fontWeight: typography.fontWeight.medium,
  },
  selectedPracticeText: {
    color: colors.primary,
    fontWeight: typography.fontWeight.bold,
  },
  practiceTypeText: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textTransform: 'capitalize',
  },
  checkmark: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: typography.fontWeight.bold,
    marginLeft: spacing.sm,
  },
  // Check In/Out Modal Styles
  checkInOutModalContainer: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    ...shadows.large,
    minWidth: 300,
    maxWidth: 400,
    alignSelf: 'center',
    marginHorizontal: spacing.lg,
  },
  checkInOutModalContent: {
    padding: spacing.xxl,
    alignItems: 'center',
  },
  checkInOutModalTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  checkInOutModalSubtitle: {
    fontSize: typography.fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  checkInOutOptions: {
    width: '100%',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  checkInOutOption: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 2,
    alignItems: 'center',
  },
  checkInOption: {
    borderColor: colors.success,
  },
  checkOutOption: {
    borderColor: colors.danger,
  },
  checkInOutOptionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  checkInOutOptionDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  checkInOutModalCancelButton: {
    borderColor: colors.borderLight,
    borderRadius: borderRadius.lg,
    width: '100%',
  },
  // Add Practice Menu Item
  addPracticeItem: {
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    marginTop: spacing.xs,
    paddingTop: spacing.md,
  },
  addPracticeText: {
    fontSize: typography.fontSize.md,
    color: colors.primary,
    fontWeight: typography.fontWeight.bold,
  },
  // Create Practice Modal
  createPracticeDialog: {
    maxHeight: '80%',
  },
  createPracticeForm: {
    gap: spacing.md,
  },
  createPracticeInput: {
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

export default DashboardScreen;
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Animated, Text, TouchableOpacity, Modal } from 'react-native';
import { Card, Title, Paragraph, Button, Divider } from 'react-native-paper';
import { useSelector, useDispatch } from 'react-redux';
import { signOut } from 'firebase/auth';
import { auth } from '../config/firebase';
import { logout } from '../store/slices/authSlice';
import { colors, spacing, borderRadius, typography, shadows, components } from '../constants/theme';

const DashboardScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { lowStockItems, items } = useSelector((state) => state.inventory);
  const { locations } = useSelector((state) => state.locations);
  
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(30));
  const [showMenu, setShowMenu] = useState(false);
  const [selectedLocationId, setSelectedLocationId] = useState('all');
  const [showLocationMenu, setShowLocationMenu] = useState(false);
  const [showCheckInOutModal, setShowCheckInOutModal] = useState(false);

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

  const handleLogout = async () => {
    try {
      await signOut(auth);
      dispatch(logout());
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Filter items based on selected location
  const filteredItems = selectedLocationId === 'all' 
    ? items 
    : items.filter(item => item.locationId === selectedLocationId);

  const filteredLowStockItems = selectedLocationId === 'all'
    ? lowStockItems
    : lowStockItems.filter(item => item.locationId === selectedLocationId);

  const expiringItems = filteredItems.filter(item => {
    if (!item.expiryDate) return false;
    const daysUntilExpiry = Math.ceil(
      (item.expiryDate - new Date()) / (1000 * 60 * 60 * 24)
    );
    return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
  });

  // Get selected location name
  const getSelectedLocationName = () => {
    if (selectedLocationId === 'all') return 'All Locations';
    const location = locations.find(loc => loc.id === selectedLocationId);
    return location ? location.name : 'All Locations';
  };

  // Location-specific analytics
  const getLocationStats = (locationId) => {
    const locationItems = items.filter(item => item.locationId === locationId);
    const lowStockItems = locationItems.filter(item => item.currentQuantity <= item.minStockLevel);
    return {
      totalItems: locationItems.length,
      lowStockCount: lowStockItems.length,
      lowStockItems,
    };
  };

  const getLocationName = (locationId) => {
    const location = locations.find(loc => loc.id === locationId);
    return location ? location.name : 'Unknown Location';
  };

  // Get locations with low stock alerts
  const locationsWithLowStock = locations
    .map(location => ({
      ...location,
      stats: getLocationStats(location.id)
    }))
    .filter(location => location.stats.lowStockCount > 0);

  const quickActions = [
    {
      title: 'Scan Barcode',
      action: () => navigation.navigate('Scanner'),
      mode: 'contained',
      color: colors.info,
    },
    {
      title: 'Manual Check In/Out',
      action: () => setShowCheckInOutModal(true),
      mode: 'contained',
      color: colors.secondary,
    },
  ];

  const menuItems = [
    {
      title: 'Settings',
      action: () => {
        setShowMenu(false);
        navigation.navigate('Settings');
      },
    },
    {
      title: 'Treatment Kits',
      action: () => {
        setShowMenu(false);
        navigation.navigate('TreatmentKits');
      },
    },
    {
      title: 'Locations',
      action: () => {
        setShowMenu(false);
        navigation.navigate('Locations');
      },
    },
    {
      title: `Shopping List ${filteredLowStockItems.length > 0 ? `(${filteredLowStockItems.length})` : ''}`,
      action: () => {
        setShowMenu(false);
        navigation.navigate('ShoppingList');
      },
      badge: filteredLowStockItems.length > 0,
    },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Animated.View style={[{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.userInfo}>
              <Title style={styles.welcomeTitle}>Welcome back!</Title>
              <Paragraph style={styles.userEmail}>{user?.email}</Paragraph>
            </View>
          </View>
          <TouchableOpacity onPress={() => setShowMenu(true)} style={styles.settingsButton}>
            <Text style={styles.headerIcon}>☰</Text>
          </TouchableOpacity>
        </View>

        {/* Location Filter */}
        <View style={styles.locationFilterContainer}>
          <Text style={styles.locationFilterLabel}>View inventory for:</Text>
          <TouchableOpacity
            style={styles.locationDropdown}
            onPress={() => setShowLocationMenu(true)}
          >
            <Text style={styles.locationDropdownText}>{getSelectedLocationName()}</Text>
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
                <Button
                  key={index}
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
              ))}
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

        {/* Location-Specific Low Stock Alerts */}
        {locationsWithLowStock.length > 0 && (
          <Card style={styles.locationAlertsCard}>
            <Card.Content style={styles.locationAlertsContent}>
              <View style={styles.locationAlertsHeader}>
                <View style={styles.locationAlertsText}>
                  <Title style={styles.locationAlertsTitle}>Low Stock by Location</Title>
                  <Paragraph style={styles.locationAlertsDescription}>
                    {locationsWithLowStock.length} locations have low stock items
                  </Paragraph>
                </View>
              </View>
              
              <View style={styles.locationAlertsList}>
                {locationsWithLowStock.map((location) => (
                  <TouchableOpacity
                    key={location.id}
                    style={styles.locationAlertItem}
                    onPress={() => navigation.navigate('Inventory', { locationId: location.id, filter: 'lowStock' })}
                  >
                    <View style={styles.locationAlertInfo}>
                      <Text style={styles.locationAlertName}>{location.name}</Text>
                      <Text style={styles.locationAlertType}>{location.type}</Text>
                      <Text style={styles.locationAlertCount}>
                        {location.stats.lowStockCount} low stock items
                      </Text>
                    </View>
                    <View style={styles.locationAlertBadge}>
                      <Text style={styles.locationAlertBadgeText}>
                        {location.stats.lowStockCount}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>

              <Button
                mode="text"
                onPress={() => navigation.navigate('Locations')}
                textColor={colors.danger}
                style={styles.alertButton}
              >
                Manage Locations
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

      {/* Dropdown Menu Modal */}
      <Modal
        visible={showMenu}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowMenu(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowMenu(false)}
        >
          <View style={styles.menuContainer}>
            <View style={styles.menuContent}>
              {menuItems.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.menuItem,
                    index === menuItems.length - 1 && styles.lastMenuItem
                  ]}
                  onPress={item.action}
                >
                  <Text style={styles.menuText}>{item.title}</Text>
                  {item.badge && (
                    <View style={styles.menuBadge}>
                      <Text style={styles.menuBadgeText}>!</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Location Filter Modal */}
      <Modal
        visible={showLocationMenu}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowLocationMenu(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowLocationMenu(false)}
        >
          <View style={styles.locationMenuContainer}>
            <View style={styles.locationMenuContent}>
              <TouchableOpacity
                style={[
                  styles.locationMenuItem,
                  selectedLocationId === 'all' && styles.selectedLocationItem
                ]}
                onPress={() => {
                  setSelectedLocationId('all');
                  setShowLocationMenu(false);
                }}
              >
                <Text style={[
                  styles.locationMenuText,
                  selectedLocationId === 'all' && styles.selectedLocationText
                ]}>All Locations</Text>
                {selectedLocationId === 'all' && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </TouchableOpacity>
              {locations.map((location) => (
                <TouchableOpacity
                  key={location.id}
                  style={[
                    styles.locationMenuItem,
                    selectedLocationId === location.id && styles.selectedLocationItem,
                    location.id === locations[locations.length - 1].id && styles.lastLocationMenuItem
                  ]}
                  onPress={() => {
                    setSelectedLocationId(location.id);
                    setShowLocationMenu(false);
                  }}
                >
                  <View style={styles.locationItemContent}>
                    <Text style={[
                      styles.locationMenuText,
                      selectedLocationId === location.id && styles.selectedLocationText
                    ]}>{location.name}</Text>
                    <Text style={styles.locationTypeText}>{location.type}</Text>
                  </View>
                  {selectedLocationId === location.id && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
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
          style={styles.modalOverlay}
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
  },
  // Location Alerts Styles
  locationAlertsCard: {
    marginBottom: spacing.xl,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.dangerLight + '15',
    borderLeftWidth: 4,
    borderLeftColor: colors.danger,
    ...shadows.small,
  },
  locationAlertsContent: {
    padding: spacing.lg,
  },
  locationAlertsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  locationAlertsIcon: {
    fontSize: 20,
    textAlign: 'center',
    marginRight: spacing.sm,
  },
  locationAlertsText: {
    flex: 1,
  },
  locationAlertsTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.danger,
    marginBottom: spacing.xs,
  },
  locationAlertsDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
  locationAlertsList: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  locationAlertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  locationAlertInfo: {
    flex: 1,
  },
  locationAlertName: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  locationAlertType: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    textTransform: 'capitalize',
    marginBottom: spacing.xs,
  },
  locationAlertCount: {
    fontSize: typography.fontSize.xs,
    color: colors.danger,
    fontWeight: typography.fontWeight.medium,
  },
  locationAlertBadge: {
    backgroundColor: colors.danger,
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.sm,
  },
  locationAlertBadgeText: {
    fontSize: 11,
    fontWeight: typography.fontWeight.bold,
    color: colors.white,
  },
  // Menu Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 80,
    paddingRight: spacing.md,
  },
  menuContainer: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    ...shadows.large,
    minWidth: 200,
  },
  menuContent: {
    paddingVertical: spacing.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  lastMenuItem: {
    borderBottomWidth: 0,
  },
  menuText: {
    fontSize: typography.fontSize.md,
    color: colors.textPrimary,
    fontWeight: typography.fontWeight.medium,
    flex: 1,
  },
  menuBadge: {
    backgroundColor: colors.danger,
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuBadgeText: {
    fontSize: 12,
    color: colors.white,
    fontWeight: typography.fontWeight.bold,
  },
  // Location Filter Styles
  locationFilterContainer: {
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
  locationFilterLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    fontWeight: typography.fontWeight.medium,
  },
  locationDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.lightGray,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    minWidth: 150,
  },
  locationDropdownText: {
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
  // Location Menu Modal Styles
  locationMenuContainer: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    ...shadows.large,
    minWidth: 250,
    maxHeight: 300,
  },
  locationMenuContent: {
    paddingVertical: spacing.sm,
  },
  locationMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  lastLocationMenuItem: {
    borderBottomWidth: 0,
  },
  selectedLocationItem: {
    backgroundColor: colors.primaryLight + '20',
  },
  locationItemContent: {
    flex: 1,
  },
  locationMenuText: {
    fontSize: typography.fontSize.md,
    color: colors.textPrimary,
    fontWeight: typography.fontWeight.medium,
  },
  selectedLocationText: {
    color: colors.primary,
    fontWeight: typography.fontWeight.bold,
  },
  locationTypeText: {
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
});

export default DashboardScreen;
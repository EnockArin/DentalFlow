import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Animated, Text, TouchableOpacity } from 'react-native';
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

  const expiringItems = items.filter(item => {
    if (!item.expiryDate) return false;
    const daysUntilExpiry = Math.ceil(
      (item.expiryDate - new Date()) / (1000 * 60 * 60 * 24)
    );
    return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
  });

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
      title: 'Treatment Kits',
      action: () => navigation.navigate('TreatmentKits'),
      mode: 'contained',
      color: colors.primary,
      icon: '🏥',
    },
    {
      title: 'Locations',
      action: () => navigation.navigate('Locations'),
      mode: 'contained',
      color: colors.secondary,
      icon: '🏢',
    },
    {
      title: 'Scan Barcode',
      action: () => navigation.navigate('Scanner'),
      mode: 'contained',
      color: colors.info,
    },
    {
      title: 'Manual Add Item',
      action: () => navigation.navigate('ItemDetail'),
      mode: 'contained',
      color: colors.success,
    },
    {
      title: 'Manual Checkout',
      action: () => navigation.navigate('Checkout'),
      mode: 'contained',
      color: colors.danger,
    },
    {
      title: `Shopping List (${lowStockItems.length})`,
      action: () => navigation.navigate('ShoppingList'),
      mode: 'outlined',
      color: colors.secondary,
      badge: lowStockItems.length > 0,
    },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Animated.View style={[{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.userInfo}>
              <Title style={styles.welcomeTitle}>Welcome back! 👋</Title>
              <Paragraph style={styles.userEmail}>{user?.email}</Paragraph>
            </View>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('Settings')} style={styles.settingsButton}>
            <Text style={styles.headerIcon}>⚙️</Text>
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
                <View style={styles.statIconContainer}>
                  <Text style={styles.statIcon}>📦</Text>
                </View>
                <Title style={[styles.statNumber, { color: colors.primary }]}>
                  {items.length}
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
                <View style={styles.statIconContainer}>
                  <Text style={styles.statIcon}>⚠️</Text>
                </View>
                <Title style={[styles.statNumber, { color: colors.warning }]}>
                  {lowStockItems.length}
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
                <View style={styles.statIconContainer}>
                  <Text style={styles.statIcon}>⏰</Text>
                </View>
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
              <Text style={styles.quickActionIcon}>⚡</Text>
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
                <Text style={styles.alertIcon}>🕐</Text>
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
                <Text style={styles.locationAlertsIcon}>📍</Text>
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
    padding: spacing.lg,
  },
  statIconContainer: {
    marginBottom: spacing.sm,
  },
  statIcon: {
    margin: 0,
    backgroundColor: 'transparent',
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
  },
  actionButtonContent: {
    height: components.button.height,
    paddingHorizontal: spacing.lg,
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
    height: components.button.height,
    paddingHorizontal: spacing.lg,
  },
  // Emoji icon styles
  headerIcon: {
    fontSize: 20,
    textAlign: 'center',
  },
  statIcon: {
    fontSize: 24,
    textAlign: 'center',
  },
  quickActionIcon: {
    fontSize: 16,
    textAlign: 'center',
  },
  alertIcon: {
    fontSize: 20,
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
});

export default DashboardScreen;
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Animated } from 'react-native';
import { Card, Title, Paragraph, Button, Divider, IconButton, Avatar } from 'react-native-paper';
import { useSelector, useDispatch } from 'react-redux';
import { signOut } from 'firebase/auth';
import { auth } from '../config/firebase';
import { logout } from '../store/slices/authSlice';
import { colors, spacing, borderRadius, typography, shadows, components } from '../constants/theme';

const DashboardScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { lowStockItems, items } = useSelector((state) => state.inventory);
  
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

  const quickActions = [
    {
      title: 'Scan Barcode',
      icon: 'barcode-scan',
      action: () => navigation.navigate('Scanner'),
      mode: 'contained',
      color: colors.primary,
    },
    {
      title: 'Manual Add Item',
      icon: 'plus-circle',
      action: () => navigation.navigate('ItemDetail'),
      mode: 'contained',
      color: colors.success,
    },
    {
      title: 'Manual Checkout',
      icon: 'cart-remove',
      action: () => navigation.navigate('Inventory', { showCheckoutMode: true }),
      mode: 'contained',
      color: colors.danger,
    },
    {
      title: 'View Inventory',
      icon: 'package-variant',
      action: () => navigation.navigate('Inventory'),
      mode: 'outlined',
      color: colors.primary,
    },
    {
      title: `Shopping List (${lowStockItems.length})`,
      icon: 'cart',
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
            <Avatar.Icon 
              size={56} 
              icon="account" 
              style={styles.avatar}
              color={colors.white}
            />
            <View style={styles.userInfo}>
              <Title style={styles.welcomeTitle}>Welcome back! 👋</Title>
              <Paragraph style={styles.userEmail}>{user?.email}</Paragraph>
            </View>
          </View>
          <IconButton
            icon="cog"
            size={24}
            iconColor={colors.textSecondary}
            onPress={() => navigation.navigate('Settings')}
            style={styles.settingsButton}
          />
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <Card style={[styles.statCard, styles.totalItemsCard]}>
            <Card.Content style={styles.statContent}>
              <View style={styles.statIconContainer}>
                <IconButton
                  icon="package-variant"
                  size={32}
                  iconColor={colors.primary}
                  style={styles.statIcon}
                />
              </View>
              <Title style={[styles.statNumber, { color: colors.primary }]}>
                {items.length}
              </Title>
              <Paragraph style={styles.statLabel}>Total Items</Paragraph>
            </Card.Content>
          </Card>

          <Card style={[styles.statCard, styles.lowStockCard]}>
            <Card.Content style={styles.statContent}>
              <View style={styles.statIconContainer}>
                <IconButton
                  icon="alert"
                  size={32}
                  iconColor={colors.warning}
                  style={styles.statIcon}
                />
              </View>
              <Title style={[styles.statNumber, { color: colors.warning }]}>
                {lowStockItems.length}
              </Title>
              <Paragraph style={styles.statLabel}>Low Stock</Paragraph>
            </Card.Content>
          </Card>
        </View>

        {/* Quick Actions */}
        <Card style={styles.actionCard}>
          <Card.Content style={styles.actionContent}>
            <View style={styles.actionHeader}>
              <Title style={styles.actionTitle}>Quick Actions</Title>
              <IconButton
                icon="lightning-bolt"
                size={20}
                iconColor={colors.accent}
              />
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
                  icon={action.icon}
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
                <IconButton
                  icon="clock-alert"
                  size={24}
                  iconColor={colors.warning}
                  style={styles.alertIcon}
                />
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

        {/* Logout Button */}
        <Button
          mode="outlined"
          onPress={handleLogout}
          style={styles.logoutButton}
          textColor={colors.danger}
          icon="logout"
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
  avatar: {
    backgroundColor: colors.primary,
    marginRight: spacing.md,
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
    gap: spacing.md,
  },
  statCard: {
    flex: 1,
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
});

export default DashboardScreen;
import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  Alert,
  TouchableOpacity,
  RefreshControl
} from 'react-native';
import { 
  Text, 
  Title, 
  Paragraph, 
  Button, 
  Card, 
  Surface,
  Divider,
  ActivityIndicator
} from 'react-native-paper';
import { colors, spacing, typography, borderRadius, shadows } from '../constants/theme';
import { getShoppingLists, setShoppingLists, migrateToSecureStorage, SECURE_STORAGE_KEYS } from '../utils/secureStorage';

const LoadShoppingListScreen = ({ navigation, route }) => {
  const { onLoadList } = route.params || {};
  
  const [savedLists, setSavedLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadSavedLists();
  }, []);

  const loadSavedLists = async () => {
    try {
      setLoading(true);
      // First, attempt migration from AsyncStorage to SecureStore
      await migrateToSecureStorage('savedShoppingLists', SECURE_STORAGE_KEYS.SHOPPING_LISTS);
      
      // Load from SecureStore
      const saved = await getShoppingLists();
      setSavedLists(saved);
    } catch (error) {
      console.error('Error loading saved lists:', error);
      Alert.alert('Error', 'Failed to load saved shopping lists');
      setSavedLists([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSavedLists();
    setRefreshing(false);
  };

  const handleLoadList = async (savedList) => {
    try {
      if (onLoadList) {
        onLoadList(savedList);
      }
      
      navigation.goBack();
      Alert.alert(
        'Success', 
        `Loaded shopping list "${savedList.name}"\n\n` +
        `${savedList.manualItems.length} manual items have been added to your current list.\n\n` +
        `Note: Low stock items are calculated dynamically based on current inventory levels.`
      );
    } catch (error) {
      console.error('Error loading list:', error);
      Alert.alert('Error', 'Failed to load shopping list');
    }
  };

  const handleDeleteList = async (listId, listName) => {
    Alert.alert(
      'Delete Shopping List',
      `Are you sure you want to delete "${listName}"?\n\nThis action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive', 
          onPress: async () => {
            try {
              const updatedLists = savedLists.filter(list => list.id !== listId);
              await setShoppingLists(updatedLists);
              setSavedLists(updatedLists);
              Alert.alert('Success', 'Shopping list deleted');
            } catch (error) {
              console.error('Error deleting list:', error);
              Alert.alert('Error', 'Failed to delete shopping list');
            }
          }
        }
      ]
    );
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderEmptyState = () => (
    <Card style={styles.emptyCard}>
      <Card.Content style={styles.emptyContent}>
        <Text style={styles.emptyIcon}>📋</Text>
        <Title style={styles.emptyTitle}>No Saved Lists</Title>
        <Paragraph style={styles.emptyText}>
          You haven't saved any shopping lists yet. Save your current shopping list to access it later.
        </Paragraph>
        <Button
          mode="outlined"
          onPress={() => navigation.goBack()}
          style={styles.emptyButton}
        >
          Go Back
        </Button>
      </Card.Content>
    </Card>
  );

  const renderListItem = (savedList) => (
    <Card key={savedList.id} style={styles.listCard}>
      <Card.Content style={styles.cardContent}>
        <View style={styles.listHeader}>
          <View style={styles.listInfo}>
            <Title style={styles.listName}>{savedList.name}</Title>
            <Text style={styles.listDate}>
              Created: {formatDate(savedList.dateCreated)}
            </Text>
            <View style={styles.listStats}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{savedList.totalItems}</Text>
                <Text style={styles.statLabel}>Total Items</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, { color: colors.primary }]}>
                  {savedList.manualItems.length}
                </Text>
                <Text style={styles.statLabel}>Manual</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, { color: colors.warning || '#ff9800' }]}>
                  {savedList.lowStockSnapshot ? savedList.lowStockSnapshot.length : 0}
                </Text>
                <Text style={styles.statLabel}>Low Stock</Text>
              </View>
            </View>
          </View>
          
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeleteList(savedList.id, savedList.name)}
          >
            <Text style={styles.deleteButtonText}>×</Text>
          </TouchableOpacity>
        </View>

        <Divider style={styles.divider} />

        <View style={styles.previewSection}>
          <Text style={styles.previewTitle}>Preview of items:</Text>
          
          {savedList.manualItems.length > 0 && (
            <View style={styles.categoryPreview}>
              <Text style={styles.categoryTitle}>Manual Items:</Text>
              {savedList.manualItems.slice(0, 3).map((item, index) => (
                <Text key={index} style={styles.itemPreview}>
                  • {item.productName} (Qty: {item.quantity})
                </Text>
              ))}
              {savedList.manualItems.length > 3 && (
                <Text style={styles.moreItems}>
                  ... and {savedList.manualItems.length - 3} more
                </Text>
              )}
            </View>
          )}

          {savedList.lowStockSnapshot && savedList.lowStockSnapshot.length > 0 && (
            <View style={styles.categoryPreview}>
              <Text style={styles.categoryTitle}>Low Stock Snapshot:</Text>
              {savedList.lowStockSnapshot.slice(0, 3).map((item, index) => (
                <Text key={index} style={styles.itemPreview}>
                  • {item.productName} (Was: {item.currentQuantity}/{item.minStockLevel})
                </Text>
              ))}
              {savedList.lowStockSnapshot.length > 3 && (
                <Text style={styles.moreItems}>
                  ... and {savedList.lowStockSnapshot.length - 3} more
                </Text>
              )}
            </View>
          )}
        </View>

        <View style={styles.actionButtons}>
          <Button
            mode="contained"
            onPress={() => handleLoadList(savedList)}
            style={styles.loadButton}
            contentStyle={styles.buttonContent}
          >
            Load This List
          </Button>
        </View>
      </Card.Content>
    </Card>
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
        <Text style={styles.headerTitle}>Load Shopping List</Text>
        <View style={styles.headerSpacer} />
      </View>
      
      <ScrollView 
        style={styles.container} 
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.header}>
          <Title style={styles.title}>Saved Shopping Lists</Title>
          <Paragraph style={styles.subtitle}>
            {savedLists.length > 0 
              ? `You have ${savedLists.length} saved shopping list${savedLists.length !== 1 ? 's' : ''}`
              : 'Pull down to refresh'
            }
          </Paragraph>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading saved lists...</Text>
          </View>
        ) : savedLists.length === 0 ? (
          renderEmptyState()
        ) : (
          <View style={styles.listsContainer}>
            {savedLists
              .sort((a, b) => new Date(b.dateCreated) - new Date(a.dateCreated))
              .map(renderListItem)}
          </View>
        )}
      </ScrollView>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: typography.fontSize.md,
    color: colors.textSecondary,
  },
  listsContainer: {
    gap: spacing.md,
  },
  listCard: {
    borderRadius: borderRadius.lg,
    elevation: 2,
    ...shadows.small,
    marginBottom: spacing.sm,
  },
  cardContent: {
    padding: spacing.lg,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  listInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  listName: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  listDate: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  listStats: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
  },
  statLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    marginTop: spacing.xs / 2,
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.danger || '#f44336',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: 'bold',
    lineHeight: 18,
  },
  divider: {
    marginVertical: spacing.md,
    backgroundColor: colors.borderLight,
  },
  previewSection: {
    marginBottom: spacing.lg,
  },
  previewTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  categoryPreview: {
    marginBottom: spacing.md,
  },
  categoryTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  itemPreview: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
    marginBottom: spacing.xs / 2,
  },
  moreItems: {
    fontSize: typography.fontSize.sm,
    color: colors.textTertiary,
    fontStyle: 'italic',
    marginLeft: spacing.sm,
  },
  actionButtons: {
    gap: spacing.sm,
  },
  loadButton: {
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primary,
  },
  buttonContent: {
    height: 44,
    paddingHorizontal: spacing.lg,
  },
  emptyCard: {
    borderRadius: borderRadius.lg,
    elevation: 2,
    ...shadows.small,
    marginTop: spacing.xl,
  },
  emptyContent: {
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
    paddingHorizontal: spacing.lg,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: typography.fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  emptyButton: {
    borderRadius: borderRadius.lg,
    borderColor: colors.borderMedium,
  },
});

export default LoadShoppingListScreen;
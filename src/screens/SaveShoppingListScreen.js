import React, { useState } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  Alert,
  TouchableOpacity 
} from 'react-native';
import { 
  Text, 
  Title, 
  Paragraph, 
  Button, 
  Card, 
  Surface,
  Divider
} from 'react-native-paper';
import CustomTextInput from '../components/common/CustomTextInput';
import { colors, spacing, typography, borderRadius, shadows } from '../constants/theme';

const SaveShoppingListScreen = ({ navigation, route }) => {
  const { 
    combinedShoppingList = [], 
    manualItems = [], 
    lowStockItems = [],
    onSaveList 
  } = route.params || {};
  
  const [listName, setListName] = useState('');

  const handleSave = () => {
    if (!listName.trim()) {
      Alert.alert('Invalid Name', 'Please enter a name for the shopping list.');
      return;
    }

    if (combinedShoppingList.length === 0) {
      Alert.alert('Empty List', 'Cannot save an empty shopping list.');
      return;
    }

    const newSavedList = {
      id: `saved_${Date.now()}`,
      name: listName.trim(),
      dateCreated: new Date().toISOString(),
      manualItems: [...manualItems],
      lowStockSnapshot: lowStockItems.map(item => ({
        ...item,
        type: 'lowstock',
        snapshotDate: new Date().toISOString()
      })),
      totalItems: combinedShoppingList.length
    };

    if (onSaveList) {
      onSaveList(newSavedList);
    }
    
    navigation.goBack();
    Alert.alert(
      'Success', 
      `Shopping list "${newSavedList.name}" has been saved!`
    );
  };

  const criticalItems = lowStockItems.filter(item => item.currentQuantity === 0);
  const urgentItems = lowStockItems.filter(item => 
    item.currentQuantity > 0 && item.currentQuantity <= item.minStockLevel * 0.5
  );
  const normalLowStock = lowStockItems.filter(item => 
    !criticalItems.includes(item) && !urgentItems.includes(item)
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
        <Text style={styles.headerTitle}>Save Shopping List</Text>
        <View style={styles.headerSpacer} />
      </View>
      
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <View style={styles.header}>
          <Title style={styles.title}>Save Your Shopping List</Title>
          <Paragraph style={styles.subtitle}>
            Give your shopping list a name to save it for later use
          </Paragraph>
        </View>

        <Card style={styles.formCard}>
          <Card.Content style={styles.cardContent}>
            <CustomTextInput
              label="List Name"
              value={listName}
              onChangeText={setListName}
              mode="outlined"
              style={styles.input}
              placeholder="e.g., Monthly Restocking, Emergency Supplies"
              autoComplete="off"
              textContentType="none"
              autoCorrect={false}
              spellCheck={false}
              right={null}
            />
          </Card.Content>
        </Card>

        <Card style={styles.summaryCard}>
          <Card.Content style={styles.cardContent}>
            <Title style={styles.cardTitle}>What will be saved:</Title>
            
            <View style={styles.summarySection}>
              <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryNumber}>{combinedShoppingList.length}</Text>
                  <Text style={styles.summaryLabel}>Total Items</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryNumber, { color: colors.primary }]}>
                    {manualItems.length}
                  </Text>
                  <Text style={styles.summaryLabel}>Manual Items</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryNumber, { color: colors.warning || '#ff9800' }]}>
                    {lowStockItems.length}
                  </Text>
                  <Text style={styles.summaryLabel}>Low Stock</Text>
                </View>
              </View>
            </View>

            <Divider style={styles.divider} />

            <View style={styles.detailsSection}>
              <Text style={styles.sectionTitle}>Items Breakdown:</Text>
              
              {criticalItems.length > 0 && (
                <View style={styles.itemCategory}>
                  <Text style={[styles.categoryTitle, { color: colors.danger || '#f44336' }]}>
                    🔴 Critical - Out of Stock ({criticalItems.length})
                  </Text>
                  {criticalItems.slice(0, 3).map((item, index) => (
                    <Text key={index} style={styles.itemName}>• {item.productName}</Text>
                  ))}
                  {criticalItems.length > 3 && (
                    <Text style={styles.moreItems}>
                      ... and {criticalItems.length - 3} more
                    </Text>
                  )}
                </View>
              )}

              {urgentItems.length > 0 && (
                <View style={styles.itemCategory}>
                  <Text style={[styles.categoryTitle, { color: colors.warning || '#ff9800' }]}>
                    🟡 Urgent - Low Stock ({urgentItems.length})
                  </Text>
                  {urgentItems.slice(0, 3).map((item, index) => (
                    <Text key={index} style={styles.itemName}>• {item.productName}</Text>
                  ))}
                  {urgentItems.length > 3 && (
                    <Text style={styles.moreItems}>
                      ... and {urgentItems.length - 3} more
                    </Text>
                  )}
                </View>
              )}

              {normalLowStock.length > 0 && (
                <View style={styles.itemCategory}>
                  <Text style={[styles.categoryTitle, { color: colors.info || '#2196F3' }]}>
                    🟠 Low Stock ({normalLowStock.length})
                  </Text>
                  {normalLowStock.slice(0, 3).map((item, index) => (
                    <Text key={index} style={styles.itemName}>• {item.productName}</Text>
                  ))}
                  {normalLowStock.length > 3 && (
                    <Text style={styles.moreItems}>
                      ... and {normalLowStock.length - 3} more
                    </Text>
                  )}
                </View>
              )}

              {manualItems.length > 0 && (
                <View style={styles.itemCategory}>
                  <Text style={[styles.categoryTitle, { color: colors.primary }]}>
                    📝 Manual Items ({manualItems.length})
                  </Text>
                  {manualItems.slice(0, 3).map((item, index) => (
                    <Text key={index} style={styles.itemName}>• {item.productName}</Text>
                  ))}
                  {manualItems.length > 3 && (
                    <Text style={styles.moreItems}>
                      ... and {manualItems.length - 3} more
                    </Text>
                  )}
                </View>
              )}
            </View>
          </Card.Content>
        </Card>

        <Card style={styles.infoCard}>
          <Card.Content style={styles.cardContent}>
            <Title style={styles.infoTitle}>Important Note</Title>
            <Paragraph style={styles.infoText}>
              • Manual items will be restored exactly as they are now
            </Paragraph>
            <Paragraph style={styles.infoText}>
              • Low stock items are recalculated when loading based on current inventory levels
            </Paragraph>
            <Paragraph style={styles.infoText}>
              • This snapshot preserves the current state for reference
            </Paragraph>
          </Card.Content>
        </Card>

        <View style={styles.buttonContainer}>
          <Button
            mode="contained"
            onPress={handleSave}
            style={styles.saveButton}
            contentStyle={styles.buttonContent}
            disabled={!listName.trim() || combinedShoppingList.length === 0}
          >
            Save Shopping List
          </Button>
          
          <Button
            mode="outlined"
            onPress={() => navigation.goBack()}
            style={styles.cancelButton}
            contentStyle={styles.buttonContent}
          >
            Cancel
          </Button>
        </View>
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
  formCard: {
    borderRadius: borderRadius.lg,
    elevation: 2,
    ...shadows.small,
    marginBottom: spacing.lg,
  },
  summaryCard: {
    borderRadius: borderRadius.lg,
    elevation: 2,
    ...shadows.small,
    marginBottom: spacing.lg,
  },
  infoCard: {
    borderRadius: borderRadius.lg,
    elevation: 2,
    ...shadows.small,
    marginBottom: spacing.xl,
    backgroundColor: colors.info + '10' || '#e3f2fd',
  },
  cardContent: {
    padding: spacing.lg,
  },
  cardTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  input: {
    backgroundColor: colors.surface,
  },
  summarySection: {
    marginBottom: spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryNumber: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
  },
  summaryLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  divider: {
    marginVertical: spacing.md,
    backgroundColor: colors.borderLight,
  },
  detailsSection: {
    gap: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  itemCategory: {
    marginBottom: spacing.sm,
  },
  categoryTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semiBold,
    marginBottom: spacing.xs,
  },
  itemName: {
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
  infoTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  infoText: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.xs,
  },
  buttonContainer: {
    gap: spacing.md,
  },
  saveButton: {
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primary,
  },
  cancelButton: {
    borderRadius: borderRadius.lg,
    borderColor: colors.borderMedium,
  },
  buttonContent: {
    height: 48,
    paddingHorizontal: spacing.lg,
  },
});

export default SaveShoppingListScreen;
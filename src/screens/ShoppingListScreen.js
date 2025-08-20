import React, { useEffect } from 'react';
import { View, FlatList, StyleSheet, Share, Alert } from 'react-native';
import { 
  List, 
  Text, 
  Card, 
  Button, 
  Chip,
  ActivityIndicator,
  Divider 
} from 'react-native-paper';
import { useSelector } from 'react-redux';

const ShoppingListScreen = ({ navigation }) => {
  const { items, loading } = useSelector((state) => state.inventory);
  
  // Filter items where current quantity is at or below minimum stock level
  const lowStockItems = items.filter(item => 
    item.currentQuantity <= item.minStockLevel
  );

  const totalLowStockValue = lowStockItems.length;
  const criticalItems = lowStockItems.filter(item => 
    item.currentQuantity === 0
  );
  const urgentItems = lowStockItems.filter(item => 
    item.currentQuantity > 0 && item.currentQuantity <= item.minStockLevel * 0.5
  );

  const generateShoppingListText = () => {
    if (lowStockItems.length === 0) {
      return 'No items currently need restocking.';
    }

    let text = 'DENTAL PRACTICE SHOPPING LIST\n';
    text += `Generated: ${new Date().toLocaleDateString()}\n`;
    text += `Total Items to Order: ${lowStockItems.length}\n\n`;

    if (criticalItems.length > 0) {
      text += '🔴 CRITICAL - OUT OF STOCK:\n';
      criticalItems.forEach(item => {
        const needed = Math.max(item.minStockLevel * 2 - item.currentQuantity, item.minStockLevel);
        text += `• ${item.productName} (Current: ${item.currentQuantity}, Suggested: ${needed})\n`;
        if (item.location) text += `  Location: ${item.location}\n`;
        if (item.barcode) text += `  Barcode: ${item.barcode}\n`;
      });
      text += '\n';
    }

    if (urgentItems.length > 0) {
      text += '🟡 URGENT - LOW STOCK:\n';
      urgentItems.forEach(item => {
        const needed = Math.max(item.minStockLevel * 2 - item.currentQuantity, item.minStockLevel);
        text += `• ${item.productName} (Current: ${item.currentQuantity}, Min: ${item.minStockLevel}, Suggested: ${needed})\n`;
        if (item.location) text += `  Location: ${item.location}\n`;
        if (item.barcode) text += `  Barcode: ${item.barcode}\n`;
      });
      text += '\n';
    }

    const normalLowStock = lowStockItems.filter(item => 
      !criticalItems.includes(item) && !urgentItems.includes(item)
    );

    if (normalLowStock.length > 0) {
      text += '🟠 LOW STOCK:\n';
      normalLowStock.forEach(item => {
        const needed = Math.max(item.minStockLevel * 2 - item.currentQuantity, item.minStockLevel);
        text += `• ${item.productName} (Current: ${item.currentQuantity}, Min: ${item.minStockLevel}, Suggested: ${needed})\n`;
        if (item.location) text += `  Location: ${item.location}\n`;
        if (item.barcode) text += `  Barcode: ${item.barcode}\n`;
      });
    }

    return text;
  };

  const handleShareShoppingList = async () => {
    try {
      const shoppingListText = generateShoppingListText();
      await Share.share({
        message: shoppingListText,
        title: 'Dental Practice Shopping List',
      });
    } catch (error) {
      console.error('Error sharing shopping list:', error);
      Alert.alert('Error', 'Failed to share shopping list');
    }
  };

  const getItemPriority = (item) => {
    if (item.currentQuantity === 0) return 'critical';
    if (item.currentQuantity <= item.minStockLevel * 0.5) return 'urgent';
    return 'low';
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'critical': return '#f44336';
      case 'urgent': return '#ff9800';
      default: return '#2196F3';
    }
  };

  const getPriorityLabel = (priority) => {
    switch (priority) {
      case 'critical': return 'OUT OF STOCK';
      case 'urgent': return 'URGENT';
      default: return 'LOW STOCK';
    }
  };

  const renderItem = ({ item }) => {
    const priority = getItemPriority(item);
    const suggestedOrder = Math.max(item.minStockLevel * 2 - item.currentQuantity, item.minStockLevel);

    return (
      <Card style={[styles.itemCard, { borderLeftColor: getPriorityColor(priority) }]}>
        <Card.Content>
          <View style={styles.itemHeader}>
            <Text style={styles.itemName}>{item.productName}</Text>
            <Chip 
              mode="outlined" 
              style={[styles.priorityChip, { borderColor: getPriorityColor(priority) }]}
              textStyle={{ color: getPriorityColor(priority), fontSize: 10 }}
            >
              {getPriorityLabel(priority)}
            </Chip>
          </View>

          <View style={styles.itemDetails}>
            <Text style={styles.stockInfo}>
              Current: {item.currentQuantity} | Min: {item.minStockLevel}
            </Text>
            <Text style={styles.suggestion}>
              Suggested order: {suggestedOrder} units
            </Text>
            {item.location && (
              <Text style={styles.location}>Location: {item.location}</Text>
            )}
            {item.barcode && (
              <Text style={styles.barcode}>Barcode: {item.barcode}</Text>
            )}
          </View>

          <Button
            mode="outlined"
            compact
            onPress={() => navigation.navigate('ItemDetail', { item })}
            style={styles.editButton}
          >
            Edit Item
          </Button>
        </Card.Content>
      </Card>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading shopping list...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Card style={styles.summaryCard}>
        <Card.Content>
          <Text style={styles.summaryTitle}>Shopping List Summary</Text>
          <Divider style={styles.divider} />
          
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryNumber}>{totalLowStockValue}</Text>
              <Text style={styles.summaryLabel}>Total Items</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryNumber, { color: '#f44336' }]}>
                {criticalItems.length}
              </Text>
              <Text style={styles.summaryLabel}>Out of Stock</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryNumber, { color: '#ff9800' }]}>
                {urgentItems.length}
              </Text>
              <Text style={styles.summaryLabel}>Urgent</Text>
            </View>
          </View>

          {lowStockItems.length > 0 && (
            <Button
              mode="contained"
              onPress={handleShareShoppingList}
              style={styles.shareButton}
              icon="share"
            >
              Share Shopping List
            </Button>
          )}
        </Card.Content>
      </Card>

      {lowStockItems.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Card.Content style={styles.emptyContent}>
            <Text style={styles.emptyIcon}>✅</Text>
            <Text style={styles.emptyTitle}>All Stocked Up!</Text>
            <Text style={styles.emptyText}>
              No items currently need restocking. Great job maintaining your inventory!
            </Text>
            <Button
              mode="outlined"
              onPress={() => navigation.navigate('Inventory')}
              style={styles.emptyButton}
            >
              View Full Inventory
            </Button>
          </Card.Content>
        </Card>
      ) : (
        <FlatList
          data={lowStockItems.sort((a, b) => {
            // Sort by priority: critical first, then urgent, then low stock
            const priorityOrder = { critical: 0, urgent: 1, low: 2 };
            const aPriority = getItemPriority(a);
            const bPriority = getItemPriority(b);
            
            if (priorityOrder[aPriority] !== priorityOrder[bPriority]) {
              return priorityOrder[aPriority] - priorityOrder[bPriority];
            }
            
            return a.productName.localeCompare(b.productName);
          })}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: '#666',
  },
  summaryCard: {
    margin: 16,
    elevation: 4,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2196F3',
    marginBottom: 8,
  },
  divider: {
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  shareButton: {
    marginTop: 8,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 16,
  },
  itemCard: {
    marginHorizontal: 16,
    marginVertical: 4,
    borderLeftWidth: 4,
    elevation: 2,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemName: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 8,
  },
  priorityChip: {
    height: 24,
  },
  itemDetails: {
    marginBottom: 12,
  },
  stockInfo: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  suggestion: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2196F3',
    marginBottom: 4,
  },
  location: {
    fontSize: 12,
    color: '#888',
    marginBottom: 2,
  },
  barcode: {
    fontSize: 12,
    color: '#888',
    fontFamily: 'monospace',
  },
  editButton: {
    alignSelf: 'flex-start',
  },
  emptyCard: {
    margin: 16,
    marginTop: 32,
  },
  emptyContent: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4caf50',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  emptyButton: {
    minWidth: 150,
  },
});

export default ShoppingListScreen;
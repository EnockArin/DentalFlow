import React, { useState } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { 
  Searchbar,
  List,
  Button,
  Card,
  Title,
  Text
} from 'react-native-paper';
import { useSelector } from 'react-redux';
import { colors, spacing, borderRadius, typography } from '../constants/theme';

const TreatmentKitAddFromInventoryScreen = ({ navigation, route }) => {
  const { items: inventoryItems } = useSelector((state) => state.inventory);
  const { selectedItems = [] } = route.params || {};
  const [searchQuery, setSearchQuery] = useState('');

  const filteredItems = inventoryItems.filter(item => {
    const matchesSearch = item.productName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.barcode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Don't show items that are already in the kit
    const alreadySelected = selectedItems.some(selected => selected.inventoryId === item.id);
    
    return matchesSearch && !alreadySelected;
  });

  const handleAddItem = (inventoryItem) => {
    const newItem = {
      inventoryId: inventoryItem.id,
      name: inventoryItem.productName,
      quantity: 1,
      unit: inventoryItem.unit || 'unit',
      category: inventoryItem.category || null
    };

    // Navigate back with the new item
    navigation.navigate('TreatmentKitDetail', { 
      newItem: newItem 
    });
  };

  const renderInventoryItem = ({ item }) => (
    <List.Item
      title={item.productName}
      description={`Stock: ${item.currentQuantity} | Location: ${item.location || 'Not specified'}`}
      right={() => (
        <Button 
          mode="contained" 
          compact 
          onPress={() => handleAddItem(item)}
          buttonColor={colors.primary}
          style={styles.addButton}
        >
          Add
        </Button>
      )}
      style={styles.inventoryItem}
    />
  );

  return (
    <View style={styles.container}>
      <Card style={styles.headerCard}>
        <Card.Content>
          <Title style={styles.title}>Add from Inventory</Title>
          <Text style={styles.subtitle}>
            Select items from your inventory to add to the treatment kit
          </Text>
        </Card.Content>
      </Card>

      <Searchbar
        placeholder="Search inventory items..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchbar}
      />

      {filteredItems.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            {searchQuery ? 'No items match your search' : 'No inventory items available'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          renderItem={renderInventoryItem}
          keyExtractor={(item) => item.id}
          style={styles.list}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.md,
  },
  headerCard: {
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
  },
  title: {
    color: colors.primary,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.sm,
    marginTop: spacing.xs,
  },
  searchbar: {
    marginBottom: spacing.md,
    elevation: 0,
    backgroundColor: colors.lightGray,
    borderRadius: borderRadius.md,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: spacing.lg,
  },
  inventoryItem: {
    backgroundColor: colors.white,
    marginBottom: spacing.xs,
    borderRadius: borderRadius.sm,
    elevation: 1,
  },
  addButton: {
    alignSelf: 'center',
    minWidth: 60,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyText: {
    fontSize: typography.fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});

export default TreatmentKitAddFromInventoryScreen;
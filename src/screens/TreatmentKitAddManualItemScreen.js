import React, { useState } from 'react';
import { View, StyleSheet, Alert, ScrollView } from 'react-native';
import { 
  Button,
  Card,
  Title,
  Text
} from 'react-native-paper';
import CustomTextInput from '../components/common/CustomTextInput';
import { colors, spacing, borderRadius, typography } from '../constants/theme';

const TreatmentKitAddManualItemScreen = ({ navigation, route }) => {
  const { selectedItems = [] } = route.params || {};
  const [itemName, setItemName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState('unit');
  const [loading, setLoading] = useState(false);

  const handleAddManualItem = () => {
    if (!itemName.trim()) {
      Alert.alert('Error', 'Please enter an item name');
      return;
    }
    
    if (!quantity || isNaN(parseInt(quantity)) || parseInt(quantity) <= 0) {
      Alert.alert('Error', 'Please enter a valid positive quantity');
      return;
    }
    
    // Check if item with same name already exists
    const existingIndex = selectedItems.findIndex(item => 
      item.name.toLowerCase() === itemName.trim().toLowerCase()
    );
    
    if (existingIndex >= 0) {
      Alert.alert('Error', 'An item with this name is already in the kit');
      return;
    }
    
    const newItem = {
      inventoryId: null, // Manual items don't have inventory ID
      name: itemName.trim(),
      quantity: parseInt(quantity),
      unit: unit.trim() || 'unit',
      category: 'Manual'
    };

    // Navigate back with the new manual item
    navigation.navigate('TreatmentKitDetail', { 
      newItem: newItem 
    });
  };

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.headerCard}>
        <Card.Content>
          <Title style={styles.title}>Add Manual Item</Title>
          <Text style={styles.subtitle}>
            Create a custom item for your treatment kit
          </Text>
        </Card.Content>
      </Card>

      <Card style={styles.formCard}>
        <Card.Content>
          <CustomTextInput
            label="Item Name *"
            value={itemName}
            onChangeText={setItemName}
            placeholder="e.g., Gauze pads, Cotton rolls"
            style={styles.input}
          />

          <View style={styles.rowInputs}>
            <CustomTextInput
              label="Quantity *"
              value={quantity}
              onChangeText={setQuantity}
              placeholder="1"
              keyboardType="numeric"
              style={[styles.input, styles.halfInput]}
            />
            <CustomTextInput
              label="Unit"
              value={unit}
              onChangeText={setUnit}
              placeholder="units"
              style={[styles.input, styles.halfInput]}
            />
          </View>

          <Text style={styles.helpText}>
            * Required fields
          </Text>
        </Card.Content>
      </Card>

      <View style={styles.buttonContainer}>
        <Button
          mode="outlined"
          onPress={() => navigation.goBack()}
          style={[styles.button, styles.cancelButton]}
          disabled={loading}
        >
          Cancel
        </Button>
        
        <Button
          mode="contained"
          onPress={handleAddManualItem}
          style={[styles.button, styles.addButton]}
          buttonColor={colors.primary}
          loading={loading}
          disabled={loading}
        >
          Add Item
        </Button>
      </View>
    </ScrollView>
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
  formCard: {
    marginBottom: spacing.lg,
    borderRadius: borderRadius.lg,
  },
  input: {
    marginBottom: spacing.md,
  },
  rowInputs: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  halfInput: {
    flex: 1,
  },
  helpText: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    fontStyle: 'italic',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  button: {
    flex: 1,
    borderRadius: borderRadius.md,
  },
  cancelButton: {
    borderColor: colors.textSecondary,
  },
  addButton: {
    // Primary color applied via buttonColor prop
  },
});

export default TreatmentKitAddManualItemScreen;
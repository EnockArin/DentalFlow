import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { 
  TextInput, 
  List, 
  Card, 
  Text, 
  Portal, 
  Modal, 
  Button, 
  Searchbar,
  Chip
} from 'react-native-paper';
import { useSelector } from 'react-redux';
import { colors, spacing, borderRadius, typography, shadows } from '../../constants/theme';

const LocationPicker = ({ 
  value, 
  onSelect, 
  placeholder = "Select location",
  style,
  disabled = false 
}) => {
  const { locations } = useSelector((state) => state.locations);
  const [visible, setVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState(null);

  const locationTypes = {
    operatory: { label: 'Operatory', icon: '🦷' },
    clinic: { label: 'Clinic', icon: '🏥' },
    storage: { label: 'Storage', icon: '📦' },
    sterilization: { label: 'Sterilization', icon: '🧪' },
    lab: { label: 'Lab', icon: '🔬' },
  };

  useEffect(() => {
    if (value && locations.length > 0) {
      const location = locations.find(loc => loc.id === value);
      setSelectedLocation(location);
    }
  }, [value, locations]);

  const filteredLocations = locations.filter(location =>
    location.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    location.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (location.description && location.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleLocationSelect = (location) => {
    setSelectedLocation(location);
    onSelect(location.id, location.name);
    setVisible(false);
    setSearchQuery('');
  };

  const handleClear = () => {
    setSelectedLocation(null);
    onSelect('', '');
  };

  const getDisplayText = () => {
    if (selectedLocation) {
      const typeInfo = locationTypes[selectedLocation.type] || locationTypes.operatory;
      return `${typeInfo.icon} ${selectedLocation.name}`;
    }
    return placeholder;
  };

  const renderLocationItem = ({ item }) => {
    const typeInfo = locationTypes[item.type] || locationTypes.operatory;
    
    return (
      <TouchableOpacity onPress={() => handleLocationSelect(item)}>
        <List.Item
          title={item.name}
          description={`${typeInfo.label}${item.description ? ` • ${item.description}` : ''}`}
          left={(props) => (
            <View style={styles.locationIcon}>
              <Text style={styles.locationIconText}>{typeInfo.icon}</Text>
            </View>
          )}
          style={styles.locationItem}
          titleStyle={styles.locationTitle}
          descriptionStyle={styles.locationDescription}
        />
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity onPress={() => !disabled && setVisible(true)}>
        <TextInput
          mode="outlined"
          value={getDisplayText()}
          editable={false}
          placeholder={placeholder}
          onPressIn={() => !disabled && setVisible(true)}
          onFocus={() => !disabled && setVisible(true)}
          right={
            <TextInput.Icon 
              icon={selectedLocation ? "close" : "chevron-down"} 
              onPress={selectedLocation ? handleClear : () => !disabled && setVisible(true)}
            />
          }
          left={<TextInput.Icon icon="map-marker-outline" />}
          outlineColor={colors.borderLight}
          activeOutlineColor={colors.primary}
          style={[styles.input, disabled && styles.disabledInput]}
          textColor={selectedLocation ? colors.textPrimary : colors.textSecondary}
        />
      </TouchableOpacity>

      <Portal>
        <Modal 
          visible={visible} 
          onDismiss={() => setVisible(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <Card style={styles.modalCard}>
            <Card.Content style={styles.modalContent}>
              <Text style={styles.modalTitle}>Select Location</Text>
              
              <Searchbar
                placeholder="Search locations..."
                onChangeText={setSearchQuery}
                value={searchQuery}
                style={styles.searchbar}
              />

              {filteredLocations.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyIcon}>🏥</Text>
                  <Text style={styles.emptyText}>
                    {searchQuery ? 'No locations match your search' : 'No locations available'}
                  </Text>
                  {!searchQuery && (
                    <Text style={styles.emptySubtext}>
                      Create locations in the Locations tab
                    </Text>
                  )}
                </View>
              ) : (
                <FlatList
                  data={filteredLocations}
                  renderItem={renderLocationItem}
                  keyExtractor={(item) => item.id}
                  style={styles.locationsList}
                  showsVerticalScrollIndicator={false}
                />
              )}

              <View style={styles.modalActions}>
                <Button 
                  mode="outlined" 
                  onPress={() => setVisible(false)}
                  style={styles.cancelButton}
                >
                  Cancel
                </Button>
              </View>
            </Card.Content>
          </Card>
        </Modal>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.surface,
  },
  disabledInput: {
    opacity: 0.6,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    maxHeight: '80%',
    borderRadius: borderRadius.lg,
    ...shadows.large,
  },
  modalContent: {
    padding: spacing.lg,
  },
  modalTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  searchbar: {
    marginBottom: spacing.md,
    elevation: 2,
  },
  locationsList: {
    maxHeight: 300,
    marginBottom: spacing.md,
  },
  locationItem: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  locationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryLight + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.sm,
  },
  locationIconText: {
    fontSize: 20,
  },
  locationTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    color: colors.textPrimary,
  },
  locationDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
  emptyContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  emptyText: {
    fontSize: typography.fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  emptySubtext: {
    fontSize: typography.fontSize.sm,
    color: colors.textTertiary,
    textAlign: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingTop: spacing.md,
  },
  cancelButton: {
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.xl,
  },
});

export default LocationPicker;
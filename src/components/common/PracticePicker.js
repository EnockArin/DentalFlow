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

const PracticePicker = ({ 
  value, 
  onSelect, 
  placeholder = "Select practice *",
  style,
  disabled = false 
}) => {
  const { practices } = useSelector((state) => state.practices);
  const [visible, setVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPractice, setSelectedPractice] = useState(null);

  const practiceTypes = {
    practice: { label: 'Practice', icon: '🦷' },
  };

  useEffect(() => {
    if (value && practices.length > 0) {
      const practice = practices.find(practice => practice.id === value);
      setSelectedPractice(practice);
    }
  }, [value, practices]);

  // Auto-select practice if only one exists and none is selected
  useEffect(() => {
    if (!value && practices.length === 1 && onSelect) {
      const singlePractice = practices[0];
      setSelectedPractice(singlePractice);
      onSelect(singlePractice.id, singlePractice.name);
    }
  }, [practices, value, onSelect]);

  const filteredPractices = practices.filter(practice =>
    practice.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    practice.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (practice.description && practice.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handlePracticeSelect = (practice) => {
    setSelectedPractice(practice);
    onSelect(practice.id, practice.name);
    setVisible(false);
    setSearchQuery('');
  };

  const handleClear = () => {
    setSelectedPractice(null);
    onSelect('', '');
  };

  const getDisplayText = () => {
    if (selectedPractice) {
      const typeInfo = practiceTypes[selectedPractice.type] || practiceTypes.practice;
      return `${typeInfo.icon} ${selectedPractice.name}`;
    }
    return placeholder;
  };

  const renderPracticeItem = ({ item }) => {
    const typeInfo = practiceTypes[item.type] || practiceTypes.practice;
    
    return (
      <TouchableOpacity onPress={() => handlePracticeSelect(item)}>
        <List.Item
          title={item.name}
          description={`${typeInfo.label}${item.description ? ` • ${item.description}` : ''}`}
          left={(props) => (
            <View style={styles.practiceIcon}>
              <Text style={styles.practiceIconText}>{typeInfo.icon}</Text>
            </View>
          )}
          style={styles.practiceItem}
          titleStyle={styles.practiceTitle}
          descriptionStyle={styles.practiceDescription}
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
          outlineColor={colors.borderLight}
          activeOutlineColor={colors.primary}
          style={[styles.input, disabled && styles.disabledInput]}
          textColor={selectedPractice ? colors.textPrimary : colors.textSecondary}
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
              <Text style={styles.modalTitle}>Select Practice</Text>
              
              <Searchbar
                placeholder="Search practices..."
                onChangeText={setSearchQuery}
                value={searchQuery}
                style={styles.searchbar}
                icon={() => null}
              />

              {filteredPractices.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyIcon}>🦷</Text>
                  <Text style={styles.emptyText}>
                    {searchQuery ? 'No practices match your search' : 'No practices available'}
                  </Text>
                  {!searchQuery && (
                    <Text style={styles.emptySubtext}>
                      Create practices in the Practices tab
                    </Text>
                  )}
                </View>
              ) : (
                <FlatList
                  data={filteredPractices}
                  renderItem={renderPracticeItem}
                  keyExtractor={(item) => item.id}
                  style={styles.practicesList}
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
  practicesList: {
    maxHeight: 300,
    marginBottom: spacing.md,
  },
  practiceItem: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  practiceIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryLight + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.sm,
  },
  practiceIconText: {
    fontSize: 20,
  },
  practiceTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    color: colors.textPrimary,
  },
  practiceDescription: {
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

export default PracticePicker;
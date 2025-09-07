import React, { useState } from 'react';
import { View, StyleSheet, Alert, Share, ScrollView } from 'react-native';
import { 
  Card, 
  Title, 
  Button, 
  List, 
  Divider,
  Text,
  ActivityIndicator,
  Dialog,
  Portal,
  TextInput
} from 'react-native-paper';
import CustomTextInput from '../components/common/CustomTextInput';
import { useSelector, useDispatch } from 'react-redux';
import { signOut, updateEmail, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { logout } from '../store/slices/authSlice';
import Papa from 'papaparse';
import { generateInventoryPDF, generateShoppingListPDF, exportToPDF } from '../utils/pdfExporter';

const SettingsScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { items } = useSelector((state) => state.inventory);
  const [exporting, setExporting] = useState(false);
  const [showChangeEmail, setShowChangeEmail] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updating, setUpdating] = useState(false);
  
  // Password visibility states
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          onPress: async () => {
            try {
              await signOut(auth);
              dispatch(logout());
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          },
        },
      ]
    );
  };

  const generateInventoryCSV = () => {
    const csvData = items.map(item => ({
      'Product Name': item.productName || '',
      'Barcode': item.barcode || '',
      'Current Quantity': item.currentQuantity || 0,
      'Minimum Stock Level': item.minStockLevel || 0,
      'Location': item.location || '',
      'Expiry Date': item.expiryDate ? item.expiryDate.toISOString().split('T')[0] : '',
      'Created Date': item.createdAt ? item.createdAt.toISOString().split('T')[0] : '',
      'Last Updated': item.lastUpdated ? item.lastUpdated.toISOString().split('T')[0] : '',
      'Status': item.currentQuantity <= item.minStockLevel ? 'Low Stock' : 'In Stock',
    }));

    return Papa.unparse(csvData, {
      header: true,
      quotes: true,
    });
  };

  const generateStockLogCSV = async () => {
    try {
      const q = query(collection(db, 'stockLog'), orderBy('timestamp', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const csvData = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        // Handle already converted Date objects from Firebase
        const timestamp = data.timestamp ? (data.timestamp instanceof Date ? data.timestamp : data.timestamp.toDate()) : null;
        csvData.push({
          'Date': timestamp ? timestamp.toISOString().split('T')[0] : '',
          'Time': timestamp ? timestamp.toLocaleTimeString() : '',
          'Product Name': data.productName || '',
          'Action': data.changeType === 'in' ? 'Check In' : 'Check Out',
          'Quantity Changed': data.quantityChanged || 0,
          'Previous Quantity': data.previousQuantity || 0,
          'New Quantity': data.newQuantity || 0,
          'User Email': data.userEmail || '',
        });
      });

      return Papa.unparse(csvData, {
        header: true,
        quotes: true,
      });
    } catch (error) {
      console.error('Error generating stock log CSV:', error);
      throw error;
    }
  };

  const handleExportInventory = async () => {
    setExporting(true);
    
    try {
      const csv = generateInventoryCSV();
      const fileName = `DentalFlow_Inventory_${new Date().toISOString().split('T')[0]}.csv`;
      
      await Share.share({
        message: `DentalFlow Inventory Export - ${new Date().toLocaleDateString()}\n\nTotal Items: ${items.length}\nLow Stock Items: ${items.filter(item => item.currentQuantity <= item.minStockLevel).length}\n\nCSV Data:\n\n${csv}`,
        title: fileName,
      });
      
      Alert.alert('Success', 'Inventory data exported successfully!');
    } catch (error) {
      console.error('Error exporting inventory:', error);
      Alert.alert('Error', 'Failed to export inventory data');
    } finally {
      setExporting(false);
    }
  };

  const handleExportStockLog = async () => {
    setExporting(true);
    
    try {
      const csv = await generateStockLogCSV();
      const fileName = `DentalFlow_StockLog_${new Date().toISOString().split('T')[0]}.csv`;
      
      await Share.share({
        message: `DentalFlow Stock Movement Log - ${new Date().toLocaleDateString()}\n\nCSV Data:\n\n${csv}`,
        title: fileName,
      });
      
      Alert.alert('Success', 'Stock log exported successfully!');
    } catch (error) {
      console.error('Error exporting stock log:', error);
      Alert.alert('Error', 'Failed to export stock log');
    } finally {
      setExporting(false);
    }
  };

  const handleExportShoppingList = () => {
    const lowStockItems = items.filter(item => item.currentQuantity <= item.minStockLevel);
    
    if (lowStockItems.length === 0) {
      Alert.alert('No Items', 'No items currently need restocking');
      return;
    }

    const csvData = lowStockItems.map(item => ({
      'Product Name': item.productName || '',
      'Current Quantity': item.currentQuantity || 0,
      'Minimum Stock Level': item.minStockLevel || 0,
      'Suggested Order Quantity': Math.max(item.minStockLevel * 2 - item.currentQuantity, item.minStockLevel),
      'Location': item.location || '',
      'Barcode': item.barcode || '',
      'Priority': item.currentQuantity === 0 ? 'Critical' : item.currentQuantity <= item.minStockLevel * 0.5 ? 'Urgent' : 'Low Stock',
    }));

    const csv = Papa.unparse(csvData, {
      header: true,
      quotes: true,
    });

    Share.share({
      message: `DentalFlow Shopping List - ${new Date().toLocaleDateString()}\n\nItems to Order: ${lowStockItems.length}\n\nCSV Data:\n\n${csv}`,
      title: `DentalFlow_ShoppingList_${new Date().toISOString().split('T')[0]}.csv`,
    });
  };

  const handleExportInventoryPDF = async () => {
    setExporting(true);
    try {
      const pdfPath = await generateInventoryPDF(items, [], null);
      const filename = `DentalFlow_Full_Inventory`;
      await exportToPDF(pdfPath, filename);
      Alert.alert('Success', 'Inventory PDF exported successfully!');
    } catch (error) {
      console.error('Error exporting inventory PDF:', error);
      Alert.alert('Error', 'Failed to export inventory PDF');
    } finally {
      setExporting(false);
    }
  };

  const handleExportShoppingListPDF = async () => {
    const lowStockItems = items.filter(item => item.currentQuantity <= item.minStockLevel);
    
    if (lowStockItems.length === 0) {
      Alert.alert('No Items', 'No items currently need restocking');
      return;
    }

    setExporting(true);
    try {
      const pdfPath = await generateShoppingListPDF([], [], lowStockItems);
      const filename = `DentalFlow_Shopping_List`;
      await exportToPDF(pdfPath, filename);
      Alert.alert('Success', 'Shopping list PDF exported successfully!');
    } catch (error) {
      console.error('Error exporting shopping list PDF:', error);
      Alert.alert('Error', 'Failed to export shopping list PDF');
    } finally {
      setExporting(false);
    }
  };

  const handleChangeEmail = async () => {
    if (!newEmail.trim()) {
      Alert.alert('Error', 'Please enter a new email address');
      return;
    }

    if (!currentPassword) {
      Alert.alert('Error', 'Please enter your current password');
      return;
    }

    setUpdating(true);
    try {
      // Re-authenticate user first
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);
      
      // Update email
      await updateEmail(auth.currentUser, newEmail);
      
      Alert.alert('Success', 'Email updated successfully!');
      setShowChangeEmail(false);
      setNewEmail('');
      setCurrentPassword('');
    } catch (error) {
      console.error('Error updating email:', error);
      Alert.alert('Error', error.message || 'Failed to update email');
    } finally {
      setUpdating(false);
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all password fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return;
    }

    if (!currentPassword) {
      Alert.alert('Error', 'Please enter your current password');
      return;
    }

    setUpdating(true);
    try {
      // Re-authenticate user first
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);
      
      // Update password
      await updatePassword(auth.currentUser, newPassword);
      
      Alert.alert('Success', 'Password updated successfully!');
      setShowChangePassword(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error('Error updating password:', error);
      Alert.alert('Error', error.message || 'Failed to update password');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Account Information Card */}
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.cardTitle}>Account Information</Title>
          <Divider style={styles.divider} />
          <List.Item
            title="Email"
            description={user?.email || 'Not available'}
          />
        </Card.Content>
      </Card>

      {/* Practice Management Card */}
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.cardTitle}>Practice Management</Title>
          <Divider style={styles.divider} />
          
          <Button
            mode="outlined"
            onPress={() => navigation.navigate('Practices')}
            style={styles.exportButton}
          >
            Manage Practices
          </Button>
        </Card.Content>
      </Card>

      {/* Account Management Card */}
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.cardTitle}>Account Management</Title>
          <Divider style={styles.divider} />
          
          <Button
            mode="outlined"
            onPress={() => setShowChangeEmail(true)}
            style={styles.exportButton}
            disabled={updating}
          >
            Change Email Address
          </Button>

          <Button
            mode="outlined"
            onPress={() => setShowChangePassword(true)}
            style={styles.exportButton}
            disabled={updating}
          >
            Change Password
          </Button>
        </Card.Content>
      </Card>

      {/* Export Data Card */}
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.cardTitle}>Export Data</Title>
          <Divider style={styles.divider} />
          
          {/* Full Inventory Export */}
          <Text style={styles.sectionSubtitle}>Full Inventory ({items.length} items)</Text>
          <View style={styles.exportButtonGroup}>
            <Button
              mode="contained"
              onPress={handleExportInventory}
              loading={exporting}
              disabled={exporting}
              style={[styles.exportButton, styles.halfWidth]}
            >
              CSV
            </Button>
            <Button
              mode="outlined"
              onPress={handleExportInventoryPDF}
              loading={exporting}
              disabled={exporting}
              style={[styles.exportButton, styles.halfWidth]}
            >
              PDF
            </Button>
          </View>

          {/* Shopping List Export */}
          <Text style={styles.sectionSubtitle}>Shopping List ({items.filter(item => item.currentQuantity <= item.minStockLevel).length} items)</Text>
          <View style={styles.exportButtonGroup}>
            <Button
              mode="outlined"
              onPress={handleExportShoppingList}
              loading={exporting}
              disabled={exporting}
              style={[styles.exportButton, styles.halfWidth]}
            >
              CSV
            </Button>
            <Button
              mode="outlined"
              onPress={handleExportShoppingListPDF}
              loading={exporting}
              disabled={exporting}
              style={[styles.exportButton, styles.halfWidth]}
            >
              PDF
            </Button>
          </View>

          {/* Stock Movement Log */}
          <Text style={styles.sectionSubtitle}>Stock Movement Log</Text>
          <Button
            mode="outlined"
            onPress={handleExportStockLog}
            loading={exporting}
            disabled={exporting}
            style={styles.exportButton}
          >
            Export Stock Log (CSV)
          </Button>

          {exporting && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" style={styles.loadingIndicator} />
              <Text style={styles.loadingText}>Preparing export...</Text>
            </View>
          )}
        </Card.Content>
      </Card>

      {/* Navigation Card */}
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.cardTitle}>Quick Navigation</Title>
          <Divider style={styles.divider} />
          
          <Button
            mode="outlined"
            onPress={() => navigation.navigate('Dashboard')}
            style={styles.navButton}
            
          >
            Dashboard
          </Button>

          <Button
            mode="outlined"
            onPress={() => navigation.navigate('Inventory')}
            style={styles.navButton}
            
          >
            View Inventory
          </Button>

          <Button
            mode="outlined"
            onPress={() => navigation.navigate('ShoppingList')}
            style={styles.navButton}
            
          >
            Shopping List
          </Button>
        </Card.Content>
      </Card>

      {/* Logout Card */}
      <Card style={styles.card}>
        <Card.Content>
          <Button
            mode="contained"
            onPress={handleLogout}
            style={styles.logoutButton}
            buttonColor="#f44336"
            
          >
            Logout
          </Button>
        </Card.Content>
      </Card>

      {/* App Info */}
      <View style={styles.appInfo}>
        <Text style={styles.appInfoText}>DentalFlow v1.0</Text>
        <Text style={styles.appInfoText}>Dental Inventory Management</Text>
      </View>

      {/* Change Email Dialog */}
      <Portal>
        <Dialog visible={showChangeEmail} onDismiss={() => setShowChangeEmail(false)}>
          <Dialog.Title>Change Email Address</Dialog.Title>
          <Dialog.Content>
            <CustomTextInput
              label="New Email Address"
              value={newEmail}
              onChangeText={setNewEmail}
              keyboardType="email-address"
              style={styles.input}
            />
            <View style={styles.inputWithIcon}>
              <CustomTextInput
                label="Current Password"
                value={currentPassword}
                onChangeText={setCurrentPassword}
                secureTextEntry={!showCurrentPassword}
                style={[styles.input, styles.inputWithRightIcon]}
              />
              <View style={styles.inputIconRight}>
                <Text 
                  style={styles.passwordToggleText}
                  onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                >
                  {showCurrentPassword ? 'Hide' : 'Show'}
                </Text>
              </View>
            </View>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowChangeEmail(false)}>Cancel</Button>
            <Button onPress={handleChangeEmail} loading={updating} disabled={updating}>
              Update Email
            </Button>
          </Dialog.Actions>
        </Dialog>

        {/* Change Password Dialog */}
        <Dialog visible={showChangePassword} onDismiss={() => setShowChangePassword(false)}>
          <Dialog.Title>Change Password</Dialog.Title>
          <Dialog.Content>
            <View style={styles.inputWithIcon}>
              <CustomTextInput
                label="Current Password"
                value={currentPassword}
                onChangeText={setCurrentPassword}
                secureTextEntry={!showCurrentPassword}
                style={[styles.input, styles.inputWithRightIcon]}
              />
              <View style={styles.inputIconRight}>
                <Text 
                  style={styles.passwordToggleText}
                  onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                >
                  {showCurrentPassword ? 'Hide' : 'Show'}
                </Text>
              </View>
            </View>
            <View style={styles.inputWithIcon}>
              <CustomTextInput
                label="New Password"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry={!showNewPassword}
                style={[styles.input, styles.inputWithRightIcon]}
              />
              <View style={styles.inputIconRight}>
                <Text 
                  style={styles.passwordToggleText}
                  onPress={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? 'Hide' : 'Show'}
                </Text>
              </View>
            </View>
            
            <View style={styles.inputWithIcon}>
              <CustomTextInput
                label="Confirm New Password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
                style={[styles.input, styles.inputWithRightIcon]}
              />
              <View style={styles.inputIconRight}>
                <Text 
                  style={styles.passwordToggleText}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? 'Hide' : 'Show'}
                </Text>
              </View>
            </View>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowChangePassword(false)}>Cancel</Button>
            <Button onPress={handleChangePassword} loading={updating} disabled={updating}>
              Update Password
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  card: {
    marginBottom: 16,
    elevation: 4,
  },
  cardTitle: {
    color: '#2196F3',
    marginBottom: 8,
  },
  divider: {
    marginBottom: 16,
  },
  exportButton: {
    marginBottom: 12,
  },
  navButton: {
    marginBottom: 8,
  },
  logoutButton: {
    marginTop: 8,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    justifyContent: 'center',
  },
  loadingIndicator: {
    marginRight: 8,
  },
  loadingText: {
    color: '#666',
  },
  appInfo: {
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 32,
  },
  appInfoText: {
    color: '#999',
    fontSize: 12,
    textAlign: 'center',
  },
  sectionSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  exportButtonGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 16,
  },
  halfWidth: {
    flex: 1,
  },
  input: {
    marginBottom: 16,
  },
  inputWithIcon: {
    position: 'relative',
    marginBottom: 16,
  },
  inputWithRightIcon: {
    paddingRight: 42,
  },
  inputIconRight: {
    position: 'absolute',
    right: 6,
    top: '50%',
    transform: [{ translateY: -12 }],
    zIndex: 2,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 1,
  },
  passwordToggleText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#2196F3',
    textAlign: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    minWidth: 32,
  },
});

export default SettingsScreen;
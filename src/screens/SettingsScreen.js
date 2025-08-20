import React, { useState } from 'react';
import { View, StyleSheet, Alert, Share } from 'react-native';
import { 
  Card, 
  Title, 
  Button, 
  List, 
  Divider,
  Text,
  ActivityIndicator 
} from 'react-native-paper';
import { useSelector, useDispatch } from 'react-redux';
import { signOut } from 'firebase/auth';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { logout } from '../store/slices/authSlice';
import Papa from 'papaparse';

const SettingsScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { items } = useSelector((state) => state.inventory);
  const [exporting, setExporting] = useState(false);

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

  return (
    <View style={styles.container}>
      {/* User Info Card */}
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.cardTitle}>Account Information</Title>
          <Divider style={styles.divider} />
          <List.Item
            title="Email"
            description={user?.email || 'Not available'}
            left={(props) => <List.Icon {...props} icon="email" />}
          />
          <List.Item
            title="User ID"
            description={user?.uid || 'Not available'}
            left={(props) => <List.Icon {...props} icon="account" />}
          />
        </Card.Content>
      </Card>

      {/* Export Data Card */}
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.cardTitle}>Export Data</Title>
          <Divider style={styles.divider} />
          
          <Button
            mode="contained"
            onPress={handleExportInventory}
            loading={exporting}
            disabled={exporting}
            style={styles.exportButton}
            icon="download"
          >
            Export Full Inventory ({items.length} items)
          </Button>

          <Button
            mode="outlined"
            onPress={handleExportStockLog}
            loading={exporting}
            disabled={exporting}
            style={styles.exportButton}
            icon="history"
          >
            Export Stock Movement Log
          </Button>

          <Button
            mode="outlined"
            onPress={handleExportShoppingList}
            loading={exporting}
            disabled={exporting}
            style={styles.exportButton}
            icon="cart"
          >
            Export Shopping List ({items.filter(item => item.currentQuantity <= item.minStockLevel).length} items)
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
            icon="view-dashboard"
          >
            Dashboard
          </Button>

          <Button
            mode="outlined"
            onPress={() => navigation.navigate('Inventory')}
            style={styles.navButton}
            icon="package-variant"
          >
            View Inventory
          </Button>

          <Button
            mode="outlined"
            onPress={() => navigation.navigate('ShoppingList')}
            style={styles.navButton}
            icon="cart"
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
            icon="logout"
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
    </View>
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
});

export default SettingsScreen;
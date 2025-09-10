import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, StatusBar, Platform, Modal, TouchableOpacity } from 'react-native';
import { Button, Card, Title, Paragraph, Dialog, Portal } from 'react-native-paper';
import CustomTextInput from '../components/common/CustomTextInput';
import { colors, spacing, borderRadius } from '../constants/theme';
import { collection, query, where, getDocs, doc, updateDoc, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useSelector } from 'react-redux';
import { lookupBarcode } from '../services/secureBarcodeService';

// Use expo-camera instead of expo-barcode-scanner
let Camera, CameraView;
let cameraError = null;

try {
  const cameraModule = require('expo-camera');
  Camera = cameraModule.Camera;
  CameraView = cameraModule.CameraView;
  console.log('✅ expo-camera loaded successfully');
} catch (error) {
  console.error('❌ expo-camera not available:', error);
  cameraError = error.message;
}

const BarcodeScannerScreen = ({ navigation, route }) => {
  const { user } = useSelector((state) => state.auth);
  const { items } = useSelector((state) => state.inventory);
  
  // Check if we're scanning for shopping list
  const { forShoppingList, onAddToShoppingList } = route.params || {};
  
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [scannedData, setScannedData] = useState(null);
  const [cameraReady, setCameraReady] = useState(false);
  
  // Shopping list specific states
  const [showCostDialog, setShowCostDialog] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemQuantity, setNewItemQuantity] = useState('1');
  const [newItemCost, setNewItemCost] = useState('');
  const [currentBarcode, setCurrentBarcode] = useState('');
  
  // API lookup states
  const [apiLookupResult, setApiLookupResult] = useState(null);
  const [isLookingUp, setIsLookingUp] = useState(false);

  useEffect(() => {
    requestCameraPermission();
  }, []);

  const requestCameraPermission = async () => {
    if (!Camera || Platform.OS === 'web') {
      console.log('Camera not available');
      setHasPermission(false);
      return;
    }

    try {
      console.log('🔄 Requesting camera permission...');
      const { status } = await Camera.requestCameraPermissionsAsync();
      console.log('📋 Camera permission status:', status);
      setHasPermission(status === 'granted');
      
      if (status !== 'granted') {
        Alert.alert(
          'Camera Permission Required',
          'This app needs camera access to scan barcodes. Please grant camera permission.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Permission error:', error);
      setHasPermission(false);
      Alert.alert('Error', `Camera permission failed: ${error.message}`);
    }
  };

  const handleBarCodeScanned = async (scanningResult) => {
    if (scanned) return;

    console.log('🔍 Barcode scanned:', scanningResult);
    setScanned(true);
    setScannedData(scanningResult);

    const { type, data } = scanningResult;

    try {
      // Query Firestore for item with this barcode AND owned by current user
      // CRITICAL: Must filter by practiceId to prevent cross-user contamination
      const q = query(
        collection(db, 'inventory'), 
        where('barcode', '==', data),
        where('practiceId', '==', user?.uid)
      );
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        // Item exists in inventory - double check ownership
        const itemDoc = querySnapshot.docs[0];
        const itemData = { id: itemDoc.id, ...itemDoc.data() };
        
        // Additional security validation
        if (itemData.practiceId !== user?.uid) {
          console.error('Security: Document ownership mismatch detected');
          throw new Error('Access denied: Document ownership verification failed');
        }
        
        if (forShoppingList) {
          // Add to shopping list with cost from inventory
          handleAddToShoppingListFromInventory(itemData, data);
        } else {
          // Item exists in inventory - offer checkout or edit options
          Alert.alert(
            'Item Found in Inventory!',
            `${itemData.productName}\nCurrent Stock: ${itemData.currentQuantity}\nCost: £${(itemData.cost || 0).toFixed(2)}\n\nWhat would you like to do?`,
            [
              { text: 'Scan Again', onPress: resetScanner },
              { 
                text: 'Check Out Item', 
                onPress: () => navigation.navigate('Checkout', { 
                  scannedItem: itemData,
                  barcode: data 
                })
              },
              { 
                text: 'Edit Inventory', 
                onPress: () => navigation.navigate('ItemDetail', { item: itemData }) 
              }
            ]
          );
        }
      } else {
        // Item not found in local inventory - try API lookup
        await handleApiLookup(data);
      }
    } catch (error) {
      console.error('Error querying barcode:', error);
      Alert.alert('Error', 'Failed to look up barcode. Please try again.');
      resetScanner();
    }
  };

  const resetScanner = () => {
    setScanned(false);
    setScannedData(null);
    setApiLookupResult(null);
    setIsLookingUp(false);
  };

  const handleApiLookup = async (barcode) => {
    setIsLookingUp(true);
    setCurrentBarcode(barcode);

    try {
      const result = await lookupBarcode(barcode);
      setApiLookupResult(result);

      if (result && result.success) {
        // Product found via API
        const productInfo = result;
        
        if (forShoppingList) {
          // For shopping list, show the product info and ask to add with cost
          Alert.alert(
            'Product Found!',
            `Found: ${productInfo.productName}\nBrand: ${productInfo.brand || 'Unknown'}\nBarcode: ${barcode}\n\nAdd this item to your shopping list?`,
            [
              { text: 'Scan Again', onPress: resetScanner },
              { 
                text: 'Add to List', 
                onPress: () => handleAddApiProductToShoppingList(productInfo, barcode)
              }
            ]
          );
        } else {
          // For inventory, show product info and offer to check in (add) to inventory
          Alert.alert(
            'New Product Found!',
            `${productInfo.productName}\nBrand: ${productInfo.brand || 'Unknown'}\nBarcode: ${barcode}\n\nThis item is not in your inventory. Would you like to check it in?`,
            [
              { text: 'Scan Again', onPress: resetScanner },
              { 
                text: 'Check In Item', 
                onPress: () => navigation.replace('ItemDetail', { 
                  barcode: barcode,
                  productName: productInfo.productName,
                  description: productInfo.description,
                  brand: productInfo.brand,
                  category: productInfo.category,
                  size: productInfo.size,
                  imageUrl: productInfo.imageUrl,
                  apiData: productInfo
                })
              }
            ]
          );
        }
      } else {
        // API lookup failed or no product found
        if (forShoppingList) {
          // Show manual cost input dialog
          setNewItemName('');
          setNewItemQuantity('1');
          setNewItemCost('');
          setShowCostDialog(true);
        } else {
          // Normal inventory flow for unknown items
          Alert.alert(
            'Unknown Product',
            `No product information found for barcode: ${barcode}\n\nThis item is not in your inventory. Would you like to check in a new item manually?`,
            [
              { text: 'Scan Again', onPress: resetScanner },
              { 
                text: 'Check In New Item', 
                onPress: () => navigation.replace('ItemDetail', { barcode: barcode })
              }
            ]
          );
        }
      }
    } catch (error) {
      console.error('API Lookup error:', error);
      // Instead of showing an error, treat this as "product not found" and handle gracefully
      console.log('Treating API error as "product not found" - handling gracefully');
      
      if (forShoppingList) {
        // Show manual cost input dialog
        setNewItemName('');
        setNewItemQuantity('1'); 
        setNewItemCost('');
        setShowCostDialog(true);
      } else {
        // Normal inventory flow for unknown items
        Alert.alert(
          'Unknown Product',
          `No product information found for barcode: ${barcode}\n\nThis item is not in your inventory. Would you like to check in a new item manually?`,
          [
            { text: 'Scan Again', onPress: resetScanner },
            { 
              text: 'Check In New Item', 
              onPress: () => navigation.replace('ItemDetail', { barcode: barcode })
            }
          ]
        );
      }
    } finally {
      setIsLookingUp(false);
    }
  };

  const handleAddToShoppingListFromInventory = (itemData, barcode) => {
    const newItem = {
      id: `manual_${Date.now()}_${barcode}`,
      productName: itemData.productName,
      quantity: 1,
      cost: itemData.cost || itemData.unitCost || 0,
      notes: `Scanned from inventory: ${itemData.description || 'No description'}`,
      type: 'manual',
      dateAdded: new Date().toISOString(),
      barcode: barcode,
      originalItem: itemData
    };

    Alert.alert(
      'Add to Shopping List',
      `Found: ${itemData.productName}\nUnit Cost: £${((itemData.cost || itemData.unitCost) || 0).toFixed(2)}\n\nAdd this item to your shopping list?`,
      [
        { text: 'Scan Again', onPress: resetScanner },
        { 
          text: 'Add to List', 
          onPress: () => {
            if (onAddToShoppingList) {
              onAddToShoppingList(newItem);
            }
            navigation.goBack();
            Alert.alert('Success', `Added "${itemData.productName}" to your shopping list with cost £${((itemData.cost || itemData.unitCost) || 0).toFixed(2)}`);
          }
        }
      ]
    );
  };

  const handleAddApiProductToShoppingList = (productInfo, barcode) => {
    // Show cost input dialog with pre-filled product name from API
    setCurrentBarcode(barcode);
    setNewItemName(productInfo.productName);
    setNewItemQuantity('1');
    setNewItemCost('');
    setShowCostDialog(true);
  };

  const handleAddNewItemToShoppingList = () => {
    if (!newItemName.trim()) {
      Alert.alert('Invalid Input', 'Please enter an item name.');
      return;
    }

    if (!newItemCost || !newItemCost.trim()) {
      Alert.alert('Invalid Input', 'Please enter a unit cost.');
      return;
    }

    const quantity = parseInt(newItemQuantity) || 1;
    const cost = parseFloat(newItemCost);
    
    if (isNaN(cost) || cost < 0) {
      Alert.alert('Invalid Input', 'Please enter a valid positive cost.');
      return;
    }
    
    const newItem = {
      id: `manual_${Date.now()}_${currentBarcode}`,
      productName: newItemName.trim(),
      quantity: quantity,
      cost: cost,
      notes: apiLookupResult && apiLookupResult.success 
        ? `From API: ${apiLookupResult.brand ? apiLookupResult.brand + ' - ' : ''}${apiLookupResult.description || ''}`
        : `Scanned barcode: ${currentBarcode}`,
      type: 'manual',
      dateAdded: new Date().toISOString(),
      barcode: currentBarcode,
      apiData: apiLookupResult || null
    };

    if (onAddToShoppingList) {
      onAddToShoppingList(newItem);
    }
    
    setShowCostDialog(false);
    navigation.goBack();
    Alert.alert('Success', `Added "${newItem.productName}" to your shopping list with cost £${cost.toFixed(2)}`);
  };

  const handleCancelCostDialog = () => {
    setShowCostDialog(false);
    resetScanner();
  };

  if (cameraError) {
    return (
      <View style={styles.errorContainer}>
        <Card style={styles.errorCard}>
          <Card.Content>
            <Title style={styles.errorTitle}>Camera Not Available</Title>
            <Paragraph style={styles.errorText}>
              {cameraError}
            </Paragraph>
            <Paragraph style={styles.errorText}>
              This might be because:
              • The app is running in a simulator
              • Camera permissions are not available
              • Native modules are not properly linked
            </Paragraph>
            <Button 
              mode="contained" 
              onPress={() => navigation.goBack()}
              style={styles.button}
              buttonColor={colors.primary}
            >
              Back to Dashboard
            </Button>
          </Card.Content>
        </Card>
      </View>
    );
  }

  if (hasPermission === null) {
    return (
      <View style={styles.loadingContainer}>
        <Title>Requesting camera permission...</Title>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.errorContainer}>
        <Card style={styles.errorCard}>
          <Card.Content>
            <Title style={styles.errorTitle}>Camera Access Denied</Title>
            <Paragraph style={styles.errorText}>
              Camera access is required to scan barcodes. Please enable camera permissions in your device settings.
            </Paragraph>
            <Button 
              mode="contained" 
              onPress={requestCameraPermission}
              style={styles.button}
              buttonColor={colors.primary}
            >
              Request Permission Again
            </Button>
            <Button 
              mode="outlined" 
              onPress={() => navigation.goBack()}
              style={styles.button}
            >
              Back to Dashboard
            </Button>
          </Card.Content>
        </Card>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="black" />
      
      {CameraView ? (
        <CameraView
          style={styles.camera}
          facing="back"
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          barcodeScannerSettings={{
            barcodeTypes: ['qr', 'ean13', 'ean8', 'code128', 'code39', 'code93', 'codabar', 'datamatrix', 'pdf417'],
          }}
        >
          <View style={styles.overlay}>
            <View style={styles.header}>
              <Card style={styles.headerCard}>
                <Card.Content style={styles.headerContent}>
                  <Title style={styles.headerTitle}>Barcode Scanner</Title>
                  <Paragraph style={styles.headerSubtitle}>
                    {isLookingUp ? 'Looking up product...' :
                     scanned ? 'Barcode Scanned!' : 'Point camera at barcode'}
                  </Paragraph>
                </Card.Content>
              </Card>
            </View>

            <View style={styles.scanFrame}>
              <View style={styles.scanFrameCorner} />
            </View>

            <View style={styles.footer}>
              <Card style={styles.footerCard}>
                <Card.Content style={styles.footerContent}>
                  {scannedData && (
                    <View style={styles.scannedInfo}>
                      <Paragraph style={styles.scannedText}>
                        Type: {scannedData.type}
                      </Paragraph>
                      <Paragraph style={styles.scannedText}>
                        Data: {scannedData.data}
                      </Paragraph>
                    </View>
                  )}
                  <Button 
                    mode="contained" 
                    onPress={() => navigation.goBack()}
                    style={styles.button}
                    buttonColor={colors.danger}
                  >
                    Back
                  </Button>
                  {scanned && (
                    <Button 
                      mode="outlined" 
                      onPress={resetScanner}
                      style={styles.button}
                    >
                      Scan Again
                    </Button>
                  )}
                </Card.Content>
              </Card>
            </View>
          </View>
        </CameraView>
      ) : Camera ? (
        <Camera
          style={styles.camera}
          type={Camera.Constants.Type.back}
          onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
          barCodeScannerSettings={{
            barCodeTypes: [Camera.Constants.BarCodeType.qr, Camera.Constants.BarCodeType.ean13],
          }}
        >
          <View style={styles.overlay}>
            <View style={styles.header}>
              <Title style={styles.headerTitle}>Scanning Barcode...</Title>
            </View>
            <Button 
              mode="contained" 
              onPress={() => navigation.goBack()}
              style={styles.backButton}
              buttonColor={colors.danger}
            >
              Back
            </Button>
          </View>
        </Camera>
      ) : (
        <View style={styles.errorContainer}>
          <Title>Camera component not available</Title>
        </View>
      )}
      
      {/* Cost Input Dialog for Shopping List */}
      <Portal>
        <Dialog visible={showCostDialog} onDismiss={handleCancelCostDialog}>
          <Dialog.Title>Add Item to Shopping List</Dialog.Title>
          <Dialog.Content>
            <Paragraph style={{ marginBottom: 16 }}>
              {apiLookupResult && apiLookupResult.success 
                ? 'Product found! Please set quantity and unit cost:'
                : 'Item not found. Please provide product details and unit cost:'}
            </Paragraph>
            
            {apiLookupResult && apiLookupResult.success && (
              <View style={{ backgroundColor: colors.primaryLight + '10', padding: 12, borderRadius: 8, marginBottom: 16 }}>
                <Text style={{ fontWeight: 'bold', marginBottom: 4 }}>
                  Product Info:
                </Text>
                {apiLookupResult.brand && (
                  <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                    Brand: {apiLookupResult.brand}
                  </Text>
                )}
                {apiLookupResult.category && (
                  <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                    Category: {apiLookupResult.category}
                  </Text>
                )}
              </View>
            )}
            
            <Paragraph style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 16 }}>
              Barcode: {currentBarcode}
            </Paragraph>
            
            <CustomTextInput
              label="Product Name"
              value={newItemName}
              onChangeText={setNewItemName}
              mode="outlined"
              style={{ marginBottom: 12 }}
            />
            
            <CustomTextInput
              label="Quantity"
              value={newItemQuantity}
              onChangeText={setNewItemQuantity}
              mode="outlined"
              keyboardType="numeric"
              style={{ marginBottom: 12 }}
              placeholder="1"
            />
            
            <CustomTextInput
              label="Unit Cost (£) *"
              value={newItemCost}
              onChangeText={setNewItemCost}
              mode="outlined"
              keyboardType="decimal-pad"
              style={{ marginBottom: 12 }}
              placeholder="0.00"
              left={<Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.primary }}>£</Text>}
            />
            
            <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 8, fontStyle: 'italic' }}>
              * Unit cost is required to add item to shopping list
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={handleCancelCostDialog}>Cancel</Button>
            <Button onPress={handleAddNewItemToShoppingList}>Add to List</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'space-between',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: spacing.md,
  },
  headerCard: {
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  headerContent: {
    alignItems: 'center',
  },
  headerTitle: {
    color: colors.white,
    textAlign: 'center',
  },
  headerSubtitle: {
    color: colors.white,
    textAlign: 'center',
    opacity: 0.8,
  },
  scanFrame: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrameCorner: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: 20,
    backgroundColor: 'transparent',
  },
  footer: {
    paddingBottom: 40,
    paddingHorizontal: spacing.md,
  },
  footerCard: {
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  footerContent: {
    alignItems: 'center',
  },
  scannedInfo: {
    marginBottom: spacing.md,
  },
  scannedText: {
    color: colors.white,
    textAlign: 'center',
  },
  button: {
    marginVertical: spacing.xs,
    minWidth: 120,
  },
  backButton: {
    position: 'absolute',
    top: 60,
    right: 20,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  errorCard: {
    width: '100%',
    maxWidth: 400,
  },
  errorTitle: {
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  errorText: {
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
});

export default BarcodeScannerScreen;
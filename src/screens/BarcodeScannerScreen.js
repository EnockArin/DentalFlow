import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, Modal, Animated, Dimensions, StatusBar, Platform, TouchableOpacity } from 'react-native';
import { Button, Card, Title, Paragraph, Surface, Chip, TextInput } from 'react-native-paper';
import CustomTextInput from '../components/common/CustomTextInput';

// Conditionally import BarCodeScanner to handle simulator environments
let BarCodeScanner;
try {
  BarCodeScanner = require('expo-barcode-scanner').BarCodeScanner;
} catch (error) {
  console.warn('BarCodeScanner not available in this environment');
}
import { collection, query, where, getDocs, doc, updateDoc, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useSelector } from 'react-redux';
import { colors, spacing, borderRadius, typography, shadows } from '../constants/theme';
import { globalFormStyles } from '../styles/globalFormFixes';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const SCAN_AREA_SIZE = screenWidth * 0.7;

const BarcodeScannerScreen = ({ navigation, route }) => {
  const { user } = useSelector((state) => state.auth);
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [scannedItem, setScannedItem] = useState(null);
  const [quantity, setQuantity] = useState('1');
  const [loading, setLoading] = useState(false);
  const [scanLineAnim] = useState(new Animated.Value(0));
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    // Scanning line animation
    const scanAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(scanLineAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );
    
    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
    
    scanAnimation.start();
    
    return () => scanAnimation.stop();
  }, []);

  useEffect(() => {
    const getBarCodeScannerPermissions = async () => {
      // Check if we're in a simulator or if BarCodeScanner is available
      if (!BarCodeScanner || Platform.OS === 'web') {
        console.log('BarCodeScanner not available - simulator or web');
        setHasPermission(false);
        return;
      }
      
      try {
        // First check current permission status
        const { status: currentStatus } = await BarCodeScanner.getPermissionsAsync();
        console.log('Current camera permission status:', currentStatus);
        
        if (currentStatus === 'granted') {
          setHasPermission(true);
          return;
        }
        
        // If not granted, request permission
        const { status } = await BarCodeScanner.requestPermissionsAsync();
        console.log('Requested camera permission status:', status);
        setHasPermission(status === 'granted');
        
        if (status !== 'granted') {
          console.log('Camera permission denied by user');
        }
      } catch (error) {
        console.error('Error with camera permissions:', error);
        setHasPermission(false);
      }
    };

    getBarCodeScannerPermissions();
  }, []);

  const handleBarCodeScanned = async ({ type, data }) => {
    console.log('Barcode scanned:', { type, data });
    setScanned(true);
    
    // Add visual/haptic feedback
    try {
      const { Haptics } = require('expo-haptics');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      console.log('Haptics not available:', error);
    }
    
    try {
      // Query Firestore for item with this barcode
      const q = query(collection(db, 'inventory'), where('barcode', '==', data));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        // Item exists - show check in/out modal
        const itemDoc = querySnapshot.docs[0];
        const itemData = { id: itemDoc.id, ...itemDoc.data() };
        console.log('Found item for barcode:', itemData.productName);
        setScannedItem(itemData);
        setModalVisible(true);
      } else {
        // Item not found - navigate to add new item with barcode prefilled
        console.log('No item found for barcode:', data);
        Alert.alert(
          'Item Not Found',
          `No item found with barcode: ${data}\n\nWould you like to add a new item?`,
          [
            { text: 'Cancel', onPress: () => setScanned(false) },
            { 
              text: 'Add Item', 
              onPress: () => {
                navigation.replace('ItemDetail', { barcode: data });
              }
            },
          ]
        );
      }
    } catch (error) {
      console.error('Error querying barcode:', error);
      Alert.alert('Error', 'Failed to look up barcode. Please try again.');
      setScanned(false);
    }
  };

  const handleStockMovement = async (type) => {
    if (!quantity.trim() || isNaN(parseInt(quantity)) || parseInt(quantity) <= 0) {
      Alert.alert('Invalid Quantity', 'Please enter a valid positive number');
      return;
    }

    const quantityChange = parseInt(quantity);
    const newQuantity = type === 'in' 
      ? scannedItem.currentQuantity + quantityChange
      : scannedItem.currentQuantity - quantityChange;

    if (newQuantity < 0) {
      Alert.alert('Invalid Operation', 'Not enough stock to check out this quantity');
      return;
    }

    setLoading(type);

    try {
      // Update inventory item
      const itemRef = doc(db, 'inventory', scannedItem.id);
      await updateDoc(itemRef, { 
        currentQuantity: newQuantity,
        lastUpdated: Timestamp.now()
      });

      // Log stock movement
      await addDoc(collection(db, 'stockLog'), {
        inventoryId: scannedItem.id,
        userId: user?.uid,
        userEmail: user?.email,
        changeType: type,
        quantityChanged: quantityChange,
        previousQuantity: scannedItem.currentQuantity,
        newQuantity: newQuantity,
        timestamp: Timestamp.now(),
        productName: scannedItem.productName, // For easy reporting
      });

      Alert.alert(
        'Success',
        type === 'in' 
          ? `Added ${quantityChange} units to stock\n\nNew quantity: ${newQuantity}`
          : `Checked out ${quantityChange} units of ${scannedItem.productName}\n\nRemaining quantity: ${newQuantity}`,
        [
          {
            text: 'OK',
            onPress: () => {
              setModalVisible(false);
              setScanned(false);
              setQuantity('1');
              setScannedItem(null);
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error updating stock:', error);
      Alert.alert('Error', 'Failed to update stock. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  const resetScanner = () => {
    setScanned(false);
    setModalVisible(false);
    setScannedItem(null);
    setQuantity('1');
  };

  if (hasPermission === null) {
    return (
      <View style={styles.permissionContainer}>
        <TouchableOpacity
          
          size={64}
          
          style={styles.permissionIcon}
        />
        <Title style={styles.permissionTitle}>Camera Permission</Title>
        <Paragraph style={styles.permissionText}>
          Requesting access to your camera to scan barcodes...
        </Paragraph>
      </View>
    );
  }

  if (hasPermission === false) {
    const isSimulator = !BarCodeScanner || Platform.OS === 'web';
    
    return (
      <View style={styles.permissionContainer}>
        <TouchableOpacity
          icon={isSimulator ? "cellphone-off" : "camera-off"}
          size={64}
          
          style={styles.permissionIcon}
        />
        <Title style={styles.permissionTitle}>
          {isSimulator ? 'Simulator Limitation' : 'Camera Access Denied'}
        </Title>
        <Paragraph style={styles.permissionText}>
          {isSimulator 
            ? 'Barcode scanning is not available in the iOS simulator or web browser. Please test on a physical device for full camera functionality.'
            : 'Camera access is required to scan barcodes. Please enable camera permissions in your device settings.'
          }
        </Paragraph>
        
        {isSimulator && (
          <View style={styles.simulatorInfo}>
            <Paragraph style={styles.simulatorText}>
              💡 You can still test the app's other features:
            </Paragraph>
            <Paragraph style={styles.simulatorText}>
              • Add items manually via the Inventory screen
            </Paragraph>
            <Paragraph style={styles.simulatorText}>
              • Test all inventory management features
            </Paragraph>
            <Paragraph style={styles.simulatorText}>
              • Try the Dashboard and Settings
            </Paragraph>
          </View>
        )}
        
        <View style={styles.permissionActions}>
          <Button 
            mode="contained" 
            onPress={() => navigation.goBack()}
            style={styles.permissionButton}
            buttonColor={colors.primary}
          >
            Back to Dashboard
          </Button>
          
          {!isSimulator && (
            <Button 
              mode="outlined" 
              onPress={() => {
                Alert.alert(
                  'Camera Permission Required',
                  'To enable barcode scanning:\n\n1. Go to your device Settings\n2. Find DentalFlow in Apps\n3. Enable Camera permission\n4. Return to this screen',
                  [
                    { text: 'OK' },
                    { 
                      text: 'Retry Permission', 
                      onPress: () => {
                        setHasPermission(null);
                        // Re-trigger permission check
                        const getBarCodeScannerPermissions = async () => {
                          try {
                            const { status } = await BarCodeScanner.requestPermissionsAsync();
                            setHasPermission(status === 'granted');
                          } catch (error) {
                            console.error('Error requesting permission:', error);
                            setHasPermission(false);
                          }
                        };
                        getBarCodeScannerPermissions();
                      }
                    }
                  ]
                );
              }}
              style={[styles.permissionButton, { marginTop: spacing.md }]}
              textColor={colors.primary}
            >
              Enable Camera Access
            </Button>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="black" />
      {BarCodeScanner && (
        <BarCodeScanner
          onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
          style={StyleSheet.absoluteFillObject}
        />
      )}
      
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        {/* Header */}
        <View style={styles.header}>
          <Surface style={styles.headerSurface}>
            <View style={styles.headerContent}>
              <TouchableOpacity
                
                size={24}
                
                onPress={() => navigation.goBack()}
                style={styles.backButton}
              />
              <View style={styles.headerTextContainer}>
                <Title style={styles.headerTitle}>Barcode Scanner</Title>
                <Paragraph style={styles.headerSubtitle}>
                  Scan to add or checkout items
                </Paragraph>
              </View>
            </View>
          </Surface>
        </View>
        
        {/* Scanning Area */}
        <View style={styles.scanContainer}>
          <View style={styles.scanAreaWrapper}>
            {/* Corner borders */}
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
            
            {/* Scanning line */}
            <Animated.View
              style={[
                styles.scanLine,
                {
                  transform: [
                    {
                      translateY: scanLineAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, SCAN_AREA_SIZE - 4],
                      }),
                    },
                  ],
                },
              ]}
            />
            
            {/* Scan frame overlay */}
            <View style={styles.scanFrame}>
              <View style={styles.scanFrameInner} />
            </View>
          </View>
        </View>
        
        {/* Bottom Info */}
        <View style={styles.bottomContainer}>
          <Surface style={styles.instructionSurface}>
            <View style={styles.instructionContent}>
              <TouchableOpacity
                
                size={32}
                
                style={styles.instructionIcon}
              />
              <Title style={styles.instructionTitle}>
                {scanned ? 'Barcode Scanned!' : 'Scanning for Barcode'}
              </Title>
              <Paragraph style={styles.instructionText}>
                {scanned 
                  ? 'Processing barcode data...' 
                  : 'Position the barcode within the frame above'
                }
              </Paragraph>
              
              {scanned && (
                <Button 
                  mode="contained"
                  onPress={resetScanner}
                  style={styles.scanAgainButton}
                  buttonColor={colors.primary}
                  
                  compact
                >
                  Scan Again
                </Button>
              )}
            </View>
          </Surface>
        </View>
      </Animated.View>

      {/* Stock Movement Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Surface style={styles.modalSurface}>
            <View style={styles.modalContent}>
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <View style={styles.modalHeaderContent}>
                  <TouchableOpacity
                    
                    size={32}
                    
                    style={styles.modalHeaderIcon}
                  />
                  <View style={styles.modalHeaderText}>
                    <Title style={styles.modalTitle}>Item Found!</Title>
                    <Paragraph style={styles.modalSubtitle}>
                      Choose your action
                    </Paragraph>
                  </View>
                </View>
                <Chip 
                   
                  style={styles.barcodeChip}
                  textStyle={styles.barcodeChipText}
                >
                  {scannedItem?.barcode}
                </Chip>
              </View>
              
              {/* Item Information */}
              <View style={styles.itemInfo}>
                <Title style={styles.itemName} numberOfLines={2}>
                  {scannedItem?.productName}
                </Title>
                
                <View style={styles.stockInfo}>
                  <View style={styles.stockItem}>
                    <TouchableOpacity  size={20}  style={styles.stockIcon} />
                    <Paragraph style={styles.stockLabel}>Current Stock</Paragraph>
                    <Title style={[styles.stockValue, { color: colors.primary }]}>
                      {scannedItem?.currentQuantity}
                    </Title>
                  </View>
                  <View style={styles.stockDivider} />
                  <View style={styles.stockItem}>
                    <TouchableOpacity  size={20}  style={styles.stockIcon} />
                    <Paragraph style={styles.stockLabel}>Min Level</Paragraph>
                    <Title style={[styles.stockValue, { color: colors.warning }]}>
                      {scannedItem?.minStockLevel}
                    </Title>
                  </View>
                </View>
              </View>

              {/* Quantity Input */}
              <View style={[styles.quantitySection, globalFormStyles.formContainer]}>
                <Paragraph style={styles.quantityLabel}>Quantity</Paragraph>
                <CustomTextInput
                  value={quantity}
                  onChangeText={setQuantity}
                  mode="outlined"
                  keyboardType="numeric"
                  style={[styles.quantityInput, globalFormStyles.hideValidationIndicators]}
                  left={<TextInput.Icon  />}
                  outlineColor={colors.borderLight}
                  activeOutlineColor={colors.primary}
                  autoComplete="off"
                  textContentType="none"
                  autoCorrect={false}
                  spellCheck={false}
                  right={null}
                />
              </View>

              {/* Action Buttons */}
              <View style={styles.modalActions}>
                <Button
                  mode="contained"
                  onPress={() => handleStockMovement('in')}
                  loading={loading === 'in'}
                  disabled={loading}
                  style={[styles.actionButton, styles.checkInButton]}
                  buttonColor={colors.success}
                  
                >
                  Add Stock
                </Button>

                <Button
                  mode="contained"
                  onPress={() => handleStockMovement('out')}
                  loading={loading === 'out'}
                  disabled={loading}
                  style={[styles.actionButton, styles.checkOutButton]}
                  buttonColor={colors.danger}
                  
                >
                  Checkout
                </Button>
              </View>

              <Button
                mode="text"
                onPress={resetScanner}
                disabled={loading}
                style={styles.cancelButton}
                textColor={colors.textSecondary}
              >
                Cancel
              </Button>
            </View>
          </Surface>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: spacing.xl,
  },
  permissionIcon: {
    marginBottom: spacing.lg,
    backgroundColor: colors.lightGray,
  },
  permissionTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    textAlign: 'center',
    marginBottom: spacing.md,
    color: colors.textPrimary,
  },
  permissionText: {
    fontSize: typography.fontSize.md,
    textAlign: 'center',
    marginBottom: spacing.xl,
    color: colors.textSecondary,
    lineHeight: typography.lineHeight.relaxed * typography.fontSize.md,
  },
  permissionActions: {
    alignItems: 'center',
    width: '100%',
  },
  permissionButton: {
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.xl,
  },
  simulatorInfo: {
    backgroundColor: colors.primaryLight + '15',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginVertical: spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  simulatorText: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    lineHeight: typography.lineHeight.relaxed * typography.fontSize.sm,
  },
  overlay: {
    flex: 1,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  headerSurface: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    margin: 0,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  headerTextContainer: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  headerTitle: {
    color: colors.white,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    color: colors.white,
    fontSize: typography.fontSize.sm,
    opacity: 0.8,
  },
  scanContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanAreaWrapper: {
    width: SCAN_AREA_SIZE,
    height: SCAN_AREA_SIZE,
    position: 'relative',
  },
  scanFrame: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
  },
  scanFrameInner: {
    width: '100%',
    height: '100%',
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: 'transparent',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: colors.white,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  scanLine: {
    position: 'absolute',
    left: 2,
    right: 2,
    height: 2,
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
  },
  instructionSurface: {
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  instructionContent: {
    alignItems: 'center',
  },
  instructionIcon: {
    marginBottom: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  instructionTitle: {
    color: colors.white,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  instructionText: {
    color: colors.white,
    fontSize: typography.fontSize.sm,
    textAlign: 'center',
    opacity: 0.8,
    marginBottom: spacing.md,
  },
  scanAgainButton: {
    marginTop: spacing.sm,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: spacing.md,
  },
  modalSurface: {
    width: '100%',
    maxWidth: 420,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.surface,
    ...shadows.large,
  },
  modalContent: {
    padding: spacing.xl,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  modalHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalHeaderIcon: {
    margin: 0,
    marginRight: spacing.md,
    backgroundColor: colors.successLight + '20',
  },
  modalHeaderText: {
    flex: 1,
  },
  modalTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  modalSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
  barcodeChip: {
    backgroundColor: colors.primaryLight + '20',
  },
  barcodeChipText: {
    color: colors.primary,
    fontFamily: 'monospace',
    fontSize: typography.fontSize.xs,
  },
  itemInfo: {
    marginBottom: spacing.xl,
  },
  itemName: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  stockInfo: {
    flexDirection: 'row',
    backgroundColor: colors.lightGray,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  stockItem: {
    flex: 1,
    alignItems: 'center',
  },
  stockIcon: {
    margin: 0,
    marginBottom: spacing.xs,
  },
  stockLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  stockValue: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
  },
  stockDivider: {
    width: 1,
    backgroundColor: colors.border,
    marginHorizontal: spacing.md,
  },
  quantitySection: {
    marginBottom: spacing.xl,
  },
  quantityLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  quantityInput: {
    backgroundColor: colors.surface,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  actionButton: {
    flex: 1,
    borderRadius: borderRadius.lg,
  },
  checkInButton: {
    // Styles handled by buttonColor prop
  },
  checkOutButton: {
    // Styles handled by buttonColor prop
  },
  fullWidthButton: {
    width: '100%',
    borderRadius: borderRadius.lg,
  },
  cancelButton: {
    alignSelf: 'center',
  },
});

export default BarcodeScannerScreen;
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, StatusBar, Platform } from 'react-native';
import { Button, Card, Title, Paragraph } from 'react-native-paper';
import { colors, spacing, borderRadius } from '../constants/theme';
import { collection, query, where, getDocs, doc, updateDoc, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useSelector } from 'react-redux';

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

const BarcodeScannerScreen = ({ navigation }) => {
  const { user } = useSelector((state) => state.auth);
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [scannedData, setScannedData] = useState(null);
  const [cameraReady, setCameraReady] = useState(false);

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
      // Query Firestore for item with this barcode
      const q = query(collection(db, 'inventory'), where('barcode', '==', data));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        // Item exists - show success message
        const itemDoc = querySnapshot.docs[0];
        const itemData = { id: itemDoc.id, ...itemDoc.data() };
        
        Alert.alert(
          'Item Found!',
          `Found: ${itemData.productName}\nBarcode: ${data}\nCurrent Stock: ${itemData.currentQuantity}`,
          [
            { text: 'Scan Again', onPress: resetScanner },
            { text: 'View Item', onPress: () => navigation.navigate('ItemDetail', { item: itemData }) }
          ]
        );
      } else {
        // Item not found
        Alert.alert(
          'Item Not Found',
          `No item found with barcode: ${data}\n\nWould you like to add a new item?`,
          [
            { text: 'Scan Again', onPress: resetScanner },
            { 
              text: 'Add Item', 
              onPress: () => navigation.replace('ItemDetail', { barcode: data })
            }
          ]
        );
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
                    {scanned ? 'Barcode Scanned!' : 'Point camera at barcode'}
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
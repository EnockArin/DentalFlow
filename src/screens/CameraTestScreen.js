import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { Button, Card, Title } from 'react-native-paper';
import { colors, spacing, borderRadius } from '../constants/theme';

// Try to import camera components
let Camera, BarCodeScanner, CameraView;
let cameraError = null;

try {
  const cameraModule = require('expo-camera');
  Camera = cameraModule.Camera;
  CameraView = cameraModule.CameraView;
  console.log('✅ expo-camera imported successfully', { Camera: !!Camera, CameraView: !!CameraView });
} catch (error) {
  console.warn('❌ expo-camera import failed:', error.message);
  cameraError = error.message;
}

try {
  BarCodeScanner = require('expo-barcode-scanner').BarCodeScanner;
  console.log('✅ expo-barcode-scanner imported successfully');
} catch (error) {
  console.warn('❌ expo-barcode-scanner import failed:', error.message);
  if (!cameraError) cameraError = error.message;
}

const CameraTestScreen = ({ navigation }) => {
  const [cameraPermission, setCameraPermission] = useState(null);
  const [scannerPermission, setScannerPermission] = useState(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [testResults, setTestResults] = useState([]);

  const addTestResult = (test, status, details) => {
    setTestResults(prev => [...prev, { test, status, details, timestamp: new Date() }]);
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  const runDiagnostics = async () => {
    console.log('🔍 Starting camera diagnostics...');
    
    // Test 1: Check if modules are available
    if (cameraError) {
      addTestResult('Module Import', 'FAIL', `Import error: ${cameraError}`);
      return;
    } else {
      addTestResult('Module Import', 'PASS', 'Both expo-camera and expo-barcode-scanner imported successfully');
    }

    // Test 2: Check Camera permissions
    if (Camera) {
      try {
        const { status: cameraStatus } = await Camera.requestCameraPermissionsAsync();
        setCameraPermission(cameraStatus);
        addTestResult('Camera Permission', cameraStatus === 'granted' ? 'PASS' : 'FAIL', `Status: ${cameraStatus}`);
      } catch (error) {
        addTestResult('Camera Permission', 'FAIL', `Error: ${error.message}`);
      }
    }

    // Test 3: Check BarCodeScanner permissions
    if (BarCodeScanner) {
      try {
        const { status: scannerStatus } = await BarCodeScanner.requestPermissionsAsync();
        setScannerPermission(scannerStatus);
        addTestResult('Scanner Permission', scannerStatus === 'granted' ? 'PASS' : 'FAIL', `Status: ${scannerStatus}`);
      } catch (error) {
        addTestResult('Scanner Permission', 'FAIL', `Error: ${error.message}`);
      }
    }

    // Test 4: Check camera availability
    if (Camera) {
      try {
        const isAvailable = await Camera.isAvailableAsync();
        addTestResult('Camera Availability', isAvailable ? 'PASS' : 'FAIL', `Available: ${isAvailable}`);
      } catch (error) {
        addTestResult('Camera Availability', 'FAIL', `Error: ${error.message}`);
      }
    }

    console.log('✅ Camera diagnostics completed');
  };

  const testBasicBarcodeScan = () => {
    if (BarCodeScanner && scannerPermission === 'granted') {
      Alert.alert(
        'Test Scan',
        'Try scanning any barcode. This will test if the scanner can detect barcodes.',
        [
          { text: 'Cancel' },
          { 
            text: 'Start Test', 
            onPress: () => {
              // Navigate to a simple test scanner
              navigation.navigate('Scanner');
            }
          }
        ]
      );
    } else {
      Alert.alert('Cannot Test', 'Scanner permission not granted or scanner not available');
    }
  };

  const testNewCameraAPI = () => {
    if (CameraView && cameraPermission === 'granted') {
      Alert.alert(
        'Test New Camera API',
        'This will test the new expo-camera CameraView component with barcode scanning.',
        [
          { text: 'Cancel' },
          { 
            text: 'Start Test', 
            onPress: () => {
              // Create a simple test with CameraView
              Alert.alert('Info', 'New camera API test would go here. Check console for logs.');
              console.log('🧪 Testing new CameraView API...');
            }
          }
        ]
      );
    } else {
      Alert.alert('Cannot Test', 'New camera API not available or permission not granted');
    }
  };

  const renderTestResult = (result, index) => (
    <View key={index} style={[
      styles.testResult,
      { borderLeftColor: result.status === 'PASS' ? colors.success : colors.danger }
    ]}>
      <View style={styles.testHeader}>
        <Text style={styles.testName}>{result.test}</Text>
        <Text style={[
          styles.testStatus,
          { color: result.status === 'PASS' ? colors.success : colors.danger }
        ]}>
          {result.status}
        </Text>
      </View>
      <Text style={styles.testDetails}>{result.details}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Card style={styles.headerCard}>
        <Card.Content>
          <Title style={styles.title}>📱 Camera & Scanner Diagnostics</Title>
          <Text style={styles.subtitle}>
            This screen tests camera and barcode scanner functionality
          </Text>
        </Card.Content>
      </Card>

      <Card style={styles.resultsCard}>
        <Card.Content>
          <Title style={styles.sectionTitle}>Test Results</Title>
          {testResults.length === 0 ? (
            <Text style={styles.loadingText}>Running diagnostics...</Text>
          ) : (
            testResults.map(renderTestResult)
          )}
        </Card.Content>
      </Card>

      <Card style={styles.actionsCard}>
        <Card.Content>
          <Title style={styles.sectionTitle}>Test Actions</Title>
          
          <Button
            mode="contained"
            onPress={runDiagnostics}
            style={styles.actionButton}
            buttonColor={colors.primary}
          >
            Re-run Diagnostics
          </Button>

          <Button
            mode="contained"
            onPress={testBasicBarcodeScan}
            style={styles.actionButton}
            buttonColor={colors.secondary}
            disabled={scannerPermission !== 'granted'}
          >
            Test Barcode Scanning (Old API)
          </Button>

          <Button
            mode="contained"
            onPress={testNewCameraAPI}
            style={styles.actionButton}
            buttonColor={colors.info}
            disabled={cameraPermission !== 'granted'}
          >
            Test Camera View (New API)
          </Button>

          <Button
            mode="outlined"
            onPress={() => navigation.goBack()}
            style={styles.actionButton}
            textColor={colors.textPrimary}
          >
            Back to Dashboard
          </Button>
        </Card.Content>
      </Card>

      {/* System Info */}
      <Card style={styles.infoCard}>
        <Card.Content>
          <Title style={styles.sectionTitle}>System Info</Title>
          <Text style={styles.infoText}>Camera Permission: {cameraPermission || 'Unknown'}</Text>
          <Text style={styles.infoText}>Scanner Permission: {scannerPermission || 'Unknown'}</Text>
          <Text style={styles.infoText}>Platform: Android</Text>
        </Card.Content>
      </Card>
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
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  resultsCard: {
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  loadingText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    padding: spacing.xl,
  },
  testResult: {
    borderLeftWidth: 4,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  testHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  testName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  testStatus: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  testDetails: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  actionsCard: {
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
  },
  actionButton: {
    marginBottom: spacing.sm,
    borderRadius: borderRadius.md,
  },
  infoCard: {
    borderRadius: borderRadius.lg,
  },
  infoText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
});

export default CameraTestScreen;
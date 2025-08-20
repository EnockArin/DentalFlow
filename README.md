# 🦷 DentalFlow - Professional Dental Inventory Management

<div align="center">
  
![DentalFlow Logo](https://via.placeholder.com/200x200/2E86AB/FFFFFF?text=🦷+DentalFlow)

**A modern, cross-platform React Native application for dental practice inventory management**

[![React Native](https://img.shields.io/badge/React%20Native-0.79.5-blue.svg)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-~53.0.20-black.svg)](https://expo.dev/)
[![Firebase](https://img.shields.io/badge/Firebase-12.1.0-orange.svg)](https://firebase.google.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-~5.8.3-blue.svg)](https://www.typescriptlang.org/)

</div>

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Screenshots](#screenshots)
- [Technology Stack](#technology-stack)
- [Getting Started](#getting-started)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [Project Structure](#project-structure)
- [API Reference](#api-reference)
- [Contributing](#contributing)
- [License](#license)

## 🎯 Overview

DentalFlow is a comprehensive inventory management solution specifically designed for dental practices. Built with React Native and Expo, it provides a seamless cross-platform experience for managing dental supplies, tracking stock levels, and streamlining inventory operations.

### Key Highlights

- **📱 Cross-Platform**: Native performance on iOS and Android
- **🔥 Real-time Sync**: Instant updates across all devices using Firebase
- **📊 Professional UI**: Material Design with custom dental-themed styling  
- **📈 Analytics Ready**: Comprehensive logging and export capabilities
- **🔒 Secure**: Firebase Authentication with role-based access
- **⚡ Fast Operations**: Optimized for busy dental practice workflows

## ✨ Features

### 🏥 Core Inventory Management
- **Real-time Inventory Tracking** - Live updates across all devices
- **Stock Level Monitoring** - Automatic low stock alerts and notifications
- **Expiry Date Management** - Track and alert on expiring items
- **Location Tracking** - Organize items by storage location
- **Comprehensive Search** - Search by name, barcode, or location

### 📱 Barcode Integration
- **Universal Scanner** - Single scanner for all operations
- **Add or Checkout Flow** - Scan once, choose action (add stock or checkout)
- **Manual Entry Fallback** - Works without barcode when needed
- **Quantity Adjustments** - Flexible quantity input system

### 📊 Dashboard & Analytics  
- **Executive Dashboard** - Key metrics and quick actions
- **Stock Statistics** - Total items, low stock counts, expiring items
- **Quick Actions** - Fast access to common operations
- **Professional Animations** - Smooth, engaging user experience

### 📈 Advanced Operations
- **Stock Movement Logging** - Complete audit trail of all transactions
- **Data Export (CSV)** - Full inventory, stock logs, and shopping lists
- **Shopping List Generation** - Automatic low-stock purchasing lists
- **Multi-format Export** - Share data via email, cloud storage, etc.

### 👥 User Management
- **Secure Authentication** - Firebase Authentication integration
- **User Registration** - Complete account creation flow
- **Session Management** - Persistent login with automatic logout
- **Activity Logging** - Track user actions for accountability

### 🎨 User Experience
- **Material Design 3** - Modern, professional interface
- **Cross-platform Consistency** - Identical experience on iOS/Android
- **Accessibility Support** - Screen reader and navigation support
- **Responsive Design** - Works on phones and tablets
- **Dark/Light Mode Ready** - Theme system prepared for preferences

## 📸 Screenshots

*Coming Soon - Screenshots of the main screens*

## 🛠 Technology Stack

### Frontend
- **React Native** `0.79.5` - Cross-platform mobile framework
- **Expo** `~53.0.20` - Development platform and build tool
- **React Navigation** `^7.1.6` - Navigation library
- **React Native Paper** `^5.14.5` - Material Design components
- **React Native Reanimated** `~3.17.4` - High-performance animations

### State Management
- **Redux Toolkit** `^2.8.2` - Predictable state container
- **React Redux** `^9.2.0` - React bindings for Redux

### Backend & Database
- **Firebase** `^12.1.0` - Backend-as-a-Service
  - **Firestore** - NoSQL document database
  - **Authentication** - User management and security
  - **Real-time Listeners** - Live data synchronization

### Additional Libraries
- **Expo Barcode Scanner** `^13.0.1` - Barcode scanning functionality
- **React Native Modal DateTime Picker** `^18.0.0` - Date/time input
- **Papa Parse** `^5.5.3` - CSV generation and parsing
- **Expo Linear Gradient** `^14.1.5` - UI enhancements
- **Expo Vector Icons** `^14.1.0` - Icon library

### Development Tools
- **TypeScript** `~5.8.3` - Type safety and better developer experience
- **ESLint** `^9.25.0` - Code linting and quality
- **Expo CLI** - Development and build management

## 🚀 Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (version 18 or higher)
- **npm** or **yarn** package manager  
- **Expo CLI** (`npm install -g @expo/cli`)
- **Git** for version control
- **Android Studio** (for Android development)
- **Xcode** (for iOS development - macOS only)

### Development Environment

1. **iOS Simulator** (macOS only):
   - Install Xcode from the App Store
   - Install iOS Simulator

2. **Android Emulator**:
   - Install Android Studio
   - Set up Android Virtual Device (AVD)
   - Configure Android SDK

3. **Physical Device** (Recommended):
   - Install Expo Go app from App Store/Play Store
   - Ensure device is on same network as development machine

## 📦 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/DentalFlow.git
cd DentalFlow
```

### 2. Install Dependencies

```bash
npm install
# or
yarn install
```

### 3. Start Development Server

```bash
npm start
# or
expo start
```

### 4. Run on Device/Emulator

- **iOS**: Press `i` in the terminal or scan QR code with camera
- **Android**: Press `a` in the terminal or scan QR code with Expo Go
- **Web**: Press `w` in the terminal (limited functionality)

## ⚙️ Configuration

### Firebase Setup

1. **Create Firebase Project**:
   - Visit [Firebase Console](https://console.firebase.google.com/)
   - Create new project: "DentalFlow" or your preferred name
   - Enable Google Analytics (optional)

2. **Enable Authentication**:
   - Go to Authentication → Sign-in method
   - Enable Email/Password authentication
   - Configure settings as needed

3. **Create Firestore Database**:
   - Go to Firestore Database
   - Create database in production mode
   - Set up security rules (see below)

4. **Get Configuration**:
   - Go to Project Settings → General
   - Add a new Web app
   - Copy configuration object

5. **Update Configuration**:
   ```javascript
   // src/config/firebase.js
   const firebaseConfig = {
     apiKey: "your-api-key",
     authDomain: "your-project.firebaseapp.com",
     projectId: "your-project-id",
     storageBucket: "your-project.appspot.com",
     messagingSenderId: "123456789",
     appId: "your-app-id"
   };
   ```

### Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own inventory items
    match /inventory/{document} {
      allow read, write: if request.auth != null && 
        request.auth.uid == resource.data.practiceId;
    }
    
    // Users can only access their own stock logs
    match /stockLog/{document} {
      allow read, write: if request.auth != null && 
        request.auth.uid == resource.data.userId;
    }
  }
}
```

## 📖 Usage

### Initial Setup

1. **Register Account**:
   - Open app and tap "Create Account"
   - Enter first name, last name, email, and password
   - Confirm account creation

2. **First Login**:
   - Enter email and password
   - Access the main dashboard

### Core Operations

#### Adding Inventory Items

**Method 1: Barcode Scanning**
1. Dashboard → **"Scan Barcode"**
2. Scan item barcode
3. Choose **"Add Stock"** 
4. Enter quantity → Confirm

**Method 2: Manual Entry**
1. Dashboard → **"Manual Add Item"**
2. Fill in product details:
   - Product name (required)
   - Barcode (optional)
   - Current quantity (required) 
   - Minimum stock level (required)
   - Storage location (optional)
   - Expiry date (optional)
3. Save item

#### Checking Out Items

**Method 1: Barcode Scanning**
1. Dashboard → **"Scan Barcode"**
2. Scan item barcode  
3. Choose **"Checkout"**
4. Enter quantity → Confirm

**Method 2: Manual Checkout**
1. Dashboard → **"Manual Checkout"**
2. Long-press desired item
3. Choose **"Checkout"**
4. Enter quantity → Confirm

### Advanced Features

#### Inventory Management
- **View All Items**: Dashboard → "View Inventory"
- **Search Items**: Use search bar in inventory screen
- **Filter Items**: Use filter chips (All, Low Stock, Expiring)
- **Edit Items**: Long-press item → "Edit Item"
- **Delete Items**: Long-press item → "Delete"

#### Data Export
- **Settings** → Choose export type:
  - **Full Inventory**: All items with details
  - **Stock Movement Log**: All transactions
  - **Shopping List**: Low stock items only

#### Shopping Lists
- **Automatic Generation**: Low stock items appear in shopping list
- **Export Options**: Share via email, cloud storage, etc.
- **Suggested Quantities**: Smart ordering recommendations

## 📁 Project Structure

```
DentalFlow/
├── 📱 App.js                 # Main app entry point
├── 📋 babel.config.js        # Babel configuration
├── 📦 package.json           # Dependencies and scripts
├── 📖 README.md              # This file
│
├── 🎯 src/
│   ├── 🎨 components/        # Reusable components
│   │   ├── common/           # Generic components
│   │   │   ├── GradientBackground.js
│   │   │   └── CustomTextInput.js
│   │   └── IOSFormFix.js     # iOS-specific fixes
│   │
│   ├── ⚙️ config/            # Configuration files
│   │   └── firebase.js       # Firebase configuration
│   │
│   ├── 🎨 constants/         # App constants
│   │   └── theme.js          # Design system and themes
│   │
│   ├── 🧭 navigation/        # Navigation configuration
│   │   └── AppNavigator.js   # Main navigation setup
│   │
│   ├── 📱 screens/           # App screens
│   │   ├── LoginScreen.js    # User authentication
│   │   ├── RegisterScreen.js # User registration  
│   │   ├── DashboardScreen.js # Main dashboard
│   │   ├── InventoryListScreen.js # Inventory management
│   │   ├── ItemDetailScreen.js # Item creation/editing
│   │   ├── BarcodeScannerScreen.js # Barcode scanning
│   │   ├── ShoppingListScreen.js # Low stock items
│   │   └── SettingsScreen.js # App settings
│   │
│   ├── 🗄️ store/             # Redux store configuration
│   │   ├── index.js          # Store setup
│   │   └── slices/           # Redux slices
│   │       ├── authSlice.js  # Authentication state
│   │       └── inventorySlice.js # Inventory state
│   │
│   └── 🎨 styles/            # Style overrides
│       └── iOSOverrides.js   # iOS-specific styles
```

## 🔧 API Reference

### Firebase Collections

#### `inventory` Collection
```javascript
{
  id: "auto-generated",
  productName: "Dental Floss",
  barcode: "1234567890123",
  currentQuantity: 50,
  minStockLevel: 10,
  location: "Storage Room A",
  expiryDate: Timestamp,
  practiceId: "user-uid",
  createdAt: Timestamp,
  lastUpdated: Timestamp
}
```

#### `stockLog` Collection  
```javascript
{
  id: "auto-generated",
  inventoryId: "item-id",
  userId: "user-uid", 
  userEmail: "user@example.com",
  changeType: "in" | "out",
  quantityChanged: 5,
  previousQuantity: 45,
  newQuantity: 50,
  timestamp: Timestamp,
  productName: "Dental Floss"
}
```

### Redux State Structure

```javascript
{
  auth: {
    user: {
      uid: "user-id",
      email: "user@example.com", 
      displayName: "User Name"
    },
    isAuthenticated: boolean,
    loading: boolean,
    error: string | null
  },
  
  inventory: {
    items: Array<InventoryItem>,
    lowStockItems: Array<InventoryItem>,
    loading: boolean,
    error: string | null
  }
}
```

## 🤝 Contributing

We welcome contributions to DentalFlow! Here's how you can help:

### Getting Started
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Commit your changes (`git commit -m 'Add amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

### Development Guidelines
- Follow the existing code style and patterns
- Add tests for new features
- Update documentation as needed
- Ensure all tests pass before submitting
- Use meaningful commit messages

### Areas for Contribution
- 🐛 Bug fixes and improvements
- ✨ New features and enhancements
- 📖 Documentation improvements
- 🎨 UI/UX enhancements
- ⚡ Performance optimizations
- 🧪 Test coverage improvements

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **React Native Community** for the amazing framework
- **Expo Team** for simplifying mobile development
- **Firebase** for reliable backend services
- **Material Design** for design inspiration
- **Dental Professionals** for requirements and feedback

## 📞 Support

For support, email support@dentalflow.app or join our community discussions.

---

<div align="center">
  
**Built with ❤️ for dental professionals worldwide**

*DentalFlow - Streamlining dental inventory management, one scan at a time* 🦷

</div>
# UniversalDocs

A high-performance, cross-platform mobile document management system built with React Native.

## Project Structure

```
UniversalDocs/
│
├── android/
├── ios/
│
├── src/
│   │
│   ├── app/
│   │   ├── App.tsx                      # Root App component
│   │   ├── navigation/
│   │   │   ├── RootNavigator.tsx        # Root Native Stack Navigator
│   │   │   ├── MainNavigator.tsx        # Main Bottom Tab Navigator
│   │   │   └── navigation.types.ts      # Navigation route and param types
│   │   └── providers/
│   │       └── AppProvider.tsx          # Global providers & bootstrap lifecycle
│   │
│   ├── core/
│   │   ├── filesystem/
│   │   │   ├── fileSystem.ts            # Base filesystem operations & paths
│   │   │   ├── fileReader.ts            # Text/Base64/Binary file reading
│   │   │   ├── fileWriter.ts            # File writing & appending
│   │   │   └── directoryManager.ts      # App directory management
│   │   ├── database/
│   │   │   ├── database.ts              # SQLite database manager
│   │   │   ├── schema.ts                # Table & index definitions
│   │   │   └── repositories/
│   │   │       ├── documentRepository.ts# Document metadata CRUD
│   │   │       ├── folderRepository.ts  # Folder hierarchy CRUD
│   │   │       └── recentRepository.ts  # Recents & access tracking
│   │   ├── storage/
│   │   │   ├── localStorage.ts          # Key-value & preference storage
│   │   │   └── secureStorage.ts         # Encrypted Keychain/Keystore storage
│   │   ├── permissions/
│   │   │   └── permissionService.ts     # Camera and storage permission handler
│   │   └── errors/
│   │       ├── AppError.ts              # Typed domain errors
│   │       └── errorHandler.ts          # Centralized error reporting
│   │
│   ├── features/
│   │   ├── documents/                   # Document browsing & management
│   │   ├── editor/                      # Document viewer & editor
│   │   ├── search/                      # Full-text & metadata search
│   │   ├── scanner/                     # Camera document scanner
│   │   └── security/                    # Vault & biometric protection
│   │
│   ├── shared/
│   │   ├── components/                  # Reusable UI components
│   │   ├── constants/                   # Global configuration & constants
│   │   ├── hooks/                       # Custom shared React hooks
│   │   ├── theme/                       # Colors, typography, spacing
│   │   ├── types/                       # Shared domain models & types
│   │   └── utils/                       # Formatting & file helpers
│   │
│   └── assets/
│       ├── icons/                       # Vector & raster icons
│       ├── images/                      # Static image assets
│       └── fonts/                       # Custom typography fonts
│
├── App.tsx                              # Entry re-export
├── package.json
├── tsconfig.json
├── babel.config.js
├── metro.config.js
└── README.md
```

## Getting Started

### 1. Install Dependencies
```sh
npm install
```

### 2. Run Metro Dev Server
```sh
npm start
```

### 3. Build & Run Application
```sh
# Android
npm run android

# iOS (macOS only)
bundle exec pod install
npm run ios
```

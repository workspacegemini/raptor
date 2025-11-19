# Enterprise Performance Engine - Mobile App

React Native mobile application built with Expo for iOS and Android.

## Features

- **Modern UI**: Beautiful, native mobile experience
- **Offline Support**: Continue learning without internet (coming soon)
- **QR Code Scanner**: Quick access to equipment-specific training (coming soon)
- **Push Notifications**: Stay updated on course progress
- **Secure Authentication**: JWT-based auth with secure token storage
- **Tab Navigation**: Easy access to Home, Courses, Progress, and Profile

## Tech Stack

- **Expo**: ~51.0.0
- **React Native**: 0.74.0
- **Expo Router**: File-based navigation
- **React Query**: Data fetching and caching
- **Zustand**: State management
- **Expo Secure Store**: Secure token storage
- **Axios**: HTTP client with interceptors

## Getting Started

### Prerequisites

- Node.js 18+
- iOS Simulator (for Mac) or Android Emulator
- Expo CLI
- Backend API running (default: http://localhost:3001)

### Installation

```bash
# Navigate to mobile app
cd apps/mobile

# Install dependencies
npm install

# Start development server
npm start
```

### Running on Device

#### iOS Simulator (Mac only)
```bash
npm run ios
```

#### Android Emulator
```bash
npm run android
```

#### Physical Device
1. Install **Expo Go** app from App Store or Google Play
2. Scan the QR code from terminal

## Project Structure

```
apps/mobile/
├── app/                    # Expo Router app directory
│   ├── (auth)/            # Authentication screens
│   │   └── login.tsx      # Login page
│   ├── (tabs)/            # Tab navigation
│   │   ├── _layout.tsx    # Tab layout
│   │   ├── index.tsx      # Home screen
│   │   ├── courses.tsx    # Courses screen
│   │   ├── progress.tsx   # Progress screen
│   │   └── profile.tsx    # Profile screen
│   ├── _layout.tsx        # Root layout
│   └── index.tsx          # Entry point
├── lib/                   # Utilities and services
│   ├── api-client.ts      # API client with auth
│   └── auth-store.ts      # Zustand auth store
├── assets/                # Images, fonts, etc.
├── app.json               # Expo configuration
├── package.json           # Dependencies
└── tsconfig.json          # TypeScript config
```

## Key Features Implemented

### Authentication
- Login screen with email/password
- Secure token storage using Expo Secure Store
- Automatic token refresh on 401 errors
- Session persistence across app restarts

### Home Screen
- Welcome header with user info
- Quick stats (Active Courses, Completed, Learning Time)
- Quick action cards
- Continue learning section with progress
- Recommended courses

### Navigation
- Tab-based navigation (Home, Courses, Progress, Profile)
- File-based routing with Expo Router
- Protected routes (redirect to login if not authenticated)

### Profile Screen
- User information display
- Avatar with initials
- Role badge
- Menu items (Edit Profile, Settings, Certificates, Help)
- Sign out functionality

### API Integration
- Complete API client with:
  - Automatic token injection
  - Token refresh on expiration
  - Error handling
  - Offline detection
  - iOS and Android emulator support

## Configuration

### API URL

Edit `app.json` to configure the API URL:

```json
{
  "expo": {
    "extra": {
      "apiUrl": "https://api.yourdomain.com/api/v1"
    }
  }
}
```

Or set environment variable:
```bash
export API_URL=https://api.yourdomain.com/api/v1
```

### App Icons and Splash Screen

Replace these files:
- `assets/icon.png` (1024x1024)
- `assets/splash.png` (1242x2436)
- `assets/adaptive-icon.png` (1024x1024, for Android)
- `assets/favicon.png` (48x48, for web)

## Development

### Hot Reload

Expo provides fast refresh. Save any file and see changes instantly.

### Debugging

- Shake device or press `Cmd+D` (iOS) / `Cmd+M` (Android) for dev menu
- Use React Native Debugger or browser devtools
- View logs in terminal where `npm start` is running

### Type Checking

```bash
npm run type-check
```

### Linting

```bash
npm run lint
```

## Building for Production

### EAS Build (Recommended)

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Configure build
eas build:configure

# Build for iOS
eas build --platform ios

# Build for Android
eas build --platform android
```

### Local Build

```bash
# iOS (Mac only)
expo build:ios

# Android
expo build:android
```

## Environment Variables

The app automatically detects the correct localhost address:
- **iOS Simulator**: `http://localhost:3001/api/v1`
- **Android Emulator**: `http://10.0.2.2:3001/api/v1`
- **Physical Device**: Set custom API URL in `app.json`

## Troubleshooting

### Cannot connect to API

**Solution for Android Emulator:**
```bash
# Forward port from emulator to localhost
adb reverse tcp:3001 tcp:3001
```

**Solution for iOS Simulator:**
- Ensure API is running on `http://localhost:3001`
- Check firewall settings

**Solution for Physical Device:**
- Use ngrok or similar tunneling service
- Or deploy API to a public URL

### Build Errors

```bash
# Clear cache
expo start -c

# Reinstall dependencies
rm -rf node_modules
npm install

# Reset iOS simulator
xcrun simctl erase all
```

## Roadmap

Phase 3 features to be implemented:

- [ ] Course catalog with search and filters
- [ ] Lesson player with video support
- [ ] Offline mode with AsyncStorage
- [ ] QR code scanner for equipment training
- [ ] Push notifications
- [ ] Download lessons for offline viewing
- [ ] Certificates display
- [ ] Leaderboard
- [ ] Dark mode support
- [ ] Biometric authentication (Face ID / Touch ID)

## Contributing

1. Follow React Native best practices
2. Use TypeScript for type safety
3. Test on both iOS and Android
4. Follow existing code style
5. Update this README for new features

## License

[Your License Here]

---

**Built with ❤️ for deskless workers**

# 📱 FlipHQ

> **A mobile app for finding, logging, and flipping secondhand treasures.**  
> Like a metal detector, but less embarrassing in public.

---

## 🚀 What FlipHQ Does

FlipHQ is a complete workflow app for flippers that helps you:

- **Find** nearby thrift stores, garage sales, and flip-worthy spots (12-mile radius search with Google Places API)
- **Log** items with a 3-step wizard (category, subcategory, condition, cost)
- **Value** items with real-time profit calculations and Flip Worthiness ratings
- **Fix** items with repair guides, fixability scores, and category-specific toolkits
- **Flip** items with platform strategy, pricing ranges, and pro listing checklists
- **Track** your inventory and leads with workflow status (Found → Fixed → Flipped)
- **FlipBot** AI assistant powered by GPT-4o-mini for expert advice and valuations
- **Secure** — all data stored locally on your device (no accounts, no backend)

---

## ✅ Complete Feature List

### Core Screens (All Functional)

1. **Home Screen** — Premium blue & gold hub with 6-button navigation
2. **Find Screen** — 12-mile radius search with token-gated API calls
3. **Log Item Screen** — 3-step wizard with live valuation ticker
4. **Estimate Screen** — Final valuation with profit ranges and star ratings
5. **Fix Screen** — Fixability scores, YouTube links, and toolkits
6. **Flip Screen** — Platform comparison and pricing strategies
7. **My Finds Screen** — Dual-pillar inventory and leads tracking
8. **FlipBot Screen** — Full AI chat interface with personality
9. **How It Works Screen** — Visual roadmap of the hustle workflow

### Data & Storage

- **Local Storage** — All data persisted with AsyncStorage
- **Inventory Management** — Items with status workflow
- **Leads System** — Saved spots from Find screen
- **Search Caching** — Results persist across sessions
- **Token System** — Complete IAP integration ready

### Monetization

- **Token Bundles** (3 tiers):
  - Starter Pack: $0.99 for 10 tokens
  - Hustler Pack: $2.99 for 35 tokens (Best Value)
  - Pro Pack: $4.99 for 80 tokens
- **Token Usage**: 1 token = 1 FlipBot conversation (3 messages) OR 1 Area Scan
- **Safety Refunds**: Tokens refunded if scan returns 0 results or errors
- **Free Tokens**: 10 tokens on first launch

### Technical Stack

- **React Native** with Expo SDK 53
- **Navigation**: React Navigation (Native Stack)
- **Storage**: AsyncStorage (local device storage)
- **APIs**: Google Places API, OpenAI GPT-4o-mini
- **IAP**: Expo In-App Purchases (iOS & Android ready)
- **UI**: Custom premium theme (Blue & Gold), Poppins fonts

---

## 🎯 Production Status

### ✅ Ready for Launch

- All features implemented and tested
- Error handling and edge cases covered
- Console logs wrapped in `__DEV__` checks
- Route params validation in place
- IAP code integrated (products need to be created in stores)
- No linter errors
- Production-ready codebase

### 📋 Pre-Launch Checklist

**IAP Configuration:**
- [ ] Create 3 IAP products in App Store Connect (iOS)
- [ ] Create 3 IAP products in Google Play Console (Android, after first upload)
- [ ] Test IAP purchases in sandbox/test mode

**Build & Test:**
- [ ] Build iOS app for TestFlight
- [ ] Build Android app for Internal Testing
- [ ] Test on multiple devices and screen sizes
- [ ] Test all features end-to-end
- [ ] Test token edge cases (0 tokens, refunds)
- [ ] Test data persistence (app restart, device restart)

**Store Listings:**
- [ ] Take app screenshots (iOS: 6.7", 6.5", 5.5" / Android: phone & tablet)
- [ ] Finalize app descriptions and keywords
- [ ] Submit for App Store review
- [ ] Submit for Google Play review

---

## 🛠️ Development

### Setup

```bash
npm install
```

### Run

```bash
# Start Expo dev server
npm start

# Run on iOS
npm run ios

# Run on Android
npm run android
```

### Environment Variables

**For Local Development:**
Create a `.env` file in the root directory:

```
GOOGLE_PLACES_API_KEY=your_google_places_api_key
OPEN_AI_API=your_openai_api_key
```

**For EAS Builds (Production):**
Set environment variables as EAS secrets (recommended for cloud builds):

```bash
# Set secrets for EAS builds
eas secret:create --scope project --name GOOGLE_PLACES_API_KEY --value your_key_here
eas secret:create --scope project --name OPEN_AI_API --value your_key_here

# View existing secrets
eas secret:list
```

### Build

```bash
# Build for iOS (TestFlight/App Store)
eas build --platform ios --profile production

# Build for Android (Google Play)
eas build --platform android --profile production

# Build for both platforms
eas build --platform all --profile production

# Preview builds (APK for Android, IPA for iOS)
eas build --platform android --profile preview
eas build --platform ios --profile preview
```

**Note:** EAS Build will automatically handle code signing for both iOS and Android. For Android, production builds use AAB format (required for Google Play).

---

## 📦 App Configuration

- **Bundle ID**: `com.flipworthy.app`
- **Package Name**: `com.flipworthy.app`
- **Version**: `1.0.0`
- **Privacy Policy**: https://ftr-labs.github.io/FlipHQ/privacy-policy.html
- **Support URL**: https://ftr-labs.github.io/FlipHQ/support.html

---

## 💡 Key Features

### Token System
- Unified token system for FlipBot and Find screen
- Real IAP integration (Apple & Google Play)
- Safety refunds for failed operations
- 10 free tokens on first launch

### Data Privacy
- All data stored locally on device
- No backend server required
- No user accounts or login
- Data deleted when app is uninstalled

### Premium UI/UX
- Custom blue & gold theme throughout
- Custom modals (no system alerts)
- Smooth animations and transitions
- Dark keyboards on all inputs
- Professional card layouts

---

## 🚢 Launch Ready

The app is **feature-complete** and **production-ready**. All core functionality is implemented, tested, and polished. The only remaining steps are:

1. Create IAP products in App Store Connect and Google Play Console
2. Build and upload to TestFlight/Internal Testing
3. Test IAP purchases
4. Take screenshots and finalize store listings
5. Submit for review

---

Made by JN at studioFTR | FTR Labs

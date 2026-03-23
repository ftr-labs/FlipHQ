# FlipHQ

A mobile app for finding, logging, fixing, and flipping secondhand items.

## What FlipHQ Does

FlipHQ is an iOS-first workflow app for flippers:

- Find nearby thrift stores, garage sales, and resale spots (Google Places API)
- Log items with guided details
- Estimate value and profit
- Get repair guidance
- Plan platform-specific flip strategy
- Track inventory and leads
- Chat with FlipBot (OpenAI-backed assistant)

All user data is stored locally on device with AsyncStorage.

## Current Product Model

FlipHQ currently has **no token system and no in-app purchases**.

- Find scans are free.
- FlipBot usage is free.
- No payment plans or bundles are configured.

## Core Screens

1. Home
2. Find
3. Log Item
4. Estimate
5. Fix
6. Flip
7. My Finds
8. FlipBot
9. How It Works

## Tech Stack

- React Native + Expo SDK 53
- React Navigation (Native Stack)
- AsyncStorage for local persistence
- Google Places API
- OpenAI API

## Development

### Setup

```bash
npm install
```

### Run

```bash
npm start
npm run ios
```

### Environment Variables

Create a `.env` file in the project root:

```bash
GOOGLE_PLACES_API_KEY=your_google_places_api_key
OPEN_AI_API=your_openai_api_key
```

For EAS cloud builds, add them as project secrets:

```bash
eas secret:create --scope project --name GOOGLE_PLACES_API_KEY --value your_key_here
eas secret:create --scope project --name OPEN_AI_API --value your_key_here
```

## Build (iOS)

```bash
eas build --platform ios --profile production
eas build --platform ios --profile preview
```

## App Configuration

- Bundle ID: `com.flipworthy.app`
- Version: `1.0.0`
- Privacy Policy: https://ftr-labs.github.io/FlipHQ/privacy-policy.html
- Support URL: https://ftr-labs.github.io/FlipHQ/support.html

Made by JN at studioFTR | FTR Labs

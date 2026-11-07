# Group 3 — Motion-Based Fitness Assistant

A fitness app inspired by *Solo Leveling*, built with Expo (React Native). The app uses the device camera for motion-based exercise tracking (full-body scan, guided reps), GPS for outdoor quest/trail navigation with a live map, and a leveling system that lets users train and "level up" like the anime's protagonist.

This repository is the shared team repository of the PIT team.

## Team Members

| Name | GitHub Username | Role |
|------|-----------------|------|
| Aries R. Magto Jr. | [@walubo](https://github.com/walubo) | Leader |
| John Louie Torres | [@torresjohnlouie5-gif](https://github.com/torresjohnlouie5-gif) | Member |
| Yanyan Matos | [@yanyanmatos24](https://github.com/yanyanmatos24) | Member |
| Junrey Roxas | [@roxasjunrey14-blip](https://github.com/roxasjunrey14-blip) | Member |
| Mae Ann | [@MaeAnn31](https://github.com/MaeAnn31) | Member |

See [MEMBERS.md](MEMBERS.md) for the full roster with roles.

## Tech Stack (with versions)

| Technology | Version |
|------------|---------|
| Expo (React Native framework) | SDK ~57.0.26 |
| React | 19.2.3 |
| React Native | 0.86.3 |
| expo-camera | ~57.0.6 |
| expo-location | ~57.0.20 |
| expo-sensors | ~57.0.3 |
| expo-status-bar | ~57.0.1 |
| react-native-maps | 1.27.2 |
| react-native-svg | 15.15.4 |
| react-native-webview | 13.16.1 |
| @expo/vector-icons | ^15.0.2 |
| Node.js (development) | v24.19.0 |
| npm (development) | 11.17.0 |

## How to Run

1. Install [Node.js](https://nodejs.org/) (LTS) and the **Expo Go** app on your Android/iOS phone.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npx expo start
   ```
4. Scan the QR code with Expo Go (Android) or the Camera app (iOS).

## Project Structure

```
├── App.js            # App entry
├── app.json          # Expo configuration
├── index.js          # React Native entry point
├── package.json      # Dependencies and scripts
├── assets/           # Images and icons
└── src/              # Application source code
```

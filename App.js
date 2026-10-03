// TEMPORARY dev menu so you can test features on your phone.
// Torres's real UI will replace this later.

import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import RepTest from './src/dev/RepTest';
import TPoseScanScreen from './src/dev/TPoseScanScreen';
import LiveTrackScreen from './src/dev/LiveTrackScreen';
import SystemScanGPSScreen from './src/screens/SystemScanGPSScreen';
import StatusWindowTest from './src/dev/StatusWindowTest';
import FxDemoScreen from './src/dev/FxDemoScreen';
import { GlowPressable } from './src/components/fx/SystemFX';

const CYAN = '#4de8ff';
const GREEN = '#7dff9b';
const PURPLE = '#a855f7';

export default function App() {
  const [screen, setScreen] = useState('menu');

  if (screen === 'rep') return <RepTest onBack={() => setScreen('menu')} />;
  if (screen === 'scan') return <TPoseScanScreen onBack={() => setScreen('menu')} />;
  if (screen === 'track') return <LiveTrackScreen onBack={() => setScreen('menu')} />;
  if (screen === 'gps') return <SystemScanGPSScreen onBack={() => setScreen('menu')} />;
  if (screen === 'status') return <StatusWindowTest onBack={() => setScreen('menu')} />;
  if (screen === 'fx') return <FxDemoScreen onBack={() => setScreen('menu')} />;

  const MENU = [
    { key: 'status', title: 'STATUS WINDOW', text: "Torres's dashboard UI, wired to HunterContext", color: GREEN },
    { key: 'gps', title: 'GPS QUEST', text: 'Live GPS jogging/running quest tracker', color: CYAN },
    { key: 'fx', title: 'SYSTEM FX', text: 'Glow, press and motion effects', color: PURPLE },
    { key: 'scan', title: 'SYSTEM SCAN', text: 'Camera T-pose calibration', color: CYAN },
    { key: 'track', title: 'LIVE TRACKING', text: 'Body scan, motion calibration and live tracking', color: CYAN },
    { key: 'rep', title: 'BEGIN QUEST', text: 'Motion rep counter test', color: CYAN },
  ];

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.menuList} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>ASCEND</Text>
        <Text style={styles.subtitle}>{'> DEV MENU (temporary)'}</Text>

        {MENU.map((item) => (
          <GlowPressable
            key={item.key}
            onPress={() => setScreen(item.key)}
            glowColor={item.color}
            style={styles.button}
          >
            <Text style={[styles.buttonTitle, { color: item.color }]}>{item.title}</Text>
            <Text style={styles.buttonText}>{item.text}</Text>
          </GlowPressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#05080f' },
  menuList: { flexGrow: 1, justifyContent: 'center', padding: 24, gap: 16 },
  title: { color: '#fff', fontSize: 44, fontWeight: 'bold', letterSpacing: 4 },
  subtitle: { color: '#4de8ff', marginBottom: 12 },
  button: { borderColor: '#4de8ff', borderWidth: 1, borderRadius: 8, padding: 18, backgroundColor: '#0b1220' },
  buttonTitle: { color: '#4de8ff', fontSize: 18, fontWeight: 'bold' },
  buttonText: { color: '#a9b8d0', marginTop: 4 },
});

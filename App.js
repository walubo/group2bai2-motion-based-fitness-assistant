// TEMPORARY dev menu so you can test features on your phone.
// Torres's real UI will replace this later.

import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import RepTest from './src/dev/RepTest';
import TPoseScanScreen from './src/dev/TPoseScanScreen';

export default function App() {
  const [screen, setScreen] = useState('menu');

  if (screen === 'rep') return <RepTest onBack={() => setScreen('menu')} />;
  if (screen === 'scan') return <TPoseScanScreen onBack={() => setScreen('menu')} />;

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <Text style={styles.title}>ASCEND</Text>
      <Text style={styles.subtitle}>{'> DEV MENU (temporary)'}</Text>

      <Pressable style={styles.button} onPress={() => setScreen('scan')}>
        <Text style={styles.buttonTitle}>SYSTEM SCAN</Text>
        <Text style={styles.buttonText}>Camera T-pose calibration</Text>
      </Pressable>

      <Pressable style={styles.button} onPress={() => setScreen('rep')}>
        <Text style={styles.buttonTitle}>BEGIN QUEST</Text>
        <Text style={styles.buttonText}>Motion rep counter test</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#05080f', justifyContent: 'center', padding: 24, gap: 16 },
  title: { color: '#fff', fontSize: 44, fontWeight: 'bold', letterSpacing: 4 },
  subtitle: { color: '#4de8ff', marginBottom: 24 },
  button: { borderColor: '#4de8ff', borderWidth: 1, borderRadius: 8, padding: 18, backgroundColor: '#0b1220' },
  buttonTitle: { color: '#4de8ff', fontSize: 18, fontWeight: 'bold' },
  buttonText: { color: '#a9b8d0', marginTop: 4 },
});

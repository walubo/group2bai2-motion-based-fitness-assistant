// TEMPORARY test screen for the motion rep counter (uses Aries's hooks).

import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import useAccelerometer from '../hooks/useAccelerometer';
import useRepCounter from '../hooks/useRepCounter';

export default function RepTest({ onBack }) {
  const [active, setActive] = useState(false);
  const { magnitude } = useAccelerometer(active);
  const { reps, reset } = useRepCounter(magnitude, active);

  return (
    <View style={styles.screen}>
      <Text style={styles.motion}>Motion: {magnitude.toFixed(2)} g</Text>
      <Text style={styles.reps}>Reps: {reps}</Text>
      <Pressable style={styles.button} onPress={() => setActive(!active)}>
        <Text style={styles.buttonText}>{active ? 'Abort Quest' : 'Begin Quest'}</Text>
      </Pressable>
      <Pressable style={styles.button} onPress={reset}>
        <Text style={styles.buttonText}>Reset Quest</Text>
      </Pressable>
      <Pressable style={styles.button} onPress={onBack}>
        <Text style={styles.buttonText}>Back to menu</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#05080f', justifyContent: 'center', alignItems: 'center', gap: 12 },
  motion: { color: '#4de8ff', fontSize: 20 },
  reps: { color: '#fff', fontSize: 48 },
  button: { borderColor: '#4de8ff', borderWidth: 1, borderRadius: 6, paddingVertical: 12, paddingHorizontal: 28 },
  buttonText: { color: '#4de8ff', fontSize: 16 },
});

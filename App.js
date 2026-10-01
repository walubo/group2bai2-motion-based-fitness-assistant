import { useState } from 'react';
import { View, Text, Button } from 'react-native';
import useAccelerometer from './src/hooks/useAccelerometer';
import useRepCounter from './src/hooks/useRepCounter';

export default function App() {
  const [active, setActive] = useState(false);
  const { magnitude } = useAccelerometer(active);
  const { reps, reset } = useRepCounter(magnitude, active);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#05080f' }}>
      <Text style={{ color: '#4de8ff', fontSize: 20 }}>Motion: {magnitude.toFixed(2)} g</Text>
      <Text style={{ color: '#fff', fontSize: 48 }}>Reps: {reps}</Text>
      <Button title={active ? 'Abort Quest' : 'Begin Quest'} onPress={() => setActive(!active)} />
      <Button title="Reset Quest" onPress={reset} />
    </View>
  );
}
// TEMPORARY test screen: wires Torres's StatusWindow (pure display) to the
// real HunterContext, following the standard pattern — the screen calls the
// hook, passes the values down as props, and the component just renders.
// Torres's real navigation replaces this later.

import { Pressable, StyleSheet, Text, View } from 'react-native';
import { HunterProvider, useHunter } from '../context/HunterContext';
import StatusWindow from '../screens/StatusWindow';

function StatusWindowLive() {
  const quest = useHunter();
  return (
    <StatusWindow
      level={quest.level}
      exp={quest.exp}
      expToNext={quest.expToNext}
      questStatus={quest.questStatus}
      activeQuest={quest.activeQuest}
      notification={quest.notification}
    />
  );
}

export default function StatusWindowTest({ onBack }) {
  return (
    <HunterProvider>
      <View style={styles.screen}>
        {onBack && (
          <View style={styles.menuBar}>
            <Pressable onPress={onBack} hitSlop={8}>
              <Text style={styles.backText}>{'< DEV MENU'}</Text>
            </Pressable>
          </View>
        )}
        <View style={styles.fill}>
          <StatusWindowLive />
        </View>
      </View>
    </HunterProvider>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000' },
  fill: { flex: 1 },
  menuBar: { backgroundColor: '#050b18', paddingTop: 36, paddingHorizontal: 14, paddingBottom: 6 },
  backText: { color: '#4de8ff', fontSize: 13, fontWeight: 'bold' },
});

// ASCEND app shell: the Status Window is the home screen.
// Start Quest -> System Scan GPS quest screen. State is shared through one
// HunterProvider around the whole app, so EXP earned in a quest shows on the
// dashboard immediately.

import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { HunterProvider, useHunter } from './src/context/HunterContext';
import StatusWindow from './src/screens/StatusWindow';
import SystemScanGPSScreen from './src/screens/SystemScanGPSScreen';

// The dashboard reads real state from the context and renders Torres's
// pure-display component. The tab bar is intentionally not passed (hidden).
function HomeScreen({ onStartQuest }) {
  const quest = useHunter();
  return (
    <StatusWindow
      level={quest.level}
      exp={quest.exp}
      expToNext={quest.expToNext}
      questStatus={quest.questStatus}
      activeQuest={quest.activeQuest}
      notification={quest.notification}
      tabs={[]}
      onStartQuest={onStartQuest}
    />
  );
}

export default function App() {
  const [screen, setScreen] = useState('home');

  return (
    <HunterProvider>
      <StatusBar style="light" />
      {screen === 'home' && (
        <HomeScreen
          onStartQuest={() => {
            setScreen('gps');
          }}
        />
      )}
      {screen === 'gps' && <SystemScanGPSScreen onBack={() => setScreen('home')} />}
    </HunterProvider>
  );
}

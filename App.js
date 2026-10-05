// ASCEND app shell.
// Home (Status Window) -> START QUEST -> Quest Board -> the three quests:
//   SHADOW EXTRACTION (rep counter) / GATE CLEARANCE (GPS sprint) / SYSTEM SCAN
// (body calibration). One HunterProvider wraps everything, so level, EXP and
// quest status are shared by every screen.

import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { HunterProvider, useHunter } from './src/context/HunterContext';
import StatusWindow from './src/screens/StatusWindow';
import QuestBoardScreen from './src/screens/QuestBoardScreen';
import RepQuestScreen from './src/screens/RepQuestScreen';
import SystemScanGPSScreen from './src/screens/SystemScanGPSScreen';
import BodyScanScreen from './src/screens/BodyScanScreen';

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
      {screen === 'home' && <HomeScreen onStartQuest={() => setScreen('board')} />}
      {screen === 'board' && (
        <QuestBoardScreen
          onBack={() => setScreen('home')}
          onSelect={(questKey) => setScreen(questKey)}
        />
      )}
      {screen === 'rep' && <RepQuestScreen onBack={() => setScreen('board')} />}
      {screen === 'gps' && <SystemScanGPSScreen onBack={() => setScreen('board')} />}
      {screen === 'calib' && <BodyScanScreen onBack={() => setScreen('board')} />}
    </HunterProvider>
  );
}

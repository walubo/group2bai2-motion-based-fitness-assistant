import React, { createContext, useContext, useState } from 'react';

const HunterContext = createContext(null);
const EXP_PER_REP = 10;
const EXP_PER_KM = 100; // EXP reward for a GPS quest
const MIN_GOAL_KM = 1.5;
const MAX_GOAL_KM = 5.0;
const QUEST_NAME = 'Gate Clearance: Daily Sprint';

// Random goal between 1.5 and 5.0 km, rounded to 1 decimal place.
function randomGoalKm() {
  return Math.round((MIN_GOAL_KM + Math.random() * (MAX_GOAL_KM - MIN_GOAL_KM)) * 10) / 10;
}

export function HunterProvider({ children }) {
  const [level, setLevel] = useState(1);
  const [exp, setExp] = useState(0);
  const [questStatus, setQuestStatus] = useState('IDLE'); // IDLE | IN PROGRESS | CLEARED | FAILED

  // GPS quest state (owned here so every screen sees the same numbers).
  const [activeQuest, setActiveQuest] = useState(null); // quest name, e.g. "Gate Clearance: Daily Sprint"
  const [questGoalKm, setQuestGoalKm] = useState(0);
  const [currentDistanceKm, setCurrentDistanceKm] = useState(0);
  const [elapsedTimeSec, setElapsedTimeSec] = useState(0);
  const [notification, setNotification] = useState(''); // latest System Notification

  const expToNext = level * 100;

  const awardExp = (reps) => {
    let total = exp + reps * EXP_PER_REP;
    let lvl = level;
    while (total >= lvl * 100) {
      total -= lvl * 100;
      lvl += 1;
    }
    setExp(total);
    setLevel(lvl);
  };

  // Starts the daily GPS quest and rolls a random goal (only from IDLE).
  const startQuest = () => {
    if (questStatus !== 'IDLE') return;
    const goal = randomGoalKm();
    setActiveQuest(QUEST_NAME);
    setQuestGoalKm(goal);
    setCurrentDistanceKm(0);
    setElapsedTimeSec(0);
    setQuestStatus('IN PROGRESS');
    setNotification(`Daily Quest accepted: ${QUEST_NAME}. Run ${goal.toFixed(1)} km, Hunter.`);
  };

  // The GPS screen feeds tracking values in here every second / GPS update.
  // Cleared automatically when the distance reaches the goal.
  const updateProgress = (distanceKm, elapsedSec) => {
    setCurrentDistanceKm(distanceKm);
    setElapsedTimeSec(elapsedSec);
    if (questStatus === 'IN PROGRESS' && questGoalKm > 0 && distanceKm >= questGoalKm) {
      setQuestStatus('CLEARED');
      awardExp(questGoalKm * EXP_PER_KM);
      setNotification('Daily Quest Cleared! EXP Awarded, Hunter.');
    }
  };

  // Hunter gives up: quest fails.
  const abortQuest = () => {
    if (questStatus !== 'IN PROGRESS') return;
    setQuestStatus('FAILED');
    setNotification('Quest aborted. The Gate remains open, Hunter.');
  };

  // Back to IDLE so a new daily quest can be rolled.
  const resetQuest = () => {
    setQuestStatus('IDLE');
    setActiveQuest(null);
    setQuestGoalKm(0);
    setCurrentDistanceKm(0);
    setElapsedTimeSec(0);
    setNotification('');
  };

  return (
    <HunterContext.Provider
      value={{
        level, exp, expToNext, questStatus, setQuestStatus, awardExp,
        activeQuest, questGoalKm, currentDistanceKm, elapsedTimeSec, notification,
        startQuest, updateProgress, abortQuest, resetQuest,
      }}
    >
      {children}
    </HunterContext.Provider>
  );
}

export const useHunter = () => useContext(HunterContext);

import React, { createContext, useContext, useState } from 'react';

const HunterContext = createContext(null);
const EXP_PER_REP = 10;

export function HunterProvider({ children }) {
  const [level, setLevel] = useState(1);
  const [exp, setExp] = useState(0);
  const [questStatus, setQuestStatus] = useState('IDLE'); // IDLE | IN PROGRESS | CLEARED | FAILED

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

  return (
    <HunterContext.Provider
      value={{ level, exp, expToNext, questStatus, setQuestStatus, awardExp }}
    >
      {children}
    </HunterContext.Provider>
  );
}

export const useHunter = () => useContext(HunterContext);
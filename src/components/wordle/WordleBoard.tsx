'use client';

import { motion } from 'framer-motion';
import type { EvaluatedGuess, LetterStatus } from '@/types';

const MAX_ATTEMPTS = 6;
const WORD_LENGTH = 5;

interface WordleBoardProps {
  evaluatedGuesses: EvaluatedGuess[];
  currentGuess: string;
  isRevealing: boolean;
}

function getTileColor(status: LetterStatus): string {
  switch (status) {
    case 'correct':
      return 'bg-green-500 border-green-500 text-white';
    case 'present':
      return 'bg-yellow-500 border-yellow-500 text-white';
    case 'absent':
      return 'bg-gray-500 border-gray-500 text-white dark:bg-gray-600 dark:border-gray-600';
    default:
      return '';
  }
}

interface TileProps {
  letter: string;
  status?: LetterStatus;
  isActive?: boolean;
  delay?: number;
  isRevealing?: boolean;
}

function Tile({ letter, status, isActive, delay = 0, isRevealing }: TileProps) {
  const baseClasses = 'w-14 h-14 sm:w-16 sm:h-16 border-2 flex items-center justify-center text-2xl font-bold uppercase rounded select-none';

  if (status && isRevealing) {
    return (
      <motion.div
        className={`${baseClasses} ${getTileColor(status)}`}
        initial={{ rotateX: 0 }}
        animate={{ rotateX: [0, 90, 0] }}
        transition={{ duration: 0.5, delay: delay * 0.2 }}
        style={{ perspective: 600 }}
      >
        {letter}
      </motion.div>
    );
  }

  if (status) {
    return (
      <div className={`${baseClasses} ${getTileColor(status)}`}>
        {letter}
      </div>
    );
  }

  if (isActive && letter) {
    return (
      <motion.div
        className={`${baseClasses} border-gray-500 dark:border-gray-400 text-gray-800 dark:text-white`}
        initial={{ scale: 1 }}
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 0.1 }}
      >
        {letter}
      </motion.div>
    );
  }

  return (
    <div className={`${baseClasses} border-gray-300 dark:border-gray-600`}>
      {letter}
    </div>
  );
}

export default function WordleBoard({ evaluatedGuesses, currentGuess, isRevealing }: WordleBoardProps) {
  const rows = [];

  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    if (i < evaluatedGuesses.length) {
      // Completed guess row
      const guess = evaluatedGuesses[i];
      const isLastGuess = i === evaluatedGuesses.length - 1;
      rows.push(
        <div key={i} className="flex gap-1.5 justify-center">
          {guess.word.split('').map((letter, j) => (
            <Tile
              key={j}
              letter={letter}
              status={guess.result[j]}
              delay={j}
              isRevealing={isLastGuess && isRevealing}
            />
          ))}
        </div>
      );
    } else if (i === evaluatedGuesses.length) {
      // Current guess row (being typed)
      const letters = currentGuess.split('');
      rows.push(
        <div key={i} className="flex gap-1.5 justify-center">
          {Array.from({ length: WORD_LENGTH }).map((_, j) => (
            <Tile
              key={j}
              letter={letters[j] || ''}
              isActive={true}
            />
          ))}
        </div>
      );
    } else {
      // Empty row
      rows.push(
        <div key={i} className="flex gap-1.5 justify-center">
          {Array.from({ length: WORD_LENGTH }).map((_, j) => (
            <Tile key={j} letter="" />
          ))}
        </div>
      );
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      {rows}
    </div>
  );
}

'use client';

import { useCallback, useEffect } from 'react';
import { Delete, CornerDownLeft } from 'lucide-react';
import type { LetterStatus } from '@/types';

const ROWS = [
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
  ['enter', 'z', 'x', 'c', 'v', 'b', 'n', 'm', 'backspace'],
];

interface WordleKeyboardProps {
  onKeyPress: (key: string) => void;
  letterStatuses: Map<string, LetterStatus>;
  disabled?: boolean;
}

function getKeyColor(status: LetterStatus | undefined): string {
  switch (status) {
    case 'correct':
      return 'bg-green-500 text-white border-green-500 hover:bg-green-600';
    case 'present':
      return 'bg-yellow-500 text-white border-yellow-500 hover:bg-yellow-600';
    case 'absent':
      return 'bg-gray-500 text-white border-gray-500 dark:bg-gray-600 dark:border-gray-600';
    default:
      return 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white border-gray-300 dark:border-gray-600 hover:bg-gray-300 dark:hover:bg-gray-600';
  }
}

export default function WordleKeyboard({ onKeyPress, letterStatuses, disabled }: WordleKeyboardProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (disabled) return;

      if (e.key === 'Enter') {
        onKeyPress('enter');
      } else if (e.key === 'Backspace') {
        onKeyPress('backspace');
      } else if (/^[a-zA-Z]$/.test(e.key)) {
        onKeyPress(e.key.toLowerCase());
      }
    },
    [onKeyPress, disabled]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="flex flex-col gap-1.5 items-center w-full max-w-lg mx-auto">
      {ROWS.map((row, i) => (
        <div key={i} className="flex gap-1 sm:gap-1.5 justify-center w-full">
          {row.map((key) => {
            const isSpecial = key === 'enter' || key === 'backspace';
            const status = !isSpecial ? letterStatuses.get(key) : undefined;
            const colorClasses = isSpecial
              ? 'bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-white border-gray-400 dark:border-gray-500 hover:bg-gray-400 dark:hover:bg-gray-500'
              : getKeyColor(status);

            return (
              <button
                key={key}
                onClick={() => !disabled && onKeyPress(key)}
                disabled={disabled}
                className={`
                  ${colorClasses}
                  ${isSpecial ? 'px-2 sm:px-4 text-xs sm:text-sm' : 'w-8 sm:w-10 text-sm sm:text-base'}
                  h-12 sm:h-14 rounded-md font-semibold uppercase border
                  flex items-center justify-center
                  transition-colors duration-150
                  disabled:opacity-50 disabled:cursor-not-allowed
                  select-none
                `}
              >
                {key === 'enter' ? (
                  <CornerDownLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                ) : key === 'backspace' ? (
                  <Delete className="w-4 h-4 sm:w-5 sm:h-5" />
                ) : (
                  key
                )}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

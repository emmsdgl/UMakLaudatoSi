'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import type { CalculatorQuestion as QuestionType } from '@/types';

interface CalculatorQuestionProps {
  question: QuestionType;
  selectedAnswer: number;
  onSelect: (answerIndex: number) => void;
  direction: number; // 1 = forward, -1 = backward
}

const categoryEmoji: Record<string, string> = {
  transportation: '🚗',
  food: '🍽️',
  energy: '⚡',
  waste: '♻️',
  water: '💧',
};

export default function CalculatorQuestion({
  question,
  selectedAnswer,
  onSelect,
  direction,
}: CalculatorQuestionProps) {
  return (
    <AnimatePresence mode="wait" custom={direction}>
      <motion.div
        key={question.id}
        custom={direction}
        initial={{ opacity: 0, x: direction * 60 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: direction * -60 }}
        transition={{ duration: 0.25, ease: 'easeInOut' }}
      >
        <div className="text-center mb-6">
          <span className="text-3xl mb-2 block">{categoryEmoji[question.category]}</span>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white leading-tight">
            {question.question}
          </h2>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 capitalize">
            {question.category} category
          </p>
        </div>

        <RadioGroup
          value={selectedAnswer >= 0 ? String(selectedAnswer) : ''}
          onValueChange={(val) => onSelect(parseInt(val))}
          className="space-y-2.5"
        >
          {question.options.map((option, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.06 }}
            >
              <Label
                htmlFor={`q${question.id}-opt-${index}`}
                className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  selectedAnswer === index
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20 dark:border-green-500'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <RadioGroupItem
                  value={String(index)}
                  id={`q${question.id}-opt-${index}`}
                  className="border-green-500 text-green-600"
                />
                <span className="text-sm sm:text-base text-gray-700 dark:text-gray-200">
                  {option}
                </span>
              </Label>
            </motion.div>
          ))}
        </RadioGroup>
      </motion.div>
    </AnimatePresence>
  );
}

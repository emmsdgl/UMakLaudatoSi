'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Loader2, Leaf, Lock } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import CalculatorQuestion from '@/components/calculator/CalculatorQuestion';
import CalculatorResults from '@/components/calculator/CalculatorResults';
import { CALCULATOR_QUESTIONS } from '@/lib/constants/eco-paths';
import type { CarbonFootprintResult, EcoPathId } from '@/types';

export default function CalculatorPage() {
  const router = useRouter();
  const totalSteps = CALCULATOR_QUESTIONS.length;

  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<number[]>(Array(totalSteps).fill(-1));
  const [direction, setDirection] = useState(1);
  const [showResults, setShowResults] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<CarbonFootprintResult | null>(null);
  const [topCategories, setTopCategories] = useState<{ path_id: EcoPathId; co2: number }[]>([]);

  // Check if user already has a result
  const [existingResult, setExistingResult] = useState<CarbonFootprintResult | null>(null);
  const [existingTopCats, setExistingTopCats] = useState<{ path_id: EcoPathId; co2: number }[]>([]);
  const [canRetake, setCanRetake] = useState(true);
  const [loading, setLoading] = useState(true);

  const fetchExisting = useCallback(async () => {
    try {
      const res = await fetch('/api/carbon-footprint');
      const data = await res.json();
      if (data.success && data.has_result) {
        setExistingResult(data.result);
        setExistingTopCats(data.top_categories || []);
      }
      if (data.success) {
        setCanRetake(data.can_retake !== false);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExisting();
  }, [fetchExisting]);

  const handleSelect = (answerIndex: number) => {
    const newAnswers = [...answers];
    newAnswers[currentStep] = answerIndex;
    setAnswers(newAnswers);
  };

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setDirection(1);
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setDirection(-1);
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/carbon-footprint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers }),
      });
      const data = await res.json();
      if (data.success) {
        setResult(data.result);
        setTopCategories(data.top_categories || []);
        setShowResults(true);
      }
    } catch {
      // ignore
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetake = () => {
    if (!canRetake) return;
    setShowResults(false);
    setResult(null);
    setExistingResult(null);
    setAnswers(Array(totalSteps).fill(-1));
    setCurrentStep(0);
    setDirection(1);
  };

  const handleChoosePath = () => {
    router.push('/eco-paths');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-green-500 animate-spin" />
      </div>
    );
  }

  // Show existing results if user already took the quiz
  if (existingResult && !showResults && answers.every(a => a === -1)) {
    return (
      <div className="px-4 sm:px-6 py-6 max-w-lg mx-auto pb-24 lg:pb-8">
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-3">
            <Leaf className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
            Your Carbon Footprint
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Last calculated on {new Date(existingResult.created_at).toLocaleDateString()}
          </p>
        </div>
        <CalculatorResults
          result={existingResult}
          topCategories={existingTopCats}
          onChoosePath={handleChoosePath}
          onRetake={handleRetake}
          canRetake={canRetake}
        />
      </div>
    );
  }

  // Show new results after submission
  if (showResults && result) {
    return (
      <div className="px-4 sm:px-6 py-6 max-w-lg mx-auto pb-24 lg:pb-8">
        <div className="text-center mb-6">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', bounce: 0.5 }}
            className="w-16 h-16 mx-auto rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-3"
          >
            <Leaf className="w-8 h-8 text-green-600" />
          </motion.div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
            Your Results
          </h1>
        </div>
        <CalculatorResults
          result={result}
          topCategories={topCategories}
          onChoosePath={handleChoosePath}
          onRetake={handleRetake}
          canRetake={canRetake}
        />
      </div>
    );
  }

  // Quiz flow
  const currentQuestion = CALCULATOR_QUESTIONS[currentStep];
  const isLastStep = currentStep === totalSteps - 1;
  const canProceed = answers[currentStep] >= 0;
  const progress = ((currentStep + 1) / totalSteps) * 100;

  return (
    <div className="px-4 sm:px-6 py-6 max-w-lg mx-auto pb-24 lg:pb-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-lg font-bold text-gray-800 dark:text-white mb-1">
          Carbon Footprint Calculator
        </h1>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Answer {totalSteps} quick questions to discover your impact
        </p>
      </div>

      {/* Progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
            Question {currentStep + 1} of {totalSteps}
          </span>
          <span className="text-xs font-medium text-green-600">
            {Math.round(progress)}%
          </span>
        </div>
        <Progress value={progress} className="h-2 bg-gray-200 dark:bg-gray-700" />
      </div>

      {/* Question */}
      <div className="mb-8">
        <CalculatorQuestion
          question={currentQuestion}
          selectedAnswer={answers[currentStep]}
          onSelect={handleSelect}
          direction={direction}
        />
      </div>

      {/* Navigation */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={currentStep === 0}
          className="flex-1"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Back
        </Button>

        {isLastStep ? (
          <Button
            onClick={handleSubmit}
            disabled={!canProceed || submitting}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
            ) : (
              <Leaf className="w-4 h-4 mr-1.5" />
            )}
            Calculate
          </Button>
        ) : (
          <Button
            onClick={handleNext}
            disabled={!canProceed}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
          >
            Next
            <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

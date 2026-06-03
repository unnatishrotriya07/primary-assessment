"use client";

import { useState, useEffect } from "react";
import assessmentService from "@/services/assessment.service";

export function useAssessment(sessionId: string) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(1800); // 30 mins in seconds
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    if (timeLeft <= 0) {
      handleSubmit();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  const handleSelectAnswer = (questionId: string, answer: string) => {
    if (isSubmitted) return;
    setAnswers((prev) => ({
      ...prev,
      [questionId]: answer,
    }));
  };

  const handleSubmit = async () => {
    if (isSubmitted) return;
    setIsSubmitted(true);
    try {
      await assessmentService.submitAnswers({
        sessionId,
        answers,
      });
    } catch (err) {
      console.error("Submission failed", err);
    }
  };

  return {
    currentIdx,
    setCurrentIdx,
    answers,
    timeLeft,
    isSubmitted,
    handleSelectAnswer,
    handleSubmit,
  };
}
export default useAssessment;

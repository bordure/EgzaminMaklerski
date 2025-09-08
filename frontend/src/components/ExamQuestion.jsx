import React, { useState, useEffect } from 'react';

export default function ExamQuestion({ q, idx, mode, showYear, onAnswer, examSubmitted }) {
  const [selectedOption, setSelectedOption] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);

  useEffect(() => {
    if (mode !== "review") {
      setSelectedOption(null);
      setIsAnswered(false);
    }
  }, [q._id, q.question, mode]); 

  useEffect(() => {
    if (mode === "review" && q.answered && q.answered.chosenOption) {
      setSelectedOption(q.answered.chosenOption);
      setIsAnswered(true);
    }
  }, [mode, q.answered]);

  const getCorrectAnswerText = (correctAnswerLetter) => {
    switch (correctAnswerLetter) {
      case "A":
        return q.option_A;
      case "B":
        return q.option_B;
      case "C":
        return q.option_C;
      case "D":
        return q.option_D;
      default:
        return null;
    }
  };

  const handleOptionClick = (option) => {
    if (mode === "review") return;
    
    if (examSubmitted) return;
    
    if (isAnswered && mode === "study") return;

    setSelectedOption(option);
    setIsAnswered(true);

    const correctText = getCorrectAnswerText(q.correct_answer);
    const isCorrect = option === correctText;
    onAnswer(q._id, isCorrect, option);
  };

  const getOptionClasses = (option) => {
    let classes = "w-full text-left p-3 border rounded-md transition-colors duration-200 shadow-sm";
    const correctText = getCorrectAnswerText(q.correct_answer);

    if (mode === "review" || examSubmitted || (isAnswered && mode === "study")) {
      classes += " cursor-default";
    } else {
      classes += " cursor-pointer";
    }

    if (mode === "review" || examSubmitted || (mode === "study" && isAnswered)) {
      if (option === correctText) {
        classes += " bg-green-200 border-green-500 text-green-800 font-medium";
      } else if (option === selectedOption && option !== correctText) {
        classes += " bg-red-200 border-red-500 text-red-800 font-medium";
      } else {
        classes += " bg-gray-50 border-gray-300 text-gray-600";
      }
    } else {
      if (option === selectedOption) {
        classes += " bg-blue-200 border-blue-500 text-blue-800";
      } else {
        classes += " bg-white hover:bg-gray-100 border-gray-300";
      }
    }
    
    return classes;
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg mb-6">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-xl font-semibold text-gray-800">
          Question {idx + 1}
        </h3>
        {showYear && q.exam_date && (
          <span className="text-sm text-gray-500 font-medium">
            {q.exam_date}
          </span>
        )}
      </div>
      <p className="mb-4 text-gray-700">{q.question}</p>
      <ul className="space-y-3">
        {q.options.map((option, optionIdx) => (
          <li
            key={optionIdx}
            className={getOptionClasses(option)}
            onClick={() => handleOptionClick(option)}
          >
            <span className="font-medium mr-2">
              {String.fromCharCode(65 + optionIdx)}.
            </span>
            {option}
          </li>
        ))}
      </ul>
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { submitReport } from '../api';
import { useAuth } from '../AuthContext';
const REPORT_REASONS = [
  { value: "typo", label: "Literowka" },
  { value: "wrong_answer", label: "Bledna odpowiedz" },
  { value: "other", label: "Inny problem" },
];
function ReportModal({ question, onClose }) {
  const [reason, setReason] = useState("typo");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await submitReport({
        question_id: question._id,
        question_text: question.question,
        reason,
        description,
      });
      setDone(true);
    } catch {
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {done ? (
          <div className="text-center py-4">
            <p className="text-green-600 dark:text-green-400 font-semibold text-lg mb-2">
              Zgloszenie wyslane
            </p>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
              Dziekujemy za pomoc w poprawieniu bazy pytan.
            </p>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Zamknij
            </button>
          </div>
        ) : (
          <>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
              Zglos problem z pytaniem
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 truncate">
              {question.question}
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Rodzaj problemu
                </label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                >
                  {REPORT_REASONS.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Opis (opcjonalnie)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 resize-none"
                  placeholder="Opisz problem..."
                />
              </div>
              <div className="flex gap-3 justify-end pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-sm bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {submitting ? "Wysylanie..." : "Wyslij zgloszenie"}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
export default function ExamQuestion({ q, idx, mode, showYear, onAnswer, examSubmitted }) {
  const { user } = useAuth();
  const [selectedOption, setSelectedOption] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
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
    if (mode === "review" || examSubmitted || (isAnswered && mode === "study")) return;
    setSelectedOption(option);
    setIsAnswered(true);
    const correctText = getCorrectAnswerText(q.correct_answer);
    const isCorrect = option === correctText;
    onAnswer(q._id, isCorrect, option, { domain: q.domain, section: q.section, topic: q.topic });
  };
  const getOptionClasses = (option) => {
    let classes =
      "w-full text-left p-3 border rounded-md transition-colors duration-200 shadow-sm";
    const correctText = getCorrectAnswerText(q.correct_answer);
    if (mode === "review" || examSubmitted || (isAnswered && mode === "study")) {
      classes += " cursor-default";
    } else {
      classes += " cursor-pointer";
    }
    if (mode === "review" || examSubmitted || (mode === "study" && isAnswered)) {
      if (option === correctText) {
        classes +=
          " bg-green-200 border-green-500 text-green-800 font-medium dark:bg-green-800 dark:text-green-200";
      } else if (option === selectedOption && option !== correctText) {
        classes +=
          " bg-red-200 border-red-500 text-red-800 font-medium dark:bg-red-800 dark:text-red-200";
      } else {
        classes +=
          " bg-gray-50 border-gray-300 text-gray-600 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300";
      }
    } else {
      if (option === selectedOption) {
        classes +=
          " bg-blue-200 border-blue-500 text-blue-800 dark:bg-blue-800 dark:text-blue-200";
      } else {
        classes +=
          " bg-white hover:bg-gray-100 border-gray-300 dark:bg-gray-900 dark:hover:bg-gray-700 dark:border-gray-700 dark:text-gray-200";
      }
    }
    return classes;
  };
  return (
    <div className="relative bg-white dark:bg-gray-900 p-6 rounded-lg shadow-lg mb-6 transition-colors duration-300">
      {reportOpen && (
        <ReportModal question={q} onClose={() => setReportOpen(false)} />
      )}
      {!user?.guest && (
        <button
          onClick={() => setReportOpen(true)}
          title="Zglos problem z pytaniem"
          className="absolute top-3 right-3 w-6 h-6 rounded-full bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-orange-400"
          aria-label="Zglos problem z pytaniem"
        >
          !
        </button>
      )}
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
          Pytanie {idx + 1}
        </h3>
        {showYear && q.exam_date && (
          <span className="text-sm text-gray-500 dark:text-gray-400 font-medium pr-8">
            {q.exam_date}
          </span>
        )}
      </div>
      <p className="mb-4 text-gray-700 dark:text-gray-300">{q.question}</p>
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

import React from "react";
export default function ExamList({ questions }) {
  return (
    <div className="space-y-4">
      {questions.map((q, idx) => (
        <div
          key={q._id}
          className="p-4 border rounded shadow-sm bg-white dark:bg-gray-900 dark:border-gray-700 transition-colors duration-300"
        >
          <div className="font-bold text-gray-800 dark:text-gray-100">
            P.{idx + 1}: {q.question}
          </div>
          <ul className="list-disc pl-5 mt-2 text-gray-700 dark:text-gray-300">
            {["option_A", "option_B", "option_C", "option_D"].map((opt) => (
              <li key={opt}>{q[opt]}</li>
            ))}
          </ul>
          <div className="mt-2 font-semibold text-green-600 dark:text-green-400">
            Poprawna: {q.correct_answer}
          </div>
        </div>
      ))}
    </div>
  );
}

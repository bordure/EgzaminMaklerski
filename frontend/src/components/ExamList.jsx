import React from "react";

export default function ExamList({ questions }) {
  return (
    <div className="space-y-4">
      {questions.map((q, idx) => (
        <div key={q._id} className="p-4 border rounded shadow-sm bg-white">
          <div className="font-bold">Q{idx + 1}: {q.question}</div>
          <ul className="list-disc pl-5 mt-2">
            {["option_A", "option_B", "option_C", "option_D"].map(opt => (
              <li key={opt}>{q[opt]}</li>
            ))}
          </ul>
          <div className="mt-2 text-green-600 font-semibold">
            Correct: {q.correct_answer}
          </div>
        </div>
      ))}
    </div>
  );
}

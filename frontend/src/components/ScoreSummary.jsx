import React from "react";

export default function ScoreSummary({ questions, answers }) {
  const total = questions.length;
  let points = 0;
  questions.forEach((q) => {
    // Check if an answer exists and if it was correct
    const answer = answers[q._id];
    if (!answer) return; // skipped
    if (answer.isCorrect) points += 2;
    else points -= 1;
  });
  const maxPoints = total * 2;
  const passed = maxPoints > 0 ? (points / maxPoints) >= 0.67 : false;

  return (
    <div className="p-4 bg-gray-100 text-gray-900 rounded mt-4 shadow-inner">
      <h2 className="text-xl font-bold mb-2 text-gray-800">Exam Summary</h2>
      <p>Total Questions: {total}</p>
      <p>Points: {points}/{maxPoints}</p>
      <p>
        Status:
        <span className={`font-bold ml-2 ${passed ? "text-green-600" : "text-red-600"}`}>
          {passed ? "PASSED" : "FAILED"}
        </span>
      </p>
    </div>
  );
}
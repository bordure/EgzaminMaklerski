import React, { useState, useEffect, useRef } from "react";
import { fetchTopics, fetchQuestions, fetchExamDates } from "../api";
import ExamQuestion from "../components/ExamQuestion";

export default function GenerateExamPage() {
  const [topics, setTopics] = useState({});
  const [isSpecificTopics, setIsSpecificTopics] = useState(false);
  const [isSpecificYear, setIsSpecificYear] = useState(false);
  const [examYears, setExamYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedMainTopic, setSelectedMainTopic] = useState("");
  const [selectedSubTopic, setSelectedSubTopic] = useState("");
  const [mode, setMode] = useState("study");
  const [numberOfQuestions, setNumberOfQuestions] = useState(10);
  const [showYears, setShowYears] = useState(true);
  const [examTimer, setExamTimer] = useState(60); // Default 60 minutes
  const [timeRemaining, setTimeRemaining] = useState(null); // Actual countdown timer
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [examSubmitted, setExamSubmitted] = useState(false);
  const timerIntervalRef = useRef(null);

  // Fetch topics and exam dates on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const [topicsData, examDatesData] = await Promise.all([
          fetchTopics(),
          fetchExamDates()
        ]);
        setTopics(topicsData);
        // Correctly access the array from the returned object
        if (examDatesData && Array.isArray(examDatesData.exam_dates)) {
          setExamYears(examDatesData.exam_dates);
        } else {
          console.error("Exam dates data is not an array:", examDatesData);
          setExamYears([]); // Ensure state is an array to prevent errors
        }
      } catch (err) {
        setError("Failed to fetch topics or exam dates.");
        console.error("Error fetching data:", err);
      }
    };
    loadData();
  }, []);

  // Timer effect for exam mode
  useEffect(() => {
    // Start timer only when an exam is loaded in exam mode and it hasn't been submitted
    if (mode === "exam" && questions.length > 0 && !examSubmitted && timeRemaining === null) {
      // Initialize timer
      const totalSeconds = parseInt(examTimer, 10) * 60;
      setTimeRemaining(totalSeconds);

      // Clear any existing timer before starting a new one
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }

      timerIntervalRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            // Time's up - auto submit exam
            setExamSubmitted(true);
            clearInterval(timerIntervalRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    
    // Cleanup function to clear the interval when the component unmounts or dependencies change
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [mode, questions.length, examSubmitted, examTimer]);

  // Handle Generate Exam Button Click
  const handleGenerateExam = async () => {
    setLoading(true);
    setError(null);
    setExamSubmitted(false); // Reset exam state
    // Reset timer before new exam
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    setTimeRemaining(null);

    try {
      // Build query options for the unified API
      const queryOptions = {
        n: numberOfQuestions,
        random: true // Always use random for exam generation
      };

      // Add filters based on user selection
      if (isSpecificTopics) {
        // Add topic filters
        if (selectedMainTopic) {
          queryOptions.main_topic = selectedMainTopic;
        }
        if (selectedSubTopic) {
          queryOptions.sub_topic = selectedSubTopic;
        }
      }
      
      if (isSpecificYear && selectedYear) {
        // Add year filter (can be combined with topic filters)
        queryOptions.exam_date = selectedYear;
      }


      // Fetch questions using the unified API
      const res = await fetchQuestions(queryOptions);
      
      // Check if we got questions in the response
      if (!res || !res.questions || !Array.isArray(res.questions)) {
        throw new Error("No questions received from API");
      }
      
      
      const transformedQuestions = res.questions.map(q => ({
        ...q,
        options: [q.option_A, q.option_B, q.option_C, q.option_D],
        correct_answer: q.correct_answer,
        answered: { isCorrect: null, chosenOption: null }
      }));
      
      setQuestions(transformedQuestions);
    } catch (err) {
      setError("Failed to generate exam. Please try again.");
      console.error("Error generating exam:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (questionId, isCorrect, chosenOption) => {
    setQuestions(prevQuestions => 
      prevQuestions.map(q => 
        q._id === questionId ? { ...q, answered: { isCorrect, chosenOption } } : q
      )
    );
  };

  const handleFinishExam = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    setExamSubmitted(true);
  };

  const calculateScore = () => {
    let totalPoints = 0;
    let correctCount = 0;
    let wrongCount = 0;
    let skippedCount = 0;

    questions.forEach(q => {
      if (q.answered.chosenOption === null) {
        // Skipped question: 0 points
        skippedCount++;
      } else if (q.answered.isCorrect) {
        // Correct answer: +2 points
        totalPoints += 2;
        correctCount++;
      } else {
        // Wrong answer: -1 point
        totalPoints -= 1;
        wrongCount++;
      }
    });

    const maxPossibleScore = questions.length * 2;
    const passingScore = 0.67 * maxPossibleScore;
    const hasPassed = totalPoints >= passingScore;

    return {
      totalPoints,
      correctCount,
      wrongCount,
      skippedCount,
      totalQuestions: questions.length,
      maxPossibleScore,
      passingScore,
      hasPassed
    };
  };

  const formatTime = (seconds) => {
    if (seconds === null) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-8">
      {/* Fixed Timer for Exam Mode */}
      {mode === "exam" && questions.length > 0 && !examSubmitted && timeRemaining !== null && (
        <div className="fixed top-0 left-0 right-0 bg-red-600 text-white py-3 px-6 shadow-lg z-50">
          <div className="max-w-4xl mx-auto flex justify-between items-center">
            <span className="text-lg font-semibold">Exam in Progress</span>
            <div className="text-xl font-bold">
              ⏰ Time Remaining: {formatTime(timeRemaining)}
            </div>
          </div>
        </div>
      )}
      
      <div className={`max-w-4xl mx-auto ${mode === "exam" && questions.length > 0 && !examSubmitted && timeRemaining !== null ? "mt-16" : ""}`}>
        <h1 className="text-3xl font-bold mb-6 text-gray-800 border-b pb-4">
          Generate Exam
        </h1>

        <div className="bg-white p-6 rounded-lg shadow-lg mb-8 space-y-4">
          {/* Number of Questions */}
          <div>
            <label className="block text-gray-700 font-medium mb-1">Number of Questions:</label>
            <input
              type="number"
              value={numberOfQuestions}
              onChange={e => setNumberOfQuestions(parseInt(e.target.value, 10) || 1)}
              min="1"
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm"
            />
          </div>
          
          {/* Specific Topics Toggle */}
          <div className="flex items-center justify-between">
            <span className="text-lg font-medium">Ask from specific topics:</span>
            <button
              onClick={() => {
                setIsSpecificTopics(!isSpecificTopics);
                // No longer need to reset specific year when toggling topics
                // since they can now be used together
              }}
              className={`px-4 py-2 rounded-full font-semibold transition-colors duration-200
                ${isSpecificTopics ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-gray-200 text-gray-800 hover:bg-gray-300"}`}
            >
              {isSpecificTopics ? "On" : "Off"}
            </button>
          </div>

          {/* Specific Year Toggle - Show always, not conditional on topics */}
          <div className="flex items-center justify-between">
            <span className="text-lg font-medium">Ask from specific year:</span>
            <button
              onClick={() => setIsSpecificYear(!isSpecificYear)}
              className={`px-4 py-2 rounded-full font-semibold transition-colors duration-200
                ${isSpecificYear ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-gray-200 text-gray-800 hover:bg-gray-300"}`}
            >
              {isSpecificYear ? "On" : "Off"}
            </button>
          </div>

          {/* Year Dropdown - Show when specific year is enabled */}
          {isSpecificYear && (
            <div>
              <label className="block text-gray-700 font-medium mb-1">Exam Year:</label>
              <select
                value={selectedYear}
                onChange={e => {
                  setSelectedYear(e.target.value);
                }}
                className="w-full p-2 border border-gray-300 rounded-md shadow-sm"
              >
                <option value="">-- Select a year --</option>
                {examYears.map(year => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Study/Exam Mode Toggle */}
          <div className="flex items-center justify-between">
            <span className="text-lg font-medium">Mode:</span>
            <button
              onClick={() => {
                setMode(mode === "study" ? "exam" : "study");
                setQuestions([]); // Reset questions when mode changes
                setExamSubmitted(false); // Reset exam submission state
                setTimeRemaining(null); // Reset timer
              }}
              className={`px-4 py-2 rounded-full font-semibold transition-colors duration-200
                ${mode === "study" ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-blue-600 text-white hover:bg-blue-700"}`}
            >
              {mode === "study" ? "Study" : "Exam"}
            </button>
          </div>

          {/* Conditional Dropdowns for Topics */}
          {isSpecificTopics && (
            <div className="space-y-4 pt-4">
              <div>
                <label className="block text-gray-700 font-medium mb-1">Select Main Topic:</label>
                <select
                  value={selectedMainTopic}
                  onChange={e => {
                    setSelectedMainTopic(e.target.value);
                    setSelectedSubTopic(""); // Reset subtopic when main topic changes
                  }}
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm"
                >
                  <option value="">-- Select a main topic --</option>
                  {Object.keys(topics).map(topic => (
                    <option key={topic} value={topic}>
                      {topic}
                    </option>
                  ))}
                </select>
              </div>
              
              {selectedMainTopic && topics[selectedMainTopic] && topics[selectedMainTopic].length > 0 && (
                <div>
                  <label className="block text-gray-700 font-medium mb-1">Select Sub-topic (optional):</label>
                  <select
                    value={selectedSubTopic}
                    onChange={e => setSelectedSubTopic(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md shadow-sm"
                  >
                    <option value="">-- All sub-topics --</option>
                    {topics[selectedMainTopic].map(sub => (
                      <option key={sub} value={sub}>
                        {sub}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Show Years Toggle - Fixed condition */}
          <div className="flex items-center justify-between">
            <span className="text-lg font-medium">Show Exam Years:</span>
            <button
              onClick={() => setShowYears(!showYears)}
              className={`px-4 py-2 rounded-full font-semibold transition-colors duration-200
                ${showYears ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-gray-200 text-gray-800 hover:bg-gray-300"}`}
            >
              {showYears ? "On" : "Off"}
            </button>
          </div>

          {/* Timer Input (visible in Exam Mode) */}
          {mode === "exam" && (
            <div>
              <label className="block text-gray-700 font-medium mb-1">Exam Timer (minutes):</label>
              <input
                type="number"
                value={examTimer}
                onChange={e => setExamTimer(e.target.value)}
                min="1"
                className="w-full p-2 border border-gray-300 rounded-md shadow-sm"
              />
            </div>
          )}

          {/* Generate Exam Button */}
          <button
            onClick={handleGenerateExam}
            disabled={loading}
            className="w-full mt-4 bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition-colors duration-200 disabled:opacity-50"

          >
            {loading ? "Generating..." : "Generate Exam"}
          </button>
        </div>

        {/* Display Questions or Exam Summary */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 p-4 rounded-lg text-center mb-8">
            {error}
          </div>
        )}

        {examSubmitted ? (
          <div className="bg-white p-8 rounded-lg shadow-lg">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Exam Finished!</h2>
              {(() => {
                const score = calculateScore();
                const scoreColor = score.hasPassed ? "text-green-600" : "text-red-600";
                const passMessage = score.hasPassed ? "You Passed! 🎉" : "You Did Not Pass. 😔";

                return (
                  <div className="space-y-2">
                    <p className={`text-3xl font-bold ${scoreColor}`}>
                      {passMessage}
                    </p>
                    <p className="text-2xl text-gray-700">
                      Total Score: <span className="font-bold text-purple-600">{score.totalPoints} points</span>
                    </p>
                    <div className="text-lg text-gray-600 space-y-1">
                      <p>✅ Correct: {score.correctCount} (+{score.correctCount * 2} points)</p>
                      <p>❌ Wrong: {score.wrongCount} ({score.wrongCount * -1} points)</p>
                      <p>⏭️ Skipped: {score.skippedCount} (0 points)</p>
                      <p className="font-medium">Total Questions: {score.totalQuestions}</p>
                      <p className="font-medium">Passing Score: {Math.round(score.passingScore)} points ({Math.round(score.passingScore/score.maxPossibleScore * 100)}%)</p>
                    </div>
                  </div>
                );
              })()}
            </div>
            
            {/* Show all questions with answers after exam submission */}
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-gray-800 border-b pb-2">Review Your Answers:</h3>
              {questions.map((q, idx) => (
                <ExamQuestion
                  key={`review-${q._id}-${idx}`}
                  q={q}
                  idx={idx}
                  mode="review" // Special review mode
                  onAnswer={() => {}} // No-op function
                  showYear={showYears}
                  answered={q.answered}
                  examSubmitted={true}
                />
              ))}
            </div>
          </div>
        ) : (
          questions.length > 0 ? (
            <>
              {questions.map((q, idx) => (
                <ExamQuestion
                  key={`${q._id}-${idx}`} // Ensure unique key for re-renders
                  q={q}
                  idx={idx}
                  mode={mode}
                  onAnswer={handleAnswer}
                  showYear={showYears}
                  answered={q.answered}
                  examSubmitted={examSubmitted}
                />
              ))}
              {mode === "exam" && (
                <div className="text-center mt-6">
                  <button
                    onClick={handleFinishExam}
                    className="px-8 py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors duration-200"
                  >
                    Finish Exam
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="bg-white p-8 rounded-lg shadow-lg text-center text-gray-500">
              <p className="text-xl">Generate an exam to get started!</p>
            </div>
          )
        )}
      </div>
    </div>
  );
}
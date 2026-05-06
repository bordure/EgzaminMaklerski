import React, { useState, useEffect, useRef } from "react";
import { fetchTopics, fetchQuestions, fetchExamDates, submitAnswer } from "../api";
import ExamQuestion from "../components/ExamQuestion";
import { useDarkMode } from "../components/DarkModeContext";
import { useAuth } from "../AuthContext";
export default function GenerateExamPage() {
  const { isDarkMode } = useDarkMode();
  const { user } = useAuth();
  const [topics, setTopics] = useState({});
  const [isSpecificTopics, setIsSpecificTopics] = useState(false);
  const [isSpecificYear, setIsSpecificYear] = useState(false);
  const [examYears, setExamYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedDomain, setSelectedDomain] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  const [selectedTopic, setSelectedTopic] = useState("");
  const [mode, setMode] = useState("study");
  const [numberOfQuestions, setNumberOfQuestions] = useState(10);
  const [showYears, setShowYears] = useState(true);
  const [examTimer, setExamTimer] = useState(60);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [examSubmitted, setExamSubmitted] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [showExamOptions, setShowExamOptions] = useState(true);
  const timerIntervalRef = useRef(null);
  const resultsRef = useRef(null);
  useEffect(() => {
    const loadData = async () => {
      try {
        const [topicsData, examDatesData] = await Promise.all([
          fetchTopics(),
          fetchExamDates(),
        ]);
        setTopics(topicsData);
        setExamYears(
          Array.isArray(examDatesData?.exam_dates)
            ? examDatesData.exam_dates
            : []
        );
      } catch {
        setError("Nie udało się pobrać tematów lub dat egzaminów.");
      }
    };
    loadData();
  }, []);
  useEffect(() => {
    if (
      mode === "exam" &&
      !examSubmitted &&
      questions.length > 0 &&
      !timerIntervalRef.current
    ) {
      const totalSeconds =
        (examTimer === "" ? 60 : parseInt(examTimer, 10)) * 60;
      setTimeRemaining(totalSeconds);
      timerIntervalRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            setExamSubmitted(true);
            clearInterval(timerIntervalRef.current);
            timerIntervalRef.current = null;
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [mode, examSubmitted, examTimer, questions.length]);
  useEffect(() => {
    if (examSubmitted && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [examSubmitted]);
  const handleNumberChange = (e) => {
    const value = e.target.value;
    setNumberOfQuestions(value === "" ? "" : Math.max(1, parseInt(value, 10)));
  };
  const handleTimerChange = (e) => {
    const value = e.target.value;
    setExamTimer(value === "" ? "" : Math.max(1, parseInt(value, 10)));
  };
  const handleGenerateExam = async () => {
    setLoading(true);
    setError(null);
    setExamSubmitted(false);
    setCurrentQuestionIndex(0);
    setShowExamOptions(false);
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    setTimeRemaining(null);
    try {
      const questionsCount =
        numberOfQuestions === "" ? 1 : parseInt(numberOfQuestions, 10);
      const queryOptions = { n: questionsCount, random_questions: true };
      if (isSpecificTopics) {
        if (selectedDomain) queryOptions.domain = selectedDomain;
        if (selectedSection) queryOptions.section = selectedSection;
        if (selectedTopic) queryOptions.topic = selectedTopic;
      }
      if (isSpecificYear && selectedYear) {
        queryOptions.exam_date = selectedYear;
      }
      const res = await fetchQuestions(queryOptions);
      if (!res?.questions || !Array.isArray(res.questions)) {
        throw new Error("No questions received from API");
      }
      setQuestions(
        res.questions.map((q) => ({
          ...q,
          options: [q.option_A, q.option_B, q.option_C, q.option_D],
          correct_answer: q.correct_answer,
          answered: { isCorrect: null, chosenOption: null },
        }))
      );
    } catch {
      setError("Nie udało się wygenerować egzaminu. Spróbuj ponownie.");
    } finally {
      setLoading(false);
    }
  };
  const handleAnswer = (questionId, isCorrect, chosenOption, meta) => {
    if (!examSubmitted) {
      setQuestions((prev) =>
        prev.map((q) =>
          q._id === questionId
            ? { ...q, answered: { isCorrect, chosenOption } }
            : q
        )
      );
      if (!user?.guest && meta) {
        submitAnswer({
          question_id: questionId,
          is_correct: isCorrect,
          domain: meta.domain ?? null,
          section: meta.section ?? null,
          topic: meta.topic ?? null,
        }).catch(() => {});
      }
    }
  };
  const handleFinishExam = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    setExamSubmitted(true);
    setCurrentQuestionIndex(0);
  };
  const handleEndSession = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    setQuestions([]);
    setExamSubmitted(false);
    setTimeRemaining(null);
    setShowExamOptions(true);
    setCurrentQuestionIndex(0);
  };
  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    }
  };
  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    }
  };
  const calculateScore = () => {
    let totalPoints = 0,
      correctCount = 0,
      wrongCount = 0,
      skippedCount = 0;
    questions.forEach((q) => {
      if (q.answered.chosenOption === null) skippedCount++;
      else if (q.answered.isCorrect) {
        totalPoints += 2;
        correctCount++;
      } else {
        totalPoints -= 1;
        wrongCount++;
      }
    });
    const maxPossibleScore = questions.length * 2;
    const passingScore = 0.67 * maxPossibleScore;
    return {
      totalPoints,
      correctCount,
      wrongCount,
      skippedCount,
      totalQuestions: questions.length,
      maxPossibleScore,
      passingScore,
      hasPassed: totalPoints >= passingScore,
    };
  };
  const formatTime = (seconds) => {
    if (seconds === null) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };
  const answeredCount = questions.filter(
    (q) => q.answered.chosenOption !== null
  ).length;
  const currentQuestion = questions[currentQuestionIndex];
  let score = null;
  let scoreColor = "";
  let passMessage = "";
  if (mode === "exam" && examSubmitted && questions.length > 0) {
    score = calculateScore();
    scoreColor = score.hasPassed
      ? "text-green-600 dark:text-green-400"
      : "text-red-600 dark:text-red-400";
    passMessage = score.hasPassed ? "Zdałeś! 🎉" : "Nie zdałeś. 😔";
  }
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-8">
      {}
      {mode === "exam" &&
        questions.length > 0 &&
        !examSubmitted &&
        timeRemaining !== null && (
          <div className="fixed top-0 left-0 right-0 bg-red-600 text-white py-3 px-6 shadow-lg z-50">
            <div className="max-w-4xl mx-auto flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <span className="text-lg font-semibold">Egzamin w toku</span>
              </div>
              <div className="text-xl font-bold">
                ⏰ Pozostały czas: {formatTime(timeRemaining)}
              </div>
            </div>
          </div>
        )}
      <div
        className={`max-w-4xl mx-auto ${
          mode === "exam" &&
          questions.length > 0 &&
          !examSubmitted &&
          timeRemaining !== null
            ? "mt-16"
            : ""
        }`}
      >
        <h1 className="text-3xl font-bold mb-6 border-b pb-4">Generuj egzamin</h1>
        {}
        {showExamOptions && (
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg mb-8 space-y-4">
            {}
            <div>
              <label className="block mb-1 font-medium text-gray-700 dark:text-gray-200">
                Liczba pytań:
              </label>
              <input
                type="number"
                value={numberOfQuestions}
                onChange={handleNumberChange}
                onBlur={() => {
                  if (numberOfQuestions === "" || numberOfQuestions < 1)
                    setNumberOfQuestions(1);
                }}
                min="1"
                className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
              />
            </div>
            {}
            <div className="flex items-center justify-between">
              <span className="font-medium">Pytaj z określonych tematów:</span>
              <button
                onClick={() => setIsSpecificTopics(!isSpecificTopics)}
                className={`px-4 py-2 rounded-full font-semibold transition-colors duration-200 ${
                  isSpecificTopics
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-600"
                }`}
              >
                {isSpecificTopics ? "Wł." : "Wył."}
              </button>
            </div>
            {isSpecificTopics && (
              <div className="space-y-4 pt-4">
                <div>
                  <label className="block mb-1 font-medium text-gray-700 dark:text-gray-200">
                    Wybierz dziedzinę:
                  </label>
                  <select
                    value={selectedDomain}
                    onChange={(e) => {
                      setSelectedDomain(e.target.value);
                      setSelectedSection("");
                      setSelectedTopic("");
                    }}
                    className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                  >
                    <option value="">-- Wybierz dziedzinę --</option>
                    {Object.keys(topics).map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
                {selectedDomain && topics[selectedDomain] && (
                  <div>
                    <label className="block mb-1 font-medium text-gray-700 dark:text-gray-200">
                      Wybierz dział (opcjonalnie):
                    </label>
                    <select
                      value={selectedSection}
                      onChange={(e) => {
                        setSelectedSection(e.target.value);
                        setSelectedTopic("");
                      }}
                      className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                    >
                      <option value="">-- Wszystkie działy --</option>
                      {Object.keys(topics[selectedDomain]).map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                {selectedSection && topics[selectedDomain]?.[selectedSection]?.length > 0 && (
                  <div>
                    <label className="block mb-1 font-medium text-gray-700 dark:text-gray-200">
                      Wybierz temat (opcjonalnie):
                    </label>
                    <select
                      value={selectedTopic}
                      onChange={(e) => setSelectedTopic(e.target.value)}
                      className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                    >
                      <option value="">-- Wszystkie tematy --</option>
                      {topics[selectedDomain][selectedSection].map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}
            {}
            <div className="flex items-center justify-between">
              <span className="font-medium">Pytaj z określonego roku:</span>
              <button
                onClick={() => setIsSpecificYear(!isSpecificYear)}
                className={`px-4 py-2 rounded-full font-semibold transition-colors duration-200 ${
                  isSpecificYear
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-600"
                }`}
              >
                {isSpecificYear ? "Wł." : "Wył."}
              </button>
            </div>
            {isSpecificYear && (
              <div>
                <label className="block mb-1 font-medium text-gray-700 dark:text-gray-200">
                  Rok egzaminu:
                </label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                >
                  <option value="">-- Wybierz rok --</option>
                  {examYears.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {}
            <div className="flex items-center justify-between">
              <span className="font-medium">Tryb:</span>
              <button
                onClick={() => {
                  setMode(mode === "study" ? "exam" : "study");
                  setQuestions([]);
                  setExamSubmitted(false);
                  setTimeRemaining(null);
                  setCurrentQuestionIndex(0);
                }}
                className="px-4 py-2 rounded-full font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors duration-200"
              >
                {mode === "study" ? "Nauka" : "Egzamin"}
              </button>
            </div>
            {mode === "exam" && (
              <div>
                <label className="block mb-1 font-medium text-gray-700 dark:text-gray-200">
                  Czas trwania egzaminu (minuty):
                </label>
                <input
                  type="number"
                  value={examTimer}
                  onChange={(e) => {
                    const value = e.target.value;
                    setExamTimer(value === "" ? "" : Math.max(1, parseInt(value, 10)));
                  }}
                  onBlur={() => {
                    if (examTimer === "" || examTimer < 1) setExamTimer(60);
                  }}
                  min="1"
                  className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                />
              </div>
            )}
            {}
            <div className="flex items-center justify-between">
              <span className="font-medium">Pokaż lata egzaminów:</span>
              <button
                onClick={() => setShowYears(!showYears)}
                className={`px-4 py-2 rounded-full font-semibold transition-colors duration-200 ${
                  showYears
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-600"
                }`}
              >
                {showYears ? "Wł." : "Wył."}
              </button>
            </div>
            {}
            <button
              onClick={handleGenerateExam}
              disabled={
                loading ||
                (mode === "exam" && !examSubmitted && timeRemaining !== null)
              }
              className="w-full mt-4 bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition-colors duration-200 disabled:opacity-50"
            >
              {loading
                ? "Generowanie..."
                : mode === "exam" && !examSubmitted && timeRemaining !== null
                ? "Egzamin w toku"
                : "Generuj egzamin"}
            </button>
          </div>
        )}
        {}
        {error && (
          <div className="bg-red-100 dark:bg-red-800 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-200 p-4 rounded-lg text-center mb-8">
            {error}
          </div>
        )}
        {}
        {}
{mode === "exam" && examSubmitted ? (
  <div ref={resultsRef} className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg">
    <div className="text-center mb-8">
      <h2 className="text-2xl font-bold mb-4">Egzamin zakończony!</h2>
      {}
      {questions.length > 0 && (
        (() => {
          const score = calculateScore();
          const scoreColor = score.hasPassed
            ? "text-green-600 dark:text-green-400"
            : "text-red-600 dark:text-red-400";
          const passMessage = score.hasPassed ? "Zdałeś! 🎉" : "Nie zdałeś. 😔";
          return (
            <div className="space-y-4">
              <p className={`text-3xl font-bold ${scoreColor}`}>{passMessage}</p>
              <p className="text-2xl text-gray-700 dark:text-gray-300">
                Łączny wynik:{" "}
                <span className="font-bold text-purple-600 dark:text-purple-400">
                  {score.totalPoints} punktów
                </span>
              </p>
              <div className="text-lg text-gray-600 dark:text-gray-400 space-y-1">
                <p>✅ Poprawnych: {score.correctCount} (+{score.correctCount * 2} punktów)</p>
                <p>❌ Błędnych: {score.wrongCount} ({score.wrongCount * -1} punktów)</p>
                <p>⏭️ Pominiętych: {score.skippedCount} (0 punktów)</p>
                <p className="font-medium">Łączna liczba pytań: {score.totalQuestions}</p>
                <p className="font-medium">
                  Próg zaliczenia: {Math.round(score.passingScore)} punktów (
                  {Math.round((score.passingScore / score.maxPossibleScore) * 100)}%)
                </p>
              </div>
              <button
                onClick={handleEndSession}
                className="mt-4 px-6 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors duration-200"
              >
                Powrót do generowania egzaminu
              </button>
            </div>
          );
        })()
      )}
      {}
      {questions.length > 0 && (
        <div className="mt-8">
          <h3 className="text-xl font-semibold border-b pb-2 mb-4">Przejrzyj odpowiedzi</h3>
          {currentQuestion && (
            <ExamQuestion
              key={`review-${currentQuestion._id}-${currentQuestionIndex}`}
              q={currentQuestion}
              idx={currentQuestionIndex}
              mode="review"
              onAnswer={() => {}}
              showYear={showYears}
              answered={currentQuestion.answered}
              examSubmitted={true}
            />
          )}
          <div className="flex justify-between mt-6">
            <button
              onClick={handlePrevious}
              disabled={currentQuestionIndex === 0}
              className="px-6 py-3 bg-gray-600 dark:bg-gray-700 text-white font-bold rounded-lg hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ← Poprzednie
            </button>
            <span className="font-medium text-gray-700 dark:text-gray-200">
              Pytanie {currentQuestionIndex + 1} z {questions.length}
            </span>
            <button
              onClick={handleNext}
              disabled={currentQuestionIndex === questions.length - 1}
              className="px-6 py-3 bg-gray-600 dark:bg-gray-700 text-white font-bold rounded-lg hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Następne →
            </button>
          </div>
        </div>
      )}
    </div>
  </div>
) : questions.length > 0 ? (
  <>
    <div className="mb-4 text-center">
      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
        Pytanie {currentQuestionIndex + 1} z {questions.length}
      </div>
    </div>
    {currentQuestion && (
      <ExamQuestion
        key={`${currentQuestion._id}-${currentQuestionIndex}`}
        q={currentQuestion}
        idx={currentQuestionIndex}
        mode={mode}
        onAnswer={handleAnswer}
        showYear={showYears}
        answered={currentQuestion.answered}
        examSubmitted={examSubmitted}
      />
    )}
    <div className="flex justify-between items-center mt-6">
      <button
        onClick={handlePrevious}
        disabled={currentQuestionIndex === 0}
        className="px-6 py-3 bg-gray-600 dark:bg-gray-700 text-white font-bold rounded-lg hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        ← Poprzednie
      </button>
      {mode === "exam" ? (
        <button
          onClick={handleFinishExam}
          className="px-8 py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors duration-200"
        >
          Zakończ egzamin
        </button>
      ) : (
        <button
          onClick={handleEndSession}
          className="px-8 py-3 bg-yellow-500 text-white font-bold rounded-lg hover:bg-yellow-600 transition-colors duration-200"
        >
          Zakończ naukę
        </button>
      )}
      <button
        onClick={handleNext}
        disabled={currentQuestionIndex === questions.length - 1}
        className="px-6 py-3 bg-gray-600 dark:bg-gray-700 text-white font-bold rounded-lg hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Następne →
      </button>
    </div>
  </>
) : (
  <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg text-center text-gray-700 dark:text-gray-200">
    Brak załadowanego egzaminu. Wygeneruj powyżej.
  </div>
)}
      </div>
    </div>
  );
}
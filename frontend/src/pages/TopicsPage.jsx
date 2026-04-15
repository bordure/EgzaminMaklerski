import React, { useState, useEffect, useRef } from "react";
import { fetchTopics, fetchQuestions, fetchQuestionsCount, fetchSubtopicCounts } from "../api";
import ExamQuestion from "../components/ExamQuestion";
import { useDarkMode } from "../components/DarkModeContext";

export default function TopicsPage() {
  const { isDarkMode } = useDarkMode();
  const [topics, setTopics] = useState({});
  const [selected, setSelected] = useState({ domain: "", section: "", topic: "" });
  const [questions, setQuestions] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [loading, setLoading] = useState(false);
  
  const questionsPerPage = 5;
  const questionsRef = useRef(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [topicsResponse, countsResponse] = await Promise.all([
          fetchTopics(),
          fetchSubtopicCounts()
        ]);
        
        const countsObject = {};
        countsResponse.subtopic_counts.forEach(item => {
          countsObject[item._id] = item.count;
        });

        const updatedTopics = {};
        Object.entries(topicsResponse).forEach(([domain, sections]) => {
          updatedTopics[domain] = {};
          Object.entries(sections).forEach(([section, topicNames]) => {
            updatedTopics[domain][section] = topicNames.map((name) => ({
              name,
              count: countsObject[name] || 0,
            }));
          });
        });

        setTopics(updatedTopics);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };
    
    loadData();
  }, []);

  const scrollToQuestions = () => {
    if (questionsRef.current) {
      const yOffset = -20; // Small offset from top
      const element = questionsRef.current;
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  const loadQuestions = async (domain, section, topic, page = 1, shouldScroll = true) => {
    setLoading(true);
    setSelected({ domain, section, topic });
    setCurrentPage(page);
    
    try {
      const skip = (page - 1) * questionsPerPage;
      const [questionsResponse, countResponse] = await Promise.all([
        fetchQuestions({ domain, section, topic, n: questionsPerPage, skip, random: false }),
        fetchQuestionsCount({ domain, section, topic })
      ]);
      
      setTotalQuestions(countResponse.total);
      
      const transformedQuestions = questionsResponse.questions.map(q => ({
        ...q,
        options: [q.option_A, q.option_B, q.option_C, q.option_D],
        correct_answer: q.correct_answer
      }));
      
      setQuestions(transformedQuestions);
      
      if (shouldScroll) {
        setTimeout(() => {
          scrollToQuestions();
        }, 100);
      }
    } catch (error) {
      console.error("Error fetching questions:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages && !loading) {
      loadQuestions(selected.domain, selected.section, selected.topic, newPage, true);
    }
  };

  const totalPages = Math.ceil(totalQuestions / questionsPerPage);

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const pages = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    const buttonClass = (active) =>
      `px-3 py-2 mx-1 rounded-md transition-colors duration-200 ${
        active
          ? "bg-blue-600 text-white"
          : `bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 border border-blue-300 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-gray-700`
      }`;

    const disabledClass = "bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed";

    pages.push(
      <button
        key="prev"
        onClick={() => handlePageChange(currentPage - 1)}
        disabled={currentPage === 1 || loading}
        className={currentPage === 1 || loading ? disabledClass : buttonClass(false)}
      >
        ← Poprzednia
      </button>
    );

    if (startPage > 1) {
      pages.push(
        <button key={1} onClick={() => handlePageChange(1)} disabled={loading} className={buttonClass(false)}>1</button>
      );
      if (startPage > 2) pages.push(<span key="start-ellipsis" className="px-2 py-2 text-gray-400 dark:text-gray-500">...</span>);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <button key={i} onClick={() => handlePageChange(i)} disabled={loading} className={buttonClass(i === currentPage)}>
          {i}
        </button>
      );
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) pages.push(<span key="end-ellipsis" className="px-2 py-2 text-gray-400 dark:text-gray-500">...</span>);
      pages.push(
        <button key={totalPages} onClick={() => handlePageChange(totalPages)} disabled={loading} className={buttonClass(false)}>
          {totalPages}
        </button>
      );
    }

    pages.push(
      <button
        key="next"
        onClick={() => handlePageChange(currentPage + 1)}
        disabled={currentPage === totalPages || loading}
        className={currentPage === totalPages || loading ? disabledClass : buttonClass(false)}
      >
        Następna →
      </button>
    );

    return pages;
  };

  return (
    <div className={`min-h-screen p-8 ${isDarkMode ? "bg-gray-900 text-gray-100" : "bg-gray-50 text-gray-900"}`}>
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 border-b pb-4">Przeglądaj według tematu</h1>
        <div className="flex flex-col md:flex-row gap-8">
          {/* Topics Sidebar */}
          <div className={`w-full md:w-1/3 p-6 rounded-lg shadow-lg ${isDarkMode ? "bg-gray-800" : "bg-white"}`}>
            {Object.entries(topics).map(([domain, sections]) => (
              <div key={domain} className="mb-6 last:mb-0">
                <h2
                  className={`font-semibold text-lg border-b pb-2 mb-2 cursor-pointer transition-colors ${
                    isDarkMode ? "text-gray-100 hover:text-blue-400" : "text-gray-800 hover:text-blue-600"
                  }`}
                  onClick={() => loadQuestions(domain, null, null)}
                >
                  {domain}
                </h2>
                {Object.entries(sections).map(([section, topicList]) => (
                  <div key={section} className="mb-4">
                    <h3
                      className={`font-medium text-sm uppercase tracking-wide pl-1 mb-1 cursor-pointer transition-colors ${
                        isDarkMode ? "text-gray-400 hover:text-blue-400" : "text-gray-500 hover:text-blue-600"
                      }`}
                      onClick={() => loadQuestions(domain, section, null)}
                    >
                      {section}
                    </h3>
                    <ul className="pl-2 space-y-1">
                      {topicList.map((t) => (
                        <li
                          key={t.name}
                          className={`p-2 rounded-md cursor-pointer transition-colors duration-200 text-sm ${
                            selected.topic === t.name
                              ? isDarkMode
                                ? "bg-blue-900 text-blue-300 font-medium"
                                : "bg-blue-100 text-blue-700 font-medium"
                              : isDarkMode
                              ? "hover:bg-gray-700"
                              : "hover:bg-gray-100"
                          }`}
                          onClick={() => loadQuestions(domain, section, t.name)}
                        >
                          {t.name} ({t.count})
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ))}
          </div>
          
          {/* Questions Section */}
          <div className="flex-1" ref={questionsRef}>
            {loading ? (
              <div className={`p-8 rounded-lg shadow-lg text-center ${isDarkMode ? "bg-gray-800" : "bg-white"}`}>
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className={`${isDarkMode ? "text-gray-300" : "text-gray-500"} mt-4`}>Ładowanie pytań...</p>
              </div>
            ) : questions.length > 0 ? (
              <>
                <div className={`p-4 rounded-lg shadow-lg mb-6 ${isDarkMode ? "bg-gray-800" : "bg-white"}`}>
                  <div className="flex justify-between items-center">
                    <h2 className={`${isDarkMode ? "text-gray-100" : "text-gray-800"} text-xl font-semibold`}>
                      {selected.topic
                        ? `${selected.domain} > ${selected.section} > ${selected.topic}`
                        : selected.section
                        ? `${selected.domain} > ${selected.section}`
                        : selected.domain}
                    </h2>
                    <span className={`${isDarkMode ? "text-gray-400" : "text-gray-500"} text-sm`}>
                      Pytania {((currentPage - 1) * questionsPerPage) + 1}–{Math.min(currentPage * questionsPerPage, totalQuestions)} z {totalQuestions}
                    </span>
                  </div>
                </div>

                {questions.map((q, idx) => (
                  <ExamQuestion 
                    key={q._id} 
                    q={q} 
                    idx={(currentPage - 1) * questionsPerPage + idx} 
                    mode="study" 
                    onAnswer={() => {}} 
                    showYear={true} 
                    answered={{ isCorrect: true, chosenOption: "" }}
                  />
                ))}

                {totalPages > 1 && (
                  <div className={`p-6 rounded-lg shadow-lg mt-6 ${isDarkMode ? "bg-gray-800" : "bg-white"}`}>
                    <div className="flex justify-center items-center flex-wrap">
                      {renderPagination()}
                    </div>
                    <div className={`${isDarkMode ? "text-gray-400" : "text-gray-500"} text-center text-sm mt-4`}>
                      Strona {currentPage} z {totalPages} ({totalQuestions} pytań łącznie)
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className={`p-8 rounded-lg shadow-lg text-center ${isDarkMode ? "bg-gray-800 text-gray-300" : "bg-white text-gray-500"}`}>
                <p className="text-xl">Wybierz podtemat lub główny temat, aby wyświetlić pytania.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
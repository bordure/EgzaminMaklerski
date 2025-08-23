import React, { useState, useEffect } from "react";
import { fetchTopics, fetchQuestions, fetchQuestionsCount, fetchSubtopicCounts } from "../api";
import ExamQuestion from "../components/ExamQuestion";

export default function TopicsPage() {
  const [topics, setTopics] = useState({});
  const [selected, setSelected] = useState({ main: "", sub: "" });
  const [questions, setQuestions] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [loading, setLoading] = useState(false);
  
  const questionsPerPage = 10;

  // Use a single useEffect hook to fetch all necessary data
  useEffect(() => {
    const loadData = async () => {
      try {
        const [topicsResponse, countsResponse] = await Promise.all([
          fetchTopics(),
          fetchSubtopicCounts()
        ]);
        
        // Create a lookup object for counts for O(1) access
        const countsObject = {};
        countsResponse.subtopic_counts.forEach(item => {
          countsObject[item._id] = item.count;
        });

        // Merge the topic names with their corresponding counts
        const updatedTopics = {};
        Object.entries(topicsResponse).forEach(([mainTopic, subs]) => {
          updatedTopics[mainTopic] = subs.map(subName => ({
            name: subName,
            count: countsObject[subName] || 0 // Default to 0 if count is missing
          }));
        });

        setTopics(updatedTopics);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };
    
    loadData();
  }, []); // Empty dependency array ensures this runs only once on mount

  const loadQuestions = async (main, sub, page = 1) => {
    setLoading(true);
    setSelected({ main, sub });
    setCurrentPage(page);
    
    try {
      const skip = (page - 1) * questionsPerPage;
      
      // Fetch questions and total count in parallel using the new API structure
      const [questionsResponse, countResponse] = await Promise.all([
        fetchQuestions({ 
          main_topic: main, 
          sub_topic: sub, 
          n: questionsPerPage, 
          skip, 
          random: false 
        }),
        fetchQuestionsCount({ main_topic: main, sub_topic: sub })
      ]);
      
      setTotalQuestions(countResponse.total);
      
      const transformedQuestions = questionsResponse.questions.map(q => {
        return {
          ...q,
          options: [q.option_A, q.option_B, q.option_C, q.option_D],
          correct_answer: q.correct_answer
        };
      });
      
      setQuestions(transformedQuestions);
    } catch (error) {
      console.error("Error fetching questions:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages && !loading) {
      loadQuestions(selected.main, selected.sub, newPage);
      // Scroll to top of questions section
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const totalPages = Math.ceil(totalQuestions / questionsPerPage);

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const pages = [];
    const maxVisiblePages = 5;
    
    // Calculate start and end page numbers
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    // Adjust start page if we're near the end
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    // Previous button
    pages.push(
      <button
        key="prev"
        onClick={() => handlePageChange(currentPage - 1)}
        disabled={currentPage === 1 || loading}
        className={`px-3 py-2 mx-1 rounded-md ${
          currentPage === 1 || loading
            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
            : 'bg-white text-blue-600 border border-blue-300 hover:bg-blue-50'
        }`}
      >
        ← Previous
      </button>
    );

    // First page and ellipsis if needed
    if (startPage > 1) {
      pages.push(
        <button
          key={1}
          onClick={() => handlePageChange(1)}
          disabled={loading}
          className="px-3 py-2 mx-1 rounded-md bg-white text-blue-600 border border-blue-300 hover:bg-blue-50"
        >
          1
        </button>
      );
      if (startPage > 2) {
        pages.push(<span key="start-ellipsis" className="px-2 py-2 text-gray-400">...</span>);
      }
    }

    // Page numbers
    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <button
          key={i}
          onClick={() => handlePageChange(i)}
          disabled={loading}
          className={`px-3 py-2 mx-1 rounded-md ${
            i === currentPage
              ? 'bg-blue-600 text-white'
              : 'bg-white text-blue-600 border border-blue-300 hover:bg-blue-50'
          }`}
        >
          {i}
        </button>
      );
    }

    // Last page and ellipsis if needed
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        pages.push(<span key="end-ellipsis" className="px-2 py-2 text-gray-400">...</span>);
      }
      pages.push(
        <button
          key={totalPages}
          onClick={() => handlePageChange(totalPages)}
          disabled={loading}
          className="px-3 py-2 mx-1 rounded-md bg-white text-blue-600 border border-blue-300 hover:bg-blue-50"
        >
          {totalPages}
        </button>
      );
    }

    // Next button
    pages.push(
      <button
        key="next"
        onClick={() => handlePageChange(currentPage + 1)}
        disabled={currentPage === totalPages || loading}
        className={`px-3 py-2 mx-1 rounded-md ${
          currentPage === totalPages || loading
            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
            : 'bg-white text-blue-600 border border-blue-300 hover:bg-blue-50'
        }`}
      >
        Next →
      </button>
    );

    return pages;
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-gray-800 border-b pb-4">
          Browse by Topic
        </h1>
        <div className="flex flex-col md:flex-row gap-8">
          {/* Topics Sidebar */}
          <div className="w-full md:w-1/3 bg-white p-6 rounded-lg shadow-lg">
            {Object.entries(topics).map(([main, subs]) => (
              <div key={main} className="mb-6 last:mb-0">
                <h2
                  className="font-semibold text-lg text-gray-800 border-b pb-2 mb-2 cursor-pointer hover:text-blue-600 transition-colors"
                  onClick={() => loadQuestions(main, null)}
                >
                  {main}
                </h2>
                <ul className="pl-2 space-y-2">
                  {subs.map(s => (
                    <li
                      key={s.name}
                      className={`p-2 rounded-md cursor-pointer transition-colors duration-200 
                        ${selected.sub === s.name ? "bg-blue-100 text-blue-700 font-medium" : "hover:bg-gray-100"}`}
                      onClick={() => loadQuestions(main, s.name)}
                    >
                      {s.name} ({s.count})
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          
          {/* Questions Section */}
          <div className="flex-1">
            {loading ? (
              <div className="bg-white p-8 rounded-lg shadow-lg text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-500 mt-4">Loading questions...</p>
              </div>
            ) : questions.length > 0 ? (
              <>
                {/* Questions Header */}
                <div className="bg-white p-4 rounded-lg shadow-lg mb-6">
                  <div className="flex justify-between items-center">
                    <h2 className="text-xl font-semibold text-gray-800">
                      {selected.sub ? `${selected.main} - ${selected.sub}` : selected.main}
                    </h2>
                    <span className="text-sm text-gray-500">
                      Showing {((currentPage - 1) * questionsPerPage) + 1}-{Math.min(currentPage * questionsPerPage, totalQuestions)} of {totalQuestions} questions
                    </span>
                  </div>
                </div>

                {/* Questions List */}
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

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="bg-white p-6 rounded-lg shadow-lg mt-6">
                    <div className="flex justify-center items-center flex-wrap">
                      {renderPagination()}
                    </div>
                    <div className="text-center text-sm text-gray-500 mt-4">
                      Page {currentPage} of {totalPages} ({totalQuestions} total questions)
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-white p-8 rounded-lg shadow-lg text-center text-gray-500">
                <p className="text-xl">Select a sub-topic or a main topic to view questions.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
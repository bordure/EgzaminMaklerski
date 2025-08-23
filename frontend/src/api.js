import axios from "axios";
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export const fetchTopics = () =>
  axios.get(`${API_URL}/topics`).then(r=>r.data);

// Unified questions endpoint - handles all question fetching scenarios
export const fetchQuestions = (options = {}) => {
  const { 
    main_topic = null, 
    sub_topic = null, 
    exam_date = null, 
    n = 10, 
    skip = 0, 
    random = false 
  } = options;
  
  const params = { n, skip, random };
  if (main_topic) params.main_topic = main_topic;
  if (sub_topic) params.sub_topic = sub_topic;
  if (exam_date) params.exam_date = exam_date;
  
  console.log("API Request params:", params); // Debug log
  
  return axios.get(`${API_URL}/questions`, { params })
    .then(r => {
      console.log("API Response:", r.data); // Debug log
      return r.data;
    })
    .catch(error => {
      console.error("API Error:", error);
      throw error;
    });
};

// Get total count of questions for given filters
export const fetchQuestionsCount = (options = {}) => {
  const { main_topic = null, sub_topic = null, exam_date = null } = options;
  
  const params = {};
  if (main_topic) params.main_topic = main_topic;
  if (sub_topic) params.sub_topic = sub_topic;
  if (exam_date) params.exam_date = exam_date;
  
  return axios.get(`${API_URL}/questions/count`, { params }).then(r => r.data);
};

// Convenience functions for common use cases
export const fetchExam = (n = 5, exam_date = null) =>
  fetchQuestions({ n, exam_date, random: true });

export const fetchQuestionsByTopic = (main_topic, sub_topic = null, n = 10, skip = 0) =>
  fetchQuestions({ main_topic, sub_topic, n, skip, random: false });

export const fetchQuestionsByDate = (exam_date, n = 10, skip = 0) =>
  fetchQuestions({ exam_date, n, skip, random: false });

export const fetchExamDates = () =>
  axios.get(`${API_URL}/exam_dates`).then(r=>r.data);

export const fetchSubtopicCounts = () =>
  axios.get(`${API_URL}/subtopic_counts`).then(r=>r.data);
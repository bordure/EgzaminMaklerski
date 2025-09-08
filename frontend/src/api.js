import axios from "axios";

const API_URL = window.RUNTIME_CONFIG?.VITE_API_URL || "http://localhost:8000";
console.log("API_URL:", API_URL);


// Create axios instance with interceptors
const api = axios.create({
  baseURL: API_URL,
});

// Token management
let authToken = null;

export const setAuthToken = (token) => {
  authToken = token;
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
};

export const getAuthToken = () => authToken;

export const clearAuthToken = () => {
  authToken = null;
  delete api.defaults.headers.common['Authorization'];
};

// Response interceptor to handle 401 errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearAuthToken();
      // Dispatch custom event for auth state change
      window.dispatchEvent(new CustomEvent('auth-expired'));
    }
    return Promise.reject(error);
  }
);

// Auth API calls
export const getGoogleAuthUrl = () =>
  api.get('/auth/google/url').then(r => r.data);

export const exchangeCodeForToken = (code) =>
  api.post('/auth/google/callback', { code }).then(r => r.data);

export const getCurrentUser = () =>
  api.get('/auth/me').then(r => r.data);

export const logout = () =>
  api.post('/auth/logout').then(r => r.data);

// Protected API calls (now require authentication)
export const fetchTopics = () =>
  api.get('/topics').then(r => r.data);

export const fetchQuestions = (options = {}) => {
  const { 
    main_topic = null, 
    sub_topic = null, 
    exam_date = null, 
    n = 10, 
    skip = 0, 
    random_questions = false 
  } = options;

  const params = { n, skip, random_questions };
  if (main_topic) params.main_topic = main_topic;
  if (sub_topic) params.sub_topic = sub_topic;
  if (exam_date) params.exam_date = exam_date;
  
  console.log("API Request params:", params);
  
  return api.get('/questions', { params })
    .then(r => {
      console.log("API Response:", r.data);
      return r.data;
    })
    .catch(error => {
      console.error("API Error:", error);
      throw error;
    });
};

export const fetchQuestionsCount = (options = {}) => {
  const { main_topic = null, sub_topic = null, exam_date = null } = options;
  
  const params = {};
  if (main_topic) params.main_topic = main_topic;
  if (sub_topic) params.sub_topic = sub_topic;
  if (exam_date) params.exam_date = exam_date;
  
  return api.get('/questions/count', { params }).then(r => r.data);
};

export const fetchExamDates = () =>
  api.get('/exam_dates').then(r => r.data);

export const fetchSubtopicCounts = () =>
  api.get('/subtopic_counts').then(r => r.data);

// Convenience functions for common use cases
export const fetchExam = (n = 5, exam_date = null) =>
  fetchQuestions({ n, exam_date, random_questions: true });

export const fetchQuestionsByTopic = (main_topic, sub_topic = null, n = 10, skip = 0) =>
  fetchQuestions({ main_topic, sub_topic, n, skip, random_questions: false });

export const fetchQuestionsByDate = (exam_date, n = 10, skip = 0) =>
  fetchQuestions({ exam_date, n, skip, random_questions: false });
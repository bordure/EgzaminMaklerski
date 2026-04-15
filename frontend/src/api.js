import axios from "axios";

const API_URL = window.RUNTIME_CONFIG?.VITE_API_URL ?? "http://localhost:8000";

const api = axios.create({
  baseURL: API_URL,
});

let authToken = null;
let refreshToken = null;
let isRefreshing = false;
let refreshSubscribers = [];

const onRefreshed = (token) => {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
};

const addRefreshSubscriber = (cb) => {
  refreshSubscribers.push(cb);
};

export const setAuthToken = (token) => {
  authToken = token;
  if (token) {
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common["Authorization"];
  }
};

export const getAuthToken = () => authToken;

export const clearAuthToken = () => {
  authToken = null;
  delete api.defaults.headers.common["Authorization"];
};

export const setRefreshToken = (token) => {
  refreshToken = token;
  if (token) localStorage.setItem("refresh_token", token);
};

export const getRefreshToken = () => refreshToken || localStorage.getItem("refresh_token");

export const clearRefreshToken = () => {
  refreshToken = null;
  localStorage.removeItem("refresh_token");
};

const refreshAccessToken = async () => {
  const refresh = getRefreshToken();
  if (!refresh) throw new Error("No refresh token available");

  const response = await axios.post(`${API_URL}/auth/refresh`, {}, {
    headers: { Authorization: `Bearer ${refresh}` },
  });

  const { access_token, refresh_token } = response.data;

  localStorage.setItem("auth_token", access_token);
  if (refresh_token) setRefreshToken(refresh_token);

  setAuthToken(access_token);
  return access_token;
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve) => {
          addRefreshSubscriber((token) => {
            originalRequest.headers["Authorization"] = `Bearer ${token}`;
            resolve(api(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const newToken = await refreshAccessToken();
        isRefreshing = false;
        onRefreshed(newToken);
        originalRequest.headers["Authorization"] = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        isRefreshing = false;
        clearAuthToken();
        clearRefreshToken();
        window.dispatchEvent(new CustomEvent("auth-expired"));
      }
    }

    return Promise.reject(error);
  }
);

export const getGoogleAuthUrl = () =>
  api.get("/auth/google/url").then((r) => r.data);

export const getCurrentUser = () =>
  api.get("/auth/me").then((r) => r.data);

export const guestLogin = () =>
  api.post("/auth/guest").then((r) => r.data);

export const logout = () =>
  api.post("/auth/logout").then((r) => r.data);

export const fetchTopics = () =>
  api.get("/exam/topics").then((r) => r.data);

export const fetchQuestions = (options = {}) => {
  const {
    domain = null,
    section = null,
    topic = null,
    exam_date = null,
    n = 10,
    skip = 0,
    random_questions = false,
  } = options;

  const params = { n, skip, random_questions };
  if (domain) params.domain = domain;
  if (section) params.section = section;
  if (topic) params.topic = topic;
  if (exam_date) params.exam_date = exam_date;

  return api
    .get("/exam/questions", { params })
    .then((r) => r.data)
    .catch((error) => {
      console.error("API Error:", error);
      throw error;
    });
};

export const fetchQuestionsCount = (options = {}) => {
  const { domain = null, section = null, topic = null, exam_date = null } = options;

  const params = {};
  if (domain) params.domain = domain;
  if (section) params.section = section;
  if (topic) params.topic = topic;
  if (exam_date) params.exam_date = exam_date;

  return api.get("/exam/questions/count", { params }).then((r) => r.data);
};

export const fetchExamDates = () =>
  api.get("/exam/exam_dates").then((r) => r.data);

export const fetchSubtopicCounts = () =>
  api.get("/exam/subtopic_counts").then((r) => r.data);

export const fetchExam = (n = 5, exam_date = null) =>
  fetchQuestions({ n, exam_date, random_questions: true });

export const fetchQuestionsByTopic = (domain, section = null, topic = null, n = 10, skip = 0) =>
  fetchQuestions({ domain, section, topic, n, skip, random_questions: false });

export const fetchQuestionsByDate = (exam_date, n = 10, skip = 0) =>
  fetchQuestions({ exam_date, n, skip, random_questions: false });

export const fetchNotionPage = (pageId) =>
  api.get(`/notion/${pageId}`).then((r) => r.data);

// Reports
export const submitReport = (payload) =>
  api.post("/reports", payload).then((r) => r.data);

// Admin
export const checkAdmin = () =>
  api.get("/admin/check").then((r) => r.data);

export const adminFetchQuestions = (params = {}) =>
  api.get("/admin/questions", { params }).then((r) => r.data);

export const adminUpdateQuestion = (id, fields) =>
  api.patch(`/admin/questions/${id}`, fields).then((r) => r.data);

export const adminFetchReports = (params = {}) =>
  api.get("/admin/reports", { params }).then((r) => r.data);

export const adminUpdateReport = (id, fields) =>
  api.patch(`/admin/reports/${id}`, fields).then((r) => r.data);

export const adminDeleteReport = (id) =>
  api.delete(`/admin/reports/${id}`).then((r) => r.data);


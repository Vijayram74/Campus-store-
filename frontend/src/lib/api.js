import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const api = axios.create({
  baseURL: `${API_URL}/api`,
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  signup: (data) => api.post('/auth/signup', data),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
};

// Colleges
export const collegeAPI = {
  getAll: () => api.get('/colleges'),
  seed: () => api.post('/seed'),
};

// Items
export const itemAPI = {
  getAll: (params) => api.get('/items', { params }),
  getOne: (id) => api.get(`/items/${id}`),
  getMy: () => api.get('/items/my'),
  create: (data) => api.post('/items', data),
  update: (id, data) => api.put(`/items/${id}`, data),
  delete: (id) => api.delete(`/items/${id}`),
};

// Categories
export const categoryAPI = {
  getAll: () => api.get('/categories'),
};

// Orders (Buy)
export const orderAPI = {
  create: (data) => api.post('/orders', data),
  getAll: (params) => api.get('/orders', { params }),
  getOne: (id) => api.get(`/orders/${id}`),
  complete: (id) => api.post(`/orders/${id}/complete`),
};

// Borrow
export const borrowAPI = {
  create: (data) => api.post('/borrow', data),
  getAll: (params) => api.get('/borrow', { params }),
  getPending: () => api.get('/borrow/pending'),
  getOne: (id) => api.get(`/borrow/${id}`),
  approve: (id, data) => api.post(`/borrow/${id}/approve`, data),
  return: (id) => api.post(`/borrow/${id}/return`),
  confirmReturn: (id) => api.post(`/borrow/${id}/confirm-return`),
};

// Payments
export const paymentAPI = {
  createCheckout: (data) => api.post('/payments/checkout', data),
  getStatus: (sessionId) => api.get(`/payments/status/${sessionId}`),
};

// Reviews
export const reviewAPI = {
  create: (data) => api.post('/reviews', data),
  getUserReviews: (userId) => api.get(`/reviews/${userId}`),
};

// Stats
export const statsAPI = {
  getDashboard: () => api.get('/stats/dashboard'),
  getFeatured: () => api.get('/stats/featured-items'),
};

// Users
export const userAPI = {
  getProfile: (id) => api.get(`/users/${id}`),
};

// Upload
export const uploadAPI = {
  uploadFile: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  uploadBase64: (imageData) => api.post('/upload/base64', { image: imageData }),
};

// Chat/Messages
export const chatAPI = {
  getConversations: () => api.get('/conversations'),
  getMessages: (conversationId) => api.get(`/conversations/${conversationId}/messages`),
  sendMessage: (data) => api.post('/messages', data),
  getUnreadCount: () => api.get('/messages/unread-count'),
};

export default api;

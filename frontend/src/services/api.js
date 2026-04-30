const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * Generic fetch wrapper that adds JWT token and handles errors.
 */
async function request(endpoint, options = {}) {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const message = data?.error || data?.errors?.join(', ') || 'Something went wrong';
    const error = new Error(message);
    error.status = res.status;
    throw error;
  }

  return data;
}

// ==================== Auth ====================
export const authApi = {
  register: (body) => request('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body) => request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
};

// ==================== Users ====================
export const usersApi = {
  list: () => request('/users'),
  me: () => request('/users/me'),
};

// ==================== Projects ====================
export const projectsApi = {
  list: () => request('/projects'),
  get: (id) => request(`/projects/${id}`),
  create: (body) => request('/projects', { method: 'POST', body: JSON.stringify(body) }),
  update: (id, body) => request(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (id) => request(`/projects/${id}`, { method: 'DELETE' }),
};

// ==================== Tasks ====================
export const tasksApi = {
  list: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/tasks${query ? `?${query}` : ''}`);
  },
  get: (id) => request(`/tasks/${id}`),
  create: (body) => request('/tasks', { method: 'POST', body: JSON.stringify(body) }),
  update: (id, body) => request(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (id) => request(`/tasks/${id}`, { method: 'DELETE' }),
};

// ==================== Dashboard ====================
export const dashboardApi = {
  get: () => request('/dashboard'),
};

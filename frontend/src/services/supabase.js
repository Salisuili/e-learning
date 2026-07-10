/**
 * API Client for Express Backend
 * Replace direct Supabase calls with backend API calls
 */
import { Platform } from 'react-native';

// Determine the correct API URL based on platform
// - Android emulator: 10.0.2.2 maps to host machine's localhost
// - iOS simulator: localhost works
// - Physical device: Use your computer's local IP address
// - Web: localhost works
const getApiUrl = () => {
  // First check if there's an environment variable
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // Platform-specific defaults
  if (Platform.OS === 'android') {
    // Android emulator uses 10.0.2.2 to reach host machine
    return 'http://10.0.2.2:3001/api';
  }

  // iOS simulator, web, or fallback
  return 'http://localhost:3001/api';
};

const API_BASE_URL = getApiUrl();

console.log(`[API] Connecting to backend at: ${API_BASE_URL}`);

class ApiClient {
  constructor() {
    this.token = null;
  }

  setToken(token) {
    this.token = token;
  }

  clearToken() {
    this.token = null;
  }

  getHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  async request(method, endpoint, body = null, isFormData = false) {
    const url = `${API_BASE_URL}${endpoint}`;
    const options = { method };

    if (isFormData) {
      options.headers = {};
      if (this.token) {
        options.headers['Authorization'] = `Bearer ${this.token}`;
      }
      options.body = body;
    } else {
      options.headers = this.getHeaders();
      if (body) {
        options.body = JSON.stringify(body);
      }
    }

    try {
      const response = await fetch(url, options);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      return data;
    } catch (error) {
      if (error.message === 'Network request failed') {
        throw new Error('Unable to connect to server. Please check your connection.');
      }
      throw error;
    }
  }

  get(endpoint) {
    return this.request('GET', endpoint);
  }

  post(endpoint, body) {
    return this.request('POST', endpoint, body);
  }

  put(endpoint, body) {
    return this.request('PUT', endpoint, body);
  }

  delete(endpoint) {
    return this.request('DELETE', endpoint);
  }

  upload(method, endpoint, formData) {
    return this.request(method, endpoint, formData, true);
  }
}

export const api = new ApiClient();

// Export a supabase-like interface for backward compatibility
export const supabase = {
  auth: {
    signUp: async ({ email, password }) => {
      throw new Error('Use api.post("/auth/register", ...) instead');
    },
    signInWithPassword: async ({ email, password }) => {
      throw new Error('Use api.post("/auth/login", ...) instead');
    },
    signOut: async () => {
      throw new Error('Use api.post("/auth/logout") instead');
    },
    getSession: async () => {
      throw new Error('Use api.get("/auth/me") instead');
    },
    getUser: async () => {
      throw new Error('Use api.get("/auth/me") instead');
    },
    resetPasswordForEmail: async () => {
      throw new Error('Use api.post("/auth/reset-password", ...) instead');
    },
    onAuthStateChange: () => {
      return { data: { subscription: { unsubscribe: () => {} } } };
    },
    admin: {
      deleteUser: async () => { throw new Error('Use api.delete("/users/:id") instead'); },
      updateUserById: async () => { throw new Error('Use api.put("/auth/update-password", ...) instead'); },
    }
  },
  from: (table) => {
    console.warn(`Direct supabase.from("${table}") calls should be replaced with API calls`);
    return {
      select: () => ({ eq: () => ({ single: async () => ({ data: null, error: 'Use API instead' }), maybeSingle: async () => ({ data: null, error: 'Use API instead' }), order: () => ({ data: null, error: 'Use API instead' }) }) }),
      insert: () => ({ select: () => ({ single: async () => ({ data: null, error: 'Use API instead' }) }) }),
      update: () => ({ eq: () => ({ select: () => ({ single: async () => ({ data: null, error: 'Use API instead' }) }) }) }),
      delete: () => ({ eq: () => ({ error: 'Use API instead' }) }),
      in: () => ({ order: () => ({ data: null, error: 'Use API instead' }) }),
      is: () => ({ order: () => ({ data: null, error: 'Use API instead' }) }),
      eq: () => ({ single: async () => ({ data: null, error: 'Use API instead' }), maybeSingle: async () => ({ data: null, error: 'Use API instead' }) }),
      order: () => ({ data: null, error: 'Use API instead' }),
    };
  },
  storage: {
    from: () => ({
      upload: async () => ({ data: null, error: 'Use API upload instead' }),
      remove: async () => ({ data: null, error: 'Use API upload instead' }),
      getPublicUrl: () => ({ data: { publicUrl: '' } }),
      download: async () => ({ data: null, error: 'Use API upload instead' }),
      list: async () => ({ data: null, error: 'Use API upload instead' }),
    })
  }
};
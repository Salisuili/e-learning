/**
 * E-Learning Platform API Client
 * Connects to the Express backend server
 */

// Change this to your backend server URL
// For local development: http://localhost:3001
// For production: https://your-server.com
const API_BASE_URL = 'http://localhost:3001/api';

class ApiClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.token = null;
  }

  setToken(token) {
    this.token = token;
  }

  clearToken() {
    this.token = null;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    // Don't set Content-Type for FormData (multipart)
    if (options.body instanceof FormData) {
      delete headers['Content-Type'];
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

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

  // =====================
  // Auth Endpoints
  // =====================

  async register(userData) {
    const formData = new FormData();
    Object.keys(userData).forEach(key => {
      if (userData[key] !== undefined && userData[key] !== null) {
        formData.append(key, userData[key]);
      }
    });
    return this.request('/auth/register', {
      method: 'POST',
      body: formData,
    });
  }

  async login(email, password) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (data.session?.access_token) {
      this.setToken(data.session.access_token);
    }
    return data;
  }

  async logout() {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } finally {
      this.clearToken();
    }
  }

  async getMe() {
    return this.request('/auth/me');
  }

  async updateProfile(profileData) {
    const formData = new FormData();
    Object.keys(profileData).forEach(key => {
      if (profileData[key] !== undefined && profileData[key] !== null) {
        formData.append(key, profileData[key]);
      }
    });
    return this.request('/auth/profile', {
      method: 'PUT',
      body: formData,
    });
  }

  async resetPassword(email) {
    return this.request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async updatePassword(newPassword) {
    return this.request('/auth/update-password', {
      method: 'PUT',
      body: JSON.stringify({ new_password: newPassword }),
    });
  }

  // =====================
  // User Endpoints
  // =====================

  async getUsers(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/users${query ? `?${query}` : ''}`);
  }

  async getPendingUsers() {
    return this.request('/users/pending');
  }

  async getUserById(id) {
    return this.request(`/users/${id}`);
  }

  async updateUserRole(id, role) {
    return this.request(`/users/${id}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    });
  }

  async approveUser(id) {
    return this.request(`/users/${id}/approve`, { method: 'PUT' });
  }

  async rejectUser(id, reason) {
    return this.request(`/users/${id}/reject`, {
      method: 'PUT',
      body: JSON.stringify({ reason }),
    });
  }

  async deleteUser(id) {
    return this.request(`/users/${id}`, { method: 'DELETE' });
  }

  async getLecturers() {
    return this.request('/users/lecturers/list');
  }

  // =====================
  // Course Endpoints
  // =====================

  async getCourses() {
    return this.request('/courses');
  }

  async getCourseById(id) {
    return this.request(`/courses/${id}`);
  }

  async createCourse(courseData) {
    return this.request('/courses', {
      method: 'POST',
      body: JSON.stringify(courseData),
    });
  }

  async updateCourse(id, courseData) {
    return this.request(`/courses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(courseData),
    });
  }

  async deleteCourse(id) {
    return this.request(`/courses/${id}`, { method: 'DELETE' });
  }

  async enrollCourse(courseId) {
    return this.request(`/courses/${courseId}/enroll`, { method: 'POST' });
  }

  async getCourseEnrollments(courseId) {
    return this.request(`/courses/${courseId}/enrollments`);
  }

  async uploadMaterial(courseId, materialData) {
    const formData = new FormData();
    Object.keys(materialData).forEach(key => {
      if (materialData[key] !== undefined && materialData[key] !== null) {
        formData.append(key, materialData[key]);
      }
    });
    return this.request(`/courses/${courseId}/materials`, {
      method: 'POST',
      body: formData,
    });
  }

  async getCourseMaterials(courseId) {
    return this.request(`/courses/${courseId}/materials`);
  }

  async deleteMaterial(materialId) {
    return this.request(`/courses/materials/${materialId}`, { method: 'DELETE' });
  }

  // =====================
  // Assignment Endpoints
  // =====================

  async getCourseAssignments(courseId) {
    return this.request(`/assignments/course/${courseId}`);
  }

  async getAssignmentById(id) {
    return this.request(`/assignments/${id}`);
  }

  async createAssignment(courseId, assignmentData) {
    const formData = new FormData();
    Object.keys(assignmentData).forEach(key => {
      if (assignmentData[key] !== undefined && assignmentData[key] !== null) {
        formData.append(key, assignmentData[key]);
      }
    });
    return this.request(`/assignments/course/${courseId}`, {
      method: 'POST',
      body: formData,
    });
  }

  async updateAssignment(id, assignmentData) {
    return this.request(`/assignments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(assignmentData),
    });
  }

  async deleteAssignment(id) {
    return this.request(`/assignments/${id}`, { method: 'DELETE' });
  }

  async submitAssignment(assignmentId, submissionData) {
    const formData = new FormData();
    Object.keys(submissionData).forEach(key => {
      if (submissionData[key] !== undefined && submissionData[key] !== null) {
        formData.append(key, submissionData[key]);
      }
    });
    return this.request(`/assignments/${assignmentId}/submit`, {
      method: 'POST',
      body: formData,
    });
  }

  async getAssignmentSubmissions(assignmentId) {
    return this.request(`/assignments/${assignmentId}/submissions`);
  }

  async getMySubmission(assignmentId) {
    return this.request(`/assignments/${assignmentId}/my-submission`);
  }

  async gradeSubmission(submissionId, score, feedback) {
    return this.request(`/assignments/submissions/${submissionId}/grade`, {
      method: 'PUT',
      body: JSON.stringify({ score, feedback }),
    });
  }

  // =====================
  // Announcement Endpoints
  // =====================

  async getCourseAnnouncements(courseId) {
    return this.request(`/announcements/course/${courseId}`);
  }

  async getDepartmentAnnouncements(department) {
    return this.request(`/announcements/department/${department}`);
  }

  async createAnnouncement(announcementData) {
    return this.request('/announcements', {
      method: 'POST',
      body: JSON.stringify(announcementData),
    });
  }

  async updateAnnouncement(id, announcementData) {
    return this.request(`/announcements/${id}`, {
      method: 'PUT',
      body: JSON.stringify(announcementData),
    });
  }

  async deleteAnnouncement(id) {
    return this.request(`/announcements/${id}`, { method: 'DELETE' });
  }

  async pinAnnouncement(id, isPinned) {
    return this.request(`/announcements/${id}/pin`, {
      method: 'PUT',
      body: JSON.stringify({ is_pinned: isPinned }),
    });
  }
}

// Create and export a singleton instance
const api = new ApiClient(API_BASE_URL);
export default api;
import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';
import { AuthTokens, ApiError } from '@/types';

class ApiClient {
  private client: AxiosInstance;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Load tokens from localStorage if available
    if (typeof window !== 'undefined') {
      this.accessToken = localStorage.getItem('accessToken');
      this.refreshToken = localStorage.getItem('refreshToken');
    }

    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config) => {
        if (this.accessToken) {
          config.headers.Authorization = `Bearer ${this.accessToken}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor to handle token refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

        // If error is 401 and we haven't retried yet, try to refresh token
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const tokens = await this.refreshAccessToken();
            if (tokens && originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${tokens.accessToken}`;
              return this.client(originalRequest);
            }
          } catch (refreshError) {
            // Refresh failed, logout user
            this.logout();
            if (typeof window !== 'undefined') {
              window.location.href = '/login';
            }
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(this.handleError(error));
      }
    );
  }

  private handleError(error: AxiosError): ApiError {
    if (error.response) {
      return {
        message: (error.response.data as any)?.message || 'An error occurred',
        statusCode: error.response.status,
        error: (error.response.data as any)?.error,
      };
    } else if (error.request) {
      return {
        message: 'No response from server',
        statusCode: 0,
      };
    } else {
      return {
        message: error.message || 'An unexpected error occurred',
        statusCode: 0,
      };
    }
  }

  // Token management
  setTokens(tokens: AuthTokens) {
    this.accessToken = tokens.accessToken;
    this.refreshToken = tokens.refreshToken;

    if (typeof window !== 'undefined') {
      localStorage.setItem('accessToken', tokens.accessToken);
      localStorage.setItem('refreshToken', tokens.refreshToken);
    }
  }

  private async refreshAccessToken(): Promise<AuthTokens | null> {
    if (!this.refreshToken) return null;

    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`,
        { refreshToken: this.refreshToken }
      );

      const tokens = response.data;
      this.setTokens(tokens);
      return tokens;
    } catch (error) {
      return null;
    }
  }

  logout() {
    this.accessToken = null;
    this.refreshToken = null;

    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
    }
  }

  // Auth endpoints
  async login(email: string, password: string) {
    const response = await this.client.post('/auth/login', { email, password });
    this.setTokens(response.data);
    return response.data;
  }

  async register(data: any) {
    const response = await this.client.post('/auth/register', data);
    this.setTokens(response.data);
    return response.data;
  }

  async getCurrentUser() {
    const response = await this.client.get('/auth/me');
    return response.data;
  }

  // Organization endpoints
  async getOrganizations(params?: { page?: number; limit?: number }) {
    const response = await this.client.get('/organizations', { params });
    return response.data;
  }

  async getOrganization(id: string) {
    const response = await this.client.get(`/organizations/${id}`);
    return response.data;
  }

  async createOrganization(data: any) {
    const response = await this.client.post('/organizations', data);
    return response.data;
  }

  async updateOrganization(id: string, data: any) {
    const response = await this.client.patch(`/organizations/${id}`, data);
    return response.data;
  }

  async deleteOrganization(id: string) {
    const response = await this.client.delete(`/organizations/${id}`);
    return response.data;
  }

  // Course endpoints
  async getCourses(params?: { page?: number; limit?: number; status?: string }) {
    const response = await this.client.get('/courses', { params });
    return response.data;
  }

  async getCourse(id: string) {
    const response = await this.client.get(`/courses/${id}`);
    return response.data;
  }

  async createCourse(data: any) {
    const response = await this.client.post('/courses', data);
    return response.data;
  }

  async updateCourse(id: string, data: any) {
    const response = await this.client.patch(`/courses/${id}`, data);
    return response.data;
  }

  async deleteCourse(id: string) {
    const response = await this.client.delete(`/courses/${id}`);
    return response.data;
  }

  // Lesson endpoints
  async getLessons(courseId: string) {
    const response = await this.client.get(`/lessons?courseId=${courseId}`);
    return response.data;
  }

  async getLesson(id: string) {
    const response = await this.client.get(`/lessons/${id}`);
    return response.data;
  }

  async createLesson(data: any) {
    const response = await this.client.post('/lessons', data);
    return response.data;
  }

  async updateLesson(id: string, data: any) {
    const response = await this.client.patch(`/lessons/${id}`, data);
    return response.data;
  }

  async deleteLesson(id: string) {
    const response = await this.client.delete(`/lessons/${id}`);
    return response.data;
  }

  // AI Generation endpoints
  async analyzeDocument(file: File) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await this.client.post('/ai-generation/analyze-document', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  }

  async generateLessons(courseId: string, file: File, targetLessonCount?: number) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('courseId', courseId);
    if (targetLessonCount) {
      formData.append('targetLessonCount', targetLessonCount.toString());
    }

    const response = await this.client.post('/ai-generation/generate-lessons', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  }

  async getAiJob(jobId: string) {
    const response = await this.client.get(`/ai-generation/jobs/${jobId}`);
    return response.data;
  }

  async listAiJobs(params?: { limit?: number }) {
    const response = await this.client.get('/ai-generation/jobs', { params });
    return response.data;
  }

  async cancelAiJob(jobId: string) {
    const response = await this.client.delete(`/ai-generation/jobs/${jobId}`);
    return response.data;
  }

  // Analytics endpoints
  async getOverview() {
    const response = await this.client.get('/analytics/overview');
    return response.data;
  }

  async getLearningActivity(days?: number) {
    const response = await this.client.get('/analytics/learning-activity', {
      params: { days },
    });
    return response.data;
  }

  async getTopCourses(limit?: number) {
    const response = await this.client.get('/analytics/top-courses', {
      params: { limit },
    });
    return response.data;
  }

  async getUserEngagement() {
    const response = await this.client.get('/analytics/user-engagement');
    return response.data;
  }

  async getCompetencyMatrix() {
    const response = await this.client.get('/analytics/competency-matrix');
    return response.data;
  }

  async getTeamPerformance() {
    const response = await this.client.get('/analytics/team-performance');
    return response.data;
  }

  // Users endpoints
  async getUsers(params?: { page?: number; limit?: number; role?: string }) {
    const response = await this.client.get('/users', { params });
    return response.data;
  }

  async getUser(id: string) {
    const response = await this.client.get(`/users/${id}`);
    return response.data;
  }

  async updateUser(id: string, data: any) {
    const response = await this.client.patch(`/users/${id}`, data);
    return response.data;
  }

  async deleteUser(id: string) {
    const response = await this.client.delete(`/users/${id}`);
    return response.data;
  }

  // Teams endpoints
  async getTeams(params?: { page?: number; limit?: number }) {
    const response = await this.client.get('/teams', { params });
    return response.data;
  }

  async getTeam(id: string) {
    const response = await this.client.get(`/teams/${id}`);
    return response.data;
  }

  async createTeam(data: any) {
    const response = await this.client.post('/teams', data);
    return response.data;
  }

  async updateTeam(id: string, data: any) {
    const response = await this.client.patch(`/teams/${id}`, data);
    return response.data;
  }

  async deleteTeam(id: string) {
    const response = await this.client.delete(`/teams/${id}`);
    return response.data;
  }

  // Skills endpoints
  async getSkills(params?: { page?: number; limit?: number; category?: string }) {
    const response = await this.client.get('/skills', { params });
    return response.data;
  }

  async getSkill(id: string) {
    const response = await this.client.get(`/skills/${id}`);
    return response.data;
  }

  async createSkill(data: any) {
    const response = await this.client.post('/skills', data);
    return response.data;
  }

  async updateSkill(id: string, data: any) {
    const response = await this.client.patch(`/skills/${id}`, data);
    return response.data;
  }

  async deleteSkill(id: string) {
    const response = await this.client.delete(`/skills/${id}`);
    return response.data;
  }

  // Enrollments endpoints
  async getEnrollments(params?: { page?: number; limit?: number; userId?: string; courseId?: string }) {
    const response = await this.client.get('/enrollments', { params });
    return response.data;
  }

  async createEnrollment(data: any) {
    const response = await this.client.post('/enrollments', data);
    return response.data;
  }

  async deleteEnrollment(id: string) {
    const response = await this.client.delete(`/enrollments/${id}`);
    return response.data;
  }
}

export const apiClient = new ApiClient();

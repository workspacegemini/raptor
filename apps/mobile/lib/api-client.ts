import axios, { AxiosInstance, AxiosError } from 'axios';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

class ApiClient {
  private client: AxiosInstance;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  constructor() {
    // Use localhost for iOS simulator, 10.0.2.2 for Android emulator
    const API_URL =
      Constants.expoConfig?.extra?.apiUrl ||
      (Constants.platform?.ios
        ? 'http://localhost:3001/api/v1'
        : 'http://10.0.2.2:3001/api/v1');

    this.client = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });

    // Load tokens from secure storage
    this.loadTokens();

    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        if (this.accessToken) {
          config.headers.Authorization = `Bearer ${this.accessToken}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for token refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as any;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const tokens = await this.refreshAccessToken();
            if (tokens && originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${tokens.accessToken}`;
              return this.client(originalRequest);
            }
          } catch (refreshError) {
            this.logout();
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(this.handleError(error));
      }
    );
  }

  private async loadTokens() {
    try {
      const accessToken = await SecureStore.getItemAsync('accessToken');
      const refreshToken = await SecureStore.getItemAsync('refreshToken');
      if (accessToken) this.accessToken = accessToken;
      if (refreshToken) this.refreshToken = refreshToken;
    } catch (error) {
      console.error('Failed to load tokens:', error);
    }
  }

  private handleError(error: AxiosError): any {
    if (error.response) {
      return {
        message: (error.response.data as any)?.message || 'An error occurred',
        statusCode: error.response.status,
        error: (error.response.data as any)?.error,
      };
    } else if (error.request) {
      return {
        message: 'No response from server. Check your internet connection.',
        statusCode: 0,
      };
    } else {
      return {
        message: error.message || 'An unexpected error occurred',
        statusCode: 0,
      };
    }
  }

  async setTokens(tokens: { accessToken: string; refreshToken: string }) {
    this.accessToken = tokens.accessToken;
    this.refreshToken = tokens.refreshToken;

    try {
      await SecureStore.setItemAsync('accessToken', tokens.accessToken);
      await SecureStore.setItemAsync('refreshToken', tokens.refreshToken);
    } catch (error) {
      console.error('Failed to save tokens:', error);
    }
  }

  private async refreshAccessToken() {
    if (!this.refreshToken) return null;

    try {
      const response = await axios.post(`${this.client.defaults.baseURL}/auth/refresh`, {
        refreshToken: this.refreshToken,
      });

      const tokens = response.data;
      await this.setTokens(tokens);
      return tokens;
    } catch (error) {
      return null;
    }
  }

  logout() {
    this.accessToken = null;
    this.refreshToken = null;

    SecureStore.deleteItemAsync('accessToken').catch(console.error);
    SecureStore.deleteItemAsync('refreshToken').catch(console.error);
  }

  // Auth endpoints
  async login(email: string, password: string) {
    const response = await this.client.post('/auth/login', { email, password });
    await this.setTokens(response.data);
    return response.data;
  }

  async getCurrentUser() {
    const response = await this.client.get('/auth/me');
    return response.data;
  }

  // Course endpoints
  async getCourses(params?: any) {
    const response = await this.client.get('/courses', { params });
    return response.data;
  }

  async getCourse(id: string) {
    const response = await this.client.get(`/courses/${id}`);
    return response.data;
  }

  // Enrollment endpoints
  async getMyEnrollments() {
    const response = await this.client.get('/enrollments/my');
    return response.data;
  }

  async enrollInCourse(courseId: string) {
    const response = await this.client.post('/enrollments', { courseId });
    return response.data;
  }

  // Lesson endpoints
  async getLesson(id: string) {
    const response = await this.client.get(`/lessons/${id}`);
    return response.data;
  }

  async trackProgress(lessonId: string, data: any) {
    const response = await this.client.post(`/lessons/${lessonId}/progress`, data);
    return response.data;
  }
}

export const apiClient = new ApiClient();

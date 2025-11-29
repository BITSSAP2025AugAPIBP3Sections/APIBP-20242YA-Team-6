import axios, { AxiosInstance, AxiosError } from 'axios';

export class MicroserviceClient {
  private client: AxiosInstance;

  constructor(baseURL: string) {
    this.client = axios.create({
      baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add response interceptor for better error messages
    this.client.interceptors.response.use(
      (response: any) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          throw new Error('Authentication required. Please login to get a valid token.');
        }
        if (error.response?.status === 403) {
          throw new Error('Access denied. You do not have permission to perform this action.');
        }
        throw error;
      }
    );
  }

  setAuthToken(token: string) {
    this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  async get<T>(path: string, params?: any): Promise<T> {
    const response = await this.client.get<T>(path, { params });
    return response.data;
  }

  async post<T>(path: string, data?: any): Promise<T> {
    const response = await this.client.post<T>(path, data);
    return response.data;
  }

  async put<T>(path: string, data?: any): Promise<T> {
    const response = await this.client.put<T>(path, data);
    return response.data;
  }

  async patch<T>(path: string, data?: any): Promise<T> {
    const response = await this.client.patch<T>(path, data);
    return response.data;
  }

  async delete<T>(path: string): Promise<T> {
    const response = await this.client.delete<T>(path);
    return response.data;
  }
}

export class DataSources {
  authService: MicroserviceClient;
  eventsService: MicroserviceClient;
  vendorsService: MicroserviceClient;
  tasksService: MicroserviceClient;
  attendeesService: MicroserviceClient;
  notificationsService: MicroserviceClient;

  constructor() {
    this.authService = new MicroserviceClient(
      process.env.AUTH_SERVICE_URL || 'http://auth-service:8001'
    );
    this.eventsService = new MicroserviceClient(
      process.env.EVENTS_SERVICE_URL || 'http://events-service:8002'
    );
    this.vendorsService = new MicroserviceClient(
      process.env.VENDORS_SERVICE_URL || 'http://vendors-service:8003'
    );
    this.tasksService = new MicroserviceClient(
      process.env.TASKS_SERVICE_URL || 'http://tasks-service:8004'
    );
    this.attendeesService = new MicroserviceClient(
      process.env.ATTENDEES_SERVICE_URL || 'http://attendees-service:8005'
    );
    this.notificationsService = new MicroserviceClient(
      process.env.NOTIFICATIONS_SERVICE_URL || 'http://notifications-service:8006'
    );
  }

  setAuthToken(token: string) {
    this.authService.setAuthToken(token);
    this.eventsService.setAuthToken(token);
    this.vendorsService.setAuthToken(token);
    this.tasksService.setAuthToken(token);
    this.attendeesService.setAuthToken(token);
    this.notificationsService.setAuthToken(token);
  }
}

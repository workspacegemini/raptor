import { Injectable } from '@nestjs/common';
import { Registry, Counter, Histogram, Gauge, collectDefaultMetrics } from 'prom-client';

@Injectable()
export class MetricsService {
  private readonly registry: Registry;

  // HTTP Metrics
  public readonly httpRequestsTotal: Counter;
  public readonly httpRequestDuration: Histogram;
  public readonly httpRequestErrors: Counter;

  // Business Metrics
  public readonly coursesCreated: Counter;
  public readonly lessonsCompleted: Counter;
  public readonly usersRegistered: Counter;
  public readonly enrollmentsCreated: Counter;
  public readonly aiJobsProcessed: Counter;

  // System Metrics
  public readonly activeSessions: Gauge;
  public readonly queueSize: Gauge;
  public readonly cacheHitRate: Gauge;

  constructor() {
    this.registry = new Registry();

    // Collect default Node.js metrics
    collectDefaultMetrics({ register: this.registry });

    // HTTP Metrics
    this.httpRequestsTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.registry],
    });

    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
      registers: [this.registry],
    });

    this.httpRequestErrors = new Counter({
      name: 'http_request_errors_total',
      help: 'Total number of HTTP request errors',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.registry],
    });

    // Business Metrics
    this.coursesCreated = new Counter({
      name: 'courses_created_total',
      help: 'Total number of courses created',
      labelNames: ['organization_id'],
      registers: [this.registry],
    });

    this.lessonsCompleted = new Counter({
      name: 'lessons_completed_total',
      help: 'Total number of lessons completed',
      labelNames: ['organization_id', 'course_id'],
      registers: [this.registry],
    });

    this.usersRegistered = new Counter({
      name: 'users_registered_total',
      help: 'Total number of users registered',
      labelNames: ['organization_id', 'role'],
      registers: [this.registry],
    });

    this.enrollmentsCreated = new Counter({
      name: 'enrollments_created_total',
      help: 'Total number of enrollments created',
      labelNames: ['organization_id', 'course_id'],
      registers: [this.registry],
    });

    this.aiJobsProcessed = new Counter({
      name: 'ai_jobs_processed_total',
      help: 'Total number of AI jobs processed',
      labelNames: ['organization_id', 'job_type', 'status'],
      registers: [this.registry],
    });

    // System Metrics
    this.activeSessions = new Gauge({
      name: 'active_sessions',
      help: 'Number of active user sessions',
      registers: [this.registry],
    });

    this.queueSize = new Gauge({
      name: 'queue_size',
      help: 'Number of jobs in the queue',
      labelNames: ['queue_name'],
      registers: [this.registry],
    });

    this.cacheHitRate = new Gauge({
      name: 'cache_hit_rate',
      help: 'Cache hit rate percentage',
      registers: [this.registry],
    });
  }

  /**
   * Get metrics in Prometheus format
   */
  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  /**
   * Get metrics as JSON
   */
  async getMetricsJSON(): Promise<any> {
    const metrics = await this.registry.getMetricsAsJSON();
    return metrics;
  }

  /**
   * Record HTTP request
   */
  recordHttpRequest(method: string, route: string, statusCode: number, duration: number) {
    this.httpRequestsTotal.inc({ method, route, status_code: statusCode });
    this.httpRequestDuration.observe({ method, route, status_code: statusCode }, duration / 1000);

    if (statusCode >= 400) {
      this.httpRequestErrors.inc({ method, route, status_code: statusCode });
    }
  }

  /**
   * Record course creation
   */
  recordCourseCreated(organizationId: string) {
    this.coursesCreated.inc({ organization_id: organizationId });
  }

  /**
   * Record lesson completion
   */
  recordLessonCompleted(organizationId: string, courseId: string) {
    this.lessonsCompleted.inc({ organization_id: organizationId, course_id: courseId });
  }

  /**
   * Record user registration
   */
  recordUserRegistered(organizationId: string, role: string) {
    this.usersRegistered.inc({ organization_id: organizationId, role });
  }

  /**
   * Record enrollment creation
   */
  recordEnrollmentCreated(organizationId: string, courseId: string) {
    this.enrollmentsCreated.inc({ organization_id: organizationId, course_id: courseId });
  }

  /**
   * Record AI job processing
   */
  recordAiJobProcessed(organizationId: string, jobType: string, status: string) {
    this.aiJobsProcessed.inc({ organization_id: organizationId, job_type: jobType, status });
  }

  /**
   * Update active sessions count
   */
  setActiveSessions(count: number) {
    this.activeSessions.set(count);
  }

  /**
   * Update queue size
   */
  setQueueSize(queueName: string, size: number) {
    this.queueSize.set({ queue_name: queueName }, size);
  }

  /**
   * Update cache hit rate
   */
  setCacheHitRate(rate: number) {
    this.cacheHitRate.set(rate);
  }
}

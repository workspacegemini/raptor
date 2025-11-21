import { Injectable, Logger } from '@nestjs/common';
import { AppWebSocketGateway as Gateway } from './websocket.gateway';

/**
 * Service to interact with WebSocket Gateway from other modules
 */
@Injectable()
export class WebSocketService {
  private readonly logger = new Logger(WebSocketService.name);
  private gateway: Gateway;

  setGateway(gateway: Gateway) {
    this.gateway = gateway;
  }

  /**
   * Notify user about course enrollment
   */
  notifyEnrollment(userId: string, courseId: string, courseName: string) {
    if (!this.gateway) return;

    this.gateway.notifyUser(userId, 'enrollment:created', {
      courseId,
      courseName,
      message: `You have been enrolled in ${courseName}`,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Notify user about lesson progress update
   */
  notifyProgressUpdate(
    userId: string,
    lessonId: string,
    courseId: string,
    progress: number,
  ) {
    if (!this.gateway) return;

    this.gateway.notifyUser(userId, 'progress:updated', {
      lessonId,
      courseId,
      progress,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Notify user about lesson completion
   */
  notifyLessonCompleted(
    userId: string,
    lessonId: string,
    lessonTitle: string,
  ) {
    if (!this.gateway) return;

    this.gateway.notifyUser(userId, 'lesson:completed', {
      lessonId,
      lessonTitle,
      message: `Congratulations! You completed ${lessonTitle}`,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Notify user about course completion
   */
  notifyCourseCompleted(userId: string, courseId: string, courseTitle: string) {
    if (!this.gateway) return;

    this.gateway.notifyUser(userId, 'course:completed', {
      courseId,
      courseTitle,
      message: `Congratulations! You completed ${courseTitle}`,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Notify organization about new course published
   */
  notifyCoursePublished(
    organizationId: string,
    courseId: string,
    courseTitle: string,
  ) {
    if (!this.gateway) return;

    this.gateway.notifyOrganization(organizationId, 'course:published', {
      courseId,
      courseTitle,
      message: `New course available: ${courseTitle}`,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Notify users in a course about updates
   */
  notifyCourseUpdate(courseId: string, updateType: string, data: any) {
    if (!this.gateway) return;

    this.gateway.notifyRoom(`course:${courseId}`, 'course:updated', {
      courseId,
      updateType,
      data,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Notify user about AI job status change
   */
  notifyAiJobStatus(
    userId: string,
    jobId: string,
    status: string,
    progress: number,
    result?: any,
  ) {
    if (!this.gateway) return;

    this.gateway.notifyUser(userId, 'ai-job:status', {
      jobId,
      status,
      progress,
      result,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Notify team members about team updates
   */
  notifyTeamUpdate(teamId: string, updateType: string, data: any) {
    if (!this.gateway) return;

    this.gateway.notifyRoom(`team:${teamId}`, 'team:updated', {
      teamId,
      updateType,
      data,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Notify user about skill badge earned
   */
  notifySkillBadgeEarned(
    userId: string,
    skillId: string,
    skillName: string,
    level: string,
  ) {
    if (!this.gateway) return;

    this.gateway.notifyUser(userId, 'skill:badge-earned', {
      skillId,
      skillName,
      level,
      message: `You earned a ${level} badge in ${skillName}!`,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Send system notification to specific user
   */
  sendSystemNotification(userId: string, title: string, message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') {
    if (!this.gateway) return;

    this.gateway.notifyUser(userId, 'system:notification', {
      title,
      message,
      type,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Broadcast system-wide announcement
   */
  broadcastAnnouncement(title: string, message: string) {
    if (!this.gateway) return;

    this.gateway.broadcast('system:announcement', {
      title,
      message,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Check if user is online
   */
  isUserOnline(userId: string): boolean {
    if (!this.gateway) return false;
    return this.gateway.isUserOnline(userId);
  }

  /**
   * Get connection stats
   */
  getStats() {
    if (!this.gateway) {
      return {
        totalConnections: 0,
        onlineUsers: [],
      };
    }

    return {
      totalConnections: this.gateway.getTotalConnections(),
      onlineUsers: this.gateway.getOnlineUsers(),
    };
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';
import * as Handlebars from 'handlebars';
import * as fs from 'fs/promises';
import * as path from 'path';

interface EmailOptions {
  to: string | string[];
  subject: string;
  template?: string;
  context?: any;
  html?: string;
  text?: string;
  attachments?: any[];
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter;
  private readonly templatesPath: string;

  constructor(private readonly configService: ConfigService) {
    this.templatesPath = path.join(__dirname, '../../templates/emails');
    this.createTransporter();
  }

  private createTransporter() {
    const emailConfig = {
      host: this.configService.get('EMAIL_HOST', 'smtp.gmail.com'),
      port: this.configService.get('EMAIL_PORT', 587),
      secure: this.configService.get('EMAIL_SECURE', false),
      auth: {
        user: this.configService.get('EMAIL_USER'),
        pass: this.configService.get('EMAIL_PASSWORD'),
      },
    };

    this.transporter = nodemailer.createTransporter(emailConfig);

    // Verify connection
    this.transporter.verify((error) => {
      if (error) {
        this.logger.error(`Email service connection error: ${error.message}`);
      } else {
        this.logger.log('Email service is ready');
      }
    });
  }

  /**
   * Send email using template
   */
  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      const { to, subject, template, context, html, text, attachments } = options;

      let emailHtml = html;
      let emailText = text;

      // If template is provided, compile it
      if (template && context) {
        const templateContent = await this.loadTemplate(template);
        const compiledTemplate = Handlebars.compile(templateContent);
        emailHtml = compiledTemplate(context);
      }

      const mailOptions = {
        from: `${this.configService.get('EMAIL_FROM_NAME', 'Enterprise Performance Engine')} <${this.configService.get('EMAIL_FROM', 'noreply@epe.com')}>`,
        to: Array.isArray(to) ? to.join(', ') : to,
        subject,
        html: emailHtml,
        text: emailText,
        attachments,
      };

      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Email sent successfully to ${to}: ${info.messageId}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send email: ${error.message}`, error.stack);
      return false;
    }
  }

  /**
   * Load email template from file
   */
  private async loadTemplate(templateName: string): Promise<string> {
    const templatePath = path.join(this.templatesPath, `${templateName}.html`);
    try {
      return await fs.readFile(templatePath, 'utf-8');
    } catch (error) {
      this.logger.error(`Failed to load template ${templateName}: ${error.message}`);
      throw new Error(`Template ${templateName} not found`);
    }
  }

  /**
   * Send welcome email to new user
   */
  async sendWelcomeEmail(email: string, userName: string, organizationName: string) {
    return this.sendEmail({
      to: email,
      subject: `Welcome to ${organizationName} - Enterprise Performance Engine`,
      template: 'welcome',
      context: {
        userName,
        organizationName,
        loginUrl: this.configService.get('APP_URL', 'http://localhost:3000'),
      },
    });
  }

  /**
   * Send course enrollment confirmation
   */
  async sendEnrollmentConfirmation(
    email: string,
    userName: string,
    courseName: string,
    courseUrl: string,
  ) {
    return this.sendEmail({
      to: email,
      subject: `You're enrolled in ${courseName}`,
      template: 'enrollment',
      context: {
        userName,
        courseName,
        courseUrl,
      },
    });
  }

  /**
   * Send course completion certificate
   */
  async sendCourseCompletionEmail(
    email: string,
    userName: string,
    courseName: string,
    certificateUrl?: string,
  ) {
    return this.sendEmail({
      to: email,
      subject: `Congratulations! You completed ${courseName}`,
      template: 'completion',
      context: {
        userName,
        courseName,
        certificateUrl,
      },
    });
  }

  /**
   * Send AI lesson generation completion notification
   */
  async sendAiJobCompletionEmail(
    email: string,
    userName: string,
    jobType: string,
    status: string,
    result: any,
  ) {
    return this.sendEmail({
      to: email,
      subject: `Your AI job is ${status}`,
      template: 'ai-job-completion',
      context: {
        userName,
        jobType,
        status,
        result,
      },
    });
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email: string, userName: string, resetToken: string) {
    const resetUrl = `${this.configService.get('APP_URL')}/reset-password?token=${resetToken}`;

    return this.sendEmail({
      to: email,
      subject: 'Password Reset Request',
      template: 'password-reset',
      context: {
        userName,
        resetUrl,
        expirationHours: 24,
      },
    });
  }

  /**
   * Send team invitation email
   */
  async sendTeamInvitationEmail(
    email: string,
    inviterName: string,
    teamName: string,
    inviteToken: string,
  ) {
    const inviteUrl = `${this.configService.get('APP_URL')}/invite?token=${inviteToken}`;

    return this.sendEmail({
      to: email,
      subject: `You're invited to join ${teamName}`,
      template: 'team-invitation',
      context: {
        inviterName,
        teamName,
        inviteUrl,
      },
    });
  }

  /**
   * Send skill badge earned notification
   */
  async sendSkillBadgeEmail(
    email: string,
    userName: string,
    skillName: string,
    level: string,
  ) {
    return this.sendEmail({
      to: email,
      subject: `You earned a ${level} badge in ${skillName}!`,
      template: 'skill-badge',
      context: {
        userName,
        skillName,
        level,
      },
    });
  }

  /**
   * Send bulk email notification (for admins)
   */
  async sendBulkNotification(
    recipients: string[],
    subject: string,
    message: string,
  ) {
    const promises = recipients.map((email) =>
      this.sendEmail({
        to: email,
        subject,
        html: message,
      }),
    );

    const results = await Promise.allSettled(promises);
    const successful = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    this.logger.log(`Bulk email sent: ${successful} successful, ${failed} failed`);

    return { successful, failed, total: recipients.length };
  }

  /**
   * Send reminder email for incomplete courses
   */
  async sendCourseReminderEmail(
    email: string,
    userName: string,
    courseName: string,
    progress: number,
    courseUrl: string,
  ) {
    return this.sendEmail({
      to: email,
      subject: `Continue your progress in ${courseName}`,
      template: 'course-reminder',
      context: {
        userName,
        courseName,
        progress,
        courseUrl,
      },
    });
  }
}

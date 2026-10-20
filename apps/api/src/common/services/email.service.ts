// ============================================================================
// EmailService
// ============================================================================
// Wraps Resend for sending transactional emails using HTML templates.

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class EmailService {
  private resend: Resend;
  private readonly logger = new Logger(EmailService.name);

  constructor(private config: ConfigService) {
    const apiKey = this.config.get<string>('RESEND_API_KEY');

    if (apiKey && apiKey !== 'placeholder') {
      this.resend = new Resend(apiKey);
    } else {
      this.logger.warn('RESEND_API_KEY is not set. Emails will be logged to console.');
    }
  }

  async sendVerificationEmail(to: string, token: string) {
    const html = this.renderTemplate('verify-email.html', token);
    return this.send(to, 'Verify your TrellisFlow account', html);
  }

  async sendPasswordResetEmail(to: string, token: string) {
    const html = this.renderTemplate('reset-password.html', token);
    return this.send(to, 'Reset your TrellisFlow password', html);
  }

  /**
   * Reads an HTML template from disk and replaces the {{token}} placeholder.
   */
  private renderTemplate(templateName: string, token: string): string {
    // Resolve path relative to the compiled dist directory
    const templatePath = path.join(__dirname, '..', 'templates', templateName);

    try {
      const template = fs.readFileSync(templatePath, 'utf-8');
      return template.replace('{{token}}', token);
    } catch (error) {
      this.logger.error(`Failed to load template: ${templateName}`, error);
      // Fallback to plain text if file isn't found
      return `<p>Your token is: <strong>${token}</strong></p>`;
    }
  }

  private async send(to: string, subject: string, html: string) {
    if (!this.resend) {
      this.logger.log(`📧 [DEV EMAIL] To: ${to} | Subject: ${subject}`);
      this.logger.debug(`📧 HTML Body:\n${html}`);
      return;
    }

    try {
      await this.resend.emails.send({
        from: this.config.get('EMAIL_FROM') || 'noreply@trellisflow.com',
        to,
        subject,
        html,
      });
      this.logger.log(`Email sent successfully to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}`, error);
    }
  }
}

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
    // Resolve path relative to the compiled dist directory.
    const templatePath = path.join(__dirname, '..', 'templates', templateName);

    try {
      const template = fs.readFileSync(templatePath, 'utf-8');
      return template.replace('{{token}}', token);
    } catch (error) {
      this.logger.error(`Failed to load template: ${templateName}`, error);

      // Fallback to plain HTML if the template cannot be found.
      return `<p>Your token is: <strong>${token}</strong></p>`;
    }
  }

  private async send(to: string, subject: string, html: string) {
    // Bypass sending real emails in test environments to prevent Resend 403 errors
    if (process.env.NODE_ENV === 'test') {
      console.log(`[EmailService] Mocked email send to ${to}: ${subject}`);
      return;
    }

    if (!this.resend) {
      this.logger.log(`📧 [DEV EMAIL] To: ${to} | Subject: ${subject}`);
      this.logger.debug(`📧 Body: ${html}`);
      return;
    }

    try {
      const response = await this.resend.emails.send({
        from: this.config.get<string>('EMAIL_FROM') || 'onboarding@resend.dev',
        to,
        subject,
        html,
      });

      // Log the full response from Resend for debugging.
      this.logger.log(`Resend response: ${JSON.stringify(response)}`);

      if (response.error) {
        this.logger.error(`Resend API Error: ${response.error.message}`);
      } else {
        this.logger.log(`Email sent successfully to ${to}`);
      }
    } catch (error) {
      this.logger.error(`Exception sending email to ${to}`, error);

      if (error instanceof Error) {
        this.logger.error(`Error details: ${error.message}`);
      }
    }
  }
}

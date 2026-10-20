// ============================================================================
// EmailService
// ============================================================================
// Wraps Resend for sending transactional emails.

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private resend: Resend;
  private readonly logger = new Logger(EmailService.name);

  constructor(private config: ConfigService) {
    const apiKey = this.config.get<string>('RESEND_API_KEY');

    // If no API key is set (like in local development), we just log to console.
    if (apiKey && apiKey !== 'placeholder') {
      this.resend = new Resend(apiKey);
    } else {
      this.logger.warn(
        'RESEND_API_KEY is not set or is a placeholder. Emails will be logged to console.',
      );
    }
  }

  async sendVerificationEmail(to: string, token: string) {
    // We will replace this with proper HTML templates in Step 4.
    const html = `<p>Your verification token is: <strong>${token}</strong></p>`;
    return this.send(to, 'Verify your TrellisFlow account', html);
  }

  async sendPasswordResetEmail(to: string, token: string) {
    const html = `<p>Your password reset token is: <strong>${token}</strong></p>`;
    return this.send(to, 'Reset your TrellisFlow password', html);
  }

  private async send(to: string, subject: string, html: string) {
    if (!this.resend) {
      // Local development fallback
      this.logger.log(`📧 [DEV EMAIL] To: ${to} | Subject: ${subject}`);
      this.logger.log(`📧 Body: ${html}`);
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

import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly transporter: nodemailer.Transporter | null;

  constructor(private readonly config: ConfigService) {
    const host = this.config.get<string>("SMTP_HOST");
    const port = this.config.get<number>("SMTP_PORT");
    const user = this.config.get<string>("SMTP_USER");
    const pass = this.config.get<string>("SMTP_PASS");

    if (host && port && user && pass) {
      const options: SMTPTransport.Options = {
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      };
      this.transporter = nodemailer.createTransport(options);
    } else {
      this.logger.warn("SMTP credentials missing. Emails will be logged to console.");
      this.transporter = null;
    }
  }

  async sendVerificationEmail(to: string, link: string) {
    const subject = "Verifica tu email para continuar en Tango";
    const html = `
      <p>Hola. Para finalizar tu registro en <strong>Tango</strong> necesitas verificar tu email.</p>
      <p>
        <a href="${link}" target="_blank" rel="noopener">Hace click aqui para verificar tu cuenta</a>
        (el enlace vence en 24 horas).
      </p>
      <p>Si no creaste esta cuenta, ignora este mensaje.</p>
    `;

    if (this.transporter) {
      await this.transporter.sendMail({
        from: this.config.get<string>("SMTP_FROM") ?? "no-reply@tango.app",
        to,
        subject,
        html,
      });
    } else {
      this.logger.log(`Verification email for ${to}: ${link}`);
    }
  }
}

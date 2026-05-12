import dotenv from "dotenv";
import * as nodemailer from "nodemailer";
import logger from "../config/logger.js";

dotenv.config();

class EmailDeliveryService {
  private readonly transporter: nodemailer.Transporter;

  constructor() {
    const host = process.env.SMTP_HOST || "localhost";
    const port = Number(process.env.SMTP_PORT || 1025);
    const secure = process.env.SMTP_SECURE === "true";
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASSWORD;

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      ...(user && pass ? { auth: { user, pass } } : {}),
    });

    logger.info("Email delivery service initialized", {
      host,
      port,
      secure,
    });
  }

  async verifyConnection() {
    await this.transporter.verify();
    logger.info("Email delivery service connection verified");
  }

  async sendEmail(message: nodemailer.SendMailOptions) {
    const info = await this.transporter.sendMail({
      from:
        message.from ||
        process.env.EMAIL_FROM ||
        "Wellspring <no-reply@wellspring.local>",
      ...message,
    });

    logger.info("Email sent", {
      messageId: info.messageId,
      to: message.to,
    });

    return info;
  }
}

export default new EmailDeliveryService();

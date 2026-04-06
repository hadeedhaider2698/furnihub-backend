import nodemailer from 'nodemailer';
import logger from '../utils/logger.js';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'hadeedhaider2698@gmail.com',
    pass: process.env.EMAIL_PASS, // Needs to be App Password from .env
  },
});

export const sendEmail = async (options) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM || '"FurniHub" <hadeedhaider2698@gmail.com>',
      to: options.email,
      subject: options.subject,
      html: options.html,
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info(`Email sent to ${options.email}: ${info.messageId}`);
    return true;
  } catch (error) {
    logger.error(`Error sending email to ${options.email}: ${error.message}`);
    return false;
  }
};

export const sendWelcomeEmail = async (userEmail, userName) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
      <h2 style="color: #8b5a2b;">Welcome to FurniHub, ${userName}!</h2>
      <p>We are thrilled to have you on board. Discover premium furniture and transform your space today with our curated collections.</p>
      <p style="margin-top: 20px;">
        <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}" style="display: inline-block; padding: 12px 24px; background-color: #8b5a2b; color: #fff; text-decoration: none; border-radius: 6px; font-weight: bold;">Start Exploring</a>
      </p>
    </div>
  `;
  return await sendEmail({ email: userEmail, subject: 'Welcome to FurniHub!', html });
};

export const sendOrderConfirmationEmail = async (userEmail, userName, orderNumber, total) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
      <h2 style="color: #8b5a2b;">Order Confirmed!</h2>
      <p>Hi ${userName},</p>
      <p>Thank you for shopping with FurniHub. Your order <strong>#${orderNumber}</strong> has been successfully placed.</p>
      <p style="font-size: 18px; font-weight: bold; margin: 20px 0;">Total Amount: $${total}</p>
      <p>We will notify you once your items are shipped. You can view your order status in your dashboard.</p>
    </div>
  `;
  return await sendEmail({ email: userEmail, subject: `Order Confirmation - #${orderNumber}`, html });
};

export const sendPasswordResetEmail = async (userEmail, userName, resetUrl) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
      <h2 style="color: #8b5a2b;">Password Reset Request</h2>
      <p>Hi ${userName},</p>
      <p>We received a request to reset your password. Click the button below to choose a new one. This link is valid for 10 minutes.</p>
      <p style="margin-top: 20px;">
        <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #8b5a2b; color: #fff; text-decoration: none; border-radius: 6px; font-weight: bold;">Reset Password</a>
      </p>
      <p style="margin-top: 20px; font-size: 12px; color: #777;">If you did not request a password reset, please ignore this email.</p>
    </div>
  `;
  return await sendEmail({ email: userEmail, subject: 'FurniHub - Password Reset Request', html });
};

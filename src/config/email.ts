import { Resend } from 'resend';

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY);

// Email templates
export const emailTemplates = {
  welcome: (name: string) => ({
    subject: 'Welcome to ServicePro!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333;">Welcome to ServicePro, ${name}!</h1>
        <p>Thank you for joining ServicePro. We're excited to have you on board.</p>
        <p>You can now start using our field service management platform to:</p>
        <ul>
          <li>Request services</li>
          <li>Track service status</li>
          <li>Make payments</li>
          <li>Communicate with technicians</li>
        </ul>
        <p>If you have any questions, feel free to reach out to our support team.</p>
        <p>Best regards,<br>The ServicePro Team</p>
      </div>
    `,
  }),

  serviceRequestCreated: (customerName: string, requestTitle: string) => ({
    subject: 'Service Request Created',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333;">Service Request Created</h1>
        <p>Dear ${customerName},</p>
        <p>Your service request "${requestTitle}" has been created successfully.</p>
        <p>Our team will review your request and assign a technician shortly.</p>
        <p>You can track the status of your request in your dashboard.</p>
        <p>Best regards,<br>The ServicePro Team</p>
      </div>
    `,
  }),

  technicianAssigned: (customerName: string, technicianName: string, requestTitle: string) => ({
    subject: 'Technician Assigned',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333;">Technician Assigned</h1>
        <p>Dear ${customerName},</p>
        <p>Good news! Technician ${technicianName} has been assigned to your service request "${requestTitle}".</p>
        <p>The technician will contact you to schedule a visit.</p>
        <p>Best regards,<br>The ServicePro Team</p>
      </div>
    `,
  }),

  paymentConfirmation: (customerName: string, amount: number, requestTitle: string) => ({
    subject: 'Payment Confirmation',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333;">Payment Confirmed</h1>
        <p>Dear ${customerName},</p>
        <p>We've received your payment of $${amount.toFixed(2)} for "${requestTitle}".</p>
        <p>Thank you for using ServicePro!</p>
        <p>Best regards,<br>The ServicePro Team</p>
      </div>
    `,
  }),

  serviceCompleted: (customerName: string, requestTitle: string) => ({
    subject: 'Service Completed',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333;">Service Completed</h1>
        <p>Dear ${customerName},</p>
        <p>Your service request "${requestTitle}" has been completed.</p>
        <p>We'd love to hear your feedback about the service.</p>
        <p>Best regards,<br>The ServicePro Team</p>
      </div>
    `,
  }),
};

// Email helper functions
export const emailHelpers = {
  async sendEmail(to: string, subject: string, html: string) {
    try {
      const data = await resend.emails.send({
        from: process.env.EMAIL_FROM || 'ServicePro <onboarding@resend.dev>',
        to,
        subject,
        html,
      });
      return { success: true, data };
    } catch (error) {
      console.error('Email sending failed:', error);
      return { success: false, error };
    }
  },

  async sendWelcomeEmail(email: string, name: string) {
    const template = emailTemplates.welcome(name);
    return this.sendEmail(email, template.subject, template.html);
  },

  async sendServiceRequestCreated(email: string, name: string, requestTitle: string) {
    const template = emailTemplates.serviceRequestCreated(name, requestTitle);
    return this.sendEmail(email, template.subject, template.html);
  },

  async sendTechnicianAssigned(email: string, name: string, technicianName: string, requestTitle: string) {
    const template = emailTemplates.technicianAssigned(name, technicianName, requestTitle);
    return this.sendEmail(email, template.subject, template.html);
  },

  async sendPaymentConfirmation(email: string, name: string, amount: number, requestTitle: string) {
    const template = emailTemplates.paymentConfirmation(name, amount, requestTitle);
    return this.sendEmail(email, template.subject, template.html);
  },

  async sendServiceCompleted(email: string, name: string, requestTitle: string) {
    const template = emailTemplates.serviceCompleted(name, requestTitle);
    return this.sendEmail(email, template.subject, template.html);
  },
};

export { resend };
export default resend;
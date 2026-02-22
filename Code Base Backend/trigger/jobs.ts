/**
 * Trigger.dev Job Definitions
 *
 * These jobs run in the background and handle:
 * - Sending notifications
 * - Processing alerts
 * - Scheduled tasks
 */

import { Trigger } from "@trigger.dev/sdk";
import { Resend } from "@trigger.dev/resend";

// Initialize Trigger client
const client = new Trigger({
  id: "er-command-center",
  apiKey: process.env.TRIGGER_API_KEY!,
  apiUrl: process.env.TRIGGER_API_URL,
});

// Initialize integrations
const resend = new Resend({
  id: "resend",
  apiKey: process.env.RESEND_API_KEY!,
});

// ==================== Notification Jobs ====================

/**
 * Send Email Notification
 */
client.defineJob({
  id: "send-email",
  name: "Send Email Notification",
  version: "1.0.0",
  trigger: client.trigger.event({
    name: "email.send",
  }),
  integrations: {
    resend,
  },
  run: async (payload, io, ctx) => {
    const { to, subject, body, html_body, priority } = payload;

    await io.logger.info(`Sending email to ${to}`);

    // Send email via Resend
    const result = await io.resend.emails.send("send-email", {
      from: "ER Command Center <notifications@ercommandcenter.com>",
      to: [to],
      subject: subject,
      text: body,
      html: html_body || body,
    });

    await io.logger.info(`Email sent: ${result.id}`);

    return {
      success: true,
      messageId: result.id,
    };
  },
});

/**
 * Send Push Notification
 */
client.defineJob({
  id: "send-push",
  name: "Send Push Notification",
  version: "1.0.0",
  trigger: client.trigger.event({
    name: "push.send",
  }),
  run: async (payload, io, ctx) => {
    const { user_id, title, body, data, priority } = payload;

    await io.logger.info(`Sending push notification to user ${user_id}`);

    // TODO: Integrate with Firebase Cloud Messaging or OneSignal
    // For now, log the notification
    await io.logger.info(`Push: ${title} - ${body}`);

    return {
      success: true,
      messageId: `push-${Date.now()}`,
    };
  },
});

// ==================== Alert Processing ====================

/**
 * Process Alert and Notify Users
 */
client.defineJob({
  id: "process-alert",
  name: "Process Alert",
  version: "1.0.0",
  trigger: client.trigger.event({
    name: "alert.process",
  }),
  run: async (payload, io, ctx) => {
    const { alert_id, title, message, priority, target_users, target_roles } = payload;

    await io.logger.info(`Processing alert ${alert_id} for roles: ${target_roles.join(", ")}`);

    // TODO: Query database for users with target_roles
    // TODO: Send push notifications to all target users
    // TODO: For critical alerts, also send SMS

    if (priority === "critical") {
      await io.logger.warn(`CRITICAL ALERT: ${title}`);
      // Send SMS to on-duty staff
    }

    return {
      success: true,
      alert_id,
      notified_users: target_users.length,
    };
  },
});

/**
 * Critical Vitals Alert
 */
client.defineJob({
  id: "critical-vitals-alert",
  name: "Critical Vitals Alert",
  version: "1.0.0",
  trigger: client.trigger.event({
    name: "vitals.critical",
  }),
  run: async (payload, io, ctx) => {
    const { patient_id, patient_name, bed_number, message, target_roles } = payload;

    await io.logger.warn(`CRITICAL VITALS: ${patient_name} (${bed_number})`);

    // Send immediate notifications to all nurses and doctors on duty
    // This is high priority - use SMS + Push

    return {
      success: true,
      patient_id,
      alert_sent: true,
    };
  },
});

/**
 * Police Case Alert
 */
client.defineJob({
  id: "police-case-alert",
  name: "Police Case Alert",
  version: "1.0.0",
  trigger: client.trigger.event({
    name: "police-case.created",
  }),
  run: async (payload, io, ctx) => {
    const { case_id, patient_name, case_type, reported_by } = payload;

    await io.logger.info(`Police case ${case_id} created for ${patient_name}`);

    // Notify all admin users
    // Send email and push notification

    return {
      success: true,
      case_id,
    };
  },
});

// ==================== Scheduled Jobs ====================

/**
 * Patient Follow-up Reminder
 */
client.defineJob({
  id: "patient-followup",
  name: "Patient Follow-up Reminder",
  version: "1.0.0",
  trigger: client.trigger.event({
    name: "followup.reminder",
  }),
  run: async (payload, io, ctx) => {
    const { patient_id, doctor_id, followup_date, notes } = payload;

    await io.logger.info(`Follow-up reminder for patient ${patient_id}`);

    // Send reminder to doctor
    // Send reminder to patient (if contact info available)

    return {
      success: true,
      patient_id,
      doctor_id,
    };
  },
});

/**
 * Batch Notifications
 */
client.defineJob({
  id: "batch-notifications",
  name: "Batch Notifications",
  version: "1.0.0",
  trigger: client.trigger.event({
    name: "notifications.batch",
  }),
  run: async (payload, io, ctx) => {
    const { notifications, count } = payload;

    await io.logger.info(`Processing ${count} notifications`);

    // Process notifications in batches
    for (const notification of notifications) {
      if (notification.type === "sms") {
        await io.sendEvent("send-sms", notification);
      } else if (notification.type === "email") {
        await io.sendEvent("send-email", notification);
      } else if (notification.type === "push") {
        await io.sendEvent("send-push", notification);
      }
    }

    return {
      success: true,
      processed: count,
    };
  },
});

/**
 * Cleanup Old Data (runs daily)
 */
client.defineJob({
  id: "cleanup-old-data",
  name: "Cleanup Old Data",
  version: "1.0.0",
  trigger: client.trigger.scheduled({
    cron: "0 2 * * *", // Run at 2 AM daily
  }),
  run: async (payload, io, ctx) => {
    await io.logger.info("Running data cleanup job");

    // TODO: Delete old audit logs
    // TODO: Archive old patient records
    // TODO: Clean up expired sessions

    return {
      success: true,
      cleaned_at: new Date().toISOString(),
    };
  },
});

export { client };

/**
 * Lead Digest Job
 *
 * Sends daily email digests of captured leads to project owners.
 * Runs via cron job: 0 9 * * * (daily at 9 AM)
 */

import { Resend } from "resend";
import { supabaseAdmin } from "../lib/supabase";
import {
  getPendingLeads,
  markLeadsAsNotified,
  type LeadCapture,
} from "../services/lead-capture";

const resend = new Resend(process.env.RESEND_API_KEY);

interface ProjectWithSettings {
  id: string;
  name: string;
  settings: {
    lead_capture_enabled?: boolean;
    lead_capture_email?: string;
    lead_notifications_enabled?: boolean;
    last_lead_digest_at?: string;
  };
  user_id: string;
}

/**
 * Send daily lead digest emails
 * Called by cron endpoint
 */
export async function sendLeadDigests(): Promise<{
  processed: number;
  sent: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let processed = 0;
  let sent = 0;

  try {
    // Get all projects with lead capture and notifications enabled
    const { data: projects, error } = await supabaseAdmin
      .from("projects")
      .select("id, name, settings, user_id")
      .is("deleted_at", null);

    if (error) {
      throw new Error(`Failed to fetch projects: ${error.message}`);
    }

    if (!projects || projects.length === 0) {
      return { processed: 0, sent: 0, errors: [] };
    }

    // Filter projects with lead capture enabled
    const eligibleProjects = (projects as ProjectWithSettings[]).filter((p) => {
      const settings = p.settings || {};
      return (
        settings.lead_capture_enabled === true &&
        settings.lead_notifications_enabled !== false &&
        settings.lead_capture_email
      );
    });

    for (const project of eligibleProjects) {
      processed++;

      try {
        const settings = project.settings;
        const notificationEmail = settings.lead_capture_email;

        if (!notificationEmail) continue;

        // Get pending leads for this project
        const leads = await getPendingLeads(project.id);

        if (leads.length === 0) continue;

        // Build and send email
        const emailHtml = buildDigestEmailHtml(project.name, leads);
        const emailText = buildDigestEmailText(project.name, leads);

        const fromAddress =
          process.env.EMAIL_FROM_ADDRESS || "hello@frontface.app";

        const { error: sendError } = await resend.emails.send({
          from: `FrontFace <${fromAddress}>`,
          to: notificationEmail,
          subject: `[${project.name}] ${leads.length} Unanswered Question${leads.length > 1 ? "s" : ""} (${formatDate(new Date())})`,
          html: emailHtml,
          text: emailText,
        });

        if (sendError) {
          errors.push(`Project ${project.id}: ${sendError.message}`);
          continue;
        }

        // Mark leads as notified
        await markLeadsAsNotified(leads.map((l) => l.id));

        // Update last digest time
        await supabaseAdmin
          .from("projects")
          .update({
            settings: {
              ...settings,
              last_lead_digest_at: new Date().toISOString(),
            },
          })
          .eq("id", project.id);

        sent++;
        console.log(
          `Sent lead digest for project ${project.id}: ${leads.length} leads`
        );
      } catch (projectError) {
        const message =
          projectError instanceof Error
            ? projectError.message
            : "Unknown error";
        errors.push(`Project ${project.id}: ${message}`);
        console.error(`Failed to send digest for project ${project.id}:`, projectError);
      }
    }

    return { processed, sent, errors };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    errors.push(message);
    return { processed, sent, errors };
  }
}

/**
 * Build HTML email content
 */
function buildDigestEmailHtml(
  projectName: string,
  leads: LeadCapture[]
): string {
  const leadsList = leads
    .map(
      (lead, i) => `
    <tr>
      <td style="padding: 16px; border-bottom: 1px solid #e5e7eb;">
        <div style="font-weight: 500; margin-bottom: 4px;">${i + 1}. "${escapeHtml(lead.question)}"</div>
        <div style="color: #6b7280; font-size: 14px;">
          ${
            lead.user_email
              ? `📧 Contact: <a href="mailto:${lead.user_email}" style="color: #2563eb;">${lead.user_email}</a>`
              : "📧 Contact: Not provided"
          }
        </div>
        <div style="color: #9ca3af; font-size: 12px; margin-top: 4px;">
          ${formatDateTime(new Date(lead.created_at))}
        </div>
      </td>
    </tr>
  `
    )
    .join("");

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #374151; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
      <div style="background: white; border-radius: 8px; padding: 24px; margin-bottom: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <h1 style="margin: 0 0 8px 0; font-size: 20px; color: #111827;">
          📋 Unanswered Questions
        </h1>
        <p style="margin: 0; color: #6b7280;">
          Your chatbot "${escapeHtml(projectName)}" couldn't answer ${leads.length} question${leads.length > 1 ? "s" : ""} in the last 24 hours.
        </p>
      </div>

      <table style="width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        ${leadsList}
      </table>

      <div style="margin-top: 24px; padding: 16px; background: #fef3c7; border-radius: 8px;">
        <p style="margin: 0; font-size: 14px; color: #92400e;">
          💡 <strong>Tip:</strong> Consider adding this information to your knowledge base to help future visitors get instant answers.
        </p>
      </div>

      <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb; color: #9ca3af; font-size: 12px;">
        <p style="margin: 0;">
          You're receiving this because you enabled lead capture notifications for "${escapeHtml(projectName)}".
          <br>Manage settings in your dashboard.
        </p>
      </div>
    </body>
    </html>
  `;
}

/**
 * Build plain text email content
 */
function buildDigestEmailText(
  projectName: string,
  leads: LeadCapture[]
): string {
  const leadsText = leads
    .map(
      (lead, i) =>
        `${i + 1}. "${lead.question}"\n   Contact: ${lead.user_email || "Not provided"}\n   Time: ${formatDateTime(new Date(lead.created_at))}`
    )
    .join("\n\n");

  return `
UNANSWERED QUESTIONS
====================

Your chatbot "${projectName}" couldn't answer ${leads.length} question${leads.length > 1 ? "s" : ""} in the last 24 hours.

${leadsText}

---

TIP: Consider adding this information to your knowledge base to help future visitors get instant answers.

---

You're receiving this because you enabled lead capture notifications for "${projectName}".
Manage settings in your dashboard.
  `.trim();
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Format date for email subject
 */
function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

/**
 * Format date and time for lead details
 */
function formatDateTime(date: Date): string {
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

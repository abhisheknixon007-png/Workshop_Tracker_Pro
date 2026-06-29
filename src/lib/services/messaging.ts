// Messaging & Integration Service (Email and WhatsApp)
import { createAuditLog } from '../supabaseDb';

export type NotificationTemplateType = 
  | 'approval_confirmation' 
  | 'attendance_reminder' 
  | 'pending_activities_alert' 
  | 'performance_summary' 
  | 'trainer_summary_notification';

interface MessageSendResult {
  success: boolean;
  message: string;
  providerUsed: string;
  details: string;
}

// Retrieve messaging settings from localStorage or environment
export function getMessagingSettings() {
  if (typeof window === 'undefined') {
    return {
      emailProvider: 'none',
      sendgridKey: '',
      sendgridSender: '',
      whatsappProvider: 'none',
      twilioSid: '',
      twilioToken: '',
      twilioFrom: '',
      testRecipient: ''
    };
  }

  return {
    emailProvider: localStorage.getItem('tracker_email_provider') || 'none',
    sendgridKey: localStorage.getItem('tracker_sendgrid_key') || '',
    sendgridSender: localStorage.getItem('tracker_sendgrid_sender') || '',
    whatsappProvider: localStorage.getItem('tracker_whatsapp_provider') || 'none',
    twilioSid: localStorage.getItem('tracker_twilio_sid') || '',
    twilioToken: localStorage.getItem('tracker_twilio_token') || '',
    twilioFrom: localStorage.getItem('tracker_twilio_from') || '',
    testRecipient: localStorage.getItem('tracker_twilio_test_recipient') || ''
  };
}

// Call SendGrid Web API to send emails
export async function sendEmail(to: string, subject: string, htmlContent: string): Promise<MessageSendResult> {
  const settings = getMessagingSettings();

  if (settings.emailProvider === 'sendgrid' && settings.sendgridKey && settings.sendgridSender) {
    try {
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${settings.sendgridKey}`
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: to }] }],
          from: { email: settings.sendgridSender },
          subject: subject,
          content: [{ type: 'text/html', value: htmlContent }]
        })
      });

      if (!response.ok) {
        throw new Error(`SendGrid API returned status ${response.status}`);
      }

      await createAuditLog(null, 'EMAIL_SENT', `Sent email to ${to} via SendGrid. Subject: ${subject}`);
      return {
        success: true,
        message: 'Email sent successfully!',
        providerUsed: 'SendGrid Web API',
        details: `Sent to ${to}`
      };
    } catch (err: any) {
      console.warn('SendGrid email call failed:', err?.message || String(err));
      // Fall through to simulation if API call fails
      await createAuditLog(null, 'EMAIL_FAILED', `Failed to send SendGrid email to ${to}: ${err?.message || String(err)}. Triggered simulator.`);
    }
  }

  // Simulator Fallback
  console.log(`[SIMULATOR EMAIL]
  To: ${to}
  From: ${settings.sendgridSender || 'simulator@workshop.com'}
  Subject: ${subject}
  Content: ${htmlContent.substring(0, 100)}...`);

  await createAuditLog(null, 'EMAIL_SIMULATION', `[SIMULATION] Email sent to ${to}. Subject: ${subject}`);
  
  return {
    success: true,
    message: 'Email simulated successfully!',
    providerUsed: 'Sandbox Email Simulator',
    details: `Simulated transmission to ${to}`
  };
}

// Call Twilio Web API to send WhatsApp messages
export async function sendWhatsApp(to: string, messageBody: string): Promise<MessageSendResult> {
  const settings = getMessagingSettings();

  // Clean phone number format for WhatsApp (must start with + and country code, e.g. +14155252771)
  let cleanTo = to.replace(/[\s-()]/g, '');
  if (!cleanTo.startsWith('+')) {
    cleanTo = '+' + cleanTo;
  }

  if (settings.whatsappProvider === 'twilio' && settings.twilioSid && settings.twilioToken && settings.twilioFrom) {
    try {
      const basicAuth = btoa(`${settings.twilioSid}:${settings.twilioToken}`);
      const bodyParams = new URLSearchParams();
      bodyParams.append('To', `whatsapp:${cleanTo}`);
      bodyParams.append('From', `whatsapp:${settings.twilioFrom}`);
      bodyParams.append('Body', messageBody);

      const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${settings.twilioSid}/Messages.json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${basicAuth}`
        },
        body: bodyParams
      });

      if (!response.ok) {
        throw new Error(`Twilio API returned status ${response.status}`);
      }

      await createAuditLog(null, 'WHATSAPP_SENT', `Sent WhatsApp to ${cleanTo} via Twilio.`);
      return {
        success: true,
        message: 'WhatsApp message sent successfully!',
        providerUsed: 'Twilio WhatsApp API',
        details: `Sent to ${cleanTo}`
      };
    } catch (err: any) {
      console.warn('Twilio WhatsApp call failed:', err?.message || String(err));
      await createAuditLog(null, 'WHATSAPP_FAILED', `Failed to send Twilio WhatsApp to ${cleanTo}: ${err?.message || String(err)}. Triggered simulator.`);
    }
  }

  // Simulator Fallback
  console.log(`[SIMULATOR WHATSAPP]
  To: ${cleanTo}
  From: ${settings.twilioFrom || 'whatsapp:+14155252771'}
  Message: ${messageBody}`);

  await createAuditLog(null, 'WHATSAPP_SIMULATION', `[SIMULATION] WhatsApp message sent to ${cleanTo}. Contents: "${messageBody}"`);

  return {
    success: true,
    message: 'WhatsApp message simulated successfully!',
    providerUsed: 'Sandbox WhatsApp Simulator',
    details: `Simulated transmission to ${cleanTo}`
  };
}

/**
 * Compile and transmit notification templates (combines Email and WhatsApp alerts)
 */
export async function sendNotificationTemplate(
  type: NotificationTemplateType,
  recipientName: string,
  recipientEmail: string,
  recipientPhone: string,
  data: Record<string, any>
): Promise<{ emailResult: MessageSendResult; whatsappResult: MessageSendResult }> {
  const settings = getMessagingSettings();
  let subject = '';
  let emailHtml = '';
  let whatsappBody = '';

  const dashboardUrl = typeof window !== 'undefined' ? `${window.location.origin}/login` : 'http://localhost:3000/login';

  switch (type) {
    case 'approval_confirmation':
      subject = 'Workshop Tracker Pro - Your Account has been Approved!';
      emailHtml = `
        <div style="font-family: sans-serif; padding: 20px; color: #334155; line-height: 1.6;">
          <h2 style="color: #4f46e5;">Welcome to Workshop Tracker Pro, ${recipientName}!</h2>
          <p>We are excited to let you know that your account registration has been approved by the system administrator.</p>
          <p>You can now sign in to your dashboard to access your workshops, schedules, and analytics.</p>
          <a href="${dashboardUrl}" style="display: inline-block; padding: 10px 20px; background-color: #4f46e5; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; margin-top: 15px;">Sign In to Dashboard</a>
          <p style="margin-top: 25px; font-size: 11px; color: #94a3b8;">This is an automated system notification.</p>
        </div>
      `;
      whatsappBody = `Hi ${recipientName}, your account on Workshop Tracker Pro has been approved! You can now log in to access your course files and details at: ${dashboardUrl}`;
      break;

    case 'attendance_reminder':
      subject = `Attendance Review Required: ${data.workshopName}`;
      emailHtml = `
        <div style="font-family: sans-serif; padding: 20px; color: #334155; line-height: 1.6;">
          <h2 style="color: #e11d48;">Attendance Alert: ${data.workshopName}</h2>
          <p>Dear ${recipientName},</p>
          <p>Your attendance in the workshop <strong>"${data.workshopName}"</strong> is currently sitting at <strong style="color: #e11d48;">${data.attendancePct}%</strong>.</p>
          <p>This falls below the minimum required threshold of ${data.minThreshold || 80}% needed for certificate eligibility.</p>
          <p>Please ensure you attend the upcoming scheduled sessions to secure your certification status.</p>
          <a href="${dashboardUrl}" style="display: inline-block; padding: 10px 20px; background-color: #4f46e5; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; margin-top: 15px;">View Attendance Log</a>
        </div>
      `;
      whatsappBody = `Hi ${recipientName}, your attendance in the workshop "${data.workshopName}" is currently ${data.attendancePct}%, which falls below the certification threshold. Please attend upcoming sessions. Log: ${dashboardUrl}`;
      break;

    case 'pending_activities_alert':
      subject = `Pending Lab Submissions: ${data.workshopName}`;
      emailHtml = `
        <div style="font-family: sans-serif; padding: 20px; color: #334155; line-height: 1.6;">
          <h2 style="color: #d97706;">Action Needed: Outstanding Lab Assignments</h2>
          <p>Dear ${recipientName},</p>
          <p>Our records show that you have <strong style="color: #d97706;">${data.pendingCount} pending activities</strong> in the workshop <strong>"${data.workshopName}"</strong>.</p>
          <p>Practical workshops are hands-on and require completion of all assignments to qualify for certification.</p>
          <p>Please finalize and submit your pending work as soon as possible.</p>
          <a href="${dashboardUrl}" style="display: inline-block; padding: 10px 20px; background-color: #4f46e5; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; margin-top: 15px;">Submit Pending Work</a>
        </div>
      `;
      whatsappBody = `Hi ${recipientName}, you have ${data.pendingCount} pending laboratory activities in "${data.workshopName}". Please submit them as soon as possible to receive certification credit. Sign in: ${dashboardUrl}`;
      break;

    case 'performance_summary':
      subject = `Course Completion Summary: ${data.workshopName}`;
      emailHtml = `
        <div style="font-family: sans-serif; padding: 20px; color: #334155; line-height: 1.6;">
          <h2 style="color: #4f46e5;">Workshop Performance Summary Report</h2>
          <p>Dear ${recipientName},</p>
          <p>Here are your final scores for <strong>"${data.workshopName}"</strong>:</p>
          <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
            <tr style="border-b: 1px solid #e2e8f0;"><td style="padding: 8px 0; font-weight: bold;">Attendance Rate</td><td style="padding: 8px 0; font-family: monospace;">${data.attendancePct}%</td></tr>
            <tr style="border-b: 1px solid #e2e8f0;"><td style="padding: 8px 0; font-weight: bold;">Completed Labs</td><td style="padding: 8px 0; font-family: monospace;">${data.completedCount}/${data.totalCount}</td></tr>
            <tr style="border-b: 1px solid #e2e8f0;"><td style="padding: 8px 0; font-weight: bold;">Assessment Grade Average</td><td style="padding: 8px 0; font-family: monospace; color: #4f46e5; font-weight: bold;">${data.averageGrade}%</td></tr>
            <tr style="border-b: 1px solid #e2e8f0;"><td style="padding: 8px 0; font-weight: bold;">Certification Status</td><td style="padding: 8px 0; font-weight: bold; color: ${data.eligible ? '#10b981' : '#ef4444'};">${data.certificateStatus}</td></tr>
          </table>
          <p style="margin-top: 20px;">We appreciate your participation and hard work in this workshop!</p>
          <a href="${dashboardUrl}" style="display: inline-block; padding: 10px 20px; background-color: #4f46e5; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; margin-top: 15px;">Access Certificate PDF</a>
        </div>
      `;
      whatsappBody = `Hi ${recipientName}, here is your summary for "${data.workshopName}": Attendance: ${data.attendancePct}%, Average Grade: ${data.averageGrade}%. Certificate status: ${data.certificateStatus}. View details: ${dashboardUrl}`;
      break;

    case 'trainer_summary_notification':
      subject = `Class Performance Overview: ${data.workshopName}`;
      emailHtml = `
        <div style="font-family: sans-serif; padding: 20px; color: #334155; line-height: 1.6;">
          <h2 style="color: #4f46e5;">Workshop Analytics Executive Summary</h2>
          <p>Dear Trainer ${recipientName},</p>
          <p>Your workshop <strong>"${data.workshopName}"</strong> analytics report is compiled:</p>
          <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
            <tr style="border-b: 1px solid #e2e8f0;"><td style="padding: 8px 0; font-weight: bold;">Total Enrolled Learners</td><td style="padding: 8px 0; font-family: monospace;">${data.learnerCount} students</td></tr>
            <tr style="border-b: 1px solid #e2e8f0;"><td style="padding: 8px 0; font-weight: bold;">Average Attendance</td><td style="padding: 8px 0; font-family: monospace;">${data.avgAttendance}%</td></tr>
            <tr style="border-b: 1px solid #e2e8f0;"><td style="padding: 8px 0; font-weight: bold;">Class Grade Average</td><td style="padding: 8px 0; font-family: monospace; font-weight: bold; color: #4f46e5;">${data.avgGrade}%</td></tr>
            <tr style="border-b: 1px solid #e2e8f0;"><td style="padding: 8px 0; font-weight: bold;">Top Student Performer</td><td style="padding: 8px 0;">${data.topPerformerName} (${data.topPerformerScore}%)</td></tr>
          </table>
          <p style="margin-top: 20px;">Use this data to review class competencies and adjust lab resources.</p>
          <a href="${dashboardUrl}" style="display: inline-block; padding: 10px 20px; background-color: #4f46e5; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; margin-top: 15px;">Open Class Ledger</a>
        </div>
      `;
      whatsappBody = `Hi Trainer ${recipientName}, insights for "${data.workshopName}": Enrolled: ${data.learnerCount}, Class Attendance: ${data.avgAttendance}%, Class Average: ${data.avgGrade}%. Top performer is ${data.topPerformerName} (${data.topPerformerScore}%). Ledger: ${dashboardUrl}`;
      break;
  }

  // Send both notifications parallelly
  const [emailResult, whatsappResult] = await Promise.all([
    sendEmail(recipientEmail, subject, emailHtml),
    sendWhatsApp(recipientPhone || settings.testRecipient || '1234567890', whatsappBody)
  ]);

  return { emailResult, whatsappResult };
}

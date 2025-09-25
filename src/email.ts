import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { EmailTemplate, ProcessedSubmission, Config } from './types';

const sesClient = new SESClient({});

export function generateEmailTemplate(submission: ProcessedSubmission, config: Config): EmailTemplate {
  const { normalized, timestamp, ip, userAgent } = submission;
  
  // Create a clean subject line
  const subject = normalized.subject as string || 
                  normalized.name ? `Form submission from ${normalized.name}` : 
                  'New form submission';

  // Generate HTML body
  const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Form Submission</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #f4f4f4; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
        .field { margin-bottom: 15px; }
        .label { font-weight: bold; color: #555; }
        .value { margin-top: 5px; padding: 10px; background: #f9f9f9; border-radius: 3px; }
        .meta { margin-top: 30px; padding: 15px; background: #e9e9e9; border-radius: 5px; font-size: 0.9em; }
        .meta-item { margin-bottom: 5px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>New Form Submission</h2>
          <p>Received at ${new Date(timestamp).toLocaleString()}</p>
        </div>
        
        <div class="content">
          ${Object.entries(normalized)
            .filter(([key]) => !['timestamp', 'ip', 'userAgent'].includes(key))
            .map(([key, value]) => `
              <div class="field">
                <div class="label">${key.charAt(0).toUpperCase() + key.slice(1)}</div>
                <div class="value">${escapeHtml(String(value || ''))}</div>
              </div>
            `).join('')}
        </div>
        
        <div class="meta">
          <div class="meta-item"><strong>IP Address:</strong> ${ip}</div>
          <div class="meta-item"><strong>Timestamp:</strong> ${timestamp}</div>
          ${userAgent ? `<div class="meta-item"><strong>User Agent:</strong> ${escapeHtml(userAgent)}</div>` : ''}
        </div>
      </div>
    </body>
    </html>
  `;

  // Generate text body
  const textBody = `
New Form Submission
==================

Received at: ${new Date(timestamp).toLocaleString()}

${Object.entries(normalized)
  .filter(([key]) => !['timestamp', 'ip', 'userAgent'].includes(key))
  .map(([key, value]) => `${key.charAt(0).toUpperCase() + key.slice(1)}: ${String(value || '')}`)
  .join('\n')}

---
IP Address: ${ip}
Timestamp: ${timestamp}
${userAgent ? `User Agent: ${userAgent}` : ''}
  `;

  return {
    subject: subject.substring(0, 200), // SES subject limit
    htmlBody,
    textBody
  };
}

export async function sendEmail(template: EmailTemplate, config: Config): Promise<void> {
  try {
    const command = new SendEmailCommand({
      Source: config.emailSender,
      Destination: {
        ToAddresses: [config.emailRecipient]
      },
      Message: {
        Subject: {
          Data: template.subject,
          Charset: 'UTF-8'
        },
        Body: {
          Html: {
            Data: template.htmlBody,
            Charset: 'UTF-8'
          },
          Text: {
            Data: template.textBody,
            Charset: 'UTF-8'
          }
        }
      }
    });

    const result = await sesClient.send(command);
    console.log('Email sent successfully:', result.MessageId);
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error('Failed to send email notification');
  }
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

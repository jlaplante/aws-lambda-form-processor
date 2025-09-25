import { generateEmailTemplate } from '../email';
import { ProcessedSubmission, Config } from '../types';

describe('Email Template Generation', () => {
  const mockConfig: Config = {
    emailRecipient: 'admin@example.com',
    emailSender: 'noreply@example.com',
    allowedOrigins: ['https://example.com'],
    dedupeTTL: 86400,
    maxDuplicateCount: 3,
    rateLimitWindow: 3600,
    rateLimitMaxRequests: 10
  };

  const mockSubmission: ProcessedSubmission = {
    normalized: {
      name: 'John Doe',
      email: 'john@example.com',
      message: 'Hello, this is a test message.',
      phone: '+1-555-123-4567'
    },
    hash: 'abc123def456',
    timestamp: '2023-10-01T12:00:00.000Z',
    ip: '192.168.1.1',
    userAgent: 'Mozilla/5.0 (Test Browser)'
  };

  it('should generate valid email template', () => {
    const template = generateEmailTemplate(mockSubmission, mockConfig);

    expect(template.subject).toBe('Form submission from John Doe');
    expect(template.htmlBody).toContain('John Doe');
    expect(template.htmlBody).toContain('john@example.com');
    expect(template.htmlBody).toContain('Hello, this is a test message.');
    expect(template.htmlBody).toContain('192.168.1.1');
    expect(template.htmlBody).toContain('2023-10-01T12:00:00.000Z');

    expect(template.textBody).toContain('John Doe');
    expect(template.textBody).toContain('john@example.com');
    expect(template.textBody).toContain('Hello, this is a test message.');
  });

  it('should handle submissions without name', () => {
    const submissionWithoutName: ProcessedSubmission = {
      ...mockSubmission,
      normalized: {
        email: 'jane@example.com',
        message: 'Test message'
      }
    };

    const template = generateEmailTemplate(submissionWithoutName, mockConfig);
    expect(template.subject).toBe('New form submission');
  });

  it('should handle submissions with custom subject', () => {
    const submissionWithSubject: ProcessedSubmission = {
      ...mockSubmission,
      normalized: {
        ...mockSubmission.normalized,
        subject: 'Custom Subject Line'
      }
    };

    const template = generateEmailTemplate(submissionWithSubject, mockConfig);
    expect(template.subject).toBe('Custom Subject Line');
  });

  it('should escape HTML in form data', () => {
    const submissionWithHtml: ProcessedSubmission = {
      ...mockSubmission,
      normalized: {
        name: 'John <script>alert("xss")</script>',
        message: 'Hello & welcome to our site!'
      }
    };

    const template = generateEmailTemplate(submissionWithHtml, mockConfig);
    expect(template.htmlBody).toContain('John &lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
    expect(template.htmlBody).toContain('Hello &amp; welcome to our site!');
  });

  it('should handle submissions without user agent', () => {
    const submissionWithoutUA: ProcessedSubmission = {
      ...mockSubmission,
      userAgent: undefined
    };

    const template = generateEmailTemplate(submissionWithoutUA, mockConfig);
    expect(template.htmlBody).not.toContain('User Agent');
    expect(template.textBody).not.toContain('User Agent');
  });
});

import { validateSubmission, normalizeSubmission, generateSubmissionHash } from '../validation';

describe('Validation', () => {
  describe('validateSubmission', () => {
    it('should accept valid form data', () => {
      const validData = {
        name: 'John Doe',
        email: 'john@example.com',
        message: 'Hello world'
      };

      const result = validateSubmission(validData);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject data with suspicious content', () => {
      const suspiciousData = {
        name: '<script>alert("xss")</script>',
        email: 'john@example.com',
        message: 'Hello world'
      };

      const result = validateSubmission(suspiciousData);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].message).toBe('Suspicious content detected');
    });

    it('should reject invalid email format', () => {
      const invalidEmailData = {
        name: 'John Doe',
        email: 'not-an-email',
        message: 'Hello world'
      };

      const result = validateSubmission(invalidEmailData);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject data with too many fields', () => {
      const tooManyFields: Record<string, string> = {};
      for (let i = 0; i < 25; i++) {
        tooManyFields[`field${i}`] = 'value';
      }

      const result = validateSubmission(tooManyFields);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('normalizeSubmission', () => {
    it('should normalize field names and values', () => {
      const input = {
        '  Name  ': '  John Doe  ',
        'EMAIL': 'JOHN@EXAMPLE.COM',
        'Message': 'Hello world'
      };

      const result = normalizeSubmission(input);
      expect(result).toEqual({
        '  name  ': 'John Doe',
        'email': 'JOHN@EXAMPLE.COM',
        'message': 'Hello world'
      });
    });

    it('should handle null and undefined values', () => {
      const input = {
        name: 'John Doe',
        email: null,
        message: undefined,
        phone: ''
      };

      const result = normalizeSubmission(input);
      expect(result).toEqual({
        name: 'John Doe',
        phone: ''
      });
    });
  });

  describe('generateSubmissionHash', () => {
    it('should generate consistent hashes for identical data', () => {
      const data1 = { name: 'John', email: 'john@example.com' };
      const data2 = { email: 'john@example.com', name: 'John' };

      const hash1 = generateSubmissionHash(data1);
      const hash2 = generateSubmissionHash(data2);

      expect(hash1).toBe(hash2);
    });

    it('should generate different hashes for different data', () => {
      const data1 = { name: 'John', email: 'john@example.com' };
      const data2 = { name: 'Jane', email: 'jane@example.com' };

      const hash1 = generateSubmissionHash(data1);
      const hash2 = generateSubmissionHash(data2);

      expect(hash1).not.toBe(hash2);
    });
  });
});

# AWS Lambda Form Processor

A serverless form processor built with AWS Lambda, API Gateway, WAF, and SES. This open-source solution allows you to securely process form submissions from static websites and send them via email with built-in protection against spam, DDoS attacks, and duplicate submissions.

## Features

- **🔒 Security**: WAF protection, CORS validation, input sanitization
- **🚫 Duplicate Prevention**: Automatic detection and blocking of repeated submissions
- **⚡ Rate Limiting**: Built-in API Gateway throttling and custom rate limiting
- **📧 Email Notifications**: Beautiful HTML and text email templates via SES
- **🌐 CORS Support**: Configurable origin allowlist with wildcard support
- **📊 Monitoring**: CloudWatch logs and metrics
- **🔧 Configurable**: Environment-based configuration for easy deployment

## Architecture

```
GitHub Pages Form → API Gateway → WAF → Lambda → DynamoDB → SES → Email
```

- **API Gateway**: Public HTTPS endpoint with built-in throttling
- **WAF**: DDoS protection and common attack filtering
- **Lambda**: Form processing, validation, and email generation
- **DynamoDB**: Duplicate detection and rate limiting state
- **SES**: Reliable email delivery

## Quick Start

### Prerequisites

- AWS CLI configured with appropriate permissions
- AWS SAM CLI installed
- Node.js 18+ and npm
- Verified SES sender email address

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd aws-lambda-form-processor
npm install
```

### 2. Configure Environment

Edit `samconfig.toml` and update the parameters:

```toml
parameter_overrides = "EmailRecipient=your-email@example.com EmailSender=noreply@yourdomain.com AllowedOrigins=https://yourusername.github.io"
```

### 3. Deploy

```bash
# First deployment (guided)
npm run deploy

# Subsequent deployments
npm run deploy:prod
```

### 4. Update Your Form

Update your HTML form to POST to the API Gateway URL:

```html
<form action="https://your-api-id.execute-api.us-east-1.amazonaws.com/prod/submit" method="POST">
  <input type="text" name="name" required>
  <input type="email" name="email" required>
  <textarea name="message" required></textarea>
  <button type="submit">Submit</button>
</form>
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `EMAIL_RECIPIENT` | Email address to receive submissions | Required |
| `EMAIL_SENDER` | Verified SES sender email | Required |
| `ALLOWED_ORIGINS` | Comma-separated list of allowed origins | Required |
| `DEDUPE_TTL` | Duplicate detection TTL in seconds | 86400 (24h) |
| `MAX_DUPLICATE_COUNT` | Max duplicates before blocking | 3 |
| `RATE_LIMIT_WINDOW` | Rate limit window in seconds | 3600 (1h) |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | 10 |

### CORS Configuration

The solution supports flexible CORS configuration:

```yaml
# Exact match
AllowedOrigins: "https://yourusername.github.io"

# Multiple origins
AllowedOrigins: "https://yourusername.github.io,https://yourdomain.com"

# Wildcard subdomains
AllowedOrigins: "https://*.yourdomain.com"
```

## Security Features

### 1. WAF Protection
- Rate limiting (2000 requests per IP per 5 minutes)
- Common attack patterns (SQL injection, XSS, etc.)
- Geographic blocking (configurable)

### 2. Duplicate Detection
- Content-based hashing for identical submissions
- Configurable threshold (default: 3 duplicates)
- Automatic cleanup with TTL

### 3. Rate Limiting
- Per-IP sliding window rate limiting
- Configurable limits and windows
- Graceful degradation on DynamoDB errors

### 4. Input Validation
- JSON schema validation
- XSS and injection pattern detection
- Field length limits
- Maximum field count limits

## Development

### Local Testing

```bash
# Start local API Gateway
npm run local

# Test with curl
curl -X POST http://localhost:3000/submit \
  -H "Content-Type: application/json" \
  -H "Origin: https://yourusername.github.io" \
  -d '{"name":"John Doe","email":"john@example.com","message":"Hello world"}'
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm test -- --coverage
```

### Linting

```bash
# Check for linting errors
npm run lint

# Fix auto-fixable issues
npm run lint:fix
```

## Monitoring

### CloudWatch Metrics

The solution automatically creates CloudWatch metrics for:
- API Gateway request count and latency
- Lambda invocations and errors
- DynamoDB read/write capacity
- WAF blocked requests

### Logs

Structured logs are written to CloudWatch with:
- Request details and processing status
- Security events (blocked requests, duplicates)
- Error details for debugging

### Alarms

Consider setting up CloudWatch alarms for:
- High error rates (>5%)
- Unusual traffic patterns
- DynamoDB throttling
- SES bounce rates

## Cost Estimation

For typical usage (1000 submissions/month):
- **API Gateway**: ~$0.35
- **Lambda**: ~$0.20
- **DynamoDB**: ~$0.25
- **SES**: ~$0.10
- **WAF**: ~$1.00
- **Total**: ~$1.90/month

## Troubleshooting

### Common Issues

1. **CORS Errors**: Verify `ALLOWED_ORIGINS` includes your domain
2. **SES Errors**: Ensure sender email is verified in SES
3. **Rate Limiting**: Check if IP is hitting rate limits
4. **Validation Errors**: Review form data format and required fields

### Debug Mode

Set `LOG_LEVEL=DEBUG` in environment variables for detailed logging.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

- Create an issue for bug reports or feature requests
- Check the troubleshooting section for common issues
- Review CloudWatch logs for detailed error information
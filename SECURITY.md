# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 2.x.x   | :white_check_mark: |
| 1.x.x   | :x:                |

## Reporting a Vulnerability

We take security seriously. If you discover a security vulnerability, please report it responsibly.

### How to Report

1. **Do NOT** open a public issue for security vulnerabilities
2. Email security concerns to the project maintainers
3. Include as much detail as possible:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

### What to Expect

- Acknowledgment within 48 hours
- Status update within 7 days
- Fix timeline depends on severity

### Security Best Practices

When using Mirror:

1. **Input Validation**: Always validate user input before processing
2. **Dependencies**: Keep dependencies updated
3. **Generated Code**: Review generated code in production environments
4. **Sensitive Data**: Never include sensitive data in Mirror source files

## Known Security Considerations

### Code Generation

Mirror generates JavaScript code. The generated code should be reviewed before deployment to production environments, especially when:
- Processing untrusted input
- Generating code for user-facing applications
- Integrating with sensitive systems

### Runtime Execution

The Mirror runtime executes generated code in the browser. Standard web security practices apply:
- Use Content Security Policy (CSP)
- Sanitize dynamic content
- Follow OWASP guidelines

## Acknowledgments

We appreciate responsible disclosure and will acknowledge security researchers who report valid vulnerabilities.

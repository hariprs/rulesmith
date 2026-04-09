## Code Style

- Use async/await syntax instead of Promise chains
- Prefer async/await over .then() chains
- Add explicit TypeScript return types to all functions
- Always specify return types for function declarations
- Use interface definitions for object shapes
- Define interfaces for complex object types
- Use const assertions for literal types
- Apply const assertions when needing literal types

## Error Handling

- Use try-catch blocks for error handling
- Wrap async operations in try-catch
- Never swallow errors silently
- Always handle errors appropriately
- Log errors with context
- Include stack traces in error logs
- Provide meaningful error messages
- Add descriptive text to error messages

## Testing

- Write unit tests for all functions
- Test business logic with unit tests
- Use Jest for testing framework
- Employ Jest as the test runner
- Mock external dependencies
- Mock external services in tests
- Test error cases
- Include negative test cases
- Maintain test coverage above 80%
- Keep code coverage high

## Code Quality

- Follow ESLint rules
- Adhere to linting guidelines
- Format code with Prettier
- Apply Prettier formatting
- Use meaningful variable names
- Choose descriptive variable names
- Avoid code duplication
- Extract repeated logic into functions
- Keep functions small and focused
- Write single-purpose functions
- Comment complex logic
- Add explanations for complicated code

## Performance

- Avoid unnecessary re-renders
- Prevent component re-renders when possible
- Use memoization for expensive computations
- Cache expensive calculation results
- Lazy load components
- Implement code splitting for large apps
- Optimize database queries
- Add indexes to frequently queried columns
- Use pagination for large datasets
- Implement limit-offset pagination
- Monitor application performance
- Track performance metrics

## Security

- Validate user input
- Sanitize all user-provided data
- Use parameterized queries
- Employ prepared statements for SQL
- Implement authentication
- Add user authentication mechanisms
- Use HTTPS for all communications
- Enable SSL/TLS encryption
- Store passwords securely
- Hash passwords using bcrypt
- Implement rate limiting
- Add rate limiters to API endpoints

## Documentation

- Document all public APIs
- Add JSDoc comments to public methods
- Maintain README files
- Keep project documentation updated
- Include usage examples
- Provide code samples in documentation
- Document configuration options
- Explain all configuration parameters

## Version Control

- Write meaningful commit messages
- Use conventional commit format
- Create feature branches
- Develop on separate branches
- Review pull requests
- Perform code reviews before merging
- Keep commit history clean
- Avoid merge commits when possible

## Dependencies

- Keep dependencies updated
- Regularly update npm packages
- Audit dependencies for vulnerabilities
- Run npm audit regularly
- Use dependency locking
- Commit package-lock.json files
- Avoid unnecessary dependencies
- Minimize third-party packages

## Code Organization

- Group related files together
- Organize files by feature
- Use barrel exports
- Create index files for exports
- Separate concerns
- Maintain single responsibility principle
- Use absolute imports
- Import from absolute paths
- Organize imports alphabetically
- Sort import statements

## Error Messages

- Provide helpful error messages
- Include suggestions in errors
- Use error codes
- Define error constants
- Log errors appropriately
- Implement structured logging
- Monitor error rates
- Track error frequency

## API Design

- Use RESTful conventions
- Follow REST principles
- Version your API
- Include API version in URL
- Use appropriate HTTP methods
- Choose correct HTTP verbs
- Provide consistent response formats
- Standardize API responses
- Implement rate limiting
- Add API rate limiters
- Document API endpoints
- Maintain API documentation

## Database

- Use transactions for multi-step operations
- Wrap related DB operations in transactions
- Optimize database indexes
- Create appropriate indexes
- Use connection pooling
- Implement database connection pooling
- Backup database regularly
- Schedule automated backups
- Validate database constraints
- Enforce data integrity

## Frontend

- Use responsive design
- Implement mobile-friendly layouts
- Optimize images
- Compress and optimize images
- Minimize bundle size
- Reduce JavaScript bundle size
- Use progressive enhancement
- Ensure baseline functionality
- Test on multiple browsers
- Perform cross-browser testing

## Backend

- Implement caching strategies
- Use Redis for caching
- Queue background jobs
- Process tasks asynchronously
- Handle graceful shutdown
- Implement shutdown handlers
- Monitor server health
- Track server metrics
- Use environment variables
- Configure via environment

## Testing (Additional)

- Write integration tests
- Test component interactions
- Use test doubles
- Implement test doubles appropriately
- Test edge cases
- Cover boundary conditions
- Maintain test independence
- Keep tests isolated

## More Testing

- Test asynchronous code
- Handle async test scenarios
- Use fake timers
- Mock time-dependent code
- Test error boundaries
- Verify error handling UI
- Snapshot test UI components
- Implement snapshot testing

## Code Review

- Review code changes thoroughly
- Perform detailed code reviews
- Provide constructive feedback
- Give helpful review comments
- Check for security issues
- Identify security vulnerabilities
- Verify test coverage
- Ensure adequate testing

## Refactoring

- Refactor regularly
- Improve code structure periodically
- Eliminate code smells
- Remove anti-patterns
- Improve naming
- Use better variable names
- Reduce complexity
- Simplify complex functions
- Extract magic numbers
- Replace numbers with constants

## Logging

- Use structured logging
- Implement JSON logging
- Log at appropriate levels
- Use correct log levels
- Include correlation IDs
- Add request tracing
- Avoid logging sensitive data
- Protect user privacy
- Rotate log files
- Manage log file retention

## Monitoring

- Set up alerts
- Configure monitoring alerts
- Track key metrics
- Monitor performance indicators
- Create dashboards
- Build monitoring dashboards
- Monitor error rates
- Track error frequency
- Track user behavior
- Analyze user actions

## Accessibility

- Follow WCAG guidelines
- Implement accessibility standards
- Test with screen readers
- Verify screen reader compatibility
- Provide alt text for images
- Add image descriptions
- Ensure keyboard navigation
- Enable keyboard-only operation
- Use semantic HTML
- Write proper HTML structure

## Internationalization

- Support multiple languages
- Implement i18n support
- Use locale-aware formatting
- Format dates locally
- Separate content from code
- Externalize text strings
- Test with different locales
- Verify locale functionality

## Continuous Integration

- Automate builds
- Set up build automation
- Run tests on every commit
- Execute tests in CI pipeline
- Deploy automatically
- Implement CI/CD pipelines
- Monitor build status
- Track build success rate

## Code Comments

- Comment why, not what
- Explain reasoning in comments
- Keep comments updated
- Maintain comment accuracy
- Avoid redundant comments
- Don't state the obvious
- Use TODO comments
- Mark temporary solutions

## Error Recovery

- Implement retry logic
- Retry failed requests
- Use circuit breakers
- Prevent cascading failures
- Implement fallback mechanisms
- Provide backup functionality
- Gracefully handle failures
- Degrade functionality nicely

## Data Validation

- Validate on input
- Check data at entry points
- Sanitize output
- Clean data before display
- Use schema validation
- Implement JSON schema validation
- Validate data types
- Check type constraints

## File Operations

- Check file existence
- Verify file before access
- Handle file permissions
- Manage file access rights
- Use atomic writes
- Implement atomic file operations
- Clean up temp files
- Remove temporary files

## Memory Management

- Avoid memory leaks
- Prevent memory leaks
- Clean up resources
- Release resources properly
- Use weak references
- Implement weak references where appropriate
- Monitor memory usage
- Track memory consumption

## Concurrency

- Use locks appropriately
- Implement locking mechanisms
- Avoid race conditions
- Prevent concurrent access issues
- Use thread-safe operations
- Ensure thread safety
- Implement deadlocks detection
- Prevent deadlock scenarios

## Caching

- Cache frequently accessed data
- Store hot data in cache
- Invalidate cache properly
- Manage cache expiration
- Use cache headers
- Set HTTP cache headers
- Implement cache warming
- Pre-populate cache data

## API Security

- Use API keys
- Implement API key authentication
- Implement OAuth
- Use OAuth for authorization
- Validate API tokens
- Verify token authenticity
- Use CORS properly
- Configure CORS headers
- Implement rate limiting per user
- Add user-specific rate limits

## Data Privacy

- Anonymize user data
- Remove personal identifiers
- Implement data retention policies
- Set data expiration
- Comply with GDPR
- Follow privacy regulations
- Obtain user consent
- Collect user permissions
- Allow data deletion
- Enable account deletion

## Performance Monitoring

- Track API response times
- Monitor endpoint performance
- Measure database query performance
- Analyze query execution time
- Profile application performance
- Use profiling tools
- Identify performance bottlenecks
- Find slow operations

## Code Metrics

- Track code complexity
- Measure cyclomatic complexity
- Monitor code churn
- Track code change frequency
- Track technical debt
- Measure debt indicators
- Maintain code quality metrics
- Track quality indicators

## Deployment

- Use blue-green deployment
- Implement zero-downtime deployment
- Roll back quickly
- Enable fast rollback
- Test in staging
- Validate before production
- Monitor deployment health
- Check deployment status
- Document deployment process
- Maintain deployment guides

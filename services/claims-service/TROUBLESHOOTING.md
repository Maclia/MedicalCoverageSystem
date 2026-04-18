# Claims Service Troubleshooting Guide

## Common Issues and Solutions

### Service Won't Start
**Issue:** Service fails to start with database connection errors
**Solution:**
1. Check database configuration in .env file
2. Ensure PostgreSQL is running
3. Verify database credentials
4. Check if database exists and is accessible

**Issue:** Service crashes on startup
**Solution:**
1. Check logs for error messages
2. Verify all dependencies are installed
3. Ensure TypeScript compilation succeeds
4. Check for port conflicts

### Database Issues
**Issue:** Database connection timeout
**Solution:**
1. Check database server status
2. Verify network connectivity
3. Increase connection timeout in .env
4. Check firewall settings

**Issue:** Database schema errors
**Solution:**
1. Verify Drizzle schema matches database
2. Check for missing tables/columns
3. Run database migrations if needed
4. Ensure proper database user permissions

### API Endpoint Issues
**Issue:** 404 Not Found errors
**Solution:**
1. Verify endpoint URL is correct
2. Check if service is running
3. Ensure routes are properly registered
4. Check for typos in endpoint paths

**Issue:** 500 Internal Server Error
**Solution:**
1. Check server logs for details
2. Verify request payload format
3. Check database connection
4. Ensure all required fields are provided

### Development Issues
**Issue:** TypeScript compilation errors
**Solution:**
1. Run `npm run build` to see detailed errors
2. Check for missing type definitions
3. Verify import paths are correct
4. Ensure all dependencies are installed

**Issue:** Tests failing
**Solution:**
1. Check test database setup
2. Verify test data is correct
3. Ensure all dependencies are installed
4. Check for environment-specific issues

### Docker Issues
**Issue:** Docker container won't start
**Solution:**
1. Check Docker daemon status
2. Verify Docker image build succeeds
3. Check container logs for errors
4. Ensure proper port mapping

**Issue:** Docker networking issues
**Solution:**
1. Verify Docker network configuration
2. Check container connectivity
3. Ensure proper port exposure
4. Check firewall settings

### Performance Issues
**Issue:** Slow response times
**Solution:**
1. Check database query performance
2. Verify server resources
3. Check for memory leaks
4. Monitor CPU usage

**Issue:** High memory usage
**Solution:**
1. Check for memory leaks
2. Optimize database queries
3. Implement proper cleanup
4. Monitor memory usage patterns

### Security Issues
**Issue:** Authentication failures
**Solution:**
1. Verify JWT secret configuration
2. Check token expiration
3. Ensure proper header format
4. Verify authentication middleware

**Issue:** CORS errors
**Solution:**
1. Check CORS configuration
2. Verify allowed origins
3. Ensure proper headers
4. Check for preflight requests

### Logging Issues
**Issue:** No logs being generated
**Solution:**
1. Check log directory permissions
2. Verify Winston configuration
3. Ensure proper log levels
4. Check for log rotation

**Issue:** Excessive logging
**Solution:**
1. Adjust log levels in .env
2. Implement proper log filtering
3. Check for debug mode
4. Optimize log statements

### Environment Issues
**Issue:** Environment variables not loading
**Solution:**
1. Check .env file syntax
2. Verify environment variable names
3. Ensure proper file permissions
4. Check for .env.local overrides

**Issue:** Development vs Production differences
**Solution:**
1. Verify NODE_ENV setting
2. Check environment-specific configurations
3. Ensure proper database connections
4. Verify logging levels

### Integration Issues
**Issue:** Service integration failures
**Solution:**
1. Check service URLs in .env
2. Verify network connectivity
3. Check service availability
4. Ensure proper authentication

**Issue:** Data synchronization issues
**Solution:**
1. Check database consistency
2. Verify data formats
3. Ensure proper error handling
4. Check for race conditions

### Monitoring Issues
**Issue:** Health check failures
**Solution:**
1. Verify database connectivity
2. Check service dependencies
3. Ensure proper health check implementation
4. Monitor resource usage

**Issue:** Performance metrics not available
**Solution:**
1. Check monitoring configuration
2. Verify metrics collection
3. Ensure proper logging
4. Check for monitoring tool issues

## Quick Reference Commands

### Start Service
```bash
npm run dev
```

### Build for Production
```bash
npm run build
```

### Run Tests
```bash
npm test
```

### Check Dependencies
```bash
npm outdated
npm audit
```

### Database Operations
```bash
# Check database connection
node -e "require('./src/config/database').checkDatabaseConnection()"

# Run database migrations
npx drizzle-kit migrate
```

### Docker Operations
```bash
# Build Docker image
docker build -t claims-service .

# Run Docker container
docker run -p 3005:3005 claims-service

# Check container logs
docker logs claims-service
```

### Log Operations
```bash
# View recent logs
tail -f logs/combined.log

# Clear logs
rm -f logs/*.log
```

### Troubleshooting Steps
1. Check service status
2. Review logs for errors
3. Verify configuration
4. Test database connectivity
5. Check network connectivity
6. Verify dependencies
7. Test endpoints individually
8. Check resource usage

## Common Error Messages

### Database Connection Errors
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```
**Solution:** PostgreSQL server not running or incorrect connection settings.

### Port Conflicts
```
Error: listen EADDRINUSE: address already in use :::3005
```
**Solution:** Port 3005 is already in use. Stop the conflicting service or change port.

### TypeScript Errors
```
Cannot find module './utils/logger'
```
**Solution:** Missing import or incorrect path. Check file structure and imports.

### JWT Errors
```
JsonWebTokenError: jwt malformed
```
**Solution:** Invalid JWT token. Check token generation and validation.

### Validation Errors
```
Invalid claim data
```
**Solution:** Check request payload against validation schema.

## Performance Monitoring

### Check Resource Usage
```bash
# Memory usage
ps aux | grep node

# CPU usage
top -p $(pgrep -d',' -f node)

# Network connections
netstat -tulpn | grep :3005
```

### Database Performance
```bash
# Check slow queries
EXPLAIN ANALYZE SELECT * FROM claims;

# Check database size
SELECT pg_size_pretty(pg_database_size('medical_coverage'));
```

### Application Performance
```bash
# Check response times
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:3005/health

# Monitor logs
tail -f logs/combined.log | grep -E "(error|warn|slow)"
```

## Recovery Procedures

### Service Recovery
1. Stop the service
2. Clear temporary files
3. Restart the service
4. Check logs for persistent issues

### Database Recovery
1. Check database status
2. Run consistency checks
3. Restore from backup if needed
4. Verify data integrity

### Configuration Recovery
1. Restore from backup
2. Verify environment variables
3. Check service dependencies
4. Test service functionality

## Prevention Tips

### Regular Maintenance
- Monitor logs regularly
- Check for security updates
- Perform regular backups
- Test disaster recovery procedures

### Performance Optimization
- Monitor resource usage
- Optimize database queries
- Implement proper caching
- Scale resources as needed

### Security Best Practices
- Keep dependencies updated
- Implement proper authentication
- Monitor for security issues
- Regular security audits

### Development Best Practices
- Write comprehensive tests
- Implement proper error handling
- Use version control
- Document changes thoroughly
# System Security Remediation Plan

## 🛡️ Step-by-Step Execution Plan to Secure Medical Coverage System

---

## PHASE 1: IMMEDIATE EMERGENCY FIXES (0-24 HOURS)
✅ **CRITICAL - Block active attack surface immediately**

| # | Action | Command / Instructions | Verification | Status |
|---|--------|------------------------|--------------|--------|
| 1 | **Change Default Database Password** | Generate strong password: <br>`openssl rand -hex 32` <br><br>Update in: <br>• `.env` file <br>• `docker-compose.yml` remove fallback default | Verify cannot login with `postgres_password_2024` | ☐ |
| 2 | **Replace JWT Secrets** | Generate 2 separate secrets: <br>`openssl rand -base64 64` <br><br>Update: <br>• `JWT_SECRET` <br>• `JWT_REFRESH_SECRET` <br><br>⚠️ Remove all default fallbacks from docker-compose.yml | Try to forge token with old secret - should fail | ☐ |
| 3 | **Block All Internal Ports At Firewall** | Close these ports publicly: <br>3002,3003,3004,3005,3006,3007,3008,3009,3010,3011,3012,5009,5432,6379,6432 <br><br>Only keep open: 80, 443, 3000, 3001 | Verify ports are filtered using external port scanner | ☐ |
| 4 | **Enable Redis Authentication** | Add `requirepass` in redis config <br>Update `REDIS_URL` with password format: `redis://:password@redis:6379` | Verify unauthenticated connections are rejected | ☐ |
| 5 | **Run NPM Audit Fix** | ```bash <br>npm audit fix <br>npm audit fix --force <br>``` | Verify high severity vulnerabilities are resolved | ☐ |

> **AFTER PHASE 1**: 80% of immediate exploit risk is eliminated

---

## PHASE 2: HIGH PRIORITY FIXES (1-7 DAYS)
✅ **Remove major vulnerabilities and harden attack surface**

| # | Action | Implementation Details | Testing | Status |
|---|--------|------------------------|---------|--------|
| 6 | **Remove Public Port Mappings** | Delete all `ports:` sections from docker-compose.yml for internal services. Only keep ports for: <br>• api-gateway <br>• frontend <br>• nginx | Verify services can communicate internally but are not reachable externally | ☐ |
| 7 | **Implement Authentication Rate Limiting** | Add rate limiter to `/api/auth/login` endpoint: <br>• Max 5 attempts per 10 minutes <br>• Exponential backoff delay <br>• Account lock after 10 failures | Test brute force attack simulation | ☐ |
| 8 | **Replace Vulnerable XLSX Library** | Remove `xlsx` package completely: <br>```bash <br>npm uninstall xlsx <br>npm install exceljs@4.4.0 <br>``` <br><br>Migrate all excel import/export code | Verify excel functionality works without prototype pollution risk | ☐ |
| 9 | **Enable HTTPS / SSL** | Install LetsEncrypt certificates <br>Configure Nginx with modern TLS 1.3 only <br>Enable HSTS headers | Test SSL Labs rating - minimum A grade | ☐ |
| 10 | **Implement Token Revocation** | Add JWT token blacklist in Redis <br>Invalidate all tokens on: <br>• Logout <br>• Password change <br>• Account deactivation | Verify stolen token cannot be used after logout | ☐ |
| 11 | **Add Security Headers** | Implement these headers at API Gateway: <br>• Content-Security-Policy <br>• X-Frame-Options: DENY <br>• X-Content-Type-Options: nosniff <br>• Strict-Transport-Security | Scan with securityheaders.com | ☐ |

---

## PHASE 3: SECURITY HARDENING (7-30 DAYS)
✅ **Defense in depth and ongoing security controls**

| # | Action | Implementation | Status |
|---|--------|----------------|--------|
| 12 | **Input Validation & Sanitization** | Add Zod/Joi schema validation to all API endpoints <br>Implement SQL injection protection <br>Add XSS filtering for all user input | ☐ |
| 13 | **Least Privilege Containers** | Run all containers as non-root user <br>Remove all unnecessary capabilities <br>Enable read-only filesystem where possible | ☐ |
| 14 | **Database Encryption At Rest** | Enable PostgreSQL Transparent Data Encryption (TDE) <br>Encrypt all backup files <br>Implement column level encryption for PII fields | ☐ |
| 15 | **Secret Management System** | Migrate all secrets from environment variables to: <br>• Hashicorp Vault <br>• AWS Secrets Manager <br>• Azure Key Vault | ☐ |
| 16 | **Security Monitoring & Alerting** | Setup SIEM integration <br>Alert on: <br>• Multiple failed logins <br>• Unusual access patterns <br>• Database export operations <br>• Configuration changes | ☐ |
| 17 | **CI/CD Security Pipeline** | Add these checks to every commit: <br>• Dependency vulnerability scanning <br>• Static Application Security Testing (SAST) <br>• Secret scanning <br>• Infrastructure as Code scanning | ☐ |

---

## PHASE 4: ONGOING SECURITY PROGRAM (30+ DAYS)
✅ **Maintain security posture long term**

| # | Activity | Frequency | Responsibility |
|---|----------|-----------|----------------|
| 18 | **Dependency Updates** | Weekly | DevOps Team |
| 19 | **Vulnerability Scanning** | Monthly | Security Officer |
| 20 | **Penetration Testing** | Quarterly | 3rd Party Auditor |
| 21 | **Security Awareness Training** | Quarterly | All Developers |
| 22 | **Access Review** | Bi-annually | System Administrators |
| 23 | **Incident Response Drill** | Annually | Entire Team |

---

## 📊 SECURITY IMPROVEMENT ROADMAP

| Timeline | Risk Reduction |
|----------|----------------|
| After 24 hours | 🟢 80% of critical risk eliminated |
| After 7 days | 🟢 95% of known vulnerabilities fixed |
| After 30 days | 🟢 Enterprise grade security posture |
| Ongoing | 🟢 Maintain compliance and resilience |

---

## ❗ IMPORTANT EXECUTION RULES

1.  **NO DEPLOYMENT WINDOWS**: Critical fixes can be implemented immediately
2.  **CHANGE CONTROL**: All changes must be logged and reviewed
3.  **VERIFICATION**: Every fix must have explicit testing steps
4.  **ROLLBACK PLAN**: Maintain ability to revert changes within 15 minutes
5.  **COMMUNICATION**: Notify stakeholders before applying breaking changes

---

## ✅ COMPLETION CHECKLIST

Before declaring system secure:
- [ ] No default credentials exist anywhere
- [ ] All high/critical vulnerabilities are resolved
- [ ] All internal ports are not publicly accessible
- [ ] HTTPS is enabled everywhere
- [ ] Rate limiting is active on authentication endpoints
- [ ] Security headers are implemented
- [ ] Secrets are properly managed
- [ ] Security monitoring is active

---

*This plan follows NIST SP 800-53 and HIPAA Security Rule requirements for healthcare systems.*
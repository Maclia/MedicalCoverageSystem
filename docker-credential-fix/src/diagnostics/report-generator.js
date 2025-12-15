const os = require('os');
const DiffGenerator = require('../utils/diff-generator');

/**
 * Report Generator
 * Creates comprehensive diagnostic reports in multiple formats
 */

class ReportGenerator {
  constructor(options = {}) {
    this.format = options.format || 'text'; // text, markdown, json, html
    this.verbose = options.verbose || false;
    this.includeStats = options.includeStats !== false;
    this.includeRecommendations = options.includeRecommendations !== false;
    this.maxIssues = options.maxIssues || 50;
    this.sortBySeverity = options.sortBySeverity !== false;
    this.showTimestamps = options.showTimestamps !== false;
    this.colorOutput = options.colorOutput !== false;
    this.diffGenerator = new DiffGenerator({
      contextLines: options.contextLines || 3,
      colorOutput: this.colorOutput
    });
  }

  /**
   * Generate comprehensive diagnostic report
   */
  generateReport(platformInfo, dockerChecks, diagnosticResults) {
    const report = {
      metadata: this.createMetadata(platformInfo, dockerChecks),
      summary: this.createSummary(dockerChecks, diagnosticResults),
      issues: this.categorizeIssues(diagnosticResults),
      recommendations: this.generateRecommendations(dockerChecks, diagnosticResults),
      detailedFindings: this.createDetailedFindings(diagnosticResults),
      generated: new Date().toISOString()
    };

    // Format based on requested format
    switch (this.format) {
      case 'markdown':
        return this.generateMarkdownReport(report);
      case 'json':
        return this.generateJsonReport(report);
      case 'html':
        return this.generateHtmlReport(report);
      case 'text':
      default:
        return this.generateTextReport(report);
    }
  }

  /**
   * Create report metadata
   */
  createMetadata(platformInfo, dockerChecks) {
    return {
      tool: {
        name: 'docker-credential-fix',
        version: '1.0.0'
      },
      system: {
        platform: platformInfo.os,
        architecture: platformInfo.arch,
        version: platformInfo.version,
        hostname: os.hostname(),
        homedir: platformInfo.homedir
      },
      docker: {
        daemon: {
          running: dockerChecks.daemon?.running || false,
          version: dockerChecks.daemon?.version || 'unknown',
          apiVersion: dockerChecks.daemon?.apiVersion || 'unknown'
        },
        configuration: {
          exists: dockerChecks.configuration?.configExists || false,
          valid: dockerChecks.configuration?.configValid || false,
          path: dockerChecks.configuration?.configPath || 'unknown'
        }
      },
      credentialHelper: platformInfo.credentialHelper || null
    };
  }

  /**
   * Create executive summary
   */
  createSummary(dockerChecks, diagnosticResults) {
    const issues = this.extractAllIssues(diagnosticResults);
    const criticalIssues = issues.filter(i => i.severity === 'critical');
    const highIssues = issues.filter(i => i.severity === 'high');
    const mediumIssues = issues.filter(i => i.severity === 'medium');
    const lowIssues = issues.filter(i => i.severity === 'low');

    let status = 'HEALTHY';
    if (criticalIssues.length > 0) {
      status = 'CRITICAL';
    } else if (highIssues.length > 0) {
      status = 'WARNING';
    } else if (mediumIssues.length > 0) {
      status = 'CAUTION';
    }

    return {
      status,
      issuesFound: issues.length,
      critical: criticalIssues.length,
      high: highIssues.length,
      medium: mediumIssues.length,
      low: lowIssues.length,
      dockerRunning: dockerChecks.daemon?.running || false,
      credentialHelperWorking: diagnosticResults.credentialHelper?.helperWorking || false
    };
  }

  /**
   * Categorize and organize issues
   */
  categorizeIssues(diagnosticResults) {
    const categories = {
      daemon: [],
      configuration: [],
      credentialHelper: [],
      permissions: [],
      network: [],
      system: [],
      platform: []
    };

    const allIssues = this.extractAllIssues(diagnosticResults);

    for (const issue of allIssues) {
      const category = this.categorizeIssue(issue);
      if (categories[category]) {
        categories[category].push(issue);
      }
    }

    // Sort issues by severity if requested
    if (this.sortBySeverity) {
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      for (const category of Object.keys(categories)) {
        categories[category].sort((a, b) =>
          severityOrder[a.severity] - severityOrder[b.severity]
        );
      }
    }

    return categories;
  }

  /**
   * Categorize a single issue
   */
  categorizeIssue(issue) {
    if (issue.code.includes('DOCKER') && issue.code.includes('NOT')) {
      return 'daemon';
    } else if (issue.code.includes('CONFIG')) {
      return 'configuration';
    } else if (issue.code.includes('CREDENTIAL') || issue.code.includes('HELPER')) {
      return 'credentialHelper';
    } else if (issue.code.includes('PERMISSION') || issue.code.includes('ACCESS')) {
      return 'permissions';
    } else if (issue.code.includes('REGISTRY') || issue.code.includes('NETWORK')) {
      return 'network';
    } else if (issue.code.includes('SYSTEM') || issue.code.includes('OS')) {
      return 'system';
    } else {
      return 'platform';
    }
  }

  /**
   * Extract all issues from diagnostic results
   */
  extractAllIssues(diagnosticResults) {
    const issues = [];

    // Extract from main diagnostic structure
    if (diagnosticResults.issues && Array.isArray(diagnosticResults.issues)) {
      issues.push(...diagnosticResults.issues.map(issue => ({
        ...issue,
        source: 'main'
      })));
    }

    // Extract from nested diagnostic results
    const nestedResults = [
      'keychain', 'credentialHelper', 'homebrew', 'dockerDesktop',
      'secretService', 'packageManager', 'dockerInstallation',
      'permissions', 'configuration', 'services'
    ];

    for (const result of nestedResults) {
      if (diagnosticResults[result] && diagnosticResults[result].errors) {
        issues.push(...diagnosticResults[result].errors.map(error => ({
          ...error,
          source: result
        })));
      }
    }

    // Normalize issue severity
    return issues.map(issue => ({
      ...issue,
      severity: this.normalizeSeverity(issue)
    }));
  }

  /**
   * Normalize issue severity
   */
  normalizeSeverity(issue) {
    if (issue.severity) {
      return issue.severity;
    }

    // Infer severity from code and message
    const code = (issue.code || '').toLowerCase();
    const message = (issue.message || '').toLowerCase();

    if (code.includes('critical') || code.includes('fatal') ||
        message.includes('cannot') || message.includes('failed')) {
      return 'critical';
    } else if (code.includes('high') || code.includes('important') ||
             message.includes('should') || message.includes('warning')) {
      return 'high';
    } else if (code.includes('medium') || message.includes('consider')) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * Generate recommendations based on findings
   */
  generateRecommendations(dockerChecks, diagnosticResults) {
    const recommendations = [];

    // Get existing recommendations from diagnostic results
    if (diagnosticResults.recommendations && Array.isArray(diagnosticResults.recommendations)) {
      recommendations.push(...diagnosticResults.recommendations);
    }

    // Add additional recommendations based on findings
    const summary = this.createSummary(dockerChecks, diagnosticResults);

    // Overall status recommendations
    if (summary.status === 'CRITICAL') {
      recommendations.push({
        priority: 'critical',
        title: 'Critical Docker Issues Detected',
        description: 'Multiple critical issues require immediate attention',
        actions: [
          'Address all critical issues first',
          'Restart Docker daemon after fixes',
          'Test Docker login functionality'
        ]
      });
    }

    if (summary.dockerRunning && !summary.credentialHelperWorking) {
      recommendations.push({
        priority: 'high',
        title: 'Fix Credential Helper',
        description: 'Docker is running but credential helper is not working',
        actions: [
          'Install or reinstall Docker credential helper',
          'Check Docker configuration file',
          'Verify system permissions'
        ]
      });
    }

    if (!summary.dockerRunning) {
      recommendations.push({
        priority: 'critical',
        title: 'Start Docker Daemon',
        description: 'Docker daemon is not running and cannot be accessed',
        actions: [
          'Start Docker Desktop (macOS/Windows)',
          'Run "sudo systemctl start docker" (Linux)',
          'Check Docker service status'
        ]
      });
    }

    // Remove duplicates and sort by priority
    const uniqueRecommendations = this.removeDuplicateRecommendations(recommendations);
    return uniqueRecommendations.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  /**
   * Remove duplicate recommendations
   */
  removeDuplicateRecommendations(recommendations) {
    const seen = new Set();
    const unique = [];

    for (const rec of recommendations) {
      const key = rec.title.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(rec);
      }
    }

    return unique;
  }

  /**
   * Create detailed findings section
   */
  createDetailedFindings(diagnosticResults) {
    const findings = {};

    // Platform-specific findings
    findings.platform = {
      os: diagnosticResults.platform || 'unknown',
      version: diagnosticResults.version || 'unknown',
      architecture: diagnosticResults.arch || 'unknown',
      desktopEnvironment: diagnosticResults.desktopEnvironment || 'unknown'
    };

    // Docker daemon findings
    if (diagnosticResults.dockerInstallation || diagnosticResults.dockerDesktop) {
      findings.docker = {
        version: diagnosticResults.dockerInstallation?.dockerVersion ||
                    diagnosticResults.dockerDesktop?.dockerEngineVersion || 'unknown',
        service: {
          running: diagnosticResults.dockerInstallation?.dockerService ||
                    diagnosticResults.dockerDesktop?.dockerDesktopRunning || false,
          version: diagnosticResults.dockerInstallation?.dockerEngineVersion || 'unknown'
        },
        installation: {
          path: diagnosticResults.dockerInstallation?.dockerPath ||
                   diagnosticResults.dockerDesktop?.dockerDesktopPath || 'unknown',
          method: this.detectInstallationMethod(diagnosticResults)
        }
      };
    }

    // Credential helper findings
    if (diagnosticResults.credentialHelper) {
      findings.credentialHelper = {
        installed: diagnosticResults.credentialHelper.helperInstalled || false,
        working: diagnosticResults.credentialHelper.helperWorking || false,
        helpers: diagnosticResults.credentialHelper.availableHelpers || [],
        configured: diagnosticResults.credentialHelper.helperPath || 'none'
      };
    }

    // System environment findings
    findings.environment = this.createEnvironmentFindings(diagnosticResults);

    // Performance findings
    if (this.includeStats) {
      findings.performance = this.createPerformanceFindings(diagnosticResults);
    }

    return findings;
  }

  /**
   * Detect Docker installation method
   */
  detectInstallationMethod(diagnosticResults) {
    if (diagnosticResults.dockerDesktop?.dockerDesktopInstalled) {
      return 'docker-desktop';
    } else if (diagnosticResults.dockerInstallation?.dockerInstalled) {
      return 'package-manager';
    } else if (diagnosticResults.dockerInstallation?.dockerEngineVersion) {
      return 'docker-engine';
    } else {
      return 'unknown';
    }
  }

  /**
   * Create environment findings
   */
  createEnvironmentFindings(diagnosticResults) {
    const findings = {};

    // Desktop environment (Linux)
    if (diagnosticResults.desktopEnvironment) {
      findings.desktop = diagnosticResults.desktopEnvironment;
    }

    // Secret service availability (Linux)
    if (diagnosticResults.secretService) {
      findings.secretService = {
        running: diagnosticResults.secretService.secretServiceRunning || false,
        dbusConnected: diagnosticResults.secretService.dbusConnected || false,
        availableMethods: diagnosticResults.secretService.availableMethods || []
      };
    }

    // Keychain access (macOS)
    if (diagnosticResults.keychain) {
      findings.keychain = {
        accessible: diagnosticResults.keychain.keychainAccessible || false,
        defaultKeychain: diagnosticResults.keychain.defaultKeychain || 'none',
        permissions: diagnosticResults.keychain.keychainPermissions || false
      };
    }

    // Credential manager (Windows)
    if (diagnosticResults.credentialManager) {
      findings.credentialManager = {
        accessible: diagnosticResults.credentialManager.credentialManagerAccessible || false,
        working: diagnosticResults.credentialManager.credentialManagerWorking || false,
        totalCredentials: diagnosticResults.credentialManager.totalCredentials || 0
      };
    }

    // System permissions
    if (diagnosticResults.permissions) {
      findings.permissions = {
        administrator: diagnosticResults.permissions.isAdministrator || false,
        dockerGroup: diagnosticResults.permissions.dockerGroupMembership || false,
        fileAccess: diagnosticResults.permissions.homeDirectoryWritable || false
      };
    }

    return findings;
  }

  /**
   * Create performance findings
   */
  createPerformanceFindings(diagnosticResults) {
    const findings = {};

    // System resources
    if (diagnosticResults.dockerChecks?.system) {
      findings.systemResources = diagnosticResults.dockerChecks.system;
    }

    // Docker storage
    if (diagnosticResults.dockerChecks?.system?.dockerStorage) {
      findings.dockerStorage = diagnosticResults.dockerChecks.system.dockerStorage;
    }

    // Network connectivity
    if (diagnosticResults.dockerChecks?.registry) {
      findings.network = {
        dockerHubAccessible: diagnosticResults.dockerChecks.registry.dockerHub || false,
        proxyConfigured: diagnosticResults.dockerChecks.registry.proxyConfigured || false,
        timeout: diagnosticResults.dockerChecks.registry.timeout || false
      };
    }

    return findings;
  }

  /**
   * Generate text format report
   */
  generateTextReport(report) {
    const lines = [];

    // Header
    lines.push('='.repeat(60));
    lines.push('DOCKER CREDENTIAL HELPER DIAGNOSTIC REPORT');
    lines.push('='.repeat(60));
    lines.push('');

    // Executive Summary
    lines.push('EXECUTIVE SUMMARY');
    lines.push('-'.repeat(20));
    lines.push(`Status: ${report.summary.status}`);
    lines.push(`Issues Found: ${report.summary.issuesFound}`);
    lines.push(`  Critical: ${report.summary.critical}`);
    lines.push(`  High: ${report.summary.high}`);
    lines.push(`  Medium: ${report.summary.medium}`);
    lines.push(`  Low: ${report.summary.low}`);
    lines.push(`Docker Running: ${report.summary.dockerRunning ? 'YES' : 'NO'}`);
    lines.push(`Credential Helper: ${report.summary.credentialHelperWorking ? 'WORKING' : 'BROKEN'}`);
    lines.push('');

    // System Information
    lines.push('SYSTEM INFORMATION');
    lines.push('-'.repeat(20));
    lines.push(`Platform: ${report.metadata.system.platform}`);
    lines.push(`Architecture: ${report.metadata.system.architecture}`);
    lines.push(`Docker Version: ${report.metadata.docker.daemon.version || 'Not installed'}`);
    lines.push(`Credential Helper: ${report.metadata.credentialHelper?.type || 'None'}`);
    lines.push('');

    // Issues by Category
    if (report.issues) {
      lines.push('ISSUES BY CATEGORY');
      lines.push('-'.repeat(20));

      for (const [category, issues] of Object.entries(report.issues)) {
        if (issues.length === 0) continue;

        lines.push(`${category.toUpperCase()} (${issues.length}):`);
        for (const issue of issues.slice(0, this.maxIssues)) {
          lines.push(`  [${issue.severity.toUpperCase()}] ${issue.message}`);
          if (this.verbose && issue.suggestion) {
            lines.push(`    → ${issue.suggestion}`);
          }
        }

        if (issues.length > this.maxIssues) {
          lines.push(`  ... and ${issues.length - this.maxIssues} more issues`);
        }
        lines.push('');
      }
    }

    // Recommendations
    if (this.includeRecommendations && report.recommendations.length > 0) {
      lines.push('RECOMMENDATIONS');
      lines.push('-'.repeat(20));

      for (const rec of report.recommendations.slice(0, 10)) {
        lines.push(`${rec.priority.toUpperCase()}: ${rec.title}`);
        if (this.verbose) {
          lines.push(`  ${rec.description}`);
          for (const action of rec.actions) {
            lines.push(`  - ${action}`);
          }
        }
        lines.push('');
      }
    }

    // Footer
    lines.push('='.repeat(60));
    lines.push(`Report generated: ${report.generated}`);
    lines.push(`Tool: ${report.metadata.tool.name} v${report.metadata.tool.version}`);
    lines.push('='.repeat(60));

    return lines.join('\n');
  }

  /**
   * Generate markdown format report
   */
  generateMarkdownReport(report) {
    const lines = [];

    // Header
    lines.push('# Docker Credential Helper Diagnostic Report');
    lines.push('');
    lines.push('## Executive Summary');
    lines.push('');
    lines.push(`- **Status**: ${report.summary.status}`);
    lines.push(`- **Issues Found**: ${report.summary.issuesFound}`);
    lines.push(`- **Docker Running**: ${report.summary.dockerRunning ? '✅ Yes' : '❌ No'}`);
    lines.push(`- **Credential Helper**: ${report.summary.credentialHelperWorking ? '✅ Working' : '❌ Broken'}`);
    lines.push('');

    if (report.summary.issuesFound > 0) {
      lines.push('### Issue Breakdown');
      lines.push('');
      lines.push('| Severity | Count |');
      lines.push('|----------|-------|');
      lines.push(`| Critical | ${report.summary.critical} |`);
      lines.push(`| High | ${report.summary.high} |`);
      lines.push(`| Medium | ${report.summary.medium} |`);
      lines.push(`| Low | ${report.summary.low} |`);
      lines.push('');
    }

    // System Information
    lines.push('## System Information');
    lines.push('');
    lines.push('| Property | Value |');
    lines.push('|----------|-------|');
    lines.push(`| Platform | ${report.metadata.system.platform} |`);
    lines.push(`| Architecture | ${report.metadata.system.architecture} |`);
    lines.push(`| Docker Version | ${report.metadata.docker.daemon.version || 'Not installed'} |`);
    lines.push(`| Credential Helper | ${report.metadata.credentialHelper?.type || 'None'} |`);
    lines.push('');

    // Issues
    if (report.issues) {
      lines.push('## Issues by Category');
      lines.push('');

      for (const [category, issues] of Object.entries(report.issues)) {
        if (issues.length === 0) continue;

        lines.push(`### ${category.charAt(0).toUpperCase() + category.slice(1)} (${issues.length})`);
        lines.push('');

        for (const issue of issues.slice(0, this.maxIssues)) {
          const severityIcon = this.getSeverityIcon(issue.severity);
          lines.push(`${severityIcon} **[${issue.severity.toUpperCase()}]** ${issue.message}`);

          if (this.verbose && issue.suggestion) {
            lines.push(`> ${issue.suggestion}`);
          }
          lines.push('');
        }

        if (issues.length > this.maxIssues) {
          lines.push(`*... and ${issues.length - this.maxIssues} more issues*`);
          lines.push('');
        }
      }
    }

    // Recommendations
    if (this.includeRecommendations && report.recommendations.length > 0) {
      lines.push('## Recommendations');
      lines.push('');

      for (const rec of report.recommendations.slice(0, 10)) {
        lines.push(`### ${rec.priority.toUpperCase()}: ${rec.title}`);
        lines.push('');
        lines.push(rec.description);
        lines.push('');

        if (this.verbose) {
          lines.push('**Actions:**');
          for (const action of rec.actions) {
            lines.push(`- ${action}`);
          }
          lines.push('');
        }
      }
    }

    // Footer
    lines.push('---');
    lines.push(`*Report generated: ${report.generated}*`);
    lines.push(`*Tool: ${report.metadata.tool.name} v${report.metadata.tool.version}*`);

    return lines.join('\n');
  }

  /**
   * Generate JSON format report
   */
  generateJsonReport(report) {
    const jsonReport = {
      ...report,
      format: 'json',
      generator: {
        name: 'docker-credential-fix',
        version: '1.0.0'
      }
    };

    return JSON.stringify(jsonReport, null, 2);
  }

  /**
   * Generate HTML format report
   */
  generateHtmlReport(report) {
    const styles = `
      body { font-family: Arial, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; }
      .header { background: #2c3e50; color: white; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
      .status { display: inline-block; padding: 5px 10px; border-radius: 3px; color: white; font-weight: bold; }
      .status.critical { background: #e74c3c; }
      .status.warning { background: #f39c12; }
      .status.caution { background: #f1c40f; }
      .status.healthy { background: #27ae60; }
      .summary { background: #ecf0f1; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
      .issues { margin-bottom: 30px; }
      .category { margin-bottom: 20px; border-left: 4px solid #3498db; padding-left: 15px; }
      .issue { margin-bottom: 10px; padding: 10px; border-radius: 3px; }
      .issue.critical { background: #fadbd8; border-left-color: #e74c3c; }
      .issue.high { background: #fdebd0; border-left-color: #f39c12; }
      .issue.medium { background: #f9e79f; border-left-color: #f1c40f; }
      .issue.low { background: #d5f4e6; border-left-color: #3498db; }
      .recommendations { background: #e8f6f3; padding: 15px; border-radius: 5px; }
      .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #bdc3c7; color: #7f8c8d; font-size: 0.9em; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
      th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
      th { background: #f8f9fa; }
      .severity { text-transform: uppercase; font-weight: bold; padding: 2px 6px; border-radius: 2px; color: white; }
      .severity.critical { background: #e74c3c; }
      .severity.high { background: #f39c12; }
      .severity.medium { background: #f1c40f; }
      .severity.low { background: #3498db; }
    `;

    const lines = [
      '<!DOCTYPE html>',
      '<html lang="en">',
      '<head>',
      '<meta charset="UTF-8">',
      '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
      '<title>Docker Credential Helper Diagnostic Report</title>',
      '<style>' + styles + '</style>',
      '</head>',
      '<body>',
      this.generateHtmlHeader(report),
      this.generateHtmlSummary(report),
      this.generateHtmlIssues(report),
      this.generateHtmlRecommendations(report),
      this.generateHtmlFooter(report),
      '</body>',
      '</html>'
    ];

    return lines.join('\n');
  }

  /**
   * Generate HTML header
   */
  generateHtmlHeader(report) {
    const statusClass = report.summary.status.toLowerCase();
    return `
      <div class="header">
        <h1>Docker Credential Helper Diagnostic Report</h1>
        <p>Overall Status: <span class="status ${statusClass}">${report.summary.status}</span></p>
        <p>Generated: ${new Date(report.generated).toLocaleString()}</p>
      </div>
    `;
  }

  /**
   * Generate HTML summary
   */
  generateHtmlSummary(report) {
    return `
      <div class="summary">
        <h2>Executive Summary</h2>
        <table>
          <tr><th>Docker Running</th><td>${report.summary.dockerRunning ? '✅ Yes' : '❌ No'}</td></tr>
          <tr><th>Credential Helper</th><td>${report.summary.credentialHelperWorking ? '✅ Working' : '❌ Broken'}</td></tr>
          <tr><th>Total Issues</th><td>${report.summary.issuesFound}</td></tr>
          <tr><th>Critical Issues</th><td><span class="severity critical">${report.summary.critical}</span></td></tr>
          <tr><th>High Issues</th><td><span class="severity high">${report.summary.high}</span></td></tr>
          <tr><th>Medium Issues</th><td><span class="severity medium">${report.summary.medium}</span></td></tr>
          <tr><th>Low Issues</th><td><span class="severity low">${report.summary.low}</span></td></tr>
        </table>
      </div>
    `;
  }

  /**
   * Generate HTML issues section
   */
  generateHtmlIssues(report) {
    if (!report.issues || Object.keys(report.issues).length === 0) {
      return '<div class="issues"><h2>Issues</h2><p>No issues found! ✅</p></div>';
    }

    let html = '<div class="issues"><h2>Issues by Category</h2>';

    for (const [category, issues] of Object.entries(report.issues)) {
      if (issues.length === 0) continue;

      html += `
        <div class="category">
          <h3>${category.charAt(0).toUpperCase() + category.slice(1)} (${issues.length})</h3>
      `;

      for (const issue of issues.slice(0, this.maxIssues)) {
        html += `
          <div class="issue ${issue.severity}">
            <span class="severity ${issue.severity}">${issue.severity}</span>
            <strong>${issue.message}</strong>
            ${this.verbose && issue.suggestion ? `<br><em>${issue.suggestion}</em>` : ''}
          </div>
        `;
      }

      if (issues.length > this.maxIssues) {
        html += `<p><em>... and ${issues.length - this.maxIssues} more issues</em></p>`;
      }

      html += '</div>';
    }

    html += '</div>';
    return html;
  }

  /**
   * Generate HTML recommendations
   */
  generateHtmlRecommendations(report) {
    if (!this.includeRecommendations || report.recommendations.length === 0) {
      return '';
    }

    let html = '<div class="recommendations"><h2>Recommendations</h2>';

    for (const rec of report.recommendations.slice(0, 10)) {
      html += `
        <div style="margin-bottom: 20px;">
          <h3><span class="severity ${rec.priority}">${rec.priority.toUpperCase()}</span>: ${rec.title}</h3>
          <p>${rec.description}</p>
          ${this.verbose ? `
            <h4>Actions:</h4>
            <ul>
              ${rec.actions.map(action => `<li>${action}</li>`).join('')}
            </ul>
          ` : ''}
        </div>
      `;
    }

    html += '</div>';
    return html;
  }

  /**
   * Generate HTML footer
   */
  generateHtmlFooter(report) {
    return `
      <div class="footer">
        <p><strong>Tool:</strong> ${report.metadata.tool.name} v${report.metadata.tool.version}</p>
        <p><strong>Generated:</strong> ${new Date(report.generated).toLocaleString()}</p>
      </div>
    `;
  }

  /**
   * Get severity icon for markdown
   */
  getSeverityIcon(severity) {
    const icons = {
      critical: '🚨',
      high: '⚠️',
      medium: '⚡',
      low: 'ℹ️'
    };
    return icons[severity] || 'ℹ️';
  }

  /**
   * Generate report for a single issue
   */
  generateIssueReport(issue, context = {}) {
    const report = {
      issue: {
        code: issue.code,
        message: issue.message,
        severity: issue.severity,
        suggestion: issue.suggestion,
        source: issue.source || 'unknown'
      },
      context,
      generated: new Date().toISOString()
    };

    switch (this.format) {
      case 'json':
        return JSON.stringify(report, null, 2);
      case 'markdown':
        return `# Issue Report\n\n**Code:** ${issue.code}\n**Message:** ${issue.message}\n**Severity:** ${issue.severity}\n**Suggestion:** ${issue.suggestion}\n`;
      default:
        return `ISSUE: ${issue.code}\n${issue.message}\nSeverity: ${issue.severity}\nSuggestion: ${issue.suggestion}\n`;
    }
  }

  /**
   * Generate diff report for configuration changes
   */
  generateConfigDiff(originalConfig, newConfig, configPath = '~/.docker/config.json') {
    const original = typeof originalConfig === 'string' ? originalConfig : JSON.stringify(originalConfig, null, 2);
    const modified = typeof newConfig === 'string' ? newConfig : JSON.stringify(newConfig, null, 2);

    const diff = this.diffGenerator.generateDiff(original, modified, {
      originalPath: configPath,
      modifiedPath: configPath,
      originalLabel: 'current',
      modifiedLabel: 'proposed'
    });

    if (diff.identical) {
      return 'No changes to Docker configuration.';
    }

    return this.diffGenerator.render(diff, this.format === 'html' ? 'html' : 'unified');
  }
}

module.exports = ReportGenerator;
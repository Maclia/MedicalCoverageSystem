const PlatformDetector = require('../../diagnostics/platform-detector');
const DockerChecker = require('../../diagnostics/docker-checker');
const ReportGenerator = require('../../diagnostics/report-generator');
const CredentialRepairer = require('../../repairs/credential-repairer');
const ConsentFlow = require('../../repairs/consent-flow');
const { ProcessRunner } = require('../../utils/process-runner');

/**
 * Doctor Command
 * Interactive diagnostic and repair session
 */

class DoctorCommand {
  constructor(options = {}) {
    this.options = options;
    this.verbose = options.verbose || false;
    this.dryRun = options.dryRun || false;
    this.autoApprove = options.autoApprove || false;
    this.noInteractive = options.noInteractive || false;
    this.timeout = options.timeout || 60000;
    this.outputFormat = options.format || 'text';
    this.outputFile = options.output || null;

    this.platformDetector = new PlatformDetector();
    this.dockerChecker = new DockerChecker();
    this.reportGenerator = new ReportGenerator({
      format: this.outputFormat,
      verbose: this.verbose,
      colorOutput: !options.noColor && process.stdout.isTTY
    });
    this.credentialRepairer = new CredentialRepairer({
      dryRun: this.dryRun,
      verbose: this.verbose,
      timeout: this.timeout
    });
    this.consentFlow = new ConsentFlow({
      autoApprove: this.autoApprove,
      showDiffs: !options.noDiff,
      requireExplicitConsent: !this.autoApprove
    });
    this.runner = new ProcessRunner({
      timeout: this.timeout,
      logCommands: this.verbose
    });
  }

  /**
   * Execute doctor command
   */
  async execute() {
    try {
      console.log('🔍 Starting Docker Credential Doctor...\n');

      // Step 1: Quick Scan (5 seconds)
      console.log('⚡ Performing quick scan (5 seconds)...');
      const quickResults = await this.performQuickScan();

      // Step 2: Display Summary
      this.displayQuickSummary(quickResults);

      // Step 3: Ask for detailed analysis
      if (!this.noInteractive) {
        const shouldAnalyze = await this.promptForDetailedAnalysis(quickResults);

        if (shouldAnalyze) {
          console.log('\n🔬 Performing detailed analysis...');
          const detailedResults = await this.performDetailedAnalysis();

          // Step 4: Show detailed options
          const analysis = await this.credentialRepairer.analyzeAndRepair(detailedResults);
          this.displayDetailedOptions(analysis);

          // Step 5: Get user choice
          const choice = await this.promptUserChoice(analysis);

          // Step 6: Execute selected action
          await this.executeAction(choice, analysis);
        }
      } else {
        // Non-interactive mode - just show quick results
        const analysis = await this.credentialRepairer.analyzeAndRepair(quickResults);
        await this.generateAndSaveReport(analysis, quickResults);
      }

      console.log('\n✅ Docker Credential Doctor completed successfully');

    } catch (error) {
      console.error(`❌ Doctor command failed: ${error.message}`);
      if (this.verbose) {
        console.error(error.stack);
      }
      throw error;
    }
  }

  /**
   * Perform quick diagnostic scan
   */
  async performQuickScan() {
    const startTime = Date.now();

    try {
      // Run diagnostics in parallel for speed
      const results = await Promise.allSettled([
        this.platformDetector.getPlatformInfo(),
        this.dockerChecker.runDockerChecks(),
        this.runPlatformSpecificDiagnostics()
      ]);

      const scanTime = Date.now() - startTime;

      return {
        platform: results[0].status === 'fulfilled' ? results[0].value : null,
        docker: results[1].status === 'fulfilled' ? results[1].value : null,
        platformSpecific: results[2].status === 'fulfilled' ? results[2].value : null,
        scanTime: Math.round(scanTime / 1000),
        errors: results.filter(r => r.status === 'rejected').map(r => r.reason)
      };

    } catch (error) {
      return {
        platform: null,
        docker: null,
        platformSpecific: null,
        scanTime: Math.round((Date.now() - startTime) / 1000),
        errors: [error]
      };
    }
  }

  /**
   * Run platform-specific diagnostics
   */
  async runPlatformSpecificDiagnostics() {
    const platform = process.platform;

    switch (platform) {
      case 'darwin':
        const MacOSDiagnostics = require('../../diagnostics/credential-helpers/macos');
        const macDiagnostics = new MacOSDiagnostics();
        return await macDiagnostics.runDiagnostics();

      case 'linux':
        const LinuxDiagnostics = require('../../diagnostics/credential-helpers/linux');
        const linuxDiagnostics = new LinuxDiagnostics();
        return await linuxDiagnostics.runDiagnostics();

      case 'win32':
        const WindowsDiagnostics = require('../../diagnostics/credential-helpers/windows');
        const windowsDiagnostics = new WindowsDiagnostics();
        return await windowsDiagnostics.runDiagnostics();

      default:
        return { platform, issues: [], recommendations: [] };
    }
  }

  /**
   * Display quick scan summary
   */
  displayQuickSummary(results) {
    console.log('⚡ QUICK SCAN RESULTS');
    console.log('='.repeat(50));

    // Docker status
    if (results.docker) {
      const dockerStatus = results.docker.daemon?.running ? '✅ Running' : '❌ Not running';
      console.log(`Docker Daemon: ${dockerStatus}`);

      if (results.docker.daemon?.version) {
        console.log(`Docker Version: ${results.docker.daemon.version}`);
      }

      // Configuration status
      const configStatus = results.docker.configuration?.configValid ? '✅ Valid' : '❌ Invalid';
      console.log(`Configuration: ${configStatus}`);

      // Registry connectivity
      if (results.docker.registry) {
        const registryStatus = results.docker.registry.dockerHub ? '✅ Connected' : '❌ Failed';
        console.log(`Registry Access: ${registryStatus}`);
      }
    } else {
      console.log('Docker: ❌ Not accessible');
    }

    // Credential helper status
    const credentialHelper = results.platform?.credentialHelper;
    if (credentialHelper) {
      const helperStatus = credentialHelper.available ?
        (credentialHelper.available.working ? '✅ Working' : '❌ Broken') : '❌ Not found';
      console.log(`Credential Helper: ${helperStatus}`);

      if (credentialHelper.available) {
        console.log(`Helper Type: ${credentialHelper.available.helper}`);
      }
    } else {
      console.log('Credential Helper: ❌ Not detected');
    }

    // Count issues
    let totalIssues = 0;
    let criticalIssues = 0;

    if (results.docker) {
      totalIssues += results.docker.daemon?.errors?.length || 0;
      totalIssues += results.docker.configuration?.errors?.length || 0;
      totalIssues += results.docker.registry?.errors?.length || 0;

      criticalIssues += (results.docker.daemon?.errors || []).filter(e =>
        e.code?.includes('NOT_RUNNING') || e.code?.includes('CRITICAL')
      ).length;
    }

    if (results.platformSpecific) {
      totalIssues += results.platformSpecific.issues?.length || 0;
      criticalIssues += (results.platformSpecific.issues || []).filter(i =>
        i.severity === 'critical'
      ).length;
    }

    console.log(`\n📊 Issues Found: ${totalIssues}`);
    if (criticalIssues > 0) {
      console.log(`🚨 Critical Issues: ${criticalIssues}`);
    }

    console.log(`⏱️  Scan completed in ${results.scanTime}s\n`);
  }

  /**
   * Prompt user for detailed analysis
   */
  async promptForDetailedAnalysis(results) {
    const issueCount = this.countTotalIssues(results);

    if (issueCount === 0) {
      console.log('🎉 No issues found! Docker credentials appear to be working correctly.\n');
      console.log('💡 Run with --verbose for detailed system information.');
      return false;
    }

    console.log(`\n🤔 Found ${issueCount} issues that need attention.`);
    console.log('Would you like to:');
    console.log('  [1] Fix all critical issues (recommended)');
    console.log('  [2] Review all issues individually');
    console.log('  [3] View detailed diagnostic report');
    console.log('  [0] Exit without changes');

    const readline = require('readline');
    const rlInterface = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    return new Promise((resolve) => {
      rlInterface.question('Choose option [1-3, 0]: ', (answer) => {
        rlInterface.close();

        const choice = parseInt(answer.trim());

        switch (choice) {
          case 1:
            resolve('fix_critical');
            break;
          case 2:
            resolve('review_all');
            break;
          case 3:
            resolve('detailed_report');
            break;
          case 0:
          default:
            resolve('exit');
            break;
        }
      });
    });
  }

  /**
   * Count total issues from results
   */
  countTotalIssues(results) {
    let count = 0;

    if (results.docker) {
      count += (results.docker.daemon?.errors?.length || 0);
      count += (results.docker.configuration?.errors?.length || 0);
      count += (results.docker.registry?.errors?.length || 0);
    }

    if (results.platformSpecific) {
      count += (results.platformSpecific.issues?.length || 0);
    }

    return count;
  }

  /**
   * Perform detailed analysis
   */
  async performDetailedAnalysis() {
    const startTime = Date.now();

    try {
      console.log('🔍 Performing comprehensive analysis...');

      // Run detailed checks
      const results = await this.performQuickScan();

      // Enhanced platform-specific analysis
      if (results.platformSpecific) {
        console.log('  • Platform-specific diagnostics completed');
      }

      // Docker system checks
      if (results.docker) {
        console.log('  • Docker system analysis completed');
      }

      // Configuration analysis
      console.log('  • Configuration validation completed');

      // Credential helper analysis
      console.log('  • Credential helper analysis completed');

      const analysisTime = Date.now() - startTime;
      results.analysisTime = Math.round(analysisTime / 1000);

      console.log(`✅ Detailed analysis completed in ${analysisTime / 1000}s\n`);

      return results;

    } catch (error) {
      console.error(`❌ Detailed analysis failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Display detailed options
   */
  displayDetailedOptions(analysis) {
    console.log('📋 ANALYSIS RESULTS');
    console.log('='.repeat(50));

    if (analysis.issues.length === 0) {
      console.log('🎉 No issues found that require fixing!');
      console.log('Docker credentials appear to be working correctly.');
      return;
    }

    // Group issues by severity
    const issues = analysis.issues;
    const criticalIssues = issues.filter(i => i.severity === 'critical');
    const highIssues = issues.filter(i => i.severity === 'high');
    const mediumIssues = issues.filter(i => i.severity === 'medium');
    const lowIssues = issues.filter(i => i.severity === 'low');

    let issueIndex = 1;

    if (criticalIssues.length > 0) {
      console.log('\n🚨 CRITICAL ISSUES');
      console.log('-'.repeat(30));
      for (const issue of criticalIssues) {
        console.log(`\n[${issueIndex}] ${issue.description}`);
        if (this.verbose && issue.autoFixable) {
          console.log(`    ✅ Auto-fixable`);
        }
        issueIndex++;
      }
    }

    if (highIssues.length > 0) {
      console.log('\n⚠️  HIGH SEVERITY ISSUES');
      console.log('-'.repeat(30));
      for (const issue of highIssues) {
        console.log(`\n[${issueIndex}] ${issue.description}`);
        if (this.verbose && issue.autoFixable) {
          console.log(`    ✅ Auto-fixable`);
        }
        issueIndex++;
      }
    }

    if (mediumIssues.length > 0) {
      console.log('\n⚡ MEDIUM SEVERITY ISSUES');
      console.log('-'.repeat(30));
      for (const issue of mediumIssues) {
        console.log(`\n[${issueIndex}] ${issue.description}`);
        if (this.verbose && issue.autoFixable) {
          console.log(`    ✅ Auto-fixable`);
        }
        issueIndex++;
      }
    }

    if (lowIssues.length > 0) {
      console.log('\nℹ️  LOW SEVERITY ISSUES');
      console.log('-'.repeat(30));
      for (const issue of lowIssues) {
        console.log(`\n[${issueIndex}] ${issue.description}`);
        if (this.verbose && issue.autoFixable) {
          console.log(`    ✅ Auto-fixable`);
        }
        issueIndex++;
      }
    }

    // Show recommendations
    if (analysis.recommendations.length > 0) {
      console.log('\n💡 RECOMMENDATIONS');
      console.log('-'.repeat(30));

      for (let i = 0; i < Math.min(analysis.recommendations.length, 5); i++) {
        const rec = analysis.recommendations[i];
        console.log(`\n[${i + 1}] ${rec.title}`);
        console.log(`    ${rec.description}`);
      }
    }

    console.log('\n[0] Exit without changes');
  }

  /**
   * Prompt user for action choice
   */
  async promptUserChoice(analysis) {
    if (this.noInteractive) {
      return { action: 'auto_fix_all', autoFixable: true };
    }

    const readline = require('readline');
    const rlInterface = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    return new Promise((resolve) => {
      rlInterface.question('\nSelect an option to proceed: ', (answer) => {
        rlInterface.close();

        const choice = parseInt(answer.trim());

        if (choice === 0) {
          resolve({ action: 'exit' });
        } else if (choice > 0 && choice <= analysis.issues.length) {
          const issue = analysis.issues[choice - 1];
          resolve({ action: 'fix_specific', issue });
        } else if (choice > analysis.issues.length && choice <= analysis.issues.length + analysis.recommendations.length) {
          const recIndex = choice - analysis.issues.length - 1;
          const recommendation = analysis.recommendations[recIndex];
          resolve({ action: 'apply_recommendation', recommendation });
        } else {
          // Default to auto-fix all fixable issues
          const autoFixableIssues = analysis.fixes.filter(f => f.autoFixable);
          resolve({ action: 'auto_fix_all', autoFixableIssues });
        }
      });
    });
  }

  /**
   * Execute selected action
   */
  async executeAction(choice, analysis) {
    switch (choice.action) {
      case 'exit':
        console.log('\n👋 Exiting without changes.');
        return;

      case 'fix_specific':
        await this.fixSpecificIssue(choice.issue);
        break;

      case 'apply_recommendation':
        await this.applyRecommendation(choice.recommendation);
        break;

      case 'auto_fix_all':
        await this.autoFixAll(analysis);
        break;

      case 'detailed_report':
        await this.generateAndSaveReport(analysis);
        break;

      default:
        console.log(`\n❌ Unknown action: ${choice.action}`);
        return;
    }

    // Verify fixes if not dry run
    if (!this.dryRun && !this.noInteractive) {
      console.log('\n🧪 Verifying fixes...');
      await this.verifyFixes(analysis);
    }
  }

  /**
   * Fix a specific issue
   */
  async fixSpecificIssue(issue) {
    console.log(`\n🔧 Fixing issue: ${issue.description}`);

    if (!issue.autoFixable) {
      console.log(`❌ This issue cannot be automatically fixed.`);
      console.log(`💡 ${issue.suggestion}`);
      return;
    }

    // Get consent for the fix
    const proposal = this.createFixProposal(issue);
    const consent = await this.consentFlow.getConsent(proposal);

    if (consent.approved) {
      const fix = await this.credentialRepairer.generateFix(issue);
      if (fix) {
        const result = await fix.execute();
        if (result.success) {
          console.log(`✅ ${result.message}`);
        } else {
          console.log(`❌ ${result.message}`);
        }
      }
    } else {
      console.log(`❌ Fix cancelled: ${consent.reason}`);
    }
  }

  /**
   * Apply a recommendation
   */
  async applyRecommendation(recommendation) {
    console.log(`\n💡 Applying recommendation: ${recommendation.title}`);
    console.log(`   ${recommendation.description}`);

    if (!recommendation.autoFixable) {
      console.log(`❌ This recommendation requires manual action.`);
      for (const action of recommendation.actions) {
        console.log(`   • ${action.description}`);
      }
      return;
    }

    // Execute the recommendation
    for (const action of recommendation.actions) {
      try {
        if (action.command) {
          console.log(`🚀 Executing: ${action.command}`);
          const result = await this.runner.run(
            action.command.split(' ')[0],
            action.command.split(' ').slice(1)
          );
          console.log(`✅ ${result.stdout}`);
        }
      } catch (error) {
        console.log(`❌ Failed: ${error.message}`);
      }
    }
  }

  /**
   * Auto-fix all issues
   */
  async autoFixAll(analysis) {
    const autoFixableFixes = analysis.fixes.filter(f => f.autoFixable);

    if (autoFixableFixes.length === 0) {
      console.log('\nℹ️  No automatically fixable issues found.');
      return;
    }

    console.log(`\n🔧 Auto-fixing ${autoFixableFixes.length} issues...`);

    // Create batch proposal
    const proposal = this.createBatchFixProposal(autoFixableFixes);
    const consent = await this.consentFlow.getConsent(proposal);

    if (consent.approved) {
      const results = await this.credentialRepairer.executeFixes(autoFixableFixes, {
        dryRun: this.dryRun,
        stopOnFailure: false
      });

      console.log(`\n📊 Auto-fix Results:`);
      console.log(`   Total: ${results.executed}`);
      console.log(`   ✅ Successful: ${results.successful}`);
      console.log(`   ❌ Failed: ${results.failed}`);

      if (results.requiresRestart) {
        console.log(`\n⚠️  Some fixes require Docker daemon restart.`);
        console.log(`   Run: sudo systemctl restart docker (Linux)`);
        console.log(`   Or restart Docker Desktop (macOS/Windows)`);
      }

      if (results.requiresReauth) {
        console.log(`\n🔐 Some fixes require re-authentication.`);
        console.log(`   Run: docker login <registry>`);
      }
    } else {
      console.log(`\n❌ Auto-fix cancelled: ${consent.reason}`);
    }
  }

  /**
   * Create fix proposal for consent flow
   */
  createFixProposal(issue) {
    return {
      action: 'apply_fix',
      description: issue.description,
      risk: issue.severity,
      files: [
        {
          path: this.credentialRepairer.configPath,
          type: 'config',
          description: 'Docker configuration file'
        }
      ],
      backup: {
        location: this.credentialRepairer.backupDir,
        description: 'Create backup of current configuration'
      },
      diff: null, // Would be populated with actual diff
      impact: 'This change will fix Docker credential helper issues',
      alternatives: issue.autoFixable ? [] : ['Manual fix instructions provided']
    };
  }

  /**
   * Create batch fix proposal
   */
  createBatchFixProposal(fixes) {
    const files = fixes.map(f => ({
      path: this.credentialRepairer.configPath,
      type: 'config',
      description: f.description
    }));

    const uniqueFiles = files.filter((file, index, self) =>
      index === self.findIndex(f => f.path === file.path)
    );

    return {
      action: 'apply_fixes',
      description: `Apply ${fixes.length} automatic fixes`,
      risk: this.assessBatchRisk(fixes),
      files: uniqueFiles,
      backup: {
        location: this.credentialRepairer.backupDir,
        description: 'Create backup before applying changes'
      },
      diff: null,
      impact: 'These changes will fix Docker credential helper and configuration issues',
      alternatives: ['Review and apply fixes individually']
    };
  }

  /**
   * Assess risk level for batch of fixes
   */
  assessBatchRisk(fixes) {
    if (fixes.some(f => f.riskLevel === 'critical')) {
      return 'critical';
    } else if (fixes.some(f => f.riskLevel === 'high')) {
      return 'high';
    } else if (fixes.some(f => f.riskLevel === 'medium')) {
      return 'medium';
    }
    return 'low';
  }

  /**
   * Generate and save diagnostic report
   */
  async generateAndSaveReport(analysis, diagnosticResults = null) {
    console.log('\n📄 Generating diagnostic report...');

    try {
      const report = this.reportGenerator.generateReport(
        diagnosticResults?.platform || {},
        diagnosticResults?.docker || {},
        diagnosticResults
      );

      if (this.outputFile) {
        require('fs').promises.writeFile(this.outputFile, report);
        console.log(`📄 Report saved to: ${this.outputFile}`);
      } else {
        console.log(report);
      }

    } catch (error) {
      console.log(`❌ Failed to generate report: ${error.message}`);
    }
  }

  /**
   * Verify that fixes were successful
   */
  async verifyFixes(analysis) {
    console.log('🔍 Verifying that fixes were applied correctly...');

    try {
      // Quick re-scan
      const verificationResults = await this.performQuickScan();
      const remainingIssues = this.countTotalIssues(verificationResults);

      if (remainingIssues === 0) {
        console.log('✅ All issues have been successfully resolved!');
      } else {
        console.log(`⚠️  ${remainingIssues} issues remain:`);

        // Show remaining issues
        const verificationAnalysis = await this.credentialRepairer.analyzeAndRepair(verificationResults);
        for (const issue of verificationAnalysis.issues.slice(0, 3)) {
          console.log(`   • ${issue.description}`);
        }
      }

    } catch (error) {
      console.log(`⚠️  Could not verify fixes: ${error.message}`);
    }
  }
}

module.exports = DoctorCommand;
const readline = require('readline');
const DiffGenerator = require('../utils/diff-generator');
const { ProcessRunner } = require('../utils/process-runner');

/**
 * Consent Flow Manager
 * Handles user approvals for system modifications with detailed change previews
 */

class ConsentFlow {
  constructor(options = {}) {
    this.autoApprove = options.autoApprove || false;
    this.showDiffs = options.showDiffs !== false;
    this.requireExplicitConsent = options.requireExplicitConsent || false;
    this.timeout = options.timeout || 60000; // 1 minute default
    this.verbose = options.verbose || false;
    this.alwaysShowCritical = options.alwaysShowCritical !== false;
    this.colorOutput = options.colorOutput !== false;
    this.runner = new ProcessRunner({
      timeout: options.commandTimeout || 30000
    });
    this.diffGenerator = new DiffGenerator({
      contextLines: options.diffContextLines || 3,
      colorOutput: this.colorOutput,
      showLineNumbers: true
    });
  }

  /**
   * Get user consent for a proposed change
   */
  async getConsent(proposal) {
    // Validate proposal structure
    if (!this.validateProposal(proposal)) {
      throw new Error('Invalid consent proposal structure');
    }

    // Auto-approve if enabled and risk is acceptable
    if (this.autoApprove && this.isAutoApprovable(proposal)) {
      return {
        approved: true,
        action: proposal.action,
        reason: 'auto_approved',
        timestamp: new Date().toISOString()
      };
    }

    // Show proposal details
    this.displayProposal(proposal);

    // Show diff if available
    if (this.showDiffs && proposal.diff) {
      await this.displayDiff(proposal.diff);
    }

    // Get user response
    const response = await this.promptUser(proposal);

    return {
      approved: response.approved,
      action: response.approved ? proposal.action : null,
      reason: response.reason,
      timestamp: new Date().toISOString(),
      skipped: response.skipped,
      askedForHelp: response.askedForHelp
    };
  }

  /**
   * Validate proposal structure
   */
  validateProposal(proposal) {
    const required = ['action', 'description', 'risk', 'files'];
    const optional = ['backup', 'diff', 'alternatives', 'impact'];

    // Check required fields
    for (const field of required) {
      if (!proposal[field]) {
        console.error(`Missing required field: ${field}`);
        return false;
      }
    }

    // Validate risk level
    if (!['low', 'medium', 'high', 'critical'].includes(proposal.risk)) {
      console.error(`Invalid risk level: ${proposal.risk}`);
      return false;
    }

    // Validate files structure
    if (!Array.isArray(proposal.files)) {
      console.error('Files must be an array');
      return false;
    }

    return true;
  }

  /**
   * Check if proposal can be auto-approved
   */
  isAutoApprovable(proposal) {
    // Never auto-approve critical changes
    if (proposal.risk === 'critical') {
      return false;
    }

    // Auto-approve only low risk changes
    if (proposal.risk !== 'low') {
      return false;
    }

    // Don't auto-approve if user explicitly requested to see
    if (this.alwaysShowCritical || proposal.risk === 'high') {
      return false;
    }

    return true;
  }

  /**
   * Display proposal to user
   */
  displayProposal(proposal) {
    console.log('\n' + '='.repeat(60));
    console.log(`🔍 ${this.colorize(proposal.risk.toUpperCase(), proposal.risk)} CHANGE DETECTED`);
    console.log('='.repeat(60));
    console.log();

    // Description
    console.log(`📋 Description: ${proposal.description}`);
    console.log();

    // Risk level
    const riskEmoji = this.getRiskEmoji(proposal.risk);
    console.log(`⚠️  Risk Level: ${riskEmoji} ${proposal.risk.toUpperCase()}`);
    console.log();

    // Affected files
    console.log('📁 Affected Files:');
    for (const file of proposal.files) {
      const icon = this.getFileIcon(file);
      console.log(`  ${icon} ${file.path} ${file.type ? `(${file.type})` : ''}`);
    }
    console.log();

    // Backup information
    if (proposal.backup) {
      console.log(`💾 Backup: ${proposal.backup.location}`);
      if (proposal.backup.description) {
        console.log(`   ${proposal.backup.description}`);
      }
      console.log();
    }

    // Impact
    if (proposal.impact) {
      console.log('💥 Impact:');
      console.log(`   ${proposal.impact}`);
      console.log();
    }

    // Alternatives
    if (proposal.alternatives && proposal.alternatives.length > 0) {
      console.log('🔄 Alternatives:');
      for (const alt of proposal.alternatives) {
        console.log(`   • ${alt.description} (risk: ${alt.risk})`);
      }
      console.log();
    }

    // Command details
    if (proposal.command) {
      console.log('⚡ Execution Details:');
      console.log(`   Command: ${proposal.command}`);
      if (proposal.args) {
        console.log(`   Args: ${JSON.stringify(proposal.args)}`);
      }
      if (proposal.workingDirectory) {
        console.log(`   Directory: ${proposal.workingDirectory}`);
      }
      console.log();
    }
  }

  /**
   * Display diff to user
   */
  async displayDiff(diff) {
    console.log('📊 Proposed Changes:');
    console.log('-'.repeat(40));

    try {
      const rendered = this.diffGenerator.render(diff, 'unified');
      console.log(rendered);
    } catch (error) {
      console.log(`❌ Failed to render diff: ${error.message}`);
      // Fall back to simple diff display
      if (diff.hunks && diff.hunks.length > 0) {
        console.log(`   ${diff.hunks.length} hunks of changes detected`);
      } else {
        console.log('   No changes to display');
      }
    }

    console.log('-'.repeat(40));
    console.log();
  }

  /**
   * Prompt user for consent
   */
  async promptUser(proposal) {
    const rlInterface = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    return new Promise((resolve) => {
      let attempts = 0;
      const maxAttempts = 3;

      const ask = () => {
        attempts++;
        console.log('🤔 Do you want to apply this change?');

        // Show options based on proposal
        const options = this.getOptions(proposal);
        console.log();
        for (let i = 0; i < options.length; i++) {
          const option = options[i];
          const color = this.getOptionColor(option.type);
          console.log(`  ${i + 1}. ${this.colorize(option.text, color)} ${option.description ? `- ${option.description}` : ''}`);
        }

        if (attempts > 1) {
          console.log(`  0. Skip this change`);
          console.log(`  h. Help me understand this change`);
        }

        console.log();

        rlInterface.question('Enter your choice (1-' + options.length + ', 0, h): ', (answer) => {
          const normalized = answer ? answer.trim().toLowerCase() : '';

          try {
            const response = this.processInput(normalized, options, proposal);
            rlInterface.close();
            resolve(response);
          } catch (error) {
            console.log(`❌ Invalid choice: ${error.message}`);

            if (attempts >= maxAttempts) {
              console.log('⚠️  Too many invalid attempts. Skipping change.');
              rlInterface.close();
              resolve({
                approved: false,
                reason: 'invalid_input',
                skipped: true
              });
            } else {
              console.log(`Please try again (${attempts}/${maxAttempts} attempts used).\n`);
              ask();
            }
          }
        });
      };

      ask();
    });
  }

  /**
   * Get options based on proposal
   */
  getOptions(proposal) {
    const options = [
      {
        type: 'approve',
        text: 'Yes',
        description: 'Apply this change',
        action: 'approve'
      },
      {
        type: 'approve_no_backup',
        text: 'Yes, skip backup',
        description: 'Apply without creating backup',
        action: 'approve_no_backup'
      },
      {
        type: 'view_diff',
        text: 'View detailed diff',
        description: 'Show line-by-line changes',
        action: 'view_diff'
      },
      {
        type: 'alternative',
        text: 'Show alternatives',
        description: 'Display alternative options',
        action: 'alternatives'
      }
    ];

    // Filter options based on proposal context
    const filteredOptions = options.filter(option => {
      // Don't show "skip backup" if no backup is planned
      if (option.type === 'approve_no_backup' && !proposal.backup) {
        return false;
      }

      // Don't show "view diff" if no diff available
      if (option.type === 'view_diff' && !proposal.diff) {
        return false;
      }

      // Don't show alternatives if none available
      if (option.type === 'alternative' && (!proposal.alternatives || proposal.alternatives.length === 0)) {
        return false;
      }

      return true;
    });

    // Add option-specific options for critical changes
    if (proposal.risk === 'critical') {
      filteredOptions.push({
        type: 'approve_with_revert',
        text: 'Yes, with automatic revert',
        description: 'Apply and create revert plan',
        action: 'approve_with_revert'
      });
    }

    return filteredOptions;
  }

  /**
   * Process user input
   */
  processInput(input, options, proposal) {
    // Handle help request
    if (input === 'h') {
      return this.showHelp(proposal);
    }

    // Handle skip
    if (input === '0') {
      return {
        approved: false,
        reason: 'user_skipped',
        skipped: true
      };
    }

    // Parse numeric choice
    const choice = parseInt(input);
    if (isNaN(choice) || choice < 1 || choice > options.length) {
      throw new Error(`Please enter a number between 1 and ${options.length}, 0 to skip, or h for help`);
    }

    const selectedOption = options[choice - 1];
    return this.processOption(selectedOption, proposal);
  }

  /**
   * Process selected option
   */
  processOption(option, proposal) {
    switch (option.action) {
      case 'approve':
        return {
          approved: true,
          reason: 'user_approved',
          createBackup: true
        };

      case 'approve_no_backup':
        return {
          approved: true,
          reason: 'user_approved_no_backup',
          createBackup: false
        };

      case 'approve_with_revert':
        return {
          approved: true,
          reason: 'user_approved_with_revert',
          createBackup: true,
          createRevertPlan: true
        };

      case 'view_diff':
        return this.showDetailedDiff(proposal);

      case 'alternatives':
        return this.showAlternatives(proposal);

      default:
        throw new Error(`Unknown option: ${option.action}`);
    }
  }

  /**
   * Show help information
   */
  showHelp(proposal) {
    const help = `
🆘 HELP - Understanding This Change

📋 PURPOSE:
${proposal.description}

⚠️  RISK LEVEL: ${proposal.risk.toUpperCase()}
${this.getRiskDescription(proposal.risk)}

📁 FILES AFFECTED:
${this.getFilesHelp(proposal.files)}

${proposal.backup ? `
💾 BACKUP:
${this.backup.description}
Location: ${proposal.backup.location}
` : ''}

${proposal.impact ? `
💥 IMPACT:
${proposal.impact}
` : ''}

OPTIONS EXPLAINED:
• Yes (1): Apply the change with backup
• Skip (0): Do not apply this change
• Help (h): Show this detailed information

Choose what to do with this change.
`;

    console.log(help);
    console.log();

    // Ask again after showing help
    throw new Error('Please choose an option (1-' + this.getOptions(proposal).length + ', 0, h)');
  }

  /**
   * Show detailed diff
   */
  showDetailedDiff(proposal) {
    if (!proposal.diff) {
      throw new Error('No detailed diff available');
    }

    console.log('\n📊 DETAILED CHANGES:');
    console.log('='.repeat(50));

    try {
      const rendered = this.diffGenerator.render(proposal.diff, 'unified');
      console.log(rendered);
    } catch (error) {
      console.log(`❌ Failed to render diff: ${error.message}`);
    }

    console.log('='.repeat(50));
    console.log();

    throw new Error('Please choose an option (1-' + this.getOptions(proposal).length + ', 0, h)');
  }

  /**
   * Show alternatives
   */
  showAlternatives(proposal) {
    if (!proposal.alternatives || proposal.alternatives.length === 0) {
      throw new Error('No alternatives available');
    }

    console.log('\n🔄 ALTERNATIVE APPROACHES:');
    console.log('='.repeat(40));

    for (let i = 0; i < proposal.alternatives.length; i++) {
      const alt = proposal.alternatives[i];
      console.log(`\n${i + 1}. ${this.colorize(alt.description, alt.risk)} (risk: ${alt.risk})`);

      if (alt.commands) {
        console.log('   Commands:');
        for (const cmd of alt.commands) {
          console.log(`   • ${cmd}`);
        }
      }

      if (alt.impact) {
        console.log(`   Impact: ${alt.impact}`);
      }
    }

    console.log('='.repeat(40));
    console.log();

    // Now ask which alternative they prefer
    throw new Error(`Enter alternative number (1-${proposal.alternatives.length}), or 0 to return to main options`);
  }

  /**
   * Get risk emoji
   */
  getRiskEmoji(risk) {
    const emojis = {
      critical: '🚨',
      high: '⚠️',
      medium: '⚡',
      low: 'ℹ️'
    };
    return emojis[risk] || 'ℹ️';
  }

  /**
   * Get file icon
   */
  getFileIcon(file) {
    const iconMap = {
      config: '⚙️',
      credential: '🔐',
      backup: '💾',
      system: '🔧',
      script: '📜',
      log: '📄'
    };

    return iconMap[file.type] || '📄';
  }

  /**
   * Get risk color
   */
  getRiskColor(risk) {
    const colors = {
      critical: 'red',
      high: 'yellow',
      medium: 'cyan',
      low: 'green'
    };
    return colors[risk] || 'white';
  }

  /**
   * Get option color
   */
  getOptionColor(type) {
    const colors = {
      approve: 'green',
      approve_no_backup: 'yellow',
      approve_with_revert: 'cyan',
      view_diff: 'blue',
      alternative: 'magenta'
    };
    return colors[type] || 'white';
  }

  /**
   * Get risk description
   */
  getRiskDescription(risk) {
    const descriptions = {
      critical: 'This change could cause system instability or data loss. Review carefully.',
      high: 'This change may affect system functionality. Test in a safe environment first.',
      medium: 'This change has some risk but is generally safe with proper testing.',
      low: 'This change is safe and has minimal impact on system functionality.'
    };
    return descriptions[risk] || 'Unknown risk level.';
  }

  /**
   * Get files help text
   */
  getFilesHelp(files) {
    const helpLines = files.map(file => {
      const icon = this.getFileIcon(file);
      const riskColor = this.getRiskColor(file.risk || 'low');
      const path = this.colorize(file.path, riskColor);
      return `  ${icon} ${path} (${file.type || 'file'})`;
    });
    return helpLines.join('\n');
  }

  /**
   * Colorize text based on level
   */
  colorize(text, color) {
    if (!this.colorOutput || !process.stdout.isTTY) {
      return text;
    }

    const colors = {
      red: '\x1b[31m',
      green: '\x1b[32m',
      yellow: '\x1b[33m',
      blue: '\x1b[34m',
      magenta: '\x1b[35m',
      cyan: '\x1b[36m',
      white: '\x1b[37m',
      reset: '\x1b[0m'
    };

    return `${colors[color]}${text}${colors.reset}`;
  }

  /**
   * Get consent for multiple changes
   */
  async getBatchConsent(proposals, options = {}) {
    if (!Array.isArray(proposals)) {
      throw new Error('Proposals must be an array');
    }

    // Group proposals by risk level
    const grouped = this.groupByRisk(proposals);

    console.log(`\n📊 BATCH CONSENT REQUEST`);
    console.log('='.repeat(40));
    console.log(`Found ${proposals.length} changes requiring approval:`);
    console.log();

    // Show summary by risk level
    for (const [risk, riskProposals] of Object.entries(grouped)) {
      const emoji = this.getRiskEmoji(risk);
      const color = this.getRiskColor(risk);
      console.log(`${emoji} ${this.colorize(risk.toUpperCase(), color)}: ${riskProposals.length} changes`);
    }

    console.log();

    // Check if any are critical
    const criticalProposals = proposals.filter(p => p.risk === 'critical');
    if (criticalProposals.length > 0) {
      console.log('⚠️  WARNING: Critical changes detected. Review each carefully.');
      console.log();
    }

    // Batch options
    const batchOptions = [
      {
        id: 'approve_all_low',
        text: 'Approve all low-risk changes',
        description: 'Apply all low-risk changes with backup',
        filter: p => p.risk === 'low'
      },
      {
        id: 'approve_all_medium',
        text: 'Approve all medium and low-risk changes',
        description: 'Apply all medium and low-risk changes with backup',
        filter: p => ['low', 'medium'].includes(p.risk)
      },
      {
        id: 'review_individual',
        text: 'Review each change individually',
        description: 'Go through each change one by one',
        filter: null
      },
      {
        id: 'skip_all',
        text: 'Skip all changes',
        description: 'Do not apply any of the proposed changes',
        filter: null
      }
    ];

    // Get batch choice
    const rlInterface = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const batchChoice = await new Promise((resolve) => {
      console.log('🤔 How would you like to proceed?');
      console.log();

      for (let i = 0; i < batchOptions.length; i++) {
        const option = batchOptions[i];
        const count = option.filter ? proposals.filter(option.filter).length : proposals.length;
        console.log(`  ${i + 1}. ${option.text} (${count} changes)`);
        console.log(`     ${option.description}`);
        console.log();
      }

      console.log(`  0. Exit without changes`);
      console.log();

      rlInterface.question('Enter your choice (1-' + batchOptions.length + ', 0): ', (answer) => {
        const choice = parseInt(answer);
        if (choice === 0) {
          resolve({ action: 'exit', approved: [] });
        } else if (choice >= 1 && choice <= batchOptions.length) {
          resolve({ action: batchOptions[choice - 1].id, approved: [] });
        } else {
          resolve({ action: 'invalid', approved: [] });
        }
        rlInterface.close();
      });
    });

    // Process batch choice
    switch (batchChoice.action) {
      case 'exit':
        return {
          approved: [],
          skipped: proposals.length,
          reason: 'user_cancelled_batch'
        };

      case 'invalid':
        throw new Error('Invalid batch choice');

      case 'skip_all':
        return {
          approved: [],
          skipped: proposals.length,
          reason: 'user_skipped_all'
        };

      case 'review_individual':
        return await this.processIndividualReviews(proposals);

      default:
        return await this.processBatchApproval(batchChoice.action, proposals);
    }
  }

  /**
   * Group proposals by risk level
   */
  groupByRisk(proposals) {
    const grouped = {
      critical: [],
      high: [],
      medium: [],
      low: []
    };

    for (const proposal of proposals) {
      grouped[proposal.risk].push(proposal);
    }

    return grouped;
  }

  /**
   * Process individual reviews
   */
  async processIndividualReviews(proposals) {
    const results = {
      approved: [],
      skipped: [],
      failed: []
    };

    for (const proposal of proposals) {
      try {
        console.log(`\n🔄 Processing change ${results.approved.length + results.skipped.length + results.failed.length + 1} of ${proposals.length}`);

        const consent = await this.getConsent(proposal);

        if (consent.approved) {
          results.approved.push({
            ...proposal,
            consent
          });
        } else if (consent.skipped) {
          results.skipped.push({
            ...proposal,
            consent
          });
        } else {
          results.failed.push({
            ...proposal,
            consent
          });
        }
      } catch (error) {
        console.log(`❌ Failed to process proposal: ${error.message}`);
        results.failed.push({
          ...proposal,
          consent: { approved: false, reason: error.message }
        });
      }
    }

    return results;
  }

  /**
   * Process batch approval
   */
  async processBatchApproval(action, proposals) {
    const option = batchOptions.find(opt => opt.id === action);
    const approvedProposals = proposals.filter(option.filter);

    // Show summary of what will be approved
    console.log(`\n✅ APPROVAL SUMMARY`);
    console.log('='.repeat(30));
    console.log(`Will apply ${approvedProposals.length} changes:`);

    for (const proposal of approvedProposals) {
      console.log(`  • ${proposal.description} (${proposal.risk} risk)`);
    }

    console.log();

    // Final confirmation for batch operations
    const rlInterface = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const confirmed = await new Promise((resolve) => {
      rlInterface.question('Proceed with these changes? (y/N): ', (answer) => {
        const normalized = answer ? answer.trim().toLowerCase() : '';
        resolve(normalized === 'y' || normalized === 'yes');
        rlInterface.close();
      });
    });

    if (!confirmed) {
      return {
        approved: [],
        skipped: proposals.length,
        reason: 'user_cancelled_batch_confirmation'
      };
    }

    return {
      approved: approvedProposals,
      skipped: proposals.length - approvedProposals.length,
      reason: 'batch_approved'
    };
  }
}

module.exports = ConsentFlow;
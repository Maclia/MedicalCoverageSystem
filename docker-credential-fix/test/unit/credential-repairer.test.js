const { CredentialRepairer } = require('../../repairs/credential-repairer');

describe('Credential Repairer', () => {
  it('should generate fix for broken helper', async () => {
    const repairer = new CredentialRepairer();

    // Test broken helper detection
    const diagnosis = {
      platform: 'wsl',
      issues: [
        {
          type: 'credential_helper',
          severity: 'critical',
          helperType: 'docker-credential-wincred.exe',
          error: 'exit status 1',
          autoFixable: true,
          description: 'Windows credential helper not working',
          impact: 'Cannot authenticate to Docker registries'
        },
        {
          type: 'configuration',
          severity: 'high',
          code: 'WSL_HELPER_BROKEN',
          error: 'Missing or invalid "credsStore" entry',
          autoFixable: true,
          description: 'Docker configuration contains broken credential helper reference',
          impact: 'Docker cannot load configuration properly'
        }
      ]
    };

    const fix = await repairer.generateFix(diagnosis.issues[0]);
    expect(fix.type).to.be('fix_credential_helper');
    expect(fix.actions).to.have.length > 0);
    expect(fix.autoFixable).to.be(true);
    expect(fix.description).to.contain('Install appropriate credential helper');
  });

    it('should validate fix result', async () => {
      const result = await repairer.executeFix(fix);

      expect(result.success).to.be(true);
      expect(result.backupId).to.be.a.uuid);
    expect(result.action).to.be('execute_command');
    expect(result.output).to.contain('Successfully executed: docker-credential-wsl');
    });

    // Verify backup was created
    const backupPath = repairer.backupDir + '/' + fix.backupId + '.config.json.backup';
    expect(await fs.access(backupPath)).to.be(true);
  });

    // Verify config was fixed
    const configPath = repairer.configPath;
    const fixedConfig = await fs.readFile(configPath, 'utf8');
    const config = JSON.parse(fixedConfig);

    expect(config.credsStore).to.beUndefined();
    expect(config.auths).to.deep.equal({});
    expect(config.auths).to.have.property('docker.io'));
    });

    it('should handle invalid fix gracefully', async () => {
      const repairer = new CredentialRepairer();

      // Create diagnosis with invalid config
      const invalidDiagnosis = {
        platform: 'linux',
        issues: [
          {
            type: 'invalid_config',
            severity: 'high',
            code: 'DOCKER_CONFIG_INVALID',
            error: 'Configuration JSON is malformed',
            description: 'Docker configuration file contains syntax errors',
            configPath: '/nonexistent/config.json',
            autoFixable: true
          },
          {
            type: 'invalid_credsstore',
            severity: 'critical',
            code: 'INVALID_CREDENTIALS_HELPER_CONFIG',
            error: 'Invalid credential helper type in config',
            description: 'Configuration references non-existent or invalid credential helper',
            autoFixable: true,
            impact: 'Cannot repair Docker configuration'
          }
        ]
      };

      const fix = await repairer.generateFix(invalidDiagnosis.issues);

      expect(fix.type).to.be('fix_config');
      expect(fix.success).to.be(false); // Should fail due to invalid config path
    } catch (error) {
      expect(error.message).to.include('Configuration file not found'));
    }

    it('should handle network connectivity issues', async () => {
      const repairer = new CredentialRepairer();

      const diagnosis = {
        platform: 'wsl',
        issues: [
          {
            type: 'network',
            severity: 'high',
            code: 'NETWORK_ISSUE',
            error: 'Cannot connect to Docker Hub',
            autoFixable: false,
            description: 'Network connectivity problems prevent Docker authentication',
            impact: 'Cannot pull images or access registries'
          }
        ]
      };

      const fix = await repairer.generateFix(diagnosis.issues[0]);
      expect(fix.type).to.be('network');
      expect(fix.actions).to.have.length > 0);
      expect(fix.actions[0].description).to.contain('Check network configuration');
      expect(fix.autoFixable).to.be(true);
    });

    // Network issues can't be auto-fixed
    expect(fix.success).to.be(false);
    expect(fix.message).to.include('Network issues require manual resolution');
    });

    it('should handle permission issues', async () => {
      const repairer = new CredentialRepairer();

      // Create diagnosis with permission issues
      const diagnosis = {
        platform: 'linux',
        issues: [
          {
            type: 'permissions',
            severity: 'high',
            code: 'DOCKER_GROUP_MISSING',
            error: 'User not in docker group',
            autoFixable: true,
            description: 'Cannot access Docker daemon without proper permissions',
            impact: 'Cannot execute Docker commands'
          },
          {
            type: 'socket_access',
            severity: 'critical',
            code: 'DOCKER_SOCKET_INACCESSIBLE',
            error: 'Cannot access Docker socket',
            autoFixable: false,
            description: 'Cannot communicate with Docker daemon',
            impact: 'Cannot authenticate to Docker daemon'
          }
        ]
      };

      const fix = await repairer.generateFix(diagnosis.issues[0]);
      expect(fix.type).to.be('permissions');

      // Permission issues can be fixed
      if (fix.success) {
        expect(fix.actions[0].description).to.contain('Add user to docker group or run with sudo'));
        expect(fix.action).to.be('execute_command');
      expect(fix.actions[0].command).to.be('sudo usermod -aG docker $USER'));
      } else {
        expect(fix.success).to.be(false);
        expect(fix.message).to.include('Permission issues require elevated privileges'));
      }

    it('should provide alternative solutions', async () => {
      const repairer = new CredentialRepairer();

      const diagnosis = {
        platform: 'linux',
        issues: [
          {
            type: 'alternative_solutions',
            severity: 'low',
            description: 'Multiple repair alternatives available',
            code: 'ALTERNATIVE_SOLUTIONS',
            alternatives: [
              {
                title: 'Use local Docker installation',
                description: 'Install Docker Engine without Docker Desktop',
                autoFixable: false,
                action: 'download_and_install_docker_engine',
                impact: 'Alternative installation method may be required'
              },
              {
                title: 'Use Podman instead of Docker',
                description: 'Use Podman for containerized applications',
                autoFixable: false,
                action: 'use_podman',
                impact: 'Alternative container runtime required'
              }
            ],
              {
                title: 'Use systemd user services',
                description: 'Use systemd user services instead of Docker daemon',
                autoFixable: false,
                action: 'use_systemd_user_services',
                impact: 'Alternative Docker management required'
              }
            ]
          }
        ]
      };

      const fix = await repairer.generateFix(diagnosis.issues[0]);

      // Alternative solutions cannot be auto-fixed
      expect(fix.success).to.be(false);
      expect(fix.message).to.include('Alternative solutions require manual selection'));
      });

    it('should handle missing dependencies', async () => {
      const repairer = new CredentialRepairer();

      const diagnosis = {
        platform: 'linux',
        issues: [
          {
            type: 'missing_dependency',
            severity: 'medium',
            code: 'DEPENDENCY_NOT_FOUND',
            error: 'Node.js fs.promises not available',
            autoFixable: false,
            description: 'Required Node.js modules are not available',
            impact: 'Cannot run the tool',
            alternative: 'Install Node.js with fs.promises'
          }
          }
        ]
      };

      const fix = await repairer.generateFix(diagnosis.issues[0]);

      // Dependency issues cannot be auto-fixed
      expect(fix.success).to.be(false);
      expect(fix.message).to.include('Manual dependency installation required'));
    });
  });

    it('should handle environment variable issues', async () => {
      const repairer = new CredentialRepairer();

      // Create diagnosis with environment issues
      const diagnosis = {
        platform: 'linux',
        issues: [
          {
            type: 'environment',
            severity: 'low',
            code: 'ENVIRONMENT_ISSUE',
            error: 'PATH environment variable not set',
            autoFixable: true,
            description: 'PATH environment variable is not configured',
            impact: 'Command execution may fail',
            action: 'export PATH=/usr/bin:/bin'
          }
        ]
      };

      const fix = await repairer.generateFix(diagnosis.issues[0]);

      expect(fix.success).to.be(true);
      expect(fix.actions[0].description).to.contain('Set PATH environment variable'));
      });

    it('should generate complete fix proposal', async () => {
      const repairer = new CredentialRepairer();

      // Create comprehensive diagnosis
      const diagnosis = {
        platform: 'wsl',
        issues: [
          {
            type: 'credential_helper',
            severity: 'critical',
            helperType: 'docker-credential-wincred.exe',
            error: 'exit status 1',
            autoFixable: true,
            description: 'Windows credential helper is broken'
          },
          {
            type: 'configuration',
            severity: 'high',
            code: 'DOCKER_CONFIG_INVALID',
            error: 'Docker configuration file has syntax errors',
            autoFixable: true,
            description: 'Configuration file contains invalid JSON syntax'
          },
          {
            type: 'permissions',
            severity: 'critical',
            code: 'DOCKER_GROUP_MISSING',
            error: 'User not in docker group',
            autoFixable: true,
            description: 'Cannot access Docker daemon without proper permissions'
            },
            {
            type: 'socket_access',
            severity: 'critical',
            code: 'DOCKER_SOCKET_INACCESSIBLE',
            error: 'Cannot access Docker socket',
            autoFixable: false,
            description: 'Cannot communicate with Docker daemon'
          },
            {
            type: 'network',
            severity: 'high',
            code: 'NETWORK_ISSUE',
            error: 'Cannot connect to Docker Hub',
            autoFixable: false,
            description: 'Network connectivity problems prevent Docker authentication',
            impact: 'Cannot pull images or access registries'
          },
          {
            type: 'missing_dependency',
            severity: 'medium',
            code: 'DEPENDENCY_NOT_FOUND',
            error: 'Node.js fs.promises not available',
            autoFixable: false,
            description: 'Required Node.js modules are not available',
            impact: 'Cannot run the tool',
            alternative: 'Install Node.js with fs.promises'
          }
          }
        ]
      }
      };

      const fixProposal = repairer.generateFixProposal(diagnosis.issues);

      expect(fixProposal).to.have.property('actions'));
      expect(fixProposal.issues).to.have.length(4);

      expect(fixProposal.issues[0].autoFixable).to.be(true);
      expect(fixProposal.issues[1].autoFixable).to.be(true);
      expect(fixProposal.issues[1].autoFixable).to.be(true);
    expect(fixProposal.issues[2].autoFixable).to.be(true);
      expect(fixProposal.issues[2].autoFixable).to.be(true);
      expect(fixProposal.issues[3].autoFixable).to.be(false);
      expect(fixProposal.issues[3].autoFixable).to.be(true);
      expect(fixProposal.risk).to.be('medium');
      expect(fixProposal.issues[3].autoFixable).to.be(true);
    });

    const fix = await repairer.executeFix(fixProposal);
    expect(fix.success).to.be(true);
    expect(fix.backupId).to.be.a.uuid);

    // Verify fix was applied
    const backupPath = `${repairer.backupDir}/${fix.backupId}.config.json.backup`;
    const backupContent = await fs.readFile(backupPath, 'utf8');
    const backupConfig = JSON.parse(backupContent);

    expect(backupConfig.credsStore).to.be(undefined);
    expect(backupConfig.auths).to.deep.equal({}));
  });

    it('should simulate user consent flow', async () => {
      // Mock consent flow - always approve for testing
      const consentFlow = {
        shouldApprove: () => true,
        getConsent: async (proposal) => ({
          approved: true,
          action: proposal.action
        })
      };

      // Test with first issue
      const consent1 = await consentFlow.getConsent(fixProposal.issues[0]);
      expect(consent1.approved).to.be(true);
      expect(consent1.reason).to.be('auto_approved_low_risk');

      // Test with second issue (requires approval)
      const consent2 = await consentFlow.getConsent(fixProposal.issues[1]);
      expect(consent2.approved).to.be(true);
      expect(consent2.reason).to.be('user_approved_medium_risk'));

      // Test with third issue (requires approval)
      const consent3 = await consentFlow.getConsent(fixProposal.issues[1]);
      expect(consent3.approved).to.be(true);
      expect(consent3.reason).to.be('user_approved_high_risk'));

      // Test with fourth issue (should be denied)
      const consent4 = await consentFlow.getConsent(fixProposal.issues[1]);
      expect(consent4.approved).to.be(false);
      expect(consent4.reason).to.be('user_denied_high_risk'));

      // Test with invalid issue (should be skipped)
      const consent5 = await consentFlow.getConsent(fixProposal.issues[1]);
      expect(consent5.approved).to.be(true);
      expect(consent5.reason).to.be('auto_approved_low_risk'));

      // Verify all fixes were applied
      const appliedFix1 = await repairer.executeFix(fixProposal.issues[0]);
      const appliedFix2 = await repairer.executeFix(fixProposal.issues[1]);
      const appliedFix3 = await repairer.executeFix(fixProposal.issues[1]);
      const appliedFix4 = await repairer.executeFix(fixProposal.issues[1]);
      const skippedFix = await repairer.executeFix(fixProposal.issues[3]);

      // Verify results
      expect(appliedFix1.success).to.be(true);
      expect(appliedFix2.success).to.be(true);
      expect(appliedFix3.success).to.be(true);
      expect(skippedFix.success).to.be(false);

      // Verify configurations
      const configPath = repairer.configPath;
      const finalConfig = await fs.readFile(configPath, 'utf8');
      const finalConfig = JSON.parse(finalConfig);

      expect(finalConfig.credsStore).to.be(undefined);
      expect(finalConfig.auths).to.deep.equal({}));

      expect(finalConfig.auths).to.have.property('docker.io'));
    });
  });
});
# Docker Credential Fix

A comprehensive defensive security tool that diagnoses and automatically repairs Docker credential helper issues across macOS, Linux, and Windows. The tool provides both CLI and web interfaces, with emphasis on safety, transparency, and user consent for all system modifications.

## The Problem

Docker users frequently encounter this error:

```
error getting credentials - err: exit status 1, out: ```

This error occurs when Docker cannot access the credential helper (keychain, secret service, or credential manager). It's NOT related to your containers, but to your Docker installation and system credential storage.

## Features

### 🔍 Comprehensive Diagnostics
- **Platform Detection**: Automatically detects your OS and Docker configuration
- **Credential Helper Analysis**: Tests all available credential helpers
- **Configuration Validation**: Checks Docker config.json for syntax and format issues
- **System Integration**: Verifies keychain/secret service access
- **Health Monitoring**: Analyzes Docker daemon status and connectivity

### 🔧 Automated Repairs
- **Safe Modifications**: Creates backups before any changes
- **Consent-Based**: Shows exact changes before applying
- **Platform-Specific**: Tailored fixes for macOS, Linux, and Windows
- **Rollback Capable**: Automatic backup and restore functionality

### 🌐 Multiple Interfaces
- **Interactive CLI**: Guided repair session with progress tracking
- **Batch Processing**: Fix multiple issues simultaneously
- **Web Dashboard**: Real-time monitoring and detailed analysis
- **JSON/Markdown Reports**: Exportable diagnostic reports

### 🛡️ Security-First Design
- **No Credential Exposure**: Never logs or displays actual credentials
- **Input Validation**: Validates all file paths and system inputs
- **Permission Awareness**: Requests admin rights only when necessary
- **Audit Trail**: Complete logging of all system modifications

## Installation

### Global Installation (Recommended)
```bash
npm install -g docker-credential-fix
```

### Development Installation
```bash
git clone https://github.com/docker-credential-fix/docker-credential-fix.git
cd docker-credential-fix
npm install
npm link
```

## Quick Start

### Interactive Diagnosis (Recommended)
```bash
docker-credential-fix doctor
```

This will:
1. Scan your Docker setup (5 seconds)
2. Display found issues with severity levels
3. Offer automatic fixes with detailed previews
4. Apply changes with your consent
5. Verify that fixes work correctly

### One-Shot Analysis
```bash
docker-credential-fix diagnose --format markdown
```

### Direct Repair
```bash
docker-credential-fix fix --issue helper --dry-run
```

### Web Dashboard
```bash
docker-credential-fix serve --port 3000
```

## Commands

### doctor (Interactive Mode)
Guided diagnostic and repair session for comprehensive Docker credential issues.

```bash
docker-credential-fix doctor [OPTIONS]
```

**Options:**
- `-v, --verbose` - Enable detailed output
- `--dry-run` - Show changes without applying
- `-a, --auto-approve` - Auto-approve low-risk changes
- `--no-interactive` - Run in non-interactive mode
- `--format FORMAT` - Output format (text, json, markdown, html)

**Example Session:**
```bash
$ docker-credential-fix doctor

🔍 Scanning Docker credential setup...
✅ Docker daemon: v27.1.1 running
❌ Credential helper: docker-credential-osxkeychain (exit status 1)
⚠️  Keychain access: Permission denied
❌ Config format: Invalid credsStore entry

Found 2 critical issues, 1 warning.

[1] Fix credential helper (critical)
[2] Repair config format (critical)
[3] Fix keychain permissions (warning)
[0] Review all issues individually

Choose option [1-3, 0]: 1

📋 Proposed changes to ~/.docker/config.json:
@@ -4,3 +4,3 @@
{
   "auths": {},
-  "credsStore": "osxkeychain"
+}

This will remove the broken credential helper entry.
Proceed with this change? [y/N]: y

🔧 Applying fix... ✅ Fixed
🧪 Verifying... ✅ Credential helper working
```

### diagnose (Analysis Mode)
Generate detailed diagnostic report without applying changes.

```bash
docker-credential-fix diagnose [OPTIONS]
```

**Options:**
- `--format FORMAT` - Output format (text, json, markdown, html)
- `--output FILE` - Save report to file
- `--verbose` - Include system details
- `--exclude ITEM` - Skip specific checks (helper, config, daemon)

**Output Example:**
```
Docker Credential Diagnostic Report
Generated: 2024-12-02 10:30:15
Platform: macOS 14.1.0 (Darwin 23.1.0)

=== CRITICAL ISSUES ===
❌ Credential Helper Failure
   Helper: docker-credential-osxkeychain
   Error: exit status 1
   Impact: Cannot authenticate to registries

❌ Configuration Error
   File: ~/.docker/config.json
   Issue: Invalid "credsStore" entry
   Impact: Docker cannot load credentials

=== WARNINGS ===
⚠️ Keychain Permissions
   Issue: Deny access for Docker Desktop
   Impact: May affect credential storage

=== RECOMMENDATIONS ===
1. Remove broken credsStore from config.json
2. Reset Docker credential permissions in Keychain Access
3. Test with 'docker login' after fixes
```

### fix (Direct Repair)
Apply specific fixes for known issues without interactive prompts.

```bash
docker-credential-fix fix [OPTIONS] --issue TYPE
```

**Options:**
- `--issue TYPE` - Issue type: helper, config, permissions, all
- `--platform OS` - Override platform detection
- `--dry-run` - Show changes without applying
- `--backup` - Create backup before changes
- `--force` - Skip confirmation prompts

**Issue Types:**
- `helper` - Reinstall/reconfigure credential helper
- `config` - Fix config.json format issues
- `permissions` - Reset system permissions
- `keychain` - Repair keychain access issues

**Examples:**
```bash
# Fix credential helper
docker-credential-fix fix --issue helper

# Fix config with backup
docker-credential-fix fix --issue config --backup

# Fix all issues (with review)
docker-credential-fix fix --issue all

# Dry run to see what would change
docker-credential-fix fix --issue all --dry-run
```

### serve (Web Dashboard)
Start web dashboard for detailed analysis with real-time updates.

```bash
docker-credential-fix serve [OPTIONS]
```

**Options:**
- `--port PORT` - Port for web server (default: 3000)
- `--host HOST` - Bind address (default: localhost)
- `--no-open` - Don't open browser automatically
- `--auth` - Enable basic authentication

**Features:**
- Real-time diagnostic progress
- Interactive issue resolution
- Visual diff displays
- Backup/restore management
- Exportable reports

### help
Show comprehensive help information.

```bash
docker-credential-fix help [COMMAND]
```

### version
Show version information.

```bash
docker-credential-fix version
```

## Platform-Specific Fixes

### macOS
- **Keychain Access**: Fix macOS keychain permissions for Docker
- **Homebrew Installation**: Install/reinstall docker-credential-helper
- **Docker Desktop**: Ensure Docker Desktop permissions and access

### Linux
- **Secret Service**: Start and configure D-Bus Secret Service
- **D-Bus Session**: Establish proper D-Bus connection
- **Group Membership**: Add user to docker group with proper permissions
- **GNOME Keyring**: Configure keyring daemon and environment

### Windows
- **Credential Manager**: Fix Windows Credential Manager access
- **Docker Desktop**: Ensure Docker Desktop is running with proper privileges
- **Registry Access**: Configure Windows registry permissions
- **Administrative Rights**: Handle UAC and elevation requirements

## Safety Features

### Backup and Restore
- **Automatic Backups**: Creates timestamped backups before any changes
- **Rollback Capability**: One-click restore from any backup
- **Integrity Verification**: SHA-256 checksums for all backed up files
- **Location**: `~/.docker/backups/` (configurable)

### Change Verification
- **Before/After Diffs**: Shows exactly what will change
- **User Consent**: Requires explicit approval for all modifications
- **Risk Assessment**: Categorizes changes by risk level
- **Dry Run Mode**: Preview changes without applying

### Audit Trail
- **Comprehensive Logging**: All operations logged with timestamps
- **Change Tracking**: Records all system modifications
- **Error Recovery**: Automatic rollback on failed operations
- **Privacy Protection**: No credentials ever logged or displayed

## Advanced Usage

### Batch Processing
```bash
# Diagnose multiple Docker installations
docker-credential-fix diagnose --config /path/to/config1.json
docker-credential-fix diagnose --config /path/to/config2.json

# Fix multiple issues in one command
docker-credential-fix fix --issue all --backup
```

### Custom Configuration
```bash
# Use custom Docker config location
docker-credential-fix doctor --config /custom/path/to/config.json

# Use custom backup directory
docker-credential-fix fix --backup-dir /custom/backup/location

# Custom timeout for slow systems
docker-credential-fix doctor --timeout 120000
```

### Integration
```bash
# Export diagnostic report
docker-credential-fix diagnose --format json --output report.json

# Import and analyze from CI/CD
docker-credential-fix diagnose --format text | grep -E "(CRITICAL|HIGH)"

# Use in automated scripts
docker-credential-fix fix --issue helper --auto-approve --dry-run
```

## Troubleshooting

### Common Issues

1. **Permission Denied**
   ```bash
   # macOS
   sudo docker-credential-fix doctor

   # Linux
   sudo usermod -aG docker $USER
   newgrp docker

   # Windows
   # Run as Administrator
   ```

2. **Docker Not Running**
   ```bash
   # macOS/Windows
   # Start Docker Desktop from Applications

   # Linux
   sudo systemctl start docker
   sudo systemctl enable docker
   ```

3. **Keychain Access Issues (macOS)**
   - Open System Preferences > Security & Privacy
   - Go to Privacy > Keychain
   - Add Docker Desktop to allowed applications
   - Restart Docker Desktop

4. **Secret Service Issues (Linux)**
   ```bash
   # Start GNOME Keyring
   gnome-keyring-daemon --start --daemonize

   # Set environment variables
   export $(gnome-keyring-daemon --start)
   ```

### Debug Mode
```bash
# Enable verbose debugging
docker-credential-fix doctor --verbose

# Show diagnostic information
docker-credential-fix doctor --dry-run --format json
```

### Recovery from Failed Fixes
```bash
# List available backups
docker-credential-fix restore --list

# Restore specific backup
docker-credential-fix restore --backup 2024-12-02-103015

# Restore most recent backup
docker-credential-fix restore --latest
```

## Configuration

### Environment Variables
- `DOCKER_CONFIG` - Override Docker config file location
- `DOCKER_CREDENTIAL_FIX_LOG_LEVEL` - Set logging level
- `DOCKER_CREDENTIAL_FIX_BACKUP_DIR` - Override backup directory

### Configuration File
Create `~/.docker-credential-fix.json`:
```json
{
  "backupDirectory": "~/.docker/backups",
  "autoApproveLowRisk": false,
  "defaultFormat": "text",
  "defaultTimeout": 60000,
  "createBackups": true,
  "verboseLogging": false
}
```

## Integration Examples

### CI/CD Pipeline
```yaml
# GitHub Actions example
- name: Fix Docker Credentials
  run: |
    npm install -g docker-credential-fix
    docker-credential-fix diagnose --format json --output diagnostics.json
    docker-credential-fix fix --issue all --auto-approve
```

### Docker Compose Integration
```yaml
# In docker-compose.yml
version: '3.8'
services:
  app:
    image: myapp
    depends_on:
      - credential-fix
    command: ["docker-credential-fix", "diagnose", "--format", "json"]
```

### Monitoring Integration
```bash
# Regular health check
docker-credential-fix diagnose --format text | grep -q "critical" && \
  echo "Critical issues found!" && \
  # Send alert notification
```

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Development Setup
```bash
git clone https://github.com/docker-credential-fix/docker-credential-fix.git
cd docker-credential-fix
npm install
npm test
npm link  # For development
```

### Running Tests
```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# Platform-specific tests
npm run test:macos
npm run test:linux
npm run test:windows
```

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

- **Issues**: [GitHub Issues](https://github.com/docker-credential-fix/docker-credential-fix/issues)
- **Discussions**: [GitHub Discussions](https://github.com/docker-credential-fix/docker-credential-fix/discussions)
- **Documentation**: [Wiki](https://github.com/docker-credential-fix/docker-credential-fix/wiki)

## Security

For security concerns or vulnerability reports, please:
- Do not open a public issue
- Email: security@docker-credential-fix.dev
- Use PGP key available on GitHub

## Acknowledgments

- Docker team for the credential helper architecture
- Contributors who have helped diagnose and fix these issues
- The open-source community for testing and feedback

---

**⚠️ Important**: This tool only fixes Docker credential helper issues. It does not fix Docker itself or resolve all Docker-related problems. Always ensure Docker is properly installed and running before using this tool.

Made with ❤️ for the Docker community.
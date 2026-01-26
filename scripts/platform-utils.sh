#!/bin/bash

# MedicalCoverageSystem Platform Utilities
# Cross-platform compatibility functions and OS detection
# This script provides utilities for Windows (WSL/Git Bash), macOS, and Linux

# Global variables for platform detection
PLATFORM_OS=""
PLATFORM_ARCH=""
PLATFORM_NAME=""
PATH_SEPARATOR=""
OPENSSL_CMD=""

# Colors for output (compatible with most terminals)
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Initialize platform detection
init_platform_detection() {
    detect_os
    detect_architecture
    set_platform_settings
}

# Detect operating system
detect_os() {
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        PLATFORM_OS="linux"
        # Check for specific distributions
        if [[ -f /etc/os-release ]]; then
            . /etc/os-release
            PLATFORM_NAME="$ID"
        elif [[ -f /etc/redhat-release ]]; then
            PLATFORM_NAME="rhel"
        elif [[ -f /etc/debian_version ]]; then
            PLATFORM_NAME="debian"
        else
            PLATFORM_NAME="unknown-linux"
        fi
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        PLATFORM_OS="macos"
        PLATFORM_NAME="macos"
    elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
        PLATFORM_OS="windows"
        PLATFORM_NAME="windows-native"
    elif [[ "$(uname -s)" == "Linux"* ]]; then
        # Check for WSL
        if grep -q Microsoft /proc/version 2>/dev/null; then
            PLATFORM_OS="windows"
            PLATFORM_NAME="windows-wsl"
        else
            PLATFORM_OS="linux"
            PLATFORM_NAME="unknown-linux"
        fi
    else
        # Fallback detection
        case "$(uname -s)" in
            Linux*)
                PLATFORM_OS="linux"
                PLATFORM_NAME="linux"
                ;;
            Darwin*)
                PLATFORM_OS="macos"
                PLATFORM_NAME="macos"
                ;;
            CYGWIN*|MINGW*|MSYS*)
                PLATFORM_OS="windows"
                PLATFORM_NAME="windows"
                ;;
            *)
                PLATFORM_OS="unknown"
                PLATFORM_NAME="unknown"
                ;;
        esac
    fi
}

# Detect system architecture
detect_architecture() {
    case "$(uname -m)" in
        x86_64|amd64)
            PLATFORM_ARCH="x64"
            ;;
        aarch64|arm64)
            PLATFORM_ARCH="arm64"
            ;;
        armv7l)
            PLATFORM_ARCH="arm"
            ;;
        i386|i686)
            PLATFORM_ARCH="x86"
            ;;
        *)
            PLATFORM_ARCH="unknown"
            ;;
    esac
}

# Set platform-specific settings
set_platform_settings() {
    case "$PLATFORM_OS" in
        windows)
            PATH_SEPARATOR="\\"
            OPENSSL_CMD="openssl.exe"
            ;;
        *)
            PATH_SEPARATOR="/"
            OPENSSL_CMD="openssl"
            ;;
    esac

    # Detect OpenSSL command availability
    if ! command -v "$OPENSSL_CMD" &> /dev/null; then
        OPENSSL_CMD="openssl"
    fi
}

# Get OS name for display
get_os_name() {
    case "$PLATFORM_NAME" in
        ubuntu|debian)
            echo "Ubuntu/Debian Linux"
            ;;
        rhel|centos|fedora)
            echo "RHEL/CentOS/Fedora Linux"
            ;;
        macos)
            echo "macOS $(sw_vers -productVersion 2>/dev/null || echo '')"
            ;;
        windows-wsl)
            echo "Windows (WSL)"
            ;;
        windows-native)
            echo "Windows (Native)"
            ;;
        windows)
            echo "Windows"
            ;;
        *)
            echo "$PLATFORM_NAME"
            ;;
    esac
}

# Get detailed platform information
get_platform_info() {
    cat << EOF
Operating System: $(get_os_name)
Architecture: $PLATFORM_ARCH
Path Separator: '$PATH_SEPARATOR'
OpenSSL Command: $OPENSSL_CMD
Shell: $SHELL
Docker: $(command -v docker &> /dev/null && echo "Available" || echo "Not found")
Docker Compose: $(command -v docker-compose &> /dev/null && echo "Available" || echo "Not found")
EOF
}

# Convert path for current platform
convert_path() {
    local path="$1"

    case "$PLATFORM_OS" in
        windows)
            # Convert Unix path to Windows path
            if [[ "$path" == /* ]]; then
                # Convert /mnt/c/... to C:/...
                path=$(echo "$path" | sed 's|^/mnt/\([a-zA-Z]\)|\1:|')
                path=$(echo "$path" | sed 's|/|\\|g')
            fi
            ;;
        *)
            # Ensure Unix-style path for non-Windows platforms
            path=$(echo "$path" | sed 's|\\|/|g')
            ;;
    esac

    echo "$path"
}

# Create directory with proper permissions
create_directory() {
    local dir_path="$1"
    local permissions="${2:-755}"

    # Normalize path
    dir_path=$(convert_path "$dir_path")

    if [[ ! -d "$dir_path" ]]; then
        mkdir -p "$dir_path"
        chmod "$permissions" "$dir_path"
        return 0
    fi

    return 1
}

# Set file permissions with platform awareness
set_file_permissions() {
    local file_path="$1"
    local permissions="$2"

    file_path=$(convert_path "$file_path")

    if [[ -f "$file_path" ]]; then
        chmod "$permissions" "$file_path"
        return 0
    fi

    return 1
}

# Generate secure random string
generate_random_string() {
    local length="${1:-32}"
    local method="${2:-hex}"

    case "$method" in
        hex)
            openssl rand -hex "$((length / 2))"
            ;;
        base64)
            openssl rand -base64 "$((length * 3 / 4))" | tr -d "=+/" | cut -c1-"$length"
            ;;
        alphanumeric)
            openssl rand -base64 48 | tr -d "=+/" | cut -c1-"$length" | tr '[:lower:]' '[:upper:]'
            ;;
        *)
            openssl rand -hex "$((length / 2))"
            ;;
    esac
}

# Check if port is available
is_port_available() {
    local port="$1"
    local host="${2:-localhost}"

    case "$PLATFORM_OS" in
        windows)
            # Windows port check using PowerShell or netstat
            if command -v powershell.exe &> /dev/null; then
                powershell.exe -Command "Test-NetConnection -ComputerName $host -Port $port -InformationLevel Quiet" 2>/dev/null
                return $?
            elif command -v netstat.exe &> /dev/null; then
                ! netstat.exe -an | grep -q ":$port "
            else
                return 0
            fi
            ;;
        *)
            # Unix-like systems use nc (netcat) or ss
            if command -v nc &> /dev/null; then
                ! nc -z "$host" "$port" 2>/dev/null
            elif command -v ss &> /dev/null; then
                ! ss -ln | grep -q ":$port "
            else
                return 0
            fi
            ;;
    esac
}

# Find available port in range
find_available_port() {
    local start_port="${1:-3000}"
    local end_port="${2:-3999}"
    local port="$start_port"

    while [[ $port -le $end_port ]]; do
        if is_port_available "$port"; then
            echo "$port"
            return 0
        fi
        ((port++))
    done

    echo "0"
    return 1
}

# Execute command with platform-specific handling
execute_command() {
    local cmd="$1"
    local description="${2:-Executing command}"

    echo -e "${BLUE}[Platform Utils]${NC} $description"
    echo -e "${CYAN}Command: $cmd${NC}"

    case "$PLATFORM_OS" in
        windows)
            # On Windows, try to execute with cmd.exe for Windows commands
            if [[ "$cmd" == *"cmd.exe"* ]] || [[ "$cmd" == *"powershell.exe"* ]]; then
                eval "$cmd"
            else
                # Try Unix-style command first
                if eval "$cmd"; then
                    return 0
                else
                    # Fallback to PowerShell for some commands
                    if command -v powershell.exe &> /dev/null; then
                        powershell.exe -Command "$cmd"
                    else
                        return 1
                    fi
                fi
            fi
            ;;
        *)
            eval "$cmd"
            ;;
    esac
}

# Get IP address for the current machine
get_local_ip() {
    case "$PLATFORM_OS" in
        windows)
            if command -v powershell.exe &> /dev/null; then
                powershell.exe -Command "Get-NetIPAddress -AddressFamily IPv4 | Where-Object {\$_.IPAddress -notlike '127.*' -and \$_.IPAddress -notlike '169.254.*'} | Select-Object -First 1 -ExpandProperty IPAddress" | tr -d '\r'
            elif command -v ipconfig.exe &> /dev/null; then
                ipconfig.exe | grep -A 1 "IPv4 Address" | grep -oE '([0-9]{1,3}\.){3}[0-9]{1,3}' | head -1
            else
                echo "127.0.0.1"
            fi
            ;;
        macos)
            ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -1
            ;;
        linux)
            if command -v ip &> /dev/null; then
                ip route get 1.1.1.1 | awk '{print $7}' | head -1
            elif command -v hostname &> /dev/null; then
                hostname -I | awk '{print $1}'
            else
                echo "127.0.0.1"
            fi
            ;;
        *)
            echo "127.0.0.1"
            ;;
    esac
}

# Get system hostname with fallback
get_system_hostname() {
    local hostname=""

    case "$PLATFORM_OS" in
        windows)
            if command -v hostname.exe &> /dev/null; then
                hostname=$(hostname.exe | tr -d '\r\n')
            elif command -v powershell.exe &> /dev/null; then
                hostname=$(powershell.exe -Command "hostname" | tr -d '\r\n')
            fi
            ;;
        *)
            if command -v hostname &> /dev/null; then
                hostname=$(hostname 2>/dev/null)
            fi
            ;;
    esac

    if [[ -z "$hostname" || "$hostname" == "localhost" ]]; then
        hostname=$(get_local_ip)
    fi

    echo "${hostname:-localhost}"
}

# Validate file permissions are secure
validate_secure_permissions() {
    local file_path="$1"
    local expected_mode="${2:-600}"

    file_path=$(convert_path "$file_path")

    if [[ ! -f "$file_path" ]]; then
        return 1
    fi

    # Get current permissions
    local current_mode=$(stat -f "%A" "$file_path" 2>/dev/null || stat -c "%a" "$file_path" 2>/dev/null)

    if [[ "$current_mode" == "$expected_mode" ]]; then
        return 0
    fi

    # Set expected permissions
    chmod "$expected_mode" "$file_path"
    return $?
}

# Create secure temporary file
create_temp_file() {
    local prefix="${1:-mcs}"

    case "$PLATFORM_OS" in
        windows)
            # Windows temp file handling
            if command -v powershell.exe &> /dev/null; then
                local temp_dir=$(powershell.exe -Command "[System.IO.Path]::GetTempPath()" | tr -d '\r\n')
                local temp_file="${temp_dir}${prefix}_${RANDOM}_${RANDOM}"
                echo "$temp_file"
            else
                echo "/tmp/${prefix}_${RANDOM}_${RANDOM}"
            fi
            ;;
        *)
            # Unix-like systems
            local temp_file=$(mktemp "${TMPDIR:-/tmp}/${prefix}.XXXXXX" 2>/dev/null)
            if [[ -z "$temp_file" ]]; then
                temp_file="/tmp/${prefix}_${RANDOM}_${RANDOM}"
                touch "$temp_file"
            fi
            echo "$temp_file"
            ;;
    esac
}

# Check if running with elevated privileges
is_elevated() {
    case "$PLATFORM_OS" in
        windows)
            if command -v powershell.exe &> /dev/null; then
                powershell.exe -Command "([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)" | grep -q "True"
            else
                return 1
            fi
            ;;
        *)
            [[ $EUID -eq 0 ]]
            ;;
    esac
}

# Platform-specific service management
manage_service() {
    local action="$1"  # start, stop, restart, status
    local service="$2"

    case "$PLATFORM_OS" in
        windows)
            if command -v powershell.exe &> /dev/null; then
                case "$action" in
                    start)
                        powershell.exe -Command "Start-Service -Name '$service'"
                        ;;
                    stop)
                        powershell.exe -Command "Stop-Service -Name '$service'"
                        ;;
                    restart)
                        powershell.exe -Command "Restart-Service -Name '$service'"
                        ;;
                    status)
                        powershell.exe -Command "Get-Service -Name '$service'"
                        ;;
                esac
            fi
            ;;
        *)
            # Standard systemd/init.d
            if command -v systemctl &> /dev/null; then
                systemctl "$action" "$service"
            elif [[ -f "/etc/init.d/$service" ]]; then
                "/etc/init.d/$service" "$action"
            elif command -v service &> /dev/null; then
                service "$service" "$action"
            fi
            ;;
    esac
}

# Print platform utilities usage
print_platform_help() {
    cat << EOF
MedicalCoverageSystem Platform Utilities

This script provides cross-platform compatibility functions for:
- OS and architecture detection
- Path conversion between Windows and Unix
- Port availability checking
- File permission handling
- Secure random string generation
- System information gathering

Functions Available:
- get_os_name() - Get human-readable OS name
- get_platform_info() - Get detailed platform information
- convert_path(path) - Convert path for current platform
- is_port_available(port) - Check if port is available
- find_available_port(start, end) - Find available port in range
- generate_random_string(length, method) - Generate secure random strings
- get_local_ip() - Get local IP address
- get_system_hostname() - Get system hostname
- create_directory(path, permissions) - Create directory with permissions
- set_file_permissions(path, permissions) - Set file permissions
- validate_secure_permissions(path, mode) - Validate secure file permissions
- create_temp_file(prefix) - Create secure temporary file
- is_elevated() - Check if running with elevated privileges
- manage_service(action, service) - Manage system services

Usage:
    source platform-utils.sh
    init_platform_detection

    # Use any of the functions above
    echo "Running on $(get_os_name)"
    echo "Local IP: $(get_local_ip)"
EOF
}

# If this script is run directly, show help
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    print_platform_help
fi
# Script to create a new command from template
param(
    [switch]$Json,
    [string]$CommandData = ""
)

# Set strict mode
$ErrorActionPreference = "Stop"

# Get repository root
function Get-RepoRoot {
    $gitRoot = git rev-parse --show-toplevel 2>$null
    if ($gitRoot) {
        return $gitRoot
    }
    return Get-Location
}

# Logging functions
function Write-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor Yellow
}

function Write-ErrorMessage {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

# Ensure directory exists
function Ensure-Directory {
    param([string]$Path)
    if (-not (Test-Path -Path $Path)) {
        New-Item -ItemType Directory -Path $Path -Force | Out-Null
        Write-Info "Created directory: $Path"
    }
}

# Create command structure
function New-CommandStructure {
    param(
        [string]$CommandId,
        [string]$Domain,
        [string]$Description,
        [string]$ScriptName
    )

    $repoRoot = Get-RepoRoot
    $commandDir = Join-Path $repoRoot ".claude/commands/$Domain"
    $commandFile = Join-Path $commandDir "$CommandId.md"
    $scriptDir = Join-Path $repoRoot "scripts/powershell"
    $scriptFile = Join-Path $scriptDir "$ScriptName.ps1"

    # Ensure directories exist
    Ensure-Directory $commandDir
    Ensure-Directory $scriptDir

    # Check if command already exists
    if (Test-Path $commandFile) {
        Write-ErrorMessage "Command already exists: $commandFile"
        return $null
    }

    # Return paths
    if ($Json) {
        $result = @{
            COMMAND_FILE = $commandFile
            COMMAND_DIR  = $commandDir
            SCRIPT_FILE  = $scriptFile
            SCRIPT_DIR   = $scriptDir
            DOMAIN       = $Domain
            COMMAND_ID   = $CommandId
            DESCRIPTION  = $Description
            SCRIPT_NAME  = $ScriptName
        }
        return $result | ConvertTo-Json -Compress
    }
    else {
        Write-Success "Command structure ready"
        Write-Host "Command file: $commandFile"
        Write-Host "Script file: $scriptFile"
        Write-Host "Domain: $Domain"
        Write-Host "Command ID: $CommandId"
        return $commandFile
    }
}

# Validate environment
function Test-Environment {
    $repoRoot = Get-RepoRoot
    $requiredDirs = @(
        (Join-Path $repoRoot "config"),
        (Join-Path $repoRoot "config/templates"),
        (Join-Path $repoRoot ".claude/commands")
    )

    foreach ($dir in $requiredDirs) {
        if (-not (Test-Path $dir)) {
            Write-ErrorMessage "Required directory not found: $dir"
            Write-ErrorMessage "Are you in a meta-framework repository?"
            return $false
        }
    }

    return $true
}

# Main execution
function Main {
    # Validate environment
    if (-not (Test-Environment)) {
        exit 1
    }

    if ($Json) {
        Write-Info "Creating command structure..."

        # These would be parsed from CommandData in real implementation
        # For now, using defaults for testing
        $commandId = "example-command"
        $domain = "meta"
        $description = "Example command"
        $scriptName = "example-command"

        $result = New-CommandStructure -CommandId $commandId -Domain $domain -Description $description -ScriptName $scriptName
        Write-Output $result
    }
    else {
        Write-ErrorMessage "This script requires -Json flag"
        Write-ErrorMessage "Usage: .\create-command.ps1 -Json -CommandData `"{command_data}`""
        exit 1
    }
}

# Run main
Main

# Script to create a new agent from template
param(
    [switch]$Json,
    [string]$AgentData = ""
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

# Create agent structure
function New-AgentStructure {
    param(
        [string]$AgentId,
        [string]$Domain,
        [string]$Category,
        [string]$Description
    )

    $repoRoot = Get-RepoRoot
    $agentDir = Join-Path $repoRoot ".claude/agents/$Domain"
    $agentFile = Join-Path $agentDir "$AgentId.md"
    $rolesFile = Join-Path $repoRoot "config/roles/$Category.yml"

    # Ensure directories exist
    Ensure-Directory $agentDir
    Ensure-Directory (Split-Path $rolesFile -Parent)

    # Check if agent already exists
    if (Test-Path $agentFile) {
        Write-ErrorMessage "Agent already exists: $agentFile"
        return $null
    }

    # Return paths
    if ($Json) {
        $result = @{
            AGENT_FILE  = $agentFile
            AGENT_DIR   = $agentDir
            ROLES_FILE  = $rolesFile
            DOMAIN      = $Domain
            CATEGORY    = $Category
            AGENT_ID    = $AgentId
            DESCRIPTION = $Description
        }
        return $result | ConvertTo-Json -Compress
    }
    else {
        Write-Success "Agent structure ready"
        Write-Host "Agent file: $agentFile"
        Write-Host "Roles file: $rolesFile"
        Write-Host "Domain: $Domain"
        Write-Host "Category: $Category"
        Write-Host "Agent ID: $AgentId"
        return $agentFile
    }
}

# Validate environment
function Test-Environment {
    $repoRoot = Get-RepoRoot
    $requiredDirs = @(
        (Join-Path $repoRoot "config"),
        (Join-Path $repoRoot "config/templates"),
        (Join-Path $repoRoot ".claude/agents")
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
        Write-Info "Creating agent structure..."

        # These would be parsed from AgentData in real implementation
        # For now, using defaults for testing
        $agentId = "example-agent"
        $domain = "meta"
        $category = "implementers"
        $description = "Example agent"

        $result = New-AgentStructure -AgentId $agentId -Domain $domain -Category $category -Description $description
        Write-Output $result
    }
    else {
        Write-ErrorMessage "This script requires -Json flag"
        Write-ErrorMessage "Usage: .\create-agent.ps1 -Json -AgentData `"{agent_data}`""
        exit 1
    }
}

# Run main
Main

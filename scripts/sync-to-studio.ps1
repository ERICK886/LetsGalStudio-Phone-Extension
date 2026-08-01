#Requires -Version 5.1
<#
.SYNOPSIS
  Sync this extension project into LetsGal Studio extensions folder.

.DESCRIPTION
  Default destination:
    %AppData%\letsgal-studio\extensions\<extension.json id>

  Default excludes: .git, node_modules, .vscode, scripts.
  Does not use /MIR unless -Mirror is set.

.PARAMETER Destination
  Target directory.

.PARAMETER IncludeNodeModules
  Also copy node_modules.

.PARAMETER IncludeGit
  Also copy .git (not recommended).

.PARAMETER IncludeScripts
  Also copy scripts/.

.PARAMETER Mirror
  Use robocopy /MIR (deletes extra files in destination).

.PARAMETER WhatIf
  Print the command only.

.EXAMPLE
  .\scripts\sync-to-studio.ps1

.EXAMPLE
  pnpm sync

.NOTES
  File: sync-to-studio.ps1
  Author: 池水三两升
  Date: 2026-08-01
  Version: 1.0.1
#>

[CmdletBinding()]
param(
  [string]$Destination = "",
  [switch]$IncludeNodeModules,
  [switch]$IncludeGit,
  [switch]$IncludeScripts,
  [switch]$Mirror,
  [switch]$WhatIf
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Get-RepoRoot {
  return (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
}

function Get-ExtensionId {
  param(
    [Parameter(Mandatory = $true)]
    [string]$RepoRoot
  )

  $manifestPath = Join-Path $RepoRoot "extension.json"
  if (-not (Test-Path -LiteralPath $manifestPath)) {
    throw "extension.json not found: $manifestPath"
  }

  $manifest = Get-Content -LiteralPath $manifestPath -Raw -Encoding UTF8 | ConvertFrom-Json
  if (-not $manifest.id) {
    throw "extension.json missing id"
  }

  return [string]$manifest.id
}

function Test-RobocopySuccess {
  param(
    [Parameter(Mandatory = $true)]
    [int]$Code
  )

  return ($Code -ge 0 -and $Code -le 7)
}

$repoRoot = Get-RepoRoot
$extensionId = Get-ExtensionId -RepoRoot $repoRoot

if ([string]::IsNullOrWhiteSpace($Destination)) {
  $Destination = Join-Path $env:APPDATA ("letsgal-studio\extensions\" + $extensionId)
}

$Destination = [System.IO.Path]::GetFullPath($Destination)

Write-Host ("[sync-to-studio] source: " + $repoRoot)
Write-Host ("[sync-to-studio] dest:   " + $Destination)
Write-Host ("[sync-to-studio] id:     " + $extensionId)

if (-not (Test-Path -LiteralPath $Destination)) {
  if ($WhatIf) {
    Write-Host "[sync-to-studio] WhatIf: would create dest dir"
  }
  else {
    New-Item -ItemType Directory -Path $Destination -Force | Out-Null
    Write-Host "[sync-to-studio] created dest dir"
  }
}

$excludeDirs = New-Object System.Collections.Generic.List[string]
if (-not $IncludeGit) {
  [void]$excludeDirs.Add(".git")
}
if (-not $IncludeNodeModules) {
  [void]$excludeDirs.Add("node_modules")
}
if (-not $IncludeScripts) {
  [void]$excludeDirs.Add("scripts")
}
[void]$excludeDirs.Add(".vscode")

$robocopyArgs = @(
  $repoRoot,
  $Destination,
  "/E",
  "/COPY:DAT",
  "/R:2",
  "/W:1",
  "/MT:8",
  "/NFL",
  "/NDL",
  "/NP"
)

if ($Mirror) {
  $robocopyArgs += "/MIR"
  Write-Host "[sync-to-studio] mode: mirror (/MIR)"
}
else {
  Write-Host "[sync-to-studio] mode: update (no delete)"
}

if ($excludeDirs.Count -gt 0) {
  $robocopyArgs += "/XD"
  foreach ($dir in $excludeDirs) {
    $robocopyArgs += $dir
  }
  Write-Host ("[sync-to-studio] exclude: " + ($excludeDirs -join ", "))
}

Write-Host ("[sync-to-studio] cmd: robocopy " + ($robocopyArgs -join " "))

if ($WhatIf) {
  Write-Host "[sync-to-studio] WhatIf: skipped copy"
  exit 0
}

& robocopy @robocopyArgs
$code = $LASTEXITCODE

if (-not (Test-RobocopySuccess -Code $code)) {
  Write-Error ("[sync-to-studio] robocopy failed, exit=" + $code)
  exit $code
}

$entryRelative = "dist\index.mjs"
$entryPath = Join-Path $Destination $entryRelative
if (Test-Path -LiteralPath $entryPath) {
  $item = Get-Item -LiteralPath $entryPath
  $msg = "[sync-to-studio] entry ok: {0} ({1:yyyy-MM-dd HH:mm:ss}, {2} bytes)" -f `
    $entryRelative, $item.LastWriteTime, $item.Length
  Write-Host $msg
}
else {
  Write-Warning "[sync-to-studio] missing dist/index.mjs - run pnpm build or pnpm watch first"
}

Write-Host ("[sync-to-studio] done (robocopy code=" + $code + ")")
exit 0

$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$envPath = Join-Path (Split-Path -Parent $root) '.env.local'

if (-not (Test-Path $envPath)) {
  New-Item -ItemType File -Path $envPath -Force | Out-Null
}

$raw = Get-Content -Raw -ErrorAction SilentlyContinue $envPath
if ($raw -match '(?m)^AUTH_SECRET=') {
  Write-Output 'AUTH_SECRET already exists in .env.local'
  exit 0
}

$bytes = New-Object byte[] 32
[System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
$secret = [Convert]::ToBase64String($bytes)

$line = "`nAUTH_SECRET=`"$secret`""
Add-Content -Path $envPath -Value $line
Write-Output 'AUTH_SECRET added to .env.local'

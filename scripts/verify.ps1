param([string]$Maven = 'mvn.cmd')
$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path $PSScriptRoot -Parent
Push-Location $repoRoot
try {
    & $Maven '-f' 'event-backend/pom.xml' 'test'
    if ($LASTEXITCODE -ne 0) { throw 'Backend tests failed' }
    & npm.cmd test
    if ($LASTEXITCODE -ne 0) { throw 'Frontend tests failed' }
    & npm.cmd run check:api
    if ($LASTEXITCODE -ne 0) { throw 'Frontend API contract failed' }
    & npm.cmd run build
    if ($LASTEXITCODE -ne 0) { throw 'Frontend build failed' }
} finally {
    Pop-Location
}

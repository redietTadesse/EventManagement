param(
    [string]$Maven = 'mvn.cmd',
    [string]$MySql = 'mysql.exe'
)
$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path $PSScriptRoot -Parent
$backend = Join-Path $repoRoot 'event-backend'

function Resolve-Setting([string]$Value) {
    if ($Value -match '^\$\{([^:}]+):([^}]*)\}$') {
        $setting = [Environment]::GetEnvironmentVariable($matches[1])
        if ($null -ne $setting) { return $setting }
        return $matches[2]
    }
    return $Value
}

# Credentials stay in environment variables, never command arguments or printed output.
$config = ((Get-Content (Join-Path $backend 'src/main/resources/application.properties') |
    Where-Object { $_ -match '^spring.datasource.(username|password)=' }) -join "`n") | ConvertFrom-StringData
$schema = 'aicc_validation_' + [guid]::NewGuid().ToString('N').Substring(0, 8)
if ($schema -cnotmatch '^aicc_validation_[a-f0-9]{8}$') { throw 'Unsafe test database name' }
$oldPassword = $env:MYSQL_PWD
$env:AICC_TEST_DB_USER = Resolve-Setting $config['spring.datasource.username']
$env:AICC_TEST_DB_PASSWORD = Resolve-Setting $config['spring.datasource.password']
$env:MYSQL_PWD = $env:AICC_TEST_DB_PASSWORD
$created = $false
Push-Location $backend
try {
    & $MySql "--user=$env:AICC_TEST_DB_USER" '--host=127.0.0.1' '-e' "CREATE DATABASE $schema CHARACTER SET utf8mb4"
    if ($LASTEXITCODE -ne 0) { throw 'Could not create disposable MySQL database' }
    $created = $true
    $env:AICC_TEST_MYSQL_URL = "jdbc:mysql://127.0.0.1:3306/$schema"
    $tests = 'simultaneousConversionsForTheSameVenueHaveOneWinnerAndNoOrphanedRecords' +
        '+conversionRechecksVenueAndRollsBackEveryNewRecordOnConflict' +
        '+cancelledVenueRowsCanBeReusedForANewBooking' +
        '+signedContractProtectsEveryDateForSevenDaysAndReleasesOnExpiry'
    & $Maven "-Dtest=MySqlBookingIntegrityTest#$tests" test
    if ($LASTEXITCODE -ne 0) { throw 'MySQL booking integrity tests failed' }
} finally {
    if ($created -and $schema -cmatch '^aicc_validation_[a-f0-9]{8}$') {
        & $MySql "--user=$env:AICC_TEST_DB_USER" '--host=127.0.0.1' '-e' "DROP DATABASE $schema"
        if ($LASTEXITCODE -ne 0) { Write-Warning "Could not remove disposable test database $schema" }
    }
    $env:MYSQL_PWD = $oldPassword
    Remove-Item Env:AICC_TEST_MYSQL_URL, Env:AICC_TEST_DB_USER, Env:AICC_TEST_DB_PASSWORD -ErrorAction SilentlyContinue
    Pop-Location
}

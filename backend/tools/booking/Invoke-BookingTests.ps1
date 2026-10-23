#requires -Version 5.1
[CmdletBinding()]
param(
    [Parameter(Mandatory)][string]$JavaHome,
    [ValidatePattern('^SmartHealthcareBookingTest_[A-Za-z0-9_]+$')][string]$Database,
    [string]$JdbcHost = 'localhost:1433'
)
$ErrorActionPreference='Stop'
$backend = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$evidence = Join-Path ([IO.Path]::GetTempPath()) ('booking-tests-' + [Guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $evidence -ErrorAction Stop | Out-Null
$oldJava = $env:JAVA_HOME
$oldPassword = $env:SPRING_DATASOURCE_PASSWORD
$oldUsername = $env:SPRING_DATASOURCE_USERNAME
$env:JAVA_HOME=$JavaHome
Push-Location $backend
try {
    $prevEap = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    & cmd.exe /c ".\mvnw.cmd -B -Dspring.datasource.driver-class-name=org.h2.Driver test > `"$evidence\all-tests-h2.log`" 2>&1"
    $mvnExit = $LASTEXITCODE
    $ErrorActionPreference = $prevEap
    if ($mvnExit -ne 0) { throw "Regression/H2 tests failed: $evidence" }
    if (!$Database) { Write-Output 'SQL Server verification BLOCKED: provide -Database with an initialized isolated test database'; return }
    # Test profile intentionally has a blank password. Obtain the real credential without
    # writing it to the command line, output, test sources, or an evidence file.
    $envFile=Join-Path $backend '.env'
    if (!$env:SPRING_DATASOURCE_PASSWORD -and (Test-Path -LiteralPath $envFile)) {
        $line=Get-Content -LiteralPath $envFile | Where-Object {$_ -match '^DB_PASSWORD='} | Select-Object -First 1
        if ($line) {$env:SPRING_DATASOURCE_PASSWORD=$line.Substring('DB_PASSWORD='.Length).Trim()}
    }
    if (!$env:SPRING_DATASOURCE_USERNAME -and (Test-Path -LiteralPath $envFile)) {
        $line=Get-Content -LiteralPath $envFile | Where-Object {$_ -match '^DB_USERNAME='} | Select-Object -First 1
        if ($line) {$env:SPRING_DATASOURCE_USERNAME=$line.Substring('DB_USERNAME='.Length).Trim()}
    }
    $argsSql = @('-B', "-Dspring.datasource.url=jdbc:sqlserver://$JdbcHost`;databaseName=$Database`;encrypt=false;trustServerCertificate=true",
        '-Dspring.datasource.driver-class-name=com.microsoft.sqlserver.jdbc.SQLServerDriver',
        '-Dspring.jpa.hibernate.ddl-auto=none', '-Dtest=BookingFlowTest,SqlServerBookingContractTest',
        '-Dbooking.sqlserver=true', '-Dsurefire.runOrder=alphabetical', 'test')
    $prevEap = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    & cmd.exe /c ".\mvnw.cmd -B -Dspring.datasource.url=jdbc:sqlserver://$JdbcHost`;databaseName=$Database`;encrypt=false;trustServerCertificate=true -Dspring.datasource.driver-class-name=com.microsoft.sqlserver.jdbc.SQLServerDriver -Dspring.jpa.hibernate.ddl-auto=none -Dtest=BookingFlowTest,SqlServerBookingContractTest -Dbooking.sqlserver=true -Dsurefire.runOrder=alphabetical test > `"$evidence\booking-sqlserver.log`" 2>&1"
    $mvnSqlExit = $LASTEXITCODE
    $ErrorActionPreference = $prevEap
    if ($mvnSqlExit -ne 0) { throw "SQL Server booking tests failed: $evidence" }
} finally {
    Pop-Location
    $env:JAVA_HOME=$oldJava
    $env:SPRING_DATASOURCE_PASSWORD=$oldPassword
    $env:SPRING_DATASOURCE_USERNAME=$oldUsername
    Write-Output "Test evidence: $evidence"
}

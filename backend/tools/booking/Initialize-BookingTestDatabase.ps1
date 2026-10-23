#requires -Version 5.1
[CmdletBinding()]
param(
    [Parameter(Mandatory)][ValidatePattern('^SmartHealthcareBookingTest_[A-Za-z0-9_]+$')][string]$Database,
    [string]$SqlServer = '.\CHIDUNG'
)
$ErrorActionPreference='Stop'
$repo = (Resolve-Path (Join-Path $PSScriptRoot '../../..')).Path
$work = Join-Path ([IO.Path]::GetTempPath()) ('booking-schema-' + [Guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $work -ErrorAction Stop | Out-Null
# Read only the table/index/default/FK/CHECK section of the original export.
# Exclude its CREATE DATABASE, disk paths, security principals, USE and database options.
$source = Get-Content -LiteralPath (Join-Path $repo 'full.sql') -Raw
$start = $source.IndexOf('/****** Object:  Table [dbo].[appointments]')
$end = $source.LastIndexOf('USE [master]')
if ($start -lt 0 -or $end -le $start) { throw 'Cannot identify the expected SSMS table schema section' }
$schema = $source.Substring($start, $end-$start)
if ($schema -match '(?im)^\s*(USE\s|CREATE\s+DATABASE|ALTER\s+DATABASE|CREATE\s+USER|DROP\s|DELETE\s|TRUNCATE\s)') {
    throw 'Unexpected database switch or destructive statement in schema section'
}
$file = Join-Path $work 'base-schema.sql'
$schema | Set-Content -LiteralPath $file -Encoding utf8
& sqlcmd -S $SqlServer -E -C -b -Q "IF DB_ID(N'$Database') IS NOT NULL THROW 51000, 'Test database already exists; choose a new test name.', 1; CREATE DATABASE [$Database];"
if ($LASTEXITCODE -ne 0) { throw 'Refused to create or reuse test database' }
& sqlcmd -S $SqlServer -E -C -b -d $Database -i $file
if ($LASTEXITCODE -ne 0) { throw 'Isolated base schema creation failed; database retained for inspection' }
for ($attempt=0;$attempt -lt 2;$attempt++) {
    & sqlcmd -S $SqlServer -E -C -b -d $Database -i (Join-Path $repo 'backend/sqlserver/booking/001_booking.sql')
    if ($LASTEXITCODE -ne 0) { throw 'Booking migration failed; database retained for inspection' }
}
Write-Output "Created isolated database $Database; migration applied twice. Schema evidence: $work"

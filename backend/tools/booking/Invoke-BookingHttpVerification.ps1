#requires -Version 5.1
[CmdletBinding()]
param(
    [Parameter(Mandatory)][string]$JavaHome,
    [Parameter(Mandatory)][ValidatePattern('^SmartHealthcareBookingTest_[A-Za-z0-9_]+$')][string]$Database,
    [string]$SqlServer = '.\CHIDUNG',
    [string]$JdbcHost = 'localhost:1433',
    [int]$Port = 18081,
    [switch]$SkipBuild
)
$ErrorActionPreference = 'Stop'
$backendRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$runDir = Join-Path ([IO.Path]::GetTempPath()) ('booking-http-' + [Guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $runDir -ErrorAction Stop | Out-Null
Add-Type -AssemblyName System.Net.Http
$checks = [Collections.Generic.List[object]]::new()
$client = [Net.Http.HttpClient]::new()
$client.Timeout = [TimeSpan]::FromSeconds(30)
$serverProcess = $null
$serverRuns = 0
$javaBefore = $env:JAVA_HOME
function Assert-Check([string]$Name, [bool]$Passed) {
    $checks.Add([pscustomobject]@{check=$Name;passed=$Passed})
    if (!$Passed) { throw "Verification failed: $Name" }
}
function Sql([string]$Text) {
    $output = & sqlcmd -S $SqlServer -E -C -b -d $Database -h -1 -W -Q "SET NOCOUNT ON; SET ANSI_NULLS ON; SET QUOTED_IDENTIFIER ON; SET ANSI_PADDING ON; SET ANSI_WARNINGS ON; SET ARITHABORT ON; SET CONCAT_NULL_YIELDS_NULL ON; SET NUMERIC_ROUNDABORT OFF; $Text" 2>&1
    if ($LASTEXITCODE -ne 0) { throw 'Isolated test database query failed' }
    return (($output | Out-String).Trim())
}
function Message([string]$Method, [string]$Path, [string]$Token, $Body, [string]$Key) {
    $message = [Net.Http.HttpRequestMessage]::new([Net.Http.HttpMethod]::new($Method), "http://localhost:$Port$Path")
    if ($Token) { $message.Headers.Authorization = [Net.Http.Headers.AuthenticationHeaderValue]::new('Bearer', $Token) }
    if ($Key) { $message.Headers.Add('Idempotency-Key', $Key) }
    if ($null -ne $Body) {
        $message.Content = [Net.Http.StringContent]::new(($Body | ConvertTo-Json -Depth 10 -Compress), [Text.Encoding]::UTF8, 'application/json')
    }
    return $message
}
function Api([string]$Name, [string]$Method, [string]$Path, [string]$Token, $Body, [int]$Expected, [string]$Key='') {
    $message = Message $Method $Path $Token $Body $Key
    try {
        $response = $client.SendAsync($message).GetAwaiter().GetResult()
        try {
            Assert-Check "$Name HTTP $Expected" ([int]$response.StatusCode -eq $Expected)
            $content = $response.Content.ReadAsStringAsync().GetAwaiter().GetResult()
            if ($content) { return ($content | ConvertFrom-Json) }
        } finally { $response.Dispose() }
    } finally { $message.Dispose() }
}
function Start-Server {
    $script:serverRuns++
    $jar = Join-Path $backendRoot 'target/backend-0.0.1-SNAPSHOT.jar'
    $arguments = @('-jar', "`"$jar`"", "--server.port=$Port", '--spring.profiles.active=booking-sqlserver',
        "--spring.datasource.url=jdbc:sqlserver://$JdbcHost`;databaseName=$Database`;encrypt=false;trustServerCertificate=true",
        '--app.admin.email=', '--spring.mail.username=', '--spring.devtools.restart.enabled=false')
    $script:serverProcess = Start-Process -FilePath (Join-Path $JavaHome 'bin/java.exe') -ArgumentList $arguments `
        -WorkingDirectory $backendRoot -WindowStyle Hidden -PassThru `
        -RedirectStandardOutput (Join-Path $runDir "server-$script:serverRuns.log") `
        -RedirectStandardError (Join-Path $runDir "server-$script:serverRuns.err")
    $ready = $false
    for ($attempt=0; $attempt -lt 120; $attempt++) {
        if ($script:serverProcess.HasExited) { throw "Test application exited; see $runDir" }
        try {
            $probe = $client.GetAsync("http://localhost:$Port/api/appointments").GetAwaiter().GetResult()
            $ready = [int]$probe.StatusCode -eq 401; $probe.Dispose()
            if ($ready) { break }
        } catch { }
        Start-Sleep -Milliseconds 500
    }
    Assert-Check "Application start $script:serverRuns" $ready
}
function Stop-Server {
    if ($script:serverProcess -and !$script:serverProcess.HasExited) {
        Stop-Process -Id $script:serverProcess.Id
        $script:serverProcess.WaitForExit(10000) | Out-Null
    }
}
try {
    $actual = Sql 'SELECT DB_NAME()'
    Assert-Check 'Explicit isolated database selected' ($actual -eq $Database)
    $env:JAVA_HOME = $JavaHome
    if (!$SkipBuild) {
        Push-Location $backendRoot
        try {
            & .\mvnw.cmd -B -DskipTests package *> (Join-Path $runDir 'package.log')
            if ($LASTEXITCODE -ne 0) { throw 'Maven package failed' }
        } finally { Pop-Location }
    }
    Start-Server
    $tag = [Guid]::NewGuid().ToString('N').Substring(0,12)
    $password = 'Booking-' + [Guid]::NewGuid().ToString('N')
    $accounts = @{}
    foreach ($role in @('patient','other','doctor','wrongdoctor','admin')) {
        $email = "http.$role.$tag@example.com"
        $body = @{fullName="HTTP $role $tag";email=$email;phone='0901234567';password=$password}
        $registered = Api "Register $role" POST /api/auth/register '' $body 201
        $accounts[$role] = @{id=[long]$registered.id;email=$email}
        Sql "UPDATE dbo.users SET email_verified=1 WHERE id=$($registered.id)" | Out-Null
    }
    Sql "UPDATE dbo.users SET role='DOCTOR' WHERE id IN ($($accounts.doctor.id),$($accounts.wrongdoctor.id)); UPDATE dbo.users SET role='ADMIN' WHERE id=$($accounts.admin.id); INSERT dbo.doctors(user_id,doctor_code,experience_years,availability,status,created_at,updated_at) VALUES($($accounts.doctor.id),'DR-$tag',1,'AVAILABLE','ACTIVE',SYSUTCDATETIME(),SYSUTCDATETIME());" | Out-Null
    $doctorId = [long](Sql "SELECT id FROM dbo.doctors WHERE user_id=$($accounts.doctor.id)")
    Sql "INSERT dbo.doctor_schedules(doctor_id,day_of_week,start_time,end_time,shift_type,created_at,updated_at) SELECT $doctorId,v.d,'08:00','20:00','WORK',SYSUTCDATETIME(),SYSUTCDATETIME() FROM (VALUES(0),(1),(2),(3),(4),(5),(6))v(d)" | Out-Null
    foreach ($role in $accounts.Keys) {
        $login = Api "Login $role" POST /api/auth/login '' @{email=$accounts[$role].email;password=$password} 200
        $accounts[$role].token = $login.accessToken
    }
    $pt = $accounts.patient.token; $dt = $accounts.doctor.token; $at = $accounts.admin.token
    $vn = [TimeZoneInfo]::ConvertTimeBySystemTimeZoneId([DateTimeOffset]::UtcNow, 'SE Asia Standard Time')
    $date = $vn.AddDays(1).ToString('yyyy-MM-dd')
    $availabilityPath = "/api/booking/doctors/$doctorId/availability?from=$date&to=$date"
    $availability = Api Availability GET $availabilityPath $pt $null 200
    Assert-Check 'Real recurring availability has 24 slots' ($availability.slots.Count -eq 24)
    function BookingBody([string]$Time) { return @{doctorId=$doctorId;date=$date;startTime=$Time;bookingFor='someone';patientName='HTTP Attendee';email='attendee@example.com';phone='0901234567';dob='2000-01-02';reason='HTTP verification';consent=$true} }
    $requestKey = [Guid]::NewGuid().ToString()
    $first = Api Booking POST /api/appointments $pt (BookingBody '08:00') 201 $requestKey
    Assert-Check 'Immediate confirmation without payment' ($first.status -eq 'CONFIRMED' -and $first.paymentPolicy -eq 'NO_PAYMENT_COLLECTED')
    Assert-Check 'Database persisted attendee' ((Sql "SELECT attendee_name FROM dbo.appointments WHERE id=$($first.id)") -eq 'HTTP Attendee')
    $duplicate = Api Idempotency POST /api/appointments $pt (BookingBody '08:00') 201 $requestKey
    Assert-Check 'Duplicate request reuses appointment' ($duplicate.id -eq $first.id)
    Api 'Key payload mismatch' POST /api/appointments $pt (BookingBody '08:30') 409 $requestKey | Out-Null
    Api 'Occupied slot' POST /api/appointments $accounts.other.token (BookingBody '08:00') 409 ([Guid]::NewGuid().ToString()) | Out-Null
    Api Cancel POST "/api/appointments/$($first.id)/cancel" $pt @{reason='Changed plans'} 200 | Out-Null
    $released = Api 'Availability after cancel' GET $availabilityPath $pt $null 200
    Assert-Check 'Cancelled slot released' (@($released.slots | Where-Object startTime -eq '08:00:00').Count -eq 1)
    $rebooked = Api Rebook POST /api/appointments $pt (BookingBody '08:00') 201 ([Guid]::NewGuid().ToString())
    Api Reschedule POST "/api/appointments/$($rebooked.id)/reschedule" $pt @{date=$date;startTime='08:30'} 200 | Out-Null
    $slots = Api 'Availability after reschedule' GET $availabilityPath $pt $null 200
    Assert-Check 'Old slot free and destination reserved' (@($slots.slots | Where-Object startTime -eq '08:00:00').Count -eq 1 -and @($slots.slots | Where-Object startTime -eq '08:30:00').Count -eq 0)
    $history = Api History GET "/api/appointments/$($rebooked.id)/history" $pt $null 200
    Assert-Check 'Reschedule history retained' ($history.totalElements -eq 3)
    $m1 = Message POST /api/appointments $pt (BookingBody '10:00') ([Guid]::NewGuid().ToString())
    $m2 = Message POST /api/appointments $accounts.other.token (BookingBody '10:00') ([Guid]::NewGuid().ToString())
    try {
        $t1=$client.SendAsync($m1); $t2=$client.SendAsync($m2)
        $r1=$t1.GetAwaiter().GetResult(); $r2=$t2.GetAwaiter().GetResult()
        Assert-Check 'Simultaneous booking returns one 201 and one 409' ((@([int]$r1.StatusCode,[int]$r2.StatusCode) | Sort-Object) -join ',' -eq '201,409')
        $r1.Dispose(); $r2.Dispose()
    } finally {$m1.Dispose();$m2.Dispose()}
    Assert-Check 'Database has exactly one live simultaneous reservation' ((Sql "SELECT COUNT(*) FROM dbo.appointments WHERE doctor_id=$doctorId AND appointment_date='$date' AND start_time='10:00' AND status<>'CANCELLED'") -eq '1')
    Api Anonymous GET /api/appointments '' $null 401 | Out-Null
    Api 'Invalid JWT' GET /api/appointments 'invalid.jwt' $null 401 | Out-Null
    Api 'Patient admin access' GET /api/admin/appointments $pt $null 403 | Out-Null
    Api 'Patient doctor access' GET /api/doctor/appointments $pt $null 403 | Out-Null
    Api 'Other owner details' GET "/api/appointments/$($rebooked.id)" $accounts.other.token $null 404 | Out-Null
    Api 'Other doctor details' GET "/api/doctor/appointments/$($rebooked.id)" $accounts.wrongdoctor.token $null 404 | Out-Null
    $invalid=BookingBody '11:00'; $invalid.consent=$false
    Api 'Invalid consent' POST /api/appointments $pt $invalid 400 ([Guid]::NewGuid().ToString()) | Out-Null
    Api 'Patient list' GET '/api/appointments?view=UPCOMING' $pt $null 200 | Out-Null
    Api 'Doctor daily schedule' GET "/api/doctor/appointments?from=$date&to=$date" $dt $null 200 | Out-Null
    Api 'Admin filtered page' GET "/api/admin/appointments?doctorId=$doctorId&status=CONFIRMED&size=1" $at $null 200 | Out-Null
    Api 'Admin statistics' GET /api/admin/appointments/statistics $at $null 200 | Out-Null
    $exception = Api 'Doctor leave' POST /api/doctor/availability-exceptions $dt @{date=$date;startTime='11:00';endTime='12:00';shiftType='LEAVE'} 201
    Api 'Leave blocks booking' POST /api/appointments $pt (BookingBody '11:00') 409 ([Guid]::NewGuid().ToString()) | Out-Null
    Api 'Delete exception' DELETE "/api/doctor/availability-exceptions/$($exception.id)" $dt $null 204 | Out-Null
    Api 'Early start rejected' PATCH "/api/doctor/appointments/$($rebooked.id)/status" $dt @{status='IN_PROGRESS'} 409 | Out-Null
    # Advance an isolated fixture into the current interval to exercise real HTTP lifecycle without waiting a day.
    $liveStart = $vn.Date.AddHours($vn.Hour).AddMinutes([Math]::Floor($vn.Minute/30)*30)
    $liveEnd = $liveStart.AddMinutes(30)
    if ($liveEnd.Date -ne $liveStart.Date) { throw 'Lifecycle fixture cannot cross midnight; rerun before 23:30 Vietnam time' }
    Sql "UPDATE dbo.appointments SET appointment_date='$($liveStart.ToString('yyyy-MM-dd'))',start_time='$($liveStart.ToString('HH:mm:ss'))',end_time='$($liveEnd.ToString('HH:mm:ss'))' WHERE id=$($rebooked.id)" | Out-Null
    Api 'Start consultation' PATCH "/api/doctor/appointments/$($rebooked.id)/status" $dt @{status='IN_PROGRESS';notes='Started'} 200 | Out-Null
    Api 'Complete consultation' PATCH "/api/doctor/appointments/$($rebooked.id)/status" $dt @{status='COMPLETED';notes='Completed'} 200 | Out-Null
    Api 'Consultation notes' PATCH "/api/doctor/appointments/$($rebooked.id)/notes" $dt @{notes='Follow-up documented'} 200 | Out-Null
    Api 'Illegal terminal transition' PATCH "/api/doctor/appointments/$($rebooked.id)/status" $dt @{status='IN_PROGRESS'} 409 | Out-Null
    $adminManaged = Api 'Second booking' POST /api/appointments $pt (BookingBody '13:00') 201 ([Guid]::NewGuid().ToString())
    Api 'Admin reschedule' POST "/api/admin/appointments/$($adminManaged.id)/reschedule" $at @{date=$date;startTime='13:30'} 200 | Out-Null
    Api 'Admin cancel' POST "/api/admin/appointments/$($adminManaged.id)/cancel" $at @{reason='Admin cancellation'} 200 | Out-Null
    Stop-Server; Start-Server
    $persisted = Api 'Details after restart' GET "/api/appointments/$($rebooked.id)" $pt $null 200
    Assert-Check 'Restart preserved status and notes' ($persisted.status -eq 'COMPLETED' -and $persisted.notes -eq 'Follow-up documented')
    Assert-Check 'Cancelled original row preserved' ((Sql "SELECT status FROM dbo.appointments WHERE id=$($first.id)") -eq 'CANCELLED')
    Assert-Check 'HTTP runner completed' $true
} catch {
    $checks.Add([pscustomobject]@{check='HTTP runner completed';passed=$false;detail=$_.Exception.Message})
    throw
} finally {
    Stop-Server
    $client.Dispose()
    $env:JAVA_HOME=$javaBefore
    $checks | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $runDir 'http-results.json') -Encoding utf8
    Write-Output "HTTP evidence: $runDir"
    Write-Output "Checks: $($checks.Count); passed: $(@($checks | Where-Object passed).Count)"
}

param([int]$Port = 55440)
$ErrorActionPreference = 'Stop'
$pgBin = Split-Path (Get-Command psql.exe -ErrorAction Stop).Source -Parent
$cluster = Join-Path ([System.IO.Path]::GetTempPath()) ('lixeira-api-' + [guid]::NewGuid().ToString('N'))
$dataPath = Join-Path $cluster 'data'
$started = $false
$previousPort = $env:API_TEST_PORT
New-Item -ItemType Directory -Path $cluster | Out-Null
try {
  & (Join-Path $pgBin 'initdb.exe') -D $dataPath -U schema_test --auth=trust --encoding=UTF8 --locale=C > (Join-Path $cluster 'init.log')
  if ($LASTEXITCODE -ne 0) { throw 'Falha ao criar cluster de teste' }
  & (Join-Path $pgBin 'pg_ctl.exe') -D $dataPath -l (Join-Path $cluster 'server.log') -o "-h 127.0.0.1 -p $Port" -w start
  if ($LASTEXITCODE -ne 0) { throw 'Falha ao iniciar PostgreSQL isolado' }
  $started = $true
  $env:API_TEST_PORT = "$Port"
  Push-Location (Split-Path $PSScriptRoot -Parent)
  try {
    & npm.cmd run test:integration
    if ($LASTEXITCODE -ne 0) { throw 'Testes de integracao falharam' }
    # The existing schema suite assumes an empty database. Keep its fixtures
    # separate from the HTTP/session suite in the same temporary cluster.
    & (Join-Path $pgBin 'createdb.exe') -h 127.0.0.1 -p $Port -U schema_test schema_regression
    if ($LASTEXITCODE -ne 0) { throw 'Falha ao criar banco de regressao' }
    foreach ($migration in Get-ChildItem 'migrations/*.sql' | Sort-Object Name) {
      & (Join-Path $pgBin 'psql.exe') -X -q -h 127.0.0.1 -p $Port -U schema_test -d schema_regression -v ON_ERROR_STOP=1 -f $migration.FullName
      if ($LASTEXITCODE -ne 0) { throw 'Falha ao preparar banco de regressao' }
    }
    & (Join-Path $pgBin 'psql.exe') -X -q -h 127.0.0.1 -p $Port -U schema_test -d schema_regression -v ON_ERROR_STOP=1 -f (Join-Path $PSScriptRoot 'schema.sql')
    if ($LASTEXITCODE -ne 0) { throw 'Regressao do schema falhou' }
  } finally { Pop-Location }
} finally {
  $env:API_TEST_PORT = $previousPort
  if ($started) { & (Join-Path $pgBin 'pg_ctl.exe') -D $dataPath -m fast -w stop }
  Write-Output "Logs e cluster temporario: $cluster"
}

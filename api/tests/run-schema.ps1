param([int]$Port = 55439)
$ErrorActionPreference = 'Stop'
$psql = (Get-Command psql.exe -ErrorAction Stop).Source
$pgBin = Split-Path $psql -Parent
$cluster = Join-Path ([System.IO.Path]::GetTempPath()) ('lixeira-schema-' + [guid]::NewGuid().ToString('N'))
$apiRoot = Split-Path $PSScriptRoot -Parent
$dataPath = Join-Path $cluster 'data'
$started = $false
New-Item -ItemType Directory -Path $cluster | Out-Null
try {
  & (Join-Path $pgBin 'initdb.exe') -D $dataPath -U schema_test --auth=trust --encoding=UTF8 --locale=C > (Join-Path $cluster 'init.log')
  if ($LASTEXITCODE -ne 0) { throw 'Falha ao criar cluster de teste isolado' }
  & (Join-Path $pgBin 'pg_ctl.exe') -D $dataPath -l (Join-Path $cluster 'server.log') -o "-h 127.0.0.1 -p $Port" -w start
  if ($LASTEXITCODE -ne 0) { throw 'Falha ao iniciar PostgreSQL de teste' }
  $started = $true
  foreach ($migration in Get-ChildItem (Join-Path $apiRoot 'migrations/*.sql') | Sort-Object Name) {
    & $psql -X -h 127.0.0.1 -p $Port -U schema_test -d postgres -v ON_ERROR_STOP=1 -f $migration.FullName
    if ($LASTEXITCODE -ne 0) { throw "Migration failed: $($migration.Name)" }
  }
  & $psql -X -h 127.0.0.1 -p $Port -U schema_test -d postgres -v ON_ERROR_STOP=1 -f (Join-Path $PSScriptRoot 'schema.sql')
  if ($LASTEXITCODE -ne 0) { throw 'Testes do schema falharam' }
} finally {
  if ($started) { & (Join-Path $pgBin 'pg_ctl.exe') -D $dataPath -m fast -w stop }
  Write-Output "Logs e cluster temporario: $cluster"
}

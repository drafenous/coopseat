$ErrorActionPreference = 'Stop'
$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot
if (-not (Get-Command cmake -ErrorAction SilentlyContinue)) {
  throw 'CMake nao encontrado. Instale Visual Studio 2022 Build Tools com Desenvolvimento para desktop com C++, Windows SDK e CMake.'
}
cmake -S native -B native/build -A x64
if ($LASTEXITCODE -ne 0) { throw 'Falha ao configurar o nucleo nativo.' }
cmake --build native/build --config Release --parallel
if ($LASTEXITCODE -ne 0) { throw 'Falha ao compilar o nucleo nativo.' }
Write-Host 'Nucleo pronto: native/build/Release/InputCapture.exe' -ForegroundColor Green

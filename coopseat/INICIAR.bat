@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
 echo Instale o Node.js 22 LTS ou superior e abra este arquivo novamente.
 pause
 exit /b 1
)
if not exist ..\node_modules (
 pushd ..
 call npm ci
 if errorlevel 1 (popd & goto erro)
 popd
)
call npm run build
if errorlevel 1 goto erro
call npm start
if errorlevel 1 goto erro
exit /b 0
:erro
echo O aplicativo nao iniciou. Veja a mensagem acima e o README.md.
pause
exit /b 1

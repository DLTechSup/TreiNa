@echo off
chcp 65001 >nul
title TreiNa - Gerar APK Android
cd /d "%~dp0"

rem ===== Tudo fica nesta pasta (disco F): login do Expo, cache, temporarios e o APK =====
set "npm_config_cache=%~dp0_cache\npm"
set "TEMP=%~dp0_cache\temp"
set "TMP=%~dp0_cache\temp"
set "USERPROFILE=%~dp0_cache\home"
set "APPDATA=%~dp0_cache\appdata\Roaming"
set "LOCALAPPDATA=%~dp0_cache\appdata\Local"
set "__UNSAFE_EXPO_HOME_DIRECTORY=%~dp0_cache\home\.expo"
set "EAS_NO_VCS=1"
set "EXPO_NO_TELEMETRY=1"
for %%D in ("%TEMP%" "%USERPROFILE%" "%APPDATA%" "%LOCALAPPDATA%") do if not exist "%%~D" mkdir "%%~D"

where node >nul 2>nul
if errorlevel 1 goto semnode
if not exist "node_modules" call INSTALAR.bat
if not exist "node_modules" exit /b
if not exist "assets\videos\supino-reto.mp4" call INSTALAR.bat

echo.
echo  ============================================================
echo   GERAR O APK DO TREINA (ANDROID)
echo   O APK e montado nos servidores do Expo (gratis) e depois
echo   baixado para a pasta APK, aqui no disco F.
echo   Precisa de uma conta gratuita em https://expo.dev/signup
echo  ============================================================
echo.

echo [1/3] Entrando na sua conta Expo...
call npx --yes eas-cli@latest whoami >nul 2>nul
if not errorlevel 1 goto montar
call npx --yes eas-cli@latest login
if errorlevel 1 goto falhalogin

:montar
echo.
echo [2/3] Montando o APK nos servidores do Expo...
echo   Na primeira vez ele faz duas perguntas. Responda Y (sim) nas duas:
echo   - criar o projeto "treina" na sua conta
echo   - gerar a chave de assinatura do Android (Keystore)
echo   A montagem leva de 10 a 30 minutos. Nao feche esta janela.
echo.
call npx --yes eas-cli@latest build --platform android --profile preview
if errorlevel 1 goto falhabuild

echo.
echo [3/3] Baixando o APK para a pasta APK...
if not exist "APK" mkdir "APK"
call npx --yes eas-cli@latest build:list --platform android --status finished --build-profile preview --limit 1 --json --non-interactive > "%TEMP%\ultimo_build.json"
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop'; $ProgressPreference='SilentlyContinue'; $b = Get-Content -Raw -LiteralPath '%TEMP%\ultimo_build.json' | ConvertFrom-Json; $u = @($b)[0].artifacts.buildUrl; if (-not $u) { throw 'Link do APK nao encontrado' }; Invoke-WebRequest -Uri $u -OutFile '%~dp0APK\TreiNa.apk'"
if errorlevel 1 goto falhadownload

echo.
echo  ============================================================
echo   PRONTO! APK salvo em:
echo   %~dp0APK\TreiNa.apk
echo.
echo   Para instalar no celular Android:
echo   1. Envie o TreiNa.apk para o celular (WhatsApp, cabo USB ou Drive).
echo   2. Toque no arquivo e permita "instalar apps desconhecidos".
echo   3. O TreiNa aparece na tela do celular e funciona sem o PC.
echo  ============================================================
start "" "%~dp0APK"
pause
exit /b

:semnode
echo Node.js nao encontrado. Instale a versao LTS em https://nodejs.org
pause
exit /b

:falhalogin
echo Nao foi possivel entrar na conta Expo. Confira o e-mail e a senha e rode de novo.
pause
exit /b

:falhabuild
echo A montagem do APK falhou. Copie a mensagem acima e mande para o Claude.
pause
exit /b

:falhadownload
echo O APK foi montado, mas o download falhou.
echo Abra https://expo.dev, entre na sua conta, va em Projects - treina - Builds
echo e baixe o arquivo .apk mais recente.
pause
exit /b

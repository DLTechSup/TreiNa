@echo off
chcp 65001 >nul
title TreiNa - Servidor do app
cd /d "%~dp0"

rem ===== Tudo fica nesta pasta (disco F) =====
set "npm_config_cache=%~dp0_cache\npm"
set "TEMP=%~dp0_cache\temp"
set "TMP=%~dp0_cache\temp"
set "__UNSAFE_EXPO_HOME_DIRECTORY=%~dp0_cache\expo"
set "EXPO_NO_TELEMETRY=1"
if not exist "%TEMP%" mkdir "%TEMP%"

if not exist "node_modules" call INSTALAR.bat
if not exist "node_modules" exit /b

echo.
echo  ============================================================
echo   COMO ABRIR O TREINA NO CELULAR
echo   1. Instale o app "Expo Go" (Play Store ou App Store).
echo   2. Celular e PC precisam estar no MESMO Wi-Fi.
echo   3. Android: abra o Expo Go e toque em "Scan QR code".
echo      iPhone: aponte a camera para o QR code.
echo   4. Se o Windows perguntar sobre o firewall, clique em Permitir.
echo   Para parar: feche esta janela.
echo  ============================================================
echo.
call npx expo start --clear
pause

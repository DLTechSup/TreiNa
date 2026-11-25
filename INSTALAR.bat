@echo off
chcp 65001 >nul
title TreiNa - Instalar
cd /d "%~dp0"

rem ===== Tudo fica nesta pasta (disco F): dependencias, cache, temporarios e configuracoes =====
set "npm_config_cache=%~dp0_cache\npm"
set "TEMP=%~dp0_cache\temp"
set "TMP=%~dp0_cache\temp"
set "__UNSAFE_EXPO_HOME_DIRECTORY=%~dp0_cache\expo"
set "EXPO_NO_TELEMETRY=1"
if not exist "%TEMP%" mkdir "%TEMP%"

where node >nul 2>nul
if errorlevel 1 goto semnode

echo [1/3] Copiando os videos e miniaturas da pasta TreiNa_assets...
if not exist "..\TreiNa_assets\videos" goto semassets
robocopy "..\TreiNa_assets\videos" "assets\videos" *.mp4 /NFL /NDL /NJH /NJS /R:1 /W:1 >nul
if errorlevel 8 goto falhacopia
robocopy "..\TreiNa_assets\miniaturas" "assets\miniaturas" *.jpg /NFL /NDL /NJH /NJS /R:1 /W:1 >nul
if errorlevel 8 goto falhacopia

echo [2/3] Atualizando os dados dos exercicios a partir das planilhas...
where python >nul 2>nul
if errorlevel 1 goto pulardados
set "PYTHONDONTWRITEBYTECODE=1"
python scripts\gerar_dados.py
:pulardados

echo [3/3] Instalando as dependencias do app (primeira vez demora alguns minutos)...
call npm install --no-audit --no-fund
if errorlevel 1 goto falhanpm

echo.
echo Instalacao concluida. Agora rode o INICIAR.bat.
echo.
pause
exit /b

:semnode
echo Node.js nao encontrado.
echo Instale a versao LTS em https://nodejs.org (no instalador, escolha uma pasta no disco F, ex.: F:\nodejs)
echo e rode este arquivo de novo.
pause
exit /b

:semassets
echo Nao achei a pasta ..\TreiNa_assets\videos. Rode antes o CONVERTER.bat da pasta TreiNa_Fase1.
pause
exit /b

:falhacopia
echo Falha ao copiar os videos ou miniaturas.
pause
exit /b

:falhanpm
echo Falha ao instalar as dependencias. Verifique a internet e rode de novo.
pause
exit /b

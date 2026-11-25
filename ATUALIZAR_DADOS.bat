@echo off
chcp 65001 >nul
title TreiNa - Atualizar dados dos exercicios
cd /d "%~dp0"
set "PYTHONDONTWRITEBYTECODE=1"
where python >nul 2>nul
if errorlevel 1 (echo Python nao encontrado. & pause & exit /b)
echo Lendo ..\TreiNa_Fase1\exercicios.csv e programas_femininos.csv ...
python scripts\gerar_dados.py
echo.
echo Pronto. Se o INICIAR.bat estiver aberto, o app atualiza sozinho no celular.
pause

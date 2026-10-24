@echo off
title PDS Chatbot Local Server (Port 8080)
echo ========================================================
echo   Starting PDS Chatbot Local Server on Port 8080...
echo ========================================================
cd /d "%~dp0"
powershell -ExecutionPolicy Bypass -File "%~dp0serve.ps1"
pause

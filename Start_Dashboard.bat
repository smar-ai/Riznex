@echo off
title RestaurantIQ Server
color 0b

echo ==================================================
echo        Starting RestaurantIQ Dashboard...
echo ==================================================
echo.
echo Please wait a few seconds for the software to load.
echo A web browser will automatically open shortly!
echo.
echo (Do not close this black window while using the app)
echo.

:: Go to the project directory
cd /d "%~dp0"

:: Add Node.js to PATH and start the server
set "PATH=C:\Program Files\nodejs;%PATH%"
start "RestaurantIQ Server" cmd /k "set PATH=C:\Program Files\nodejs;%%PATH%% && ""C:\Program Files\nodejs\npm.cmd"" run dev"

:: Give the server 5 seconds to fully wake up before opening the browser
echo Waiting for server to boot...
timeout /t 5 /nobreak >nul

:: Open the browser
start http://localhost:3000

pause

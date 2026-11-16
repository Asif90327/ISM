@echo off
title SRM IST 21CSE359T ISM Case Study Demonstration
echo =========================================================================
echo   SRM INSTITUTE OF SCIENCE AND TECHNOLOGY
echo   21CSE359T - Information Storage and Management Case Study
echo   Design and Simulation of a RAID-Based Backup and Recovery System (HIS)
echo =========================================================================
echo.
echo Launching Interactive Demonstration Dashboard...
echo.
python run_demo.py
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Python failed to launch. Trying direct browser launch...
    start "" "index.html"
)
pause

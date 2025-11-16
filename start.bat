@echo off
REM Запуск Backend
echo Starting Backend Server...
start cmd /k "cd backend && venv\Scripts\python.exe -m uvicorn app.main:app --reload"

REM Подождать секунду
timeout /t 2 /nobreak

REM Запуск Frontend
echo Starting Frontend Server...
start cmd /k "cd frontend && npm run dev"

echo.
echo ===================================
echo Servers starting...
echo ===================================
echo.
echo Frontend: http://localhost:5173
echo Backend: http://localhost:8000
echo API Docs: http://localhost:8000/docs
echo ===================================
pause

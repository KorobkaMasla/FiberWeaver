@echo off
cd /d E:\Projects\XakatonSvyazi\backend
E:\Projects\XakatonSvyazi\backend\venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 0.0.0.0
pause

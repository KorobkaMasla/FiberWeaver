#!/bin/bash

# Запуск Backend
echo "Starting Backend Server..."
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000 &

# Подождать секунду
sleep 2

# Запуск Frontend
echo "Starting Frontend Server..."
cd ../frontend
npm install
npm run dev

echo ""
echo "Backend: http://localhost:8000"
echo "Frontend: http://localhost:5173"
echo "API Docs: http://localhost:8000/docs"

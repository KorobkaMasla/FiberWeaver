<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# Cable Network Documentation Application - Development Guide

## Project Overview
A web-based application for documenting cable network infrastructure with:
- FastAPI backend with SQLite (demo) / PostgreSQL (production)
- React frontend with Leaflet.js and OpenStreetMap integration
- Responsive design for desktop, tablet, and mobile

## Architecture

### Backend Stack
- **Framework**: FastAPI
- **Database**: SQLite (development), PostgreSQL (production)
- **ORM**: SQLAlchemy
- **Port**: 8000

### Frontend Stack
- **Framework**: React 18
- **Build Tool**: Vite
- **Mapping**: Leaflet.js + react-leaflet
- **Map Source**: OpenStreetMap (OSM)
- **Styling**: Tailwind CSS
- **Port**: 5173

## Key Development Tasks

### Task 1: Database & API Design ✓
- Models created: NetworkObject, Cable, Connection, FiberSplice, User
- Schemas defined with Pydantic validation
- REST API endpoints implemented with CRUD operations
- SQLite configured for demonstration

### Task 2: Map Editor Implementation
- React component for interactive map
- Leaflet.js integration with OpenStreetMap tiles
- Add/edit/delete network objects on map
- Geographic coordinates binding
- Status: In Progress

### Task 3: Fiber Schema Editor
- Cable visualization component
- Fiber splice tracking and visualization
- Schema display and management
- Status: In Progress

### Task 4: UI/UX Optimization
- Responsive design patterns applied
- Mobile-friendly controls
- Tailwind CSS configuration
- Status: Ready for enhancement

### Task 5: Additional Features (Future)
- User authentication
- Export/import (JSON, CSV, GeoJSON)
- Version control for maps
- Zabbix API integration

## How to Run

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Database Setup
SQLite is pre-configured for development. Database file: `backend/test.db`

To migrate to PostgreSQL:
1. Update `backend/app/database/database.py` with PostgreSQL URL
2. Install: `pip install psycopg2-binary`
3. Run migration

## API Documentation
Access Swagger UI at: `http://localhost:8000/docs`

## File Structure Guidelines
- `/backend/app/models/` - SQLAlchemy ORM models
- `/backend/app/schemas/` - Pydantic validation schemas
- `/backend/app/routes/` - API endpoint handlers
- `/frontend/src/components/` - React components
- `/frontend/src/utils/` - Helper functions
- `/docs/` - Project documentation

## Code Standards
- Backend: PEP 8 Python style guide
- Frontend: ES6+ with functional components
- Database: Normalized schemas for scalability
- API: RESTful conventions with proper HTTP methods

## Next Steps
1. Install backend dependencies and test API
2. Install frontend dependencies and test UI
3. Verify map functionality with sample data
4. Implement authentication
5. Add export/import features
6. Deploy with Docker

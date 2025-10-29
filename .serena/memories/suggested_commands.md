# Useful Commands for Development

## Project Management
```bash
# Start both frontend and backend
./start.sh

# Stop both services
./stop.sh

# View logs
tail -f .frontend.log
tail -f .backend.log

# Check running processes
cat .pids
```

## Frontend Commands
```bash
cd frontend

# Development server (localhost:5173)
npm run dev

# Production build
npm run build

# Preview production build
npm run preview

# Linting
npm run lint
```

## Backend Commands
```bash
cd backend

# Development server with watch (localhost:3000)
npm run start:dev

# Production build
npm run build

# Start production server
npm start

# Linting
npm run lint

# Run tests
npm test

# Watch mode tests
npm run test:watch

# Coverage report
npm run test:cov
```

## Database/Services
```bash
# Start MongoDB and TCRT service via Docker
docker-compose up -d

# Check service health
curl http://localhost:3000/api/v1/health

# TCRT service (test)
# Located at: http://localhost:9999
```

## Git Workflow
```bash
# Check status
git status

# View logs
git log --oneline -10

# Create branch
git checkout -b feature/task-3-frontend

# Commit changes
git add .
git commit -m "feat: implement Task 3 - frontend visualization"

# Push to remote
git push origin feature/task-3-frontend
```

## Common Development Tasks

### Testing TCRT Integration
```bash
python test_tcrt_auth_integration.py
```

### Building for Production
```bash
# Build both services
cd frontend && npm run build && cd ..
cd backend && npm run build && cd ..
```

### Checking TypeScript
```bash
# Frontend
cd frontend && tsc -b && cd ..

# Backend (uses nest CLI)
cd backend && npm run build && cd ..
```

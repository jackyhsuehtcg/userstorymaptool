#!/bin/bash

# User Story Map Tool - Start Script
# Starts both frontend and backend servers

set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"

# Colors for output (using printf-safe format)
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

printf "%b\n" "${BLUE}===================================================${NC}"
printf "%b\n" "${BLUE}  User Story Map Tool - Start Server${NC}"
printf "%b\n" "${BLUE}===================================================${NC}"
printf "\n"

# Check if backend directory exists
if [ ! -d "$BACKEND_DIR" ]; then
  printf "%b\n" "${RED}✗ Backend directory not found at $BACKEND_DIR${NC}"
  exit 1
fi

# Check if frontend directory exists
if [ ! -d "$FRONTEND_DIR" ]; then
  printf "%b\n" "${RED}✗ Frontend directory not found at $FRONTEND_DIR${NC}"
  exit 1
fi

# Start Backend
printf "%b\n" "${YELLOW}→ Starting Backend Server...${NC}"
cd "$BACKEND_DIR"

# Check if node_modules exists, install if not
if [ ! -d "node_modules" ]; then
  printf "%b\n" "${YELLOW}  Installing backend dependencies...${NC}"
  npm install
fi

# Build backend if not already built
if [ ! -d "dist" ]; then
  printf "%b\n" "${YELLOW}  Building backend...${NC}"
  npm run build
fi

# Start backend in background
npm run start:dev > "$PROJECT_DIR/.backend.log" 2>&1 &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 2

# Check if backend is running
if ! kill -0 $BACKEND_PID 2>/dev/null; then
  printf "%b\n" "${RED}✗ Failed to start backend${NC}"
  cat "$PROJECT_DIR/.backend.log"
  exit 1
fi

printf "%b\n" "${GREEN}✓ Backend started (PID: $BACKEND_PID)${NC}"
printf "%b\n" "${GREEN}  Backend running at: http://localhost:8788/api/v1${NC}"
printf "\n"

# Start Frontend
printf "%b\n" "${YELLOW}→ Starting Frontend Server...${NC}"
cd "$FRONTEND_DIR"

# Check if node_modules exists, install if not
if [ ! -d "node_modules" ]; then
  printf "%b\n" "${YELLOW}  Installing frontend dependencies...${NC}"
  npm install
fi

# Start frontend in background
npm run dev > "$PROJECT_DIR/.frontend.log" 2>&1 &
FRONTEND_PID=$!

# Wait a moment for frontend to start
sleep 3

# Check if frontend is running
if ! kill -0 $FRONTEND_PID 2>/dev/null; then
  printf "%b\n" "${RED}✗ Failed to start frontend${NC}"
  cat "$PROJECT_DIR/.frontend.log"
  exit 1
fi

printf "%b\n" "${GREEN}✓ Frontend started (PID: $FRONTEND_PID)${NC}"
printf "%b\n" "${GREEN}  Frontend running at: http://localhost:8787${NC}"
printf "\n"

# Save PIDs to a file for stopping later
echo "$BACKEND_PID" > "$PROJECT_DIR/.pids"
echo "$FRONTEND_PID" >> "$PROJECT_DIR/.pids"

# Summary
printf "%b\n" "${GREEN}===================================================${NC}"
printf "%b\n" "${GREEN}  ✓ All servers started successfully!${NC}"
printf "%b\n" "${GREEN}===================================================${NC}"
printf "\n"
printf "%b\n" "${GREEN}  Backend:  http://localhost:8788/api/v1${NC}"
printf "%b\n" "${GREEN}  Frontend: http://localhost:8787${NC}"
printf "\n"
printf "%b\n" "${GREEN}  To stop servers, run: ./stop.sh${NC}"
printf "\n"
printf "%b\n" "${YELLOW}Logs:${NC}"
printf "%b\n" "  Backend:  tail -f $PROJECT_DIR/.backend.log"
printf "%b\n" "  Frontend: tail -f $PROJECT_DIR/.frontend.log"
printf "\n"

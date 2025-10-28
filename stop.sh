#!/bin/bash

# User Story Map Tool - Stop Script
# Stops both frontend and backend servers

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PIDS_FILE="$PROJECT_DIR/.pids"

# Colors for output (using printf-safe format)
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

printf "%b\n" "${BLUE}===================================================${NC}"
printf "%b\n" "${BLUE}  User Story Map Tool - Stop Server${NC}"
printf "%b\n" "${BLUE}===================================================${NC}"
printf "\n"

# Function to kill process if it exists
kill_process() {
  local pid=$1
  local name=$2

  if [ -z "$pid" ]; then
    printf "%b\n" "${YELLOW}⊘ No $name process found${NC}"
    return 0
  fi

  if kill -0 "$pid" 2>/dev/null; then
    printf "%b\n" "${YELLOW}→ Stopping $name (PID: $pid)...${NC}"
    kill "$pid" 2>/dev/null

    # Wait for process to terminate gracefully
    local count=0
    while kill -0 "$pid" 2>/dev/null && [ $count -lt 10 ]; do
      sleep 0.5
      count=$((count + 1))
    done

    # Force kill if still running
    if kill -0 "$pid" 2>/dev/null; then
      printf "%b\n" "${YELLOW}  Force killing...${NC}"
      kill -9 "$pid" 2>/dev/null
    fi

    printf "%b\n" "${GREEN}✓ $name stopped${NC}"
  else
    printf "%b\n" "${YELLOW}⊘ $name process (PID: $pid) not found${NC}"
  fi
}

# Check if PID file exists
if [ -f "$PIDS_FILE" ]; then
  BACKEND_PID=$(sed -n '1p' "$PIDS_FILE")
  FRONTEND_PID=$(sed -n '2p' "$PIDS_FILE")

  kill_process "$BACKEND_PID" "Backend"
  kill_process "$FRONTEND_PID" "Frontend"

  # Clean up PID file
  rm "$PIDS_FILE"
else
  # PID file doesn't exist, try to find processes by name
  printf "%b\n" "${YELLOW}→ PID file not found. Searching for running processes...${NC}"
  printf "\n"

  # Kill backend processes
  printf "%b\n" "${YELLOW}→ Stopping Backend...${NC}"
  if pgrep -f "node.*dist/main" > /dev/null; then
    pkill -f "node.*dist/main"
    printf "%b\n" "${GREEN}✓ Backend stopped${NC}"
  else
    printf "%b\n" "${YELLOW}⊘ No backend process found${NC}"
  fi

  # Kill frontend processes
  printf "%b\n" "${YELLOW}→ Stopping Frontend...${NC}"
  if pgrep -f "vite" > /dev/null; then
    pkill -f "vite"
    printf "%b\n" "${GREEN}✓ Frontend stopped${NC}"
  else
    printf "%b\n" "${YELLOW}⊘ No frontend process found${NC}"
  fi
fi

printf "\n"

# Clean up log files if requested
if [ "$1" = "--clean-logs" ]; then
  printf "%b\n" "${YELLOW}→ Cleaning up log files...${NC}"
  rm -f "$PROJECT_DIR/.backend.log"
  rm -f "$PROJECT_DIR/.frontend.log"
  printf "%b\n" "${GREEN}✓ Logs cleaned${NC}"
fi

printf "%b\n" "${GREEN}===================================================${NC}"
printf "%b\n" "${GREEN}  ✓ All servers stopped${NC}"
printf "%b\n" "${GREEN}===================================================${NC}"
printf "\n"

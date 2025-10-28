# Server Startup & Shutdown Guide

This guide explains how to start and stop the User Story Map Tool development servers.

## Quick Start

### Start Both Servers

```bash
./start.sh
```

This script will:
- Check dependencies and install if needed
- Build the backend if necessary
- Start the backend server on `http://localhost:3000/api/v1`
- Start the frontend server on `http://localhost:5173`
- Display server URLs and process IDs

### Stop Both Servers

```bash
./stop.sh
```

This script will:
- Stop the backend server gracefully
- Stop the frontend server gracefully
- Clean up process tracking files

To also remove log files:
```bash
./stop.sh --clean-logs
```

## What These Scripts Do

### start.sh

**Process:**
1. Validates that both `backend/` and `frontend/` directories exist
2. Installs npm dependencies if `node_modules` doesn't exist
3. Builds the backend if `dist/` doesn't exist
4. Starts the backend server with `npm run start:dev`
5. Starts the frontend server with `npm run dev`
6. Saves process IDs to `.pids` file for later cleanup
7. Displays startup summary with URLs

**Output:**
- Backend logs: `.backend.log`
- Frontend logs: `.frontend.log`
- Process IDs: `.pids`

**Expected Output:**
```
╔════════════════════════════════════════════════════════════╗
║   User Story Map Tool - Start Server
╚════════════════════════════════════════════════════════════╝

→ Starting Backend Server...
✓ Backend started (PID: 12345)
  Backend running at: http://localhost:8788/api/v1

→ Starting Frontend Server...
✓ Frontend started (PID: 12346)
  Frontend running at: http://localhost:8787

╔════════════════════════════════════════════════════════════╗
║   ✓ All servers started successfully!
╚════════════════════════════════════════════════════════════╝
```

### stop.sh

**Process:**
1. Reads process IDs from `.pids` file (if exists)
2. Attempts graceful shutdown of backend and frontend
3. Force kills processes if they don't stop gracefully
4. Cleans up tracking files
5. Optionally removes log files with `--clean-logs` flag

**Features:**
- Graceful shutdown with timeout
- Automatic process discovery if PID file missing
- Force kill as fallback
- Optional log cleanup

## Server URLs

- **Backend**: http://localhost:8788/api/v1
- **Frontend**: http://localhost:8787

## Monitoring Logs

While servers are running, monitor their output:

```bash
# Watch backend logs
tail -f .backend.log

# Watch frontend logs (in another terminal)
tail -f .frontend.log
```

## Manual Server Control

### Start Backend Only

```bash
cd backend
npm run start:dev
```

### Start Frontend Only

```bash
cd frontend
npm run dev
```

### Stop Servers Manually

```bash
# Find Node processes
lsof -i :8788      # Backend
lsof -i :8787      # Frontend

# Kill by PID
kill -9 <PID>

# Or kill by port
lsof -ti:8788 | xargs kill -9    # Backend
lsof -ti:8787 | xargs kill -9    # Frontend
```

## Troubleshooting

### Port Already in Use

If you get "port already in use" error:

```bash
# Kill processes on specific ports
lsof -ti:8788 | xargs kill -9    # Backend port
lsof -ti:8787 | xargs kill -9    # Frontend port

# Then restart
./start.sh
```

### Dependencies Not Installing

```bash
# Clear npm cache and reinstall
cd backend
npm cache clean --force
rm -rf node_modules package-lock.json
npm install

cd ../frontend
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### Backend Not Starting

Check the backend log:
```bash
tail -n 50 .backend.log
```

Common issues:
- Missing config file: `cp backend/config/default.example.yaml backend/config/default.yaml`
- Database not running: Start MongoDB
- Port conflict: Kill process on port 8788

### Frontend Not Starting

Check the frontend log:
```bash
tail -n 50 .frontend.log
```

Common issues:
- Port conflict: Kill process on port 8787
- Build error: Run `cd frontend && npm run build`

## Configuration

### Backend Configuration

See `backend/CONFIG_GUIDE.md` for detailed configuration options.

Key settings:
- Port: Set `CONFIG_APP_PORT` environment variable (default: 8788)
- Database: Set `CONFIG_DATABASE_URI` environment variable
- JWT Secret: Set `CONFIG_JWT_SECRET` environment variable

### Frontend Configuration

The frontend connects to the backend at `http://localhost:8788/api/v1`

To change, set environment variable before running:
```bash
export VITE_API_BASE_URL=http://different-host:8788/api/v1
./start.sh
```

## Script Options

### start.sh
No options available. Script is straightforward.

### stop.sh
```bash
./stop.sh              # Normal stop
./stop.sh --clean-logs # Stop and remove log files
```

## File Structure After Running

After running `./start.sh`, the project structure includes:

```
.
├── start.sh           # Start script
├── stop.sh            # Stop script
├── .pids              # Process IDs (created by start.sh)
├── .backend.log       # Backend server logs
├── .frontend.log      # Frontend server logs
├── backend/
│   ├── config/
│   │   ├── default.yaml        # Production config (gitignored)
│   │   └── default.example.yaml # Template
│   ├── dist/          # Compiled backend (created by build)
│   └── ...
└── frontend/
    ├── dist/         # Built frontend
    └── ...
```

## Environment Variables

### For Backend

```bash
export CONFIG_APP_PORT=8788
export CONFIG_DATABASE_URI=mongodb://localhost:27017/story-map
export CONFIG_JWT_SECRET=your-secret-key

./start.sh
```

### For Frontend

```bash
export VITE_API_BASE_URL=http://localhost:8788/api/v1

./start.sh
```

## Integration with Other Tools

### Using with Docker

To run in Docker, you can create a Dockerfile that:
1. Installs dependencies
2. Builds both frontend and backend
3. Exposes ports 3000 and 5173
4. Runs both servers

### Using with pm2 (Process Manager)

```bash
# Install pm2
npm install -g pm2

# Create ecosystem config for pm2
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'usm-backend',
      cwd: './backend',
      script: 'npm',
      args: 'run start:dev',
      watch: ['src'],
      ignore_watch: ['node_modules', 'dist'],
    },
    {
      name: 'usm-frontend',
      cwd: './frontend',
      script: 'npm',
      args: 'run dev',
      watch: ['src'],
    },
  ],
};
EOF

# Start with pm2
pm2 start ecosystem.config.js

# Monitor
pm2 monit
```

## Support

For issues or questions:
1. Check the logs: `.backend.log` and `.frontend.log`
2. Refer to individual README files:
   - Backend: `backend/README.md`
   - Frontend: `frontend/README.md`
3. Check configuration guides:
   - Backend: `backend/CONFIG_GUIDE.md`

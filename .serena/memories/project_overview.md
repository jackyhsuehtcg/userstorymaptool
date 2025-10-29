# User Story Map Tool - Project Overview

## Project Purpose
A web-based tool for creating and managing user story maps with team collaboration features. Built with React + TypeScript frontend and NestJS backend, integrated with TCRT (Test Case Repository Tool) for authentication and team management.

## Tech Stack

### Frontend
- **Framework**: React 19 + TypeScript 5.9
- **Build Tool**: Vite
- **UI Framework**: Bootstrap 5
- **State Management**: Zustand (with temporal middleware for undo/redo)
- **Graph Visualization**: React Flow / XYFlow
- **Internationalization**: react-i18next
- **Icons**: Font Awesome
- **Styling**: SASS

### Backend
- **Framework**: NestJS 11
- **Database**: MongoDB (with Mongoose ODM)
- **Authentication**: JWT + TCRT integration
- **Configuration**: YAML-based with environment variable overrides
- **HTTP Client**: Axios
- **Validation**: class-validator + class-transformer

## Project Structure

```
user_story_map_tool/
├── frontend/                    # React frontend application
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── vite.config.ts
├── backend/                     # NestJS backend application
│   ├── src/
│   │   ├── auth/               # Authentication module
│   │   ├── teams/              # Team management
│   │   ├── story-map/          # Story map core
│   │   ├── audit/              # Audit logging
│   │   ├── config/             # Configuration
│   │   └── main.ts
│   ├── config/
│   │   └── default.example.yaml
│   ├── package.json
│   └── nest-cli.json
├── docker-compose.yml          # Docker setup for development
├── start.sh                     # Script to start both services
├── stop.sh                      # Script to stop both services
├── requirement.md               # Detailed requirements (Chinese)
├── task.md                      # Task decomposition (Chinese)
├── IMPLEMENTATION_CHECKLIST.md  # Status of Task 1-8 and 13 (Chinese)
├── REFACTORING_SUMMARY.md       # Auth refactoring details
└── TCRT_INTEGRATION_GUIDE.md    # TCRT integration guide
```

## Key Features
1. User story mapping with hierarchical node structure
2. Team-based access control
3. Cross-edge relationships for dependencies
4. Import/Export functionality
5. Full audit logging
6. Multi-language support (i18n)
7. Undo/Redo capability
8. Search and filtering
9. TCRT authentication integration
10. API token management

## Status
- **Backend Auth Services**: 100% Complete (Task 1-8, Task 13)
- **Frontend Implementation**: 0% (In Progress - Task 3)
- **Overall Project**: ~35% Complete

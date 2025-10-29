# Task Completion Checklist

After completing any development task, ensure the following:

## Code Quality
- [ ] All TypeScript files compile without errors
  - Frontend: `cd frontend && tsc -b`
  - Backend: `cd backend && npm run build`
- [ ] ESLint passes without warnings
  - Frontend: `cd frontend && npm run lint`
  - Backend: `cd backend && npm run lint`
- [ ] Code follows naming conventions and style guide
- [ ] JSDoc comments added for public methods/functions
- [ ] No console.log() statements in production code
- [ ] Proper error handling implemented

## Backend Specific
- [ ] New services have comprehensive error handling
- [ ] Database operations use transactions where needed
- [ ] Role-based access guards applied to protected routes
- [ ] Audit logging added for important operations
- [ ] Configuration updated in config/default.example.yaml if needed
- [ ] API endpoints documented

## Frontend Specific
- [ ] React components use proper TypeScript typing
- [ ] Zustand state management properly integrated
- [ ] i18n translation keys are defined
- [ ] Bootstrap classes properly applied
- [ ] No hardcoded strings (use i18n)
- [ ] Accessibility considerations (aria labels, semantic HTML)

## Testing
- [ ] Unit tests written for business logic (if applicable)
- [ ] Integration tests pass (if applicable)
- [ ] Manual testing completed
- [ ] Error scenarios tested

## Documentation
- [ ] README updated if new features added
- [ ] Configuration changes documented
- [ ] Breaking changes documented
- [ ] Comments added for complex logic

## Git/Version Control
- [ ] Changes committed with clear messages
- [ ] Related checklist items (task.md) updated
- [ ] Branch naming follows convention: feature/task-X-description
- [ ] Ready for merge review

## Final Checks
- [ ] No merge conflicts
- [ ] All modified files tracked
- [ ] No unintended files in commit
- [ ] Code ready for peer review

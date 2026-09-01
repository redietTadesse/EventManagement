# AICC Event Management System - Clean Project Structure

## Final File Structure

```
AICC Frontend/
├── index.html                          # Entry HTML file
├── package.json                        # Dependencies and scripts
├── vite.config.js                      # Vite configuration
├── ARCHITECTURE_ASSESSMENT.md          # Architecture evaluation
├── PROJECT_STRUCTURE.md                # This file
│
├── src/
│   ├── main.jsx                        # React entry point
│   ├── App.jsx                         # Main app with routing
│   ├── index.css                       # Tailwind CSS with custom theme
│   │
│   ├── engine/                         # Pure business logic layer
│   │   ├── types.js                    # JSDoc type definitions
│   │   ├── transitions.js              # State machine rules
│   │   ├── conflict.js                 # Conflict detection logic
│   │   ├── autoAssign.js               # Vendor assignment algorithm
│   │   ├── checklist.js                # Checklist automation
│   │   └── events.js                   # Timeline event creation
│   │
│   ├── store/                          # State management
│   │   └── AppContext.jsx             # Global state with useReducer
│   │
│   ├── data/                           # Data layer (replaceable)
│   │   └── mockData.js                # Mock data for prototype
│   │
│   ├── components/                     # Reusable UI components
│   │   ├── Button.jsx                  # Button component
│   │   ├── Card.jsx                    # Card component
│   │   ├── Badge.jsx                   # Badge component
│   │   ├── StatCard.jsx               # Statistics card
│   │   ├── PageHeader.jsx             # Page header component
│   │   ├── StatusBadge.jsx            # Status badge component
│   │   ├── Checklist.jsx               # Checklist display
│   │   ├── Timeline.jsx                # Timeline display
│   │   ├── Navbar.jsx                 # Navigation bar
│   │   ├── NotificationsBell.jsx       # Notification bell
│   │   ├── NotificationsPanel.jsx      # Notification panel
│   │   └── Layout.jsx                 # Layout wrapper
│   │
│   ├── pages/                         # Page components
│   │   ├── Login.jsx                  # Multi-role login
│   │   │
│   │   ├── client/                    # Client-specific pages
│   │   │   ├── ClientDashboard.jsx
│   │   │   ├── NewInquiry.jsx
│   │   │   ├── MyInquiries.jsx
│   │   │   ├── InquiryDetail.jsx
│   │   │   └── ProposalView.jsx
│   │   │
│   │   ├── vendor/                    # Vendor-specific pages
│   │   │   ├── VendorDashboard.jsx
│   │   │   ├── Assignments.jsx
│   │   │   └── AssignmentDetail.jsx
│   │   │
│   │   └── coordinator/              # Coordinator-specific pages
│   │       ├── CoordinatorDashboard.jsx
│   │       ├── AllInquiries.jsx
│   │       ├── InquiryDetail.jsx
│   │       ├── AllEvents.jsx
│   │       ├── EventDetail.jsx
│   │       └── AllVendors.jsx
│   │
│   └── utils/                         # Utility functions
│       └── helpers.js                # Common helper functions
```

## Key Architectural Layers

### 1. Presentation Layer (pages/, components/)
- **Purpose**: User interface and interaction
- **Components**: Role-specific dashboards and forms
- **Technology**: React components with Tailwind CSS

### 2. State Management Layer (store/)
- **Purpose**: Global state and business logic coordination
- **Implementation**: React Context + useReducer
- **Key File**: AppContext.jsx (492 lines of state management)

### 3. Business Logic Layer (engine/)
- **Purpose**: Pure functions implementing system automations
- **Files**: transitions.js, conflict.js, autoAssign.js, checklist.js, events.js
- **Characteristics**: No side effects, testable, reusable

### 4. Data Layer (data/)
- **Purpose**: Data access and storage abstraction
- **Current**: Mock data for prototype
- **Future**: API calls to backend services

### 5. Utility Layer (utils/)
- **Purpose**: Helper functions used across the application
- **Functions**: Date formatting, currency formatting, text manipulation

## Data Flow Architecture

```
User Action → Component → Context Action → Business Logic → State Update → UI Re-render
```

### Example Flow: Client Accepts Proposal

1. **User Action**: Client clicks "Accept Proposal" button
2. **Component**: ProposalView.jsx dispatches ACCEPT_PROPOSAL action
3. **Context**: AppContext reducer handles the action
4. **Business Logic**:
   - Creates event from proposal
   - Calls autoAssignVendors() to assign vendors
   - Calls createTimelineEntry() for timeline
   - Generates notifications
5. **State Update**: Updates inquiries, assignments, notifications, timeline
6. **UI Re-render**: All subscribed components update automatically

## Technology Stack

### Frontend Framework
- **React 18.2.0**: Component-based UI library
- **Vite 5.0.8**: Build tool and dev server
- **React Router 6.21.1**: Client-side routing

### UI Libraries
- **Tailwind CSS 4.0.0-alpha.20**: Utility-first CSS framework
- **Headless UI 1.7.19**: Unstyled accessible components
- **Heroicons 2.1.1**: Icon library

### State Management
- **React Context API**: Global state management
- **useReducer Hook**: Complex state logic

## Key Design Patterns

### 1. State Machine Pattern
- Implemented in `transitions.js`
- Ensures valid state transitions
- Role-based action permissions

### 2. Separation of Concerns
- Clear boundaries between layers
- Business logic independent of UI
- Data layer abstracts storage

### 3. Component Composition
- Small, reusable components
- Feature-specific components
- Page-level composition

### 4. Single Responsibility Principle
- Each file has one clear purpose
- Functions do one thing well
- Easy to test and maintain

## Migration Path to Production

### Phase 1: Backend Integration
1. Create Node.js/Express API
2. Set up PostgreSQL database
3. Replace mock data with API calls
4. Implement JWT authentication

### Phase 2: Enhanced Features
1. Add real email notifications
2. Implement file uploads
3. Add advanced search/filtering
4. Create analytics dashboard

### Phase 3: Production Hardening
1. Add comprehensive error handling
2. Implement logging and monitoring
3. Add security measures
4. Performance optimization

## Files Removed (Cleanup)
- `src/theme.js` - Not needed with Tailwind v4
- `src/context/AppContext.jsx` - Duplicate, using store/ version
- `src/engine/checklist.ts` - TypeScript duplicate
- `src/engine/transitions.ts` - TypeScript duplicate
- `dist/` - Build artifacts (rebuildable)
- `npm-install-err.log` - Error log (not needed)

## Current File Count by Category

- **Configuration**: 3 files (package.json, vite.config.js, index.html)
- **Core React**: 3 files (main.jsx, App.jsx, index.css)
- **Engine**: 6 files (business logic)
- **Store**: 1 file (state management)
- **Data**: 1 file (mock data)
- **Components**: 12 files (reusable UI)
- **Pages**: 13 files (role-specific views)
- **Utils**: 1 file (helper functions)
- **Documentation**: 2 files (architecture assessment, structure)

**Total**: 42 source files + configuration

## Summary

This clean, well-organized structure demonstrates professional software development practices and provides an excellent foundation for both academic demonstration and production deployment.
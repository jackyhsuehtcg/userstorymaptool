import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPalette, faBell, faWrench, faPencil, faMagnifyingGlass, faCodeBranch, faClipboardList, faCheck, faLayerGroup } from '@fortawesome/free-solid-svg-icons';
import { useMapStore } from '../stores/mapStore';
import {
  notifySuccess,
  notifyError,
  notifyWarning,
  notifyInfo,
} from '../stores/notificationStore';
import { EditPanel } from '../components/EditPanel';
import { SearchPanel } from '../components/SearchPanel';
import { Toolbar } from '../components/Toolbar';
import { NotificationContainer } from '../components/NotificationContainer';
import './DemoPage.scss';

/**
 * Demo Page Component
 * Showcases all UI components and features
 */
export const DemoPage: React.FC = () => {
  const [activeSection, setActiveSection] = useState<string>('overview');
  const setSelectedNodeId = useMapStore((state) => state.setSelectedNodeId);
  const nodes = useMapStore((state) => state.nodes);

  // Initialize demo data if empty
  React.useEffect(() => {
    if (nodes.length === 0) {
      const demoNodes = [
        {
          id: 'node-1',
          teamId: 'team-a',
          summary: 'User Authentication',
          description: 'Implement login and session management',
          ticketLabels: ['backend', 'security'],
          parentId: undefined,
          x: 0,
          y: 0,
          style: {},
        },
        {
          id: 'node-2',
          teamId: 'team-a',
          summary: 'API Endpoints',
          description: 'Create RESTful API for story maps',
          ticketLabels: ['backend', 'api'],
          parentId: 'node-1',
          x: 200,
          y: 100,
          style: {},
        },
        {
          id: 'node-3',
          teamId: 'team-b',
          summary: 'UI Components',
          description: 'Build React components for visualization',
          ticketLabels: ['frontend', 'ui'],
          parentId: undefined,
          x: 0,
          y: 300,
          style: {},
        },
      ];

      demoNodes.forEach((node) => {
        useMapStore.getState().addNode(node);
      });

      // Set initial selection
      setSelectedNodeId('node-1');
    }
  }, []);

  const sections = [
    {
      id: 'overview',
      title: 'Overview',
      icon: faClipboardList,
    },
    {
      id: 'notifications',
      title: 'Notifications',
      icon: faBell,
    },
    {
      id: 'toolbar',
      title: 'Toolbar',
      icon: faWrench,
    },
    {
      id: 'editpanel',
      title: 'Edit Panel',
      icon: faPencil,
    },
    {
      id: 'searchpanel',
      title: 'Search Panel',
      icon: faMagnifyingGlass,
    },
    {
      id: 'layout',
      title: 'Full Layout',
      icon: faCodeBranch,
    },
  ];

  const renderContent = () => {
    switch (activeSection) {
      case 'overview':
        return <OverviewSection />;
      case 'notifications':
        return <NotificationsSection />;
      case 'toolbar':
        return <ToolbarSection />;
      case 'editpanel':
        return <EditPanelSection selectedNodeId={nodes[0]?.id || ''} />;
      case 'searchpanel':
        return <SearchPanelSection />;
      case 'layout':
        return <LayoutSection />;
      default:
        return <OverviewSection />;
    }
  };

  return (
    <div className="demo-page">
      <NotificationContainer />

      <div className="demo-container">
        {/* Sidebar Navigation */}
        <aside className="demo-sidebar">
          <div className="demo-sidebar-header">
            <h1 className="demo-title">Component Demo</h1>
            <p className="demo-subtitle">User Story Map Tool</p>
          </div>

          <nav className="demo-nav">
            {sections.map((section) => (
              <button
                key={section.id}
                className={`demo-nav-item ${
                  activeSection === section.id ? 'active' : ''
                }`}
                onClick={() => setActiveSection(section.id)}
              >
                <FontAwesomeIcon icon={section.icon} className="nav-icon" />
                <span className="nav-label">{section.title}</span>
              </button>
            ))}
          </nav>

          <div className="demo-sidebar-footer">
            <p className="version-info">v1.0.0</p>
          </div>
        </aside>

        {/* Main Content */}
        <main className="demo-main">
          <div className="demo-content">{renderContent()}</div>
        </main>
      </div>
    </div>
  );
};

/**
 * Overview Section
 */
const OverviewSection: React.FC = () => (
  <div className="demo-section">
    <h2 className="section-title">Component Library Overview</h2>
    <p className="section-subtitle">
      Explore all UI components used in the Story Map Tool
    </p>

    <div className="feature-grid">
      <div className="feature-card">
        <FontAwesomeIcon icon={faBell} className="feature-icon" />
        <h3>Notification System</h3>
        <p>Global toast notifications with 4 types and auto-dismiss</p>
        <ul>
          <li><FontAwesomeIcon icon={faCheck} /> Success, Error, Warning, Info</li>
          <li><FontAwesomeIcon icon={faCheck} /> Auto-dismiss with timer</li>
          <li><FontAwesomeIcon icon={faCheck} /> Persistent error mode</li>
          <li><FontAwesomeIcon icon={faCheck} /> Progress animation</li>
        </ul>
      </div>

      <div className="feature-card">
        <FontAwesomeIcon icon={faPencil} className="feature-icon" />
        <h3>Edit Panel</h3>
        <p>Professional node editing interface</p>
        <ul>
          <li><FontAwesomeIcon icon={faCheck} /> View & Edit modes</li>
          <li><FontAwesomeIcon icon={faCheck} /> Form validation</li>
          <li><FontAwesomeIcon icon={faCheck} /> Tag badges</li>
          <li><FontAwesomeIcon icon={faCheck} /> Delete confirmation</li>
        </ul>
      </div>

      <div className="feature-card">
        <FontAwesomeIcon icon={faMagnifyingGlass} className="feature-icon" />
        <h3>Search Panel</h3>
        <p>Advanced filtering with multiple options</p>
        <ul>
          <li><FontAwesomeIcon icon={faCheck} /> Full-text search</li>
          <li><FontAwesomeIcon icon={faCheck} /> Multi-criteria filters</li>
          <li><FontAwesomeIcon icon={faCheck} /> Collapsible accordion</li>
          <li><FontAwesomeIcon icon={faCheck} /> Result navigation</li>
        </ul>
      </div>

      <div className="feature-card">
        <FontAwesomeIcon icon={faWrench} className="feature-icon" />
        <h3>Toolbar</h3>
        <p>Action buttons and controls</p>
        <ul>
          <li><FontAwesomeIcon icon={faCheck} /> Add node action</li>
          <li><FontAwesomeIcon icon={faCheck} /> Import/Export</li>
          <li><FontAwesomeIcon icon={faCheck} /> Clear all with confirmation</li>
          <li><FontAwesomeIcon icon={faCheck} /> Language switcher</li>
        </ul>
      </div>

      <div className="feature-card">
        <FontAwesomeIcon icon={faLayerGroup} className="feature-icon" />
        <h3>Responsive Layout</h3>
        <p>Professional left-right split layout</p>
        <ul>
          <li><FontAwesomeIcon icon={faCheck} /> Bootstrap 5 grid</li>
          <li><FontAwesomeIcon icon={faCheck} /> Mobile adaptive</li>
          <li><FontAwesomeIcon icon={faCheck} /> Flexible sidebars</li>
          <li><FontAwesomeIcon icon={faCheck} /> TCRT design tokens</li>
        </ul>
      </div>

      <div className="feature-card">
        <FontAwesomeIcon icon={faPalette} className="feature-icon" />
        <h3>Design System</h3>
        <p>TCRT color palette and styling</p>
        <ul>
          <li><FontAwesomeIcon icon={faCheck} /> Primary colors</li>
          <li><FontAwesomeIcon icon={faCheck} /> Spacing standards</li>
          <li><FontAwesomeIcon icon={faCheck} /> Typography</li>
          <li><FontAwesomeIcon icon={faCheck} /> Animations</li>
        </ul>
      </div>
    </div>

    <section className="info-section">
      <h3>Quick Stats</h3>
      <div className="stats-grid">
        <div className="stat-item">
          <div className="stat-number">4</div>
          <div className="stat-label">Main Components</div>
        </div>
        <div className="stat-item">
          <div className="stat-number">800+</div>
          <div className="stat-label">Lines of Code</div>
        </div>
        <div className="stat-item">
          <div className="stat-number">680+</div>
          <div className="stat-label">Lines of SCSS</div>
        </div>
        <div className="stat-item">
          <div className="stat-number">0</div>
          <div className="stat-label">Type Errors</div>
        </div>
      </div>
    </section>
  </div>
);

/**
 * Notifications Section
 */
const NotificationsSection: React.FC = () => (
  <div className="demo-section">
    <h2 className="section-title">Notification System</h2>
    <p className="section-subtitle">
      Global toast notifications with auto-dismiss
    </p>

    <div className="button-group">
      <button
        className="demo-btn btn-success"
        onClick={() =>
          notifySuccess(
            'This is a success message!',
            'Operation Successful'
          )
        }
      >
        Success (5s)
      </button>
      <button
        className="demo-btn btn-error"
        onClick={() =>
          notifyError(
            'An error occurred! This notification will not auto-dismiss.',
            'Error Occurred'
          )
        }
      >
        Error (Persistent)
      </button>
      <button
        className="demo-btn btn-warning"
        onClick={() =>
          notifyWarning(
            'Warning message - be careful with this action!',
            'Warning'
          )
        }
      >
        Warning (7s)
      </button>
      <button
        className="demo-btn btn-info"
        onClick={() =>
          notifyInfo('This is an informational message.', 'Info')
        }
      >
        Info (5s)
      </button>
    </div>

    <section className="info-section">
      <h3>Features</h3>
      <ul className="feature-list">
        <li>Auto-dismiss with configurable duration</li>
        <li>Type-specific colors and icons</li>
        <li>Progress bar animation</li>
        <li>Manual close button</li>
        <li>Stacked notification support</li>
        <li>Responsive positioning</li>
      </ul>
    </section>
  </div>
);

/**
 * Toolbar Section
 */
const ToolbarSection: React.FC = () => (
  <div className="demo-section">
    <h2 className="section-title">Toolbar</h2>
    <p className="section-subtitle">
      Action buttons and controls for story map operations
    </p>

    <section className="demo-subsection">
      <h3>Preview</h3>
      <div className="toolbar-demo">
        <Toolbar />
      </div>
    </section>

    <section className="info-section">
      <h3>Toolbar Buttons</h3>
      <div className="button-specs">
        <div className="spec-item">
          <h4>➕ Add Node</h4>
          <p>Primary action to create new node</p>
          <span className="spec-tag">Primary</span>
        </div>
        <div className="spec-item">
          <h4>⬆️ Import</h4>
          <p>Import story map data (placeholder)</p>
          <span className="spec-tag">Secondary</span>
        </div>
        <div className="spec-item">
          <h4>⬇️ Export</h4>
          <p>Export to JSON file</p>
          <span className="spec-tag">Secondary</span>
        </div>
        <div className="spec-item">
          <h4>✕ Clear All</h4>
          <p>Clear all data with confirmation</p>
          <span className="spec-tag">Danger</span>
        </div>
      </div>
    </section>
  </div>
);

/**
 * Edit Panel Section
 */
const EditPanelSection: React.FC<{ selectedNodeId: string }> = () => (
  <div className="demo-section">
    <h2 className="section-title">Edit Panel</h2>
    <p className="section-subtitle">
      Professional node editing with view/edit modes
    </p>

    <section className="demo-subsection">
      <h3>Preview (Select a Node)</h3>
      <div className="panel-demo">
        <div className="demo-nodes-list">
          {useMapStore.getState().nodes.map((node) => (
            <button
              key={node.id}
              className="node-select-btn"
              onClick={() => useMapStore.getState().setSelectedNodeId(node.id)}
            >
              {node.summary}
            </button>
          ))}
        </div>
        <div className="panel-container">
          <EditPanel />
        </div>
      </div>
    </section>

    <section className="info-section">
      <h3>Edit Panel Features</h3>
      <ul className="feature-list">
        <li>View mode (default, read-only)</li>
        <li>Edit mode toggle</li>
        <li>Fields: ID, Summary*, Description, Team, Labels</li>
        <li>Tag badges preview</li>
        <li>Form validation</li>
        <li>Save/Cancel/Delete actions</li>
        <li>Empty state placeholder</li>
        <li>Toast notifications</li>
      </ul>
    </section>
  </div>
);

/**
 * Search Panel Section
 */
const SearchPanelSection: React.FC = () => (
  <div className="demo-section">
    <h2 className="section-title">Search Panel</h2>
    <p className="section-subtitle">
      Advanced filtering with multiple search criteria
    </p>

    <section className="demo-subsection">
      <h3>Preview</h3>
      <div className="panel-container">
        <SearchPanel />
      </div>
    </section>

    <section className="info-section">
      <h3>Filter Options</h3>
      <div className="filter-specs">
        <div className="spec-item">
          <h4>Full Text Search</h4>
          <p>Search in summary and description</p>
        </div>
        <div className="spec-item">
          <h4>Team Filter</h4>
          <p>Filter by assigned team</p>
        </div>
        <div className="spec-item">
          <h4>Ticket Label</h4>
          <p>Search by ticket labels</p>
        </div>
        <div className="spec-item">
          <h4>Date Range</h4>
          <p>Filter by creation date</p>
        </div>
        <div className="spec-item">
          <h4>Parent Node</h4>
          <p>Filter by parent node</p>
        </div>
      </div>
    </section>
  </div>
);

/**
 * Layout Section
 */
const LayoutSection: React.FC = () => (
  <div className="demo-section">
    <h2 className="section-title">Full Layout</h2>
    <p className="section-subtitle">
      Complete responsive layout with all components
    </p>

    <section className="demo-subsection layout-preview">
      <h3>Layout Structure</h3>
      <div className="layout-diagram">
        <div className="layout-header">Toolbar (Full Width, 50px)</div>
        <div className="layout-content">
          <div className="layout-canvas">Canvas (flex: 1)</div>
          <div className="layout-sidebar">Sidebar (380px)</div>
        </div>
        <div className="layout-notifications">
          Notifications (Fixed Top-Right)
        </div>
      </div>
    </section>

    <section className="info-section">
      <h3>Layout Features</h3>
      <ul className="feature-list">
        <li>Bootstrap 5 responsive grid</li>
        <li>Fixed header with toolbar</li>
        <li>Left canvas area (flexible)</li>
        <li>Right sidebar (380px, scrollable)</li>
        <li>Fixed notification container</li>
        <li>Mobile responsive design</li>
        <li>Touch-friendly on tablets</li>
      </ul>
    </section>

    <section className="info-section">
      <h3>Responsive Breakpoints</h3>
      <div className="breakpoint-grid">
        <div className="breakpoint-item">
          <h4>Desktop</h4>
          <p>&gt; 1024px</p>
          <p>Full left-right layout</p>
        </div>
        <div className="breakpoint-item">
          <h4>Tablet</h4>
          <p>768px - 1024px</p>
          <p>Flexible sidebar</p>
        </div>
        <div className="breakpoint-item">
          <h4>Mobile</h4>
          <p>&lt; 768px</p>
          <p>Stacked layout</p>
        </div>
      </div>
    </section>
  </div>
);

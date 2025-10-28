import React from 'react';
import { Canvas } from './Canvas';
import { EditPanel } from './EditPanel';
import { SearchPanel } from './SearchPanel';
import { Toolbar } from './Toolbar';
import { NotificationContainer } from './NotificationContainer';
import './Layout.scss';

/**
 * Main Layout Component
 * Provides the overall structure: toolbar, canvas (left), and sidebar (right)
 */
export const Layout: React.FC = () => {
  return (
    <div className="story-map-layout">
      {/* Notifications */}
      <NotificationContainer />

      {/* Header/Toolbar */}
      <header className="story-map-toolbar">
        <Toolbar />
      </header>

      {/* Main Content */}
      <div className="story-map-content">
        {/* Left Panel: Canvas */}
        <section className="story-map-canvas-section">
          <Canvas />
        </section>

        {/* Right Panel: Edit Panel + Search */}
        <aside className="story-map-sidebar">
          <div className="sidebar-tabs">
            <SearchPanel />
            <EditPanel />
          </div>
        </aside>
      </div>
    </div>
  );
};

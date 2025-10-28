import React from 'react';
import { Canvas } from './Canvas';
import { EditPanel } from './EditPanel';
import { Toolbar } from './Toolbar';
import './Layout.scss';

export const Layout: React.FC = () => {
  return (
    <div className="story-map-layout">
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
          <EditPanel />
        </aside>
      </div>
    </div>
  );
};

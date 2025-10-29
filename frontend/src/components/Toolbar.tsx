import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faUpload, faDownload, faTrash, faCircleNotch } from '@fortawesome/free-solid-svg-icons';
import { useMapStore } from '../stores/mapStore';
import { notifySuccess, notifyInfo } from '../stores/notificationStore';
import { generateNodeId } from '../utils/id';
import { LanguageSwitcher } from './LanguageSwitcher';
import './Toolbar.scss';

/**
 * Toolbar Component
 * Provides actions for creating nodes, importing/exporting, undo/redo, etc.
 */
export const Toolbar: React.FC = () => {
  const { t } = useTranslation('ui');
  const isLoading = useMapStore((state) => state.isLoading);
  const addNode = useMapStore((state) => state.addNode);
  const addEdge = useMapStore((state) => state.addEdge);
  const reset = useMapStore((state) => state.reset);
  const selectedNodeId = useMapStore((state) => state.selectedNodeId);
  const getNodeById = useMapStore((state) => state.getNodeById);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleAddNode = () => {
    const newNodeId = generateNodeId();
    const selectedNode = selectedNodeId ? getNodeById(selectedNodeId) : undefined;

    const newNode = {
      id: newNodeId,
      teamId: selectedNode?.teamId || '',
      summary: t('editPanel.summaryPlaceholder'),
      description: '',
      ticketLabels: [],
      parentId: selectedNodeId,
    };

    addNode(newNode);

    // Create edge from parent to new node if parent exists
    if (selectedNodeId) {
      const edgeId = `${selectedNodeId}-${newNodeId}`;
      addEdge({
        id: edgeId,
        source: selectedNodeId,
        target: newNodeId,
        type: 'tree',
      });
      notifySuccess(t('messages:notifications.childNodeCreated', {
        defaultValue: 'Child node created successfully',
      }));
    } else {
      notifySuccess(t('messages:notifications.nodeCreated', {
        defaultValue: 'Node created successfully',
      }));
    }
  };

  const handleClearAll = () => {
    setShowDeleteConfirm(true);
  };

  const confirmClearAll = () => {
    reset();
    setShowDeleteConfirm(false);
    notifyInfo('All nodes and edges have been cleared');
  };

  const handleImport = () => {
    notifyInfo('Import functionality coming soon');
  };

  const handleExport = () => {
    const nodes = useMapStore.getState().nodes;
    const edges = useMapStore.getState().edges;
    const data = { nodes, edges };
    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `story-map-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    notifySuccess('Data exported successfully');
  };

  return (
    <div className="toolbar">
      <div className="toolbar-left">
        <h2 className="toolbar-title">{t('appTitle')}</h2>

        <div className="toolbar-button-group">
          <button
            className="btn btn-sm btn-primary"
            onClick={handleAddNode}
            disabled={isLoading}
            title={t('toolbar.addNode')}
          >
            <FontAwesomeIcon icon={faPlus} className="btn-icon" />
            {t('toolbar.addNode')}
          </button>

          <div className="toolbar-divider"></div>

          <button
            className="btn btn-sm btn-outline-secondary"
            onClick={handleImport}
            disabled={isLoading}
            title={t('toolbar.import')}
          >
            <FontAwesomeIcon icon={faUpload} className="btn-icon" />
            {t('toolbar.import')}
          </button>

          <button
            className="btn btn-sm btn-outline-secondary"
            onClick={handleExport}
            disabled={isLoading}
            title={t('toolbar.export')}
          >
            <FontAwesomeIcon icon={faDownload} className="btn-icon" />
            {t('toolbar.export')}
          </button>

          <div className="toolbar-divider"></div>

          <button
            className="btn btn-sm btn-outline-danger"
            onClick={handleClearAll}
            disabled={isLoading}
            title={t('toolbar.clearAll')}
          >
            <FontAwesomeIcon icon={faTrash} className="btn-icon" />
            {t('toolbar.clearAll')}
          </button>

          {isLoading && (
            <div className="toolbar-spinner">
              <FontAwesomeIcon icon={faCircleNotch} spin className="spinner-icon" />
            </div>
          )}
        </div>
      </div>

      <div className="toolbar-right">
        <LanguageSwitcher />
      </div>

      {/* Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="confirmation-modal">
          <div className="confirmation-content">
            <h5>Clear All Data?</h5>
            <p>This action will delete all nodes and edges. This cannot be undone.</p>
            <div className="confirmation-buttons">
              <button className="btn btn-danger btn-sm" onClick={confirmClearAll}>
                Yes, Clear All
              </button>
              <button
                className="btn btn-outline-secondary btn-sm"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

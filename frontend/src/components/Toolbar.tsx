import React from 'react';
import { useTranslation } from 'react-i18next';
import { useMapStore } from '../stores/mapStore';
import { LanguageSwitcher } from './LanguageSwitcher';

export const Toolbar: React.FC = () => {
  const { t } = useTranslation('ui');
  const isLoading = useMapStore((state) => state.isLoading);
  const error = useMapStore((state) => state.error);

  const handleAddNode = () => {
    const newNode = {
      id: `node-${Date.now()}`,
      teamId: '',
      summary: t('editPanel.summaryPlaceholder'),
      description: '',
      ticketLabels: [],
    };
    useMapStore.getState().addNode(newNode);
  };

  const handleClearAll = () => {
    const confirmMessage = t('messages:confirmations.clearAll', {
      defaultValue: 'Are you sure you want to clear all nodes and edges?',
    });
    if (confirm(confirmMessage)) {
      useMapStore.getState().reset();
    }
  };

  return (
    <div className="toolbar">
      <div className="btn-group">
        <h3 style={{ margin: '0 20px 0 0', display: 'inline' }}>
          {t('appTitle')}
        </h3>
        <button
          className="btn btn-sm btn-primary"
          onClick={handleAddNode}
          disabled={isLoading}
          title={t('toolbar.addNode')}
        >
          {t('toolbar.addNode')}
        </button>
        <button
          className="btn btn-sm btn-outline-secondary"
          onClick={handleClearAll}
          disabled={isLoading}
          title={t('toolbar.clearAll')}
        >
          {t('toolbar.clearAll')}
        </button>

        {isLoading && (
          <span className="spinner-border spinner-border-sm ms-2" role="status">
            <span className="visually-hidden">{t('loading')}</span>
          </span>
        )}

        {error && (
          <div className="alert alert-danger ms-2 mb-0" role="alert">
            {error}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <LanguageSwitcher />
      </div>
    </div>
  );
};

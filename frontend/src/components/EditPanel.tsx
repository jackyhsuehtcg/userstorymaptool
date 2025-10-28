import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMapStore } from '../stores/mapStore';

export const EditPanel: React.FC = () => {
  const { t } = useTranslation(['ui', 'messages']);
  const selectedNodeId = useMapStore((state) => state.selectedNodeId);
  const getNodeById = useMapStore((state) => state.getNodeById);
  const updateNode = useMapStore((state) => state.updateNode);
  const deleteNode = useMapStore((state) => state.deleteNode);
  const teams = useMapStore((state) => state.teams);

  const node = selectedNodeId ? getNodeById(selectedNodeId) : undefined;

  const [summary, setSummary] = useState(node?.summary || '');
  const [description, setDescription] = useState(node?.description || '');
  const [teamId, setTeamId] = useState(node?.teamId || '');
  const [ticketLabels, setTicketLabels] = useState(
    node?.ticketLabels?.join(',') || ''
  );

  React.useEffect(() => {
    if (node) {
      setSummary(node.summary);
      setDescription(node.description || '');
      setTeamId(node.teamId || '');
      setTicketLabels(node.ticketLabels?.join(',') || '');
    } else {
      setSummary('');
      setDescription('');
      setTeamId('');
      setTicketLabels('');
    }
  }, [node]);

  const handleSave = () => {
    if (!selectedNodeId) return;

    const labels = ticketLabels
      .split(',')
      .map((l) => l.trim())
      .filter((l) => l);

    updateNode(selectedNodeId, {
      summary,
      description,
      teamId,
      ticketLabels: labels,
    });
  };

  const handleDelete = () => {
    if (!selectedNodeId) return;
    const confirmMessage = t('messages:confirmations.deleteNode');
    if (confirm(confirmMessage)) {
      deleteNode(selectedNodeId);
    }
  };

  if (!node) {
    return (
      <div className="edit-panel" style={{ padding: '20px' }}>
        <p className="text-muted">{t('editPanel.selectNode')}</p>
      </div>
    );
  }

  return (
    <div className="edit-panel" style={{ padding: '20px' }}>
      <h5 className="mb-3">{t('editPanel.title')}</h5>

      <div className="mb-3">
        <label className="form-label">{t('editPanel.id')}</label>
        <input
          type="text"
          className="form-control"
          value={selectedNodeId}
          disabled
        />
      </div>

      <div className="mb-3">
        <label className="form-label">
          {t('editPanel.summary')} <span style={{ color: 'red' }}>*</span>
        </label>
        <input
          type="text"
          className="form-control"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder={t('editPanel.summaryPlaceholder')}
        />
      </div>

      <div className="mb-3">
        <label className="form-label">{t('editPanel.description')}</label>
        <textarea
          className="form-control"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t('editPanel.descriptionPlaceholder')}
          rows={3}
        />
      </div>

      <div className="mb-3">
        <label className="form-label">{t('editPanel.team')}</label>
        <select
          className="form-select"
          value={teamId}
          onChange={(e) => setTeamId(e.target.value)}
        >
          <option value="">{t('editPanel.teamPlaceholder')}</option>
          {teams
            .filter((t) => t.active)
            .map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
        </select>
      </div>

      <div className="mb-3">
        <label className="form-label">{t('editPanel.ticketLabels')}</label>
        <input
          type="text"
          className="form-control"
          value={ticketLabels}
          onChange={(e) => setTicketLabels(e.target.value)}
          placeholder={t('editPanel.ticketLabelsPlaceholder')}
        />
      </div>

      <div className="d-flex gap-2">
        <button
          className="btn btn-primary btn-sm"
          onClick={handleSave}
        >
          {t('editPanel.save')}
        </button>
        <button
          className="btn btn-danger btn-sm"
          onClick={handleDelete}
        >
          {t('editPanel.delete')}
        </button>
      </div>
    </div>
  );
};

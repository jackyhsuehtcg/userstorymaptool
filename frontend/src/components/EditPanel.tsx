import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faClipboard, faPencil, faFloppyDisk, faBan, faTrash } from '@fortawesome/free-solid-svg-icons';
import { useMapStore } from '../stores/mapStore';
import { notifySuccess, notifyError } from '../stores/notificationStore';
import './EditPanel.scss';

/**
 * EditPanel Component
 * Allows editing of selected node properties
 */
export const EditPanel: React.FC = () => {
  const { t } = useTranslation(['ui', 'messages']);
  const selectedNodeId = useMapStore((state) => state.selectedNodeId);
  const getNodeById = useMapStore((state) => state.getNodeById);
  const updateNode = useMapStore((state) => state.updateNode);
  const deleteNode = useMapStore((state) => state.deleteNode);
  const setSelectedNodeId = useMapStore((state) => state.setSelectedNodeId);
  const teams = useMapStore((state) => state.teams);

  const node = selectedNodeId ? getNodeById(selectedNodeId) : undefined;

  const [summary, setSummary] = useState(node?.summary || '');
  const [description, setDescription] = useState(node?.description || '');
  const [teamId, setTeamId] = useState(node?.teamId || '');
  const [ticketLabels, setTicketLabels] = useState(
    node?.ticketLabels?.join(', ') || ''
  );
  const [isEditing, setIsEditing] = useState(false);

  React.useEffect(() => {
    if (node) {
      setSummary(node.summary);
      setDescription(node.description || '');
      setTeamId(node.teamId || '');
      setTicketLabels(node.ticketLabels?.join(', ') || '');
      setIsEditing(false);
    } else {
      setSummary('');
      setDescription('');
      setTeamId('');
      setTicketLabels('');
      setIsEditing(false);
    }
  }, [node]);

  const handleSave = () => {
    if (!selectedNodeId || !summary.trim()) {
      notifyError(t('editPanel.summaryPlaceholder'));
      return;
    }

    const labels = ticketLabels
      .split(',')
      .map((l) => l.trim())
      .filter((l) => l);

    updateNode(selectedNodeId, {
      summary: summary.trim(),
      description: description.trim(),
      teamId,
      ticketLabels: labels,
    });

    notifySuccess(t('buttons.save') + ' ' + t('success'));
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (!selectedNodeId) return;
    const confirmMessage = t('messages:confirmations.deleteNode', {
      defaultValue: 'Are you sure you want to delete this node?',
    });
    if (confirm(confirmMessage)) {
      deleteNode(selectedNodeId);
      setSelectedNodeId('');
      notifySuccess('Node deleted successfully');
    }
  };

  const handleCancel = () => {
    if (node) {
      setSummary(node.summary);
      setDescription(node.description || '');
      setTeamId(node.teamId || '');
      setTicketLabels(node.ticketLabels?.join(', ') || '');
    }
    setIsEditing(false);
  };

  if (!node) {
    return (
      <div className="edit-panel empty-state">
        <div className="empty-state-content">
          <FontAwesomeIcon icon={faClipboard} className="empty-state-icon" />
          <p className="empty-state-text">{t('editPanel.selectNode')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="edit-panel">
      <div className="edit-panel-header">
        <h5 className="edit-panel-title">{t('editPanel.title')}</h5>
        {!isEditing && (
          <button
            className="btn btn-sm btn-outline-primary"
            onClick={() => setIsEditing(true)}
            title="Edit"
          >
            <FontAwesomeIcon icon={faPencil} />
          </button>
        )}
      </div>

      <div className="edit-panel-body">
        <div className="form-group">
          <label className="form-label">{t('editPanel.id')}</label>
          <div className="node-id">{selectedNodeId}</div>
        </div>

        <div className="form-group">
          <label className="form-label">
            {t('editPanel.summary')} <span className="required">*</span>
          </label>
          <input
            type="text"
            className="form-control"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder={t('editPanel.summaryPlaceholder')}
            disabled={!isEditing}
          />
        </div>

        <div className="form-group">
          <label className="form-label">{t('editPanel.description')}</label>
          <textarea
            className="form-control"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('editPanel.descriptionPlaceholder')}
            rows={3}
            disabled={!isEditing}
          />
        </div>

        <div className="form-group">
          <label className="form-label">{t('editPanel.team')}</label>
          <select
            className="form-select"
            value={teamId}
            onChange={(e) => setTeamId(e.target.value)}
            disabled={!isEditing}
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

        <div className="form-group">
          <label className="form-label">{t('editPanel.ticketLabels')}</label>
          <input
            type="text"
            className="form-control"
            value={ticketLabels}
            onChange={(e) => setTicketLabels(e.target.value)}
            placeholder={t('editPanel.ticketLabelsPlaceholder')}
            disabled={!isEditing}
          />
          {ticketLabels && (
            <div className="label-badges mt-2">
              {ticketLabels
                .split(',')
                .map((label) => label.trim())
                .filter((label) => label)
                .map((label, idx) => (
                  <span key={idx} className="badge bg-secondary">
                    {label}
                  </span>
                ))}
            </div>
          )}
        </div>
      </div>

      <div className="edit-panel-footer">
        {isEditing ? (
          <>
            <button className="btn btn-primary btn-sm" onClick={handleSave} title="Save">
              <FontAwesomeIcon icon={faFloppyDisk} />
            </button>
            <button className="btn btn-outline-secondary btn-sm" onClick={handleCancel} title="Cancel">
              <FontAwesomeIcon icon={faBan} />
            </button>
            <button className="btn btn-danger btn-sm ms-auto" onClick={handleDelete} title="Delete">
              <FontAwesomeIcon icon={faTrash} />
            </button>
          </>
        ) : (
          <button className="btn btn-danger btn-sm" onClick={handleDelete} title="Delete">
            <FontAwesomeIcon icon={faTrash} />
          </button>
        )}
      </div>
    </div>
  );
};

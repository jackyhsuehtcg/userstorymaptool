import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMapStore } from '../stores/mapStore';
import './SearchPanel.scss';

interface SearchFilters {
  fullText: string;
  teamId: string;
  ticketLabel: string;
  customLabel: string;
  dateFrom: string;
  dateTo: string;
  parentNodeId: string;
}

/**
 * Search Panel Component
 * Provides multiple search and filter options for nodes
 */
export const SearchPanel: React.FC = () => {
  const { t } = useTranslation('ui');
  const teams = useMapStore((state) => state.teams);
  const nodes = useMapStore((state) => state.nodes);
  const setSelectedNodeId = useMapStore((state) => state.setSelectedNodeId);

  const [filters, setFilters] = useState<SearchFilters>({
    fullText: '',
    teamId: '',
    ticketLabel: '',
    customLabel: '',
    dateFrom: '',
    dateTo: '',
    parentNodeId: '',
  });

  const [results, setResults] = useState<typeof nodes>([]);
  const [showResults, setShowResults] = useState(false);

  const handleSearch = () => {
    let filtered = nodes;

    // Full text search (summary + description)
    if (filters.fullText) {
      const searchTerm = filters.fullText.toLowerCase();
      filtered = filtered.filter(
        (node) =>
          node.summary.toLowerCase().includes(searchTerm) ||
          node.description?.toLowerCase().includes(searchTerm)
      );
    }

    // Team filter
    if (filters.teamId) {
      filtered = filtered.filter((node) => node.teamId === filters.teamId);
    }

    // Ticket label filter
    if (filters.ticketLabel) {
      const labelTerm = filters.ticketLabel.toLowerCase();
      filtered = filtered.filter((node) =>
        node.ticketLabels?.some((label) =>
          label.toLowerCase().includes(labelTerm)
        )
      );
    }

    // Parent node filter
    if (filters.parentNodeId) {
      filtered = filtered.filter((node) => node.parentId === filters.parentNodeId);
    }

    setResults(filtered);
    setShowResults(true);
  };

  const handleClear = () => {
    setFilters({
      fullText: '',
      teamId: '',
      ticketLabel: '',
      customLabel: '',
      dateFrom: '',
      dateTo: '',
      parentNodeId: '',
    });
    setResults([]);
    setShowResults(false);
  };

  const handleSelectResult = (nodeId: string) => {
    setSelectedNodeId(nodeId);
  };

  return (
    <div className="search-panel">
      <div className="search-accordion" role="region">
        <button
          className="search-header"
          data-bs-toggle="collapse"
          data-bs-target="#searchFilters"
          aria-expanded="true"
          aria-controls="searchFilters"
        >
          <span className="search-title">{t('searchPanel.title')}</span>
          <span className="search-toggle">▼</span>
        </button>

        <div id="searchFilters" className="search-filters collapse show">
          {/* Full Text Search */}
          <div className="search-field">
            <label className="form-label">{t('searchPanel.fullText')}</label>
            <input
              type="text"
              className="form-control form-control-sm"
              value={filters.fullText}
              onChange={(e) =>
                setFilters({ ...filters, fullText: e.target.value })
              }
              placeholder="Search nodes..."
            />
          </div>

          {/* Team Filter */}
          <div className="search-field">
            <label className="form-label">{t('searchPanel.team')}</label>
            <select
              className="form-select form-select-sm"
              value={filters.teamId}
              onChange={(e) => setFilters({ ...filters, teamId: e.target.value })}
            >
              <option value="">All Teams</option>
              {teams
                .filter((t) => t.active)
                .map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
            </select>
          </div>

          {/* Ticket Label Filter */}
          <div className="search-field">
            <label className="form-label">{t('searchPanel.ticketLabel')}</label>
            <input
              type="text"
              className="form-control form-control-sm"
              value={filters.ticketLabel}
              onChange={(e) =>
                setFilters({ ...filters, ticketLabel: e.target.value })
              }
              placeholder="Filter by label..."
            />
          </div>

          {/* Date Range */}
          <div className="search-field">
            <label className="form-label">{t('searchPanel.dateRange')}</label>
            <div className="d-flex gap-2">
              <input
                type="date"
                className="form-control form-control-sm"
                value={filters.dateFrom}
                onChange={(e) =>
                  setFilters({ ...filters, dateFrom: e.target.value })
                }
              />
              <input
                type="date"
                className="form-control form-control-sm"
                value={filters.dateTo}
                onChange={(e) =>
                  setFilters({ ...filters, dateTo: e.target.value })
                }
              />
            </div>
          </div>

          {/* Parent Node Filter */}
          <div className="search-field">
            <label className="form-label">{t('searchPanel.parentNode')}</label>
            <select
              className="form-select form-select-sm"
              value={filters.parentNodeId}
              onChange={(e) =>
                setFilters({ ...filters, parentNodeId: e.target.value })
              }
            >
              <option value="">All Parents</option>
              {nodes
                .filter((node) => !node.parentId) // Root nodes
                .map((node) => (
                  <option key={node.id} value={node.id}>
                    {node.summary}
                  </option>
                ))}
            </select>
          </div>

          {/* Search Buttons */}
          <div className="search-buttons">
            <button
              className="btn btn-primary btn-sm"
              onClick={handleSearch}
            >
              {t('searchPanel.search')}
            </button>
            <button
              className="btn btn-outline-secondary btn-sm"
              onClick={handleClear}
            >
              {t('searchPanel.clear')}
            </button>
          </div>
        </div>
      </div>

      {/* Search Results */}
      {showResults && (
        <div className="search-results">
          {results.length > 0 ? (
            <>
              <div className="results-header">
                {t('searchPanel.search')}: {results.length} {t('buttons.ok')}
              </div>
              <div className="results-list">
                {results.map((node) => (
                  <button
                    key={node.id}
                    className="result-item"
                    onClick={() => handleSelectResult(node.id)}
                  >
                    <div className="result-summary">{node.summary}</div>
                    <div className="result-meta">
                      {node.teamId && (
                        <span className="badge bg-info">
                          {teams.find((t) => t.id === node.teamId)?.name}
                        </span>
                      )}
                      {node.ticketLabels?.map((label) => (
                        <span key={label} className="badge bg-secondary">
                          {label}
                        </span>
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="results-empty">
              {t('searchPanel.noResults')}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

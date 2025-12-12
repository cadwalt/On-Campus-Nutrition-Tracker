import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { SavedResponse, SavedFolder } from '../../types/savedResponse';
import { savedResponsesService } from '../services/savedResponsesService';
import { FolderIcon, TrashIcon, EditIcon } from '../ui/Icons';

interface SavedResponsesModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

const SavedResponsesModal: React.FC<SavedResponsesModalProps> = ({ isOpen, onClose, userId }) => {
  const [folders, setFolders] = useState<SavedFolder[]>([]);
  const [responses, setResponses] = useState<SavedResponse[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<SavedFolder | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [showNewFolderForm, setShowNewFolderForm] = useState(false);
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null);
  const [renamingText, setRenamingText] = useState('');
  const [loading, setLoading] = useState(false);
  const [expandedResponses, setExpandedResponses] = useState<Record<string, boolean>>({});
  const [moveTargets, setMoveTargets] = useState<Record<string, string>>({});
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [viewMode, setViewMode] = useState<'folders' | 'responses'>('folders');;

  useEffect(() => {
    if (isOpen && userId) {
      loadFolders();
    }
  }, [isOpen, userId]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const loadFolders = async () => {
    try {
      setLoading(true);
      const foldersList = await savedResponsesService.getFolders(userId);
      
      // Refresh folder counts from actual response counts in database
      const foldersWithUpdatedCounts = await Promise.all(
        foldersList.map(async (folder) => {
          const responses = await savedResponsesService.getResponsesInFolder(userId, folder.id);
          return { ...folder, responseCount: responses.length };
        })
      );
      
      setFolders(foldersWithUpdatedCounts);
      if (foldersWithUpdatedCounts.length > 0 && !selectedFolder) {
        setSelectedFolder(foldersWithUpdatedCounts[0]);
        await loadResponses(foldersWithUpdatedCounts[0].id);
      }
    } catch (err) {
      console.error('Failed to load folders:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadResponses = async (folderId: string) => {
    try {
      const resp = await savedResponsesService.getResponsesInFolder(userId, folderId);
      setResponses(resp);
      setFolders(prev => prev.map(f => (f.id === folderId ? { ...f, responseCount: resp.length } : f)));
    } catch (err) {
      console.error('Failed to load responses:', err);
    }
  };

  const getPreviewText = (fullText: string) => {
    const sentences = fullText.split(/(?<=[.!?])\s+/).filter(Boolean);
    const preview = sentences.slice(0, 3).join(' ');
    return preview || fullText.slice(0, 160);
  };

  const toggleExpand = (responseId: string) => {
    setExpandedResponses(prev => ({ ...prev, [responseId]: !prev[responseId] }));
  };

  const handleMoveResponse = async (responseId: string, targetFolderId: string) => {
    if (!selectedFolder) return;
    if (!targetFolderId || targetFolderId === selectedFolder.id) return;

    try {
      setLoading(true);
      await savedResponsesService.moveResponseToFolder(userId, responseId, selectedFolder.id, targetFolderId);

      const updatedResponses = responses.filter(r => r.id !== responseId);
      setResponses(updatedResponses);

      setFolders(prev => prev.map(f => {
        if (f.id === selectedFolder.id) return { ...f, responseCount: Math.max(0, (f.responseCount ?? 1) - 1) };
        if (f.id === targetFolderId) return { ...f, responseCount: (f.responseCount ?? 0) + 1 };
        return f;
      }));

      setMoveTargets(prev => ({ ...prev, [responseId]: '' }));
    } catch (err) {
      console.error('Failed to move response:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;

    try {
      setLoading(true);
      const newFolder = await savedResponsesService.createFolder(userId, newFolderName);
      setFolders([...folders, newFolder]);
      setNewFolderName('');
      setShowNewFolderForm(false);
    } catch (err) {
      console.error('Failed to create folder:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRenameFolder = async (folderId: string) => {
    if (!renamingText.trim()) return;

    try {
      setLoading(true);
      await savedResponsesService.renameFolder(userId, folderId, renamingText);
      setFolders(folders.map(f =>
        f.id === folderId ? { ...f, name: renamingText } : f
      ));
      setRenamingFolderId(null);
      setRenamingText('');
    } catch (err) {
      console.error('Failed to rename folder:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    if (!confirm('Are you sure you want to delete this folder? All responses will be deleted.')) return;

    try {
      setLoading(true);
      await savedResponsesService.deleteFolder(userId, folderId);
      const updatedFolders = folders.filter(f => f.id !== folderId);
      setFolders(updatedFolders);
      if (selectedFolder?.id === folderId) {
        setSelectedFolder(updatedFolders[0] || null);
        if (updatedFolders.length > 0) {
          loadResponses(updatedFolders[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to delete folder:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteResponse = async (responseId: string) => {
    if (!confirm('Delete this saved response?')) return;

    try {
      setLoading(true);
      const folderId = selectedFolder?.id;
      if (!folderId) {
        setLoading(false);
        return;
      }

      await savedResponsesService.deleteResponse(userId, responseId, folderId);
      const updatedResponses = responses.filter(r => r.id !== responseId);
      setResponses(updatedResponses);
      
      // Update folder count to match actual responses
      setFolders(prev => prev.map(f => 
        f.id === folderId ? { ...f, responseCount: updatedResponses.length } : f
      ));
    } catch (err) {
      console.error('Failed to delete response:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectFolder = async (folder: SavedFolder) => {
    setSelectedFolder(folder);
    await loadResponses(folder.id);
    if (isMobile) {
      setViewMode('responses');
    }
  };

  const handleBackToFolders = () => {
    setViewMode('folders');
    setSelectedFolder(null);
    setResponses([]);
  };

  if (!isOpen) return null;

  // Mobile: Two-tier layout (folders → responses)
  if (isMobile) {
    return createPortal(
      <div
        className="modal-overlay"
        style={{ zIndex: 100001, background: 'rgba(8, 11, 18, 0.92)', backdropFilter: 'blur(2px)' }}
      >
        <div
          className="modal-content"
          style={{
            zIndex: 100002,
            width: '95vw',
            maxWidth: '480px',
            maxHeight: '90vh',
            background: '#0b1220',
            border: '1px solid #1f2937',
            boxShadow: '0 25px 70px rgba(0,0,0,0.55)',
            display: 'flex',
            flexDirection: 'column',
            borderRadius: '14px'
          }}
        >
          {/* Header with back button for responses view */}
          <div className="modal-header-bar" style={{ borderBottom: '1px solid #1f2937', padding: '1rem 1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
                {viewMode === 'responses' && (
                  <button
                    type="button"
                    className="back-button"
                    onClick={handleBackToFolders}
                    aria-label="Back to folders"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#e2e8f0',
                      cursor: 'pointer',
                      fontSize: '1.5rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '0.25rem'
                    }}
                    title="Back to folders"
                  >
                    ←
                  </button>
                )}
                <h2 style={{ color: '#e2e8f0', fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>
                  {viewMode === 'folders' ? 'Saved Responses' : selectedFolder?.name}
                </h2>
              </div>
              <button
                type="button"
                className="close-button"
                onClick={onClose}
                aria-label="Close"
                style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: '8px', color: '#cbd5e1', padding: '0.4rem 0.6rem' }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Content - folders view */}
          {viewMode === 'folders' && (
            <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ marginBottom: '0.5rem' }}>
                <button
                  onClick={() => setShowNewFolderForm(!showNewFolderForm)}
                  style={{
                    width: '100%',
                    padding: '0.9rem',
                    background: '#111827',
                    border: '1px solid #1f2937',
                    borderRadius: '10px',
                    color: '#e2e8f0',
                    cursor: 'pointer',
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    boxShadow: '0 8px 20px rgba(0,0,0,0.35)',
                    transition: 'all 0.2s ease'
                  }}
                >
                  + New Folder
                </button>
              </div>

              {showNewFolderForm && (
                <div style={{ padding: '0.75rem', background: '#0f172a', border: '1px solid #1f2937', borderRadius: '10px' }}>
                  <input
                    type="text"
                    placeholder="Folder name..."
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') handleCreateFolder();
                    }}
                    style={{
                      width: '100%',
                      padding: '0.6rem',
                      marginBottom: '0.5rem',
                      background: '#0f172a',
                      border: '1px solid #1f2937',
                      borderRadius: '8px',
                      color: '#e2e8f0',
                      fontSize: '0.875rem',
                      boxSizing: 'border-box'
                    }}
                    autoFocus
                  />
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={handleCreateFolder}
                      disabled={loading}
                      style={{
                        flex: 1,
                        padding: '0.5rem',
                        background: '#0f766e',
                        border: '1px solid #0d9488',
                        borderRadius: '8px',
                        color: '#ecfeff',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        fontWeight: 600
                      }}
                    >
                      Create
                    </button>
                    <button
                      onClick={() => setShowNewFolderForm(false)}
                      style={{
                        flex: 1,
                        padding: '0.5rem',
                        background: '#111827',
                        border: '1px solid #1f2937',
                        borderRadius: '8px',
                        color: '#cbd5e1',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        fontWeight: 600
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {folders.length === 0 ? (
                <div style={{ color: '#64748b', textAlign: 'center', padding: '2rem 1rem' }}>
                  No folders yet. Create one to save responses!
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {folders.map(folder => (
                    <div
                      key={folder.id}
                      style={{
                        padding: '1rem',
                        background: '#0f172a',
                        border: '1px solid #1f2937',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#334155';
                        e.currentTarget.style.background = '#111827';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = '#1f2937';
                        e.currentTarget.style.background = '#0f172a';
                      }}
                    >
                      {renamingFolderId === folder.id ? (
                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                          <input
                            type="text"
                            value={renamingText}
                            onChange={(e) => setRenamingText(e.target.value)}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') handleRenameFolder(folder.id);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              flex: 1,
                              padding: '0.5rem',
                              background: '#0f172a',
                              border: '1px solid rgba(79, 70, 229, 0.4)',
                              borderRadius: '6px',
                              color: '#e2e8f0',
                              fontSize: '0.9rem',
                              boxSizing: 'border-box'
                            }}
                            autoFocus
                          />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRenameFolder(folder.id);
                            }}
                            style={{
                              padding: '0.5rem 0.75rem',
                              fontSize: '0.8rem',
                              background: 'rgba(16, 185, 129, 0.3)',
                              border: '1px solid rgba(16, 185, 129, 0.5)',
                              borderRadius: '6px',
                              color: '#a7f3d0',
                              cursor: 'pointer'
                            }}
                          >
                            ✓
                          </button>
                        </div>
                      ) : (
                        <div
                          onClick={() => handleSelectFolder(folder)}
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}
                        >
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '1rem', color: '#e2e8f0', fontWeight: 600, marginBottom: '0.25rem' }}>
                              {folder.name}
                            </div>
                            <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                              {(folder.responseCount ?? 0)} response{(folder.responseCount ?? 0) === 1 ? '' : 's'}
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setRenamingFolderId(folder.id);
                                setRenamingText(folder.name);
                              }}
                              style={{
                                padding: '0.4rem',
                                background: 'transparent',
                                border: 'none',
                                color: '#94a3b8',
                                cursor: 'pointer'
                              }}
                              title="Rename"
                            >
                              <EditIcon size={16} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteFolder(folder.id);
                              }}
                              style={{
                                padding: '0.4rem',
                                background: 'transparent',
                                border: 'none',
                                color: '#94a3b8',
                                cursor: 'pointer'
                              }}
                              title="Delete"
                            >
                              <TrashIcon size={16} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Content - responses view */}
          {viewMode === 'responses' && selectedFolder && (
            <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem', display: 'flex', flexDirection: 'column' }}>
              <div style={{ marginBottom: '0.75rem', color: '#94a3b8', fontSize: '0.9rem' }}>
                {responses.length} response{responses.length === 1 ? '' : 's'}
              </div>
              {responses.length === 0 ? (
                <div style={{ color: '#64748b', textAlign: 'center', padding: '2rem 1rem' }}>
                  No saved responses in this folder yet.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                  {responses.map(response => {
                    const isExpanded = expandedResponses[response.id];
                    const preview = getPreviewText(response.response);

                    return (
                      <div
                        key={response.id}
                        style={{
                          padding: '1rem',
                          background: '#0f172a',
                          border: '1px solid #1f2937',
                          borderRadius: '10px',
                          boxShadow: '0 8px 20px rgba(0,0,0,0.25)'
                        }}
                      >
                        <div style={{ marginBottom: '0.5rem', color: '#a7f3d0', fontWeight: 700, fontSize: '0.95rem' }}>
                          Q: {response.prompt}
                        </div>
                        <div style={{ fontSize: '0.9rem', color: '#cbd5e1', lineHeight: 1.55, whiteSpace: 'pre-wrap', marginBottom: '0.5rem' }}>
                          A: {isExpanded ? response.response : preview}
                          {!isExpanded && response.response.length > preview.length ? ' …' : ''}
                        </div>
                        {response.response.length > preview.length && (
                          <button
                            onClick={() => toggleExpand(response.id)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#cbd5e1',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.4rem',
                              fontWeight: 600,
                              fontSize: '0.85rem',
                              marginBottom: '0.5rem'
                            }}
                            aria-label={isExpanded ? 'Collapse response' : 'Expand response'}
                          >
                            <span style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.15s ease' }}>
                              ▾
                            </span>
                            {isExpanded ? 'Show less' : 'Show full response'}
                          </button>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                          <select
                            value={moveTargets[response.id] || ''}
                            onChange={(e) => setMoveTargets(prev => ({ ...prev, [response.id]: e.target.value }))}
                            style={{
                              flex: 1,
                              background: '#0f172a',
                              border: '1px solid #1f2937',
                              color: '#e2e8f0',
                              borderRadius: '8px',
                              padding: '0.5rem',
                              fontSize: '0.8rem',
                              fontWeight: 500,
                              outline: 'none',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              boxSizing: 'border-box'
                            }}
                            onFocus={(e) => {
                              e.currentTarget.style.borderColor = '#4f46e5';
                              e.currentTarget.style.boxShadow = '0 10px 30px rgba(79,70,229,0.15)';
                            }}
                            onBlur={(e) => {
                              e.currentTarget.style.borderColor = '#1f2937';
                              e.currentTarget.style.boxShadow = 'none';
                            }}
                          >
                            <option value="">Move to folder…</option>
                            {folders
                              .filter(f => f.id !== selectedFolder?.id)
                              .map(f => (
                                <option key={f.id} value={f.id}>
                                  {f.name} ({f.responseCount ?? 0})
                                </option>
                              ))}
                          </select>
                          <button
                            onClick={() => handleMoveResponse(response.id, moveTargets[response.id])}
                            disabled={!moveTargets[response.id] || loading}
                            style={{
                              padding: '0.5rem 0.7rem',
                              background: '#0f766e',
                              border: '1px solid #0d9488',
                              borderRadius: '8px',
                              color: '#ecfeff',
                              cursor: moveTargets[response.id] ? 'pointer' : 'not-allowed',
                              fontSize: '0.8rem',
                              fontWeight: 700,
                              opacity: moveTargets[response.id] ? 1 : 0.5,
                              transition: 'all 0.2s ease',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            Move
                          </button>
                        </div>
                        <div style={{ paddingTop: '0.75rem', borderTop: '1px solid #1f2937', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                            {new Date(response.savedAt).toLocaleDateString()}
                          </div>
                          <button
                            onClick={() => handleDeleteResponse(response.id)}
                            style={{
                              padding: '0.4rem 0.7rem',
                              background: '#7f1d1d',
                              border: '1px solid #b91c1c',
                              borderRadius: '8px',
                              color: '#fecdd3',
                              cursor: 'pointer',
                              fontSize: '0.75rem',
                              fontWeight: 600
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>,
      document.body
    );
  }

  // Desktop: Two-column layout (original design)
  return createPortal(
    <div
      className="modal-overlay"
      style={{ zIndex: 100001, background: 'rgba(8, 11, 18, 0.92)', backdropFilter: 'blur(2px)' }}
    >
      <div
        className="modal-content"
        style={{
          zIndex: 100002,
          maxWidth: '980px',
          maxHeight: '92vh',
          background: '#0b1220',
          border: '1px solid #1f2937',
          boxShadow: '0 25px 70px rgba(0,0,0,0.55)',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '14px'
        }}
      >
        <div className="modal-header-bar" style={{ borderBottom: '1px solid #1f2937', padding: '1rem 1.25rem' }}>
          <h2 style={{ color: '#e2e8f0', fontSize: '1.15rem', fontWeight: 700 }}>Saved Responses</h2>
          <button
            type="button"
            className="close-button"
            onClick={onClose}
            aria-label="Close"
            style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: '8px', color: '#cbd5e1' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div style={{ display: 'flex', height: '100%', minHeight: '460px' }}>
          {/* Folders sidebar */}
          <div style={{
            width: '230px',
            borderRight: '1px solid #1f2937',
            overflowY: 'auto',
            padding: '1.25rem',
            background: '#0f172a',
            scrollbarColor: '#4f46e5 #0b1220'
          }}>
            <div style={{ marginBottom: '1rem' }}>
              <button
                onClick={() => setShowNewFolderForm(!showNewFolderForm)}
                style={{
                  width: '100%',
                  padding: '0.8rem',
                  background: '#111827',
                  border: '1px solid #1f2937',
                  borderRadius: '10px',
                  color: '#e2e8f0',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  boxShadow: '0 8px 20px rgba(0,0,0,0.35)'
                }}
              >
                + New Folder
              </button>
            </div>

            {showNewFolderForm && (
              <div style={{ marginBottom: '1rem', padding: '0.75rem', background: '#0b1220', border: '1px solid #1f2937', borderRadius: '10px' }}>
                <input
                  type="text"
                  placeholder="Folder name..."
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') handleCreateFolder();
                  }}
                  style={{
                    width: '100%',
                    padding: '0.6rem',
                    marginBottom: '0.5rem',
                    background: '#0f172a',
                    border: '1px solid #1f2937',
                    borderRadius: '8px',
                    color: '#e2e8f0',
                    fontSize: '0.875rem',
                    boxSizing: 'border-box'
                  }}
                  autoFocus
                />
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={handleCreateFolder}
                    disabled={loading}
                    style={{
                      flex: 1,
                      padding: '0.5rem',
                      background: '#0f766e',
                      border: '1px solid #0d9488',
                      borderRadius: '8px',
                      color: '#ecfeff',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      fontWeight: 600
                    }}
                  >
                    Create
                  </button>
                  <button
                    onClick={() => setShowNewFolderForm(false)}
                    style={{
                      flex: 1,
                      padding: '0.5rem',
                      background: '#111827',
                      border: '1px solid #1f2937',
                      borderRadius: '8px',
                      color: '#cbd5e1',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      fontWeight: 600
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {folders.map(folder => (
                <div
                  key={folder.id}
                  style={{
                    padding: '0.85rem',
                    background: selectedFolder?.id === folder.id ? '#111827' : '#0b1220',
                    border: `1px solid ${selectedFolder?.id === folder.id ? '#4f46e5' : '#1f2937'}`,
                    borderRadius: '10px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: selectedFolder?.id === folder.id ? '0 10px 30px rgba(79,70,229,0.25)' : 'none'
                  }}
                  onMouseEnter={(e) => {
                    if (selectedFolder?.id !== folder.id) {
                      e.currentTarget.style.borderColor = '#334155';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedFolder?.id !== folder.id) {
                      e.currentTarget.style.borderColor = '#1f2937';
                    }
                  }}
                >
                  {renamingFolderId === folder.id ? (
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      <input
                        type="text"
                        value={renamingText}
                        onChange={(e) => setRenamingText(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') handleRenameFolder(folder.id);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          flex: 1,
                          padding: '0.25rem',
                          background: 'rgba(255, 255, 255, 0.1)',
                          border: '1px solid rgba(99, 102, 241, 0.4)',
                          borderRadius: '4px',
                          color: '#e2e8f0',
                          fontSize: '0.75rem'
                        }}
                        autoFocus
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRenameFolder(folder.id);
                        }}
                        style={{
                          padding: '0.25rem 0.5rem',
                          fontSize: '0.6rem',
                          background: 'rgba(16, 185, 129, 0.3)',
                          border: '1px solid rgba(16, 185, 129, 0.5)',
                          borderRadius: '4px',
                          color: '#a7f3d0',
                          cursor: 'pointer'
                        }}
                      >
                        ✓
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => handleSelectFolder(folder)}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.95rem', color: '#e2e8f0', wordBreak: 'break-word', fontWeight: 600 }}>
                          {folder.name}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                          {(folder.responseCount ?? 0)} response{(folder.responseCount ?? 0) === 1 ? '' : 's'}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0 }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setRenamingFolderId(folder.id);
                            setRenamingText(folder.name);
                          }}
                          style={{
                            padding: '0.25rem',
                            background: 'transparent',
                            border: 'none',
                            color: '#94a3b8',
                            cursor: 'pointer'
                          }}
                          title="Rename"
                        >
                          <EditIcon size={14} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteFolder(folder.id);
                          }}
                          style={{
                            padding: '0.25rem',
                            background: 'transparent',
                            border: 'none',
                            color: '#94a3b8',
                            cursor: 'pointer'
                          }}
                          title="Delete"
                        >
                          <TrashIcon size={14} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Responses content */}
          <div style={{ flex: 1, overflow: 'hidden', padding: '1.5rem 1.25rem' }}>
            {selectedFolder ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1rem' }}>
                  <h3 style={{ color: '#e2e8f0', fontSize: '1.05rem', fontWeight: 700 }}>{selectedFolder.name}</h3>
                  <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                    {responses.length} response{responses.length === 1 ? '' : 's'}
                  </div>
                </div>
                {responses.length === 0 ? (
                  <div style={{ color: '#64748b', textAlign: 'center', padding: '2rem' }}>
                    No saved responses in this folder yet.
                  </div>
                ) : (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '1rem',
                      maxHeight: 'calc(92vh - 200px)',
                      overflowY: 'auto',
                      paddingRight: '0.35rem',
                      scrollbarColor: '#4f46e5 #0b1220'
                    }}
                  >
                    {responses.map(response => {
                      const isExpanded = expandedResponses[response.id];
                      const preview = getPreviewText(response.response);

                      return (
                        <div
                          key={response.id}
                          style={{
                            padding: '1rem 1rem 0.75rem',
                            background: '#0f172a',
                            border: '1px solid #1f2937',
                            borderRadius: '12px',
                            boxShadow: '0 10px 25px rgba(0,0,0,0.35)'
                          }}
                        >
                          <div style={{ marginBottom: '0.35rem', color: '#a7f3d0', fontWeight: 700, fontSize: '0.95rem' }}>
                            Q: {response.prompt}
                          </div>
                          <div style={{ fontSize: '0.9rem', color: '#cbd5e1', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>
                            A: {isExpanded ? response.response : preview}
                            {!isExpanded && response.response.length > preview.length ? ' …' : ''}
                          </div>
                          {response.response.length > preview.length && (
                            <button
                              onClick={() => toggleExpand(response.id)}
                              style={{
                                marginTop: '0.5rem',
                                background: 'transparent',
                                border: 'none',
                                color: '#cbd5e1',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.4rem',
                                fontWeight: 600,
                                fontSize: '0.85rem'
                              }}
                              aria-label={isExpanded ? 'Collapse response' : 'Expand response'}
                            >
                              <span style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.15s ease' }}>
                                ▾
                              </span>
                              {isExpanded ? 'Show less' : 'Show full response'}
                            </button>
                          )}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.75rem' }}>
                            <select
                              value={moveTargets[response.id] || ''}
                              onChange={(e) => setMoveTargets(prev => ({ ...prev, [response.id]: e.target.value }))}
                              style={{
                                flex: 1,
                                background: '#0f172a',
                                border: '1px solid #1f2937',
                                color: '#e2e8f0',
                                borderRadius: '10px',
                                padding: '0.6rem 0.7rem',
                                fontSize: '0.9rem',
                                fontWeight: 500,
                                outline: 'none',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                              }}
                              onFocus={(e) => {
                                e.currentTarget.style.borderColor = '#4f46e5';
                                e.currentTarget.style.boxShadow = '0 10px 30px rgba(79,70,229,0.15)';
                              }}
                              onBlur={(e) => {
                                e.currentTarget.style.borderColor = '#1f2937';
                                e.currentTarget.style.boxShadow = 'none';
                              }}
                            >
                              <option value="">Move to folder…</option>
                              {folders
                                .filter(f => f.id !== selectedFolder?.id)
                                .map(f => (
                                  <option key={f.id} value={f.id}>
                                    {f.name} ({f.responseCount ?? 0})
                                  </option>
                                ))}
                            </select>
                            <button
                              onClick={() => handleMoveResponse(response.id, moveTargets[response.id])}
                              disabled={!moveTargets[response.id] || loading}
                              style={{
                                padding: '0.5rem 0.8rem',
                                background: '#0f766e',
                                border: '1px solid #0d9488',
                                borderRadius: '10px',
                                color: '#ecfeff',
                                cursor: moveTargets[response.id] ? 'pointer' : 'not-allowed',
                                fontSize: '0.9rem',
                                fontWeight: 700,
                                opacity: moveTargets[response.id] ? 1 : 0.5,
                                transition: 'all 0.2s ease'
                              }}
                            >
                              Move
                            </button>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid #1f2937' }}>
                            <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                              {new Date(response.savedAt).toLocaleDateString()}
                            </div>
                            <button
                              onClick={() => handleDeleteResponse(response.id)}
                              style={{
                                padding: '0.35rem 0.7rem',
                                background: '#7f1d1d',
                                border: '1px solid #b91c1c',
                                borderRadius: '8px',
                                color: '#fecdd3',
                                cursor: 'pointer',
                                fontSize: '0.78rem',
                                fontWeight: 600
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            ) : (
              <div style={{ color: '#64748b', textAlign: 'center', padding: '2rem' }}>
                No folders yet. Create one to save responses!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default SavedResponsesModal;

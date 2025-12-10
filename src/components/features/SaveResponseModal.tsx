import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { SavedFolder } from '../../types/savedResponse';
import { savedResponsesService } from '../services/savedResponsesService';

interface SaveResponseModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  prompt: string;
  response: string;
}

// Parse text with **bold** formatting
const parseFormattedText = (text: string): React.ReactNode[] => {
  const parts: React.ReactNode[] = [];
  let currentIndex = 0;
  let key = 0;
  const boldRegex = /\*\*([^*]+)\*\*/g;
  let match;

  while ((match = boldRegex.exec(text)) !== null) {
    if (match.index > currentIndex) {
      parts.push(text.substring(currentIndex, match.index));
    }
    parts.push(
      <strong key={key++} style={{ fontWeight: 700, color: '#e2e8f0' }}>
        {match[1]}
      </strong>
    );
    currentIndex = match.index + match[0].length;
  }

  if (currentIndex < text.length) {
    parts.push(text.substring(currentIndex));
  }

  return parts.length > 0 ? parts : [text];
};

const SaveResponseModal: React.FC<SaveResponseModalProps> = ({
  isOpen,
  onClose,
  userId,
  prompt,
  response
}) => {
  const [folders, setFolders] = useState<SavedFolder[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && userId) {
      loadFolders();
    }
  }, [isOpen, userId]);

  const loadFolders = async () => {
    try {
      setLoading(true);
      const foldersList = await savedResponsesService.getFolders(userId);
      setFolders(foldersList);
      if (foldersList.length > 0) {
        setSelectedFolderId(foldersList[0].id);
      }
    } catch (err) {
      console.error('Failed to load folders:', err);
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
      setSelectedFolderId(newFolder.id);
      setNewFolderName('');
      setShowNewFolder(false);
    } catch (err) {
      console.error('Failed to create folder:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveResponse = async () => {
    if (!selectedFolderId) {
      alert('Please select or create a folder');
      return;
    }

    try {
      setLoading(true);
      await savedResponsesService.saveResponse(userId, selectedFolderId, prompt, response);
      onClose();
    } catch (err) {
      console.error('Failed to save response:', err);
      alert('Failed to save response');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      className="modal-overlay"
      style={{ zIndex: 100001, background: 'rgba(8, 11, 18, 0.92)', backdropFilter: 'blur(2px)' }}
    >
      <div
        className="modal-content"
        style={{
          zIndex: 100002,
          maxWidth: '540px',
          background: '#0b1220',
          border: '1px solid #1f2937',
          boxShadow: '0 25px 70px rgba(0,0,0,0.55)',
          borderRadius: '14px'
        }}
      >
        <div className="modal-header-bar" style={{ borderBottom: '1px solid #1f2937', padding: '1rem 1.25rem' }}>
          <h2 style={{ color: '#e2e8f0', fontSize: '1.1rem', fontWeight: 700 }}>Save Response</h2>
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

        <div
          className="modal-body-scroll"
          style={{
            maxHeight: '70vh',
            padding: '1.25rem 1.25rem 1rem',
            scrollbarColor: '#4f46e5 #0b1220',
            scrollbarWidth: 'thin'
          }}
        >
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#a7f3d0', fontWeight: 600 }}>
              Select Folder:
            </label>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                maxHeight: '220px',
                overflowY: 'auto',
                paddingRight: '0.25rem',
                scrollbarColor: '#4f46e5 #0b1220',
                scrollbarWidth: 'thin'
              }}
            >
              {folders.map(folder => (
                <label
                  key={folder.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0.75rem',
                    background: selectedFolderId === folder.id ? '#111827' : '#0f172a',
                    border: `1px solid ${selectedFolderId === folder.id ? '#4f46e5' : '#1f2937'}`,
                    borderRadius: '10px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: selectedFolderId === folder.id ? '0 10px 30px rgba(79,70,229,0.25)' : 'none'
                  }}
                  onMouseEnter={(e) => {
                    if (selectedFolderId !== folder.id) {
                      e.currentTarget.style.borderColor = '#334155';
                      e.currentTarget.style.background = '#0f172a';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedFolderId !== folder.id) {
                      e.currentTarget.style.borderColor = '#1f2937';
                      e.currentTarget.style.background = '#0f172a';
                    }
                  }}
                >
                  <input
                    type="radio"
                    name="folder"
                    value={folder.id}
                    checked={selectedFolderId === folder.id}
                    onChange={(e) => setSelectedFolderId(e.target.value)}
                    style={{ marginRight: '0.75rem' }}
                  />
                  <div>
                    <div style={{ color: '#e2e8f0', fontSize: '0.95rem', fontWeight: 700 }}>
                      {folder.name}
                    </div>
                    <div style={{ color: '#94a3b8', fontSize: '0.78rem' }}>
                      {(folder.responseCount ?? 0)} response{(folder.responseCount ?? 0) === 1 ? '' : 's'}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {showNewFolder && (
            <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#0f172a', border: '1px solid #1f2937', borderRadius: '12px' }}>
              <input
                type="text"
                placeholder="New folder name..."
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') handleCreateFolder();
                }}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  marginBottom: '0.75rem',
                  background: '#0b1220',
                  border: '1px solid #1f2937',
                  borderRadius: '10px',
                  color: '#e2e8f0',
                  fontSize: '0.9rem',
                  outline: 'none'
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#4f46e5'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = '#1f2937'; }}
                autoFocus
              />
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={handleCreateFolder}
                  disabled={loading || !newFolderName.trim()}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    background: '#0f766e',
                    border: '1px solid #0d9488',
                    borderRadius: '10px',
                    color: '#ecfeff',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: 600
                  }}
                >
                  Create
                </button>
                <button
                  onClick={() => setShowNewFolder(false)}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    background: '#111827',
                    border: '1px solid #1f2937',
                    borderRadius: '10px',
                    color: '#cbd5e1',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: 600
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {!showNewFolder && (
            <button
              onClick={() => setShowNewFolder(true)}
              style={{
                width: '100%',
                padding: '0.85rem',
                background: '#111827',
                border: '1px solid #1f2937',
                borderRadius: '10px',
                color: '#c4b5fd',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: 600,
                marginBottom: '1.5rem',
                boxShadow: '0 8px 20px rgba(0,0,0,0.35)'
              }}
            >
              + New Folder
            </button>
          )}

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#a7f3d0', fontWeight: 600 }}>
              Question:
            </label>
            <div style={{
              padding: '0.75rem',
              background: '#0f172a',
              border: '1px solid #1f2937',
              borderRadius: '10px',
              color: '#cbd5e1',
              fontSize: '0.875rem',
              lineHeight: 1.5,
              wordBreak: 'break-word',
              whiteSpace: 'pre-wrap'
            }}>
              {prompt}
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#a7f3d0', fontWeight: 600 }}>
              Response:
            </label>
            <div style={{
              padding: '0.75rem',
              background: '#0f172a',
              border: '1px solid #1f2937',
              borderRadius: '10px',
              color: '#cbd5e1',
              fontSize: '0.875rem',
              lineHeight: 1.5,
              maxHeight: '200px',
              overflowY: 'auto',
              wordBreak: 'break-word',
              whiteSpace: 'pre-wrap'
            }}>
              {parseFormattedText(response)}
            </div>
          </div>
        </div>

        <div className="modal-footer-bar">
          <button
            onClick={onClose}
            className="cancel-button"
            disabled={loading}
            style={{
              padding: '0.75rem 1.5rem',
              background: '#111827',
              border: '1px solid #1f2937',
              borderRadius: '10px',
              color: '#cbd5e1',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: 600
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSaveResponse}
            disabled={loading || !selectedFolderId}
            className="response-button"
            style={{
              padding: '0.75rem 1.5rem',
              background: '#0f766e',
              border: '1px solid #0d9488',
              borderRadius: '10px',
              color: '#ecfeff',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: 600,
              opacity: loading || !selectedFolderId ? 0.6 : 1
            }}
          >
            {loading ? 'Saving...' : 'Save Response'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default SaveResponseModal;

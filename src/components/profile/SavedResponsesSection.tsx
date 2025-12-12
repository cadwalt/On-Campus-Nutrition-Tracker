import React, { useState } from 'react';
import SavedResponsesModal from '../features/SavedResponsesModal';

interface SavedResponsesSectionProps {
  userId: string;
}

const SavedResponsesSection: React.FC<SavedResponsesSectionProps> = ({ userId }) => {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <div style={{
        background: 'rgba(26, 26, 46, 0.8)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '12px',
        padding: '1.5rem',
        marginTop: '2rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div>
            <h3 style={{ color: '#e2e8f0', marginBottom: '0.25rem' }}>📚 Saved Nova Responses</h3>
            <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
              View and manage your saved questions and responses from Nova
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowModal(true)}
          style={{
            padding: '0.75rem 1.5rem',
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.3) 0%, rgba(168, 85, 247, 0.2) 100%)',
            border: '1px solid rgba(99, 102, 241, 0.5)',
            borderRadius: '8px',
            color: '#c4b5fd',
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontWeight: 600,
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'linear-gradient(135deg, rgba(99, 102, 241, 0.4) 0%, rgba(168, 85, 247, 0.3) 100%)';
            e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.7)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'linear-gradient(135deg, rgba(99, 102, 241, 0.3) 0%, rgba(168, 85, 247, 0.2) 100%)';
            e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.5)';
          }}
        >
          📖 View Saved Responses
        </button>
      </div>

      <SavedResponsesModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        userId={userId}
      />
    </>
  );
};

export default SavedResponsesSection;

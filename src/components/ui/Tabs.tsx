import React from 'react';

interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, onTabChange }) => {
  return (
    <div style={{
      display: 'flex',
      gap: '0.5rem',
      borderBottom: '2px solid rgba(255, 255, 255, 0.1)',
      marginBottom: '1.5rem',
      paddingBottom: '0.5rem',
      overflowX: 'auto',
      WebkitOverflowScrolling: 'touch',
      scrollbarWidth: 'none',
      msOverflowStyle: 'none'
    }}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          style={{
            padding: '0.75rem 1.5rem',
            background: activeTab === tab.id 
              ? 'rgba(99, 102, 241, 0.2)' 
              : 'transparent',
            border: 'none',
            borderBottom: activeTab === tab.id 
              ? '2px solid rgba(99, 102, 241, 0.8)' 
              : '2px solid transparent',
            color: activeTab === tab.id ? '#fff' : 'var(--muted, #9aa7bf)',
            fontSize: '0.9375rem',
            fontWeight: activeTab === tab.id ? 600 : 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'all 0.2s',
            marginBottom: '-0.5rem',
            borderRadius: '6px 6px 0 0',
            flexShrink: 0,
            whiteSpace: 'nowrap'
          }}
          onMouseEnter={(e) => {
            if (activeTab !== tab.id) {
              e.currentTarget.style.color = '#fff';
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
            }
          }}
          onMouseLeave={(e) => {
            if (activeTab !== tab.id) {
              e.currentTarget.style.color = 'var(--muted, #9aa7bf)';
              e.currentTarget.style.background = 'transparent';
            }
          }}
        >
          {tab.icon && <span style={{ display: 'flex', alignItems: 'center' }}>{tab.icon}</span>}
          {tab.label}
        </button>
      ))}
    </div>
  );
};

export default Tabs;


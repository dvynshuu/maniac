import React, { useState } from 'react';
import { X, Moon, Monitor, Key, HardDrive, BellRing } from 'lucide-react';
import './Settings.css';
import AppearanceTab from './tabs/AppearanceTab';
import SystemTab from './tabs/SystemTab';
import SecurityTab from './tabs/SecurityTab';
import DataTab from './tabs/DataTab';
import NotificationsTab from './tabs/NotificationsTab';

const tabs = [
  { id: 'Appearance', icon: Moon },
  { id: 'System', icon: Monitor },
  { id: 'Security', icon: Key },
  { id: 'Data', icon: HardDrive },
  { id: 'Notifications', icon: BellRing }
];

const tabComponents = {
  Appearance: AppearanceTab,
  System: SystemTab,
  Security: SecurityTab,
  Data: DataTab,
  Notifications: NotificationsTab,
};

export function SettingsModal({ onClose, initialTab = 'Appearance' }) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const ActiveComponent = tabComponents[activeTab];

  return (
    <div className="dashboard-modal-overlay" onClick={onClose}>
      <div className="dashboard-modal settings-modal" onClick={e => e.stopPropagation()}>
        <div className="settings-header">
          <h2>Settings</h2>
          <button onClick={onClose} className="settings-close-btn"><X size={20} /></button>
        </div>
        
        <div className="settings-body">
          <div className="settings-sidebar">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`settings-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
              >
                <tab.icon size={16} /> {tab.id}
              </button>
            ))}
          </div>
          
          <div className="settings-content">
            <h3 className="settings-content-title">{activeTab}</h3>
            <ActiveComponent onClose={onClose} />
          </div>
        </div>
      </div>
    </div>
  );
}

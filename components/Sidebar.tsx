
import React from 'react';
import type { View } from '../types';
import Icon from './common/Icon';
import { use_app_context } from '../hooks/useAppContext';

interface SidebarProps {
  current_view: View;
  set_view: (view: View) => void;
}

interface NavItemProps {
  icon: React.ReactElement;
  label: string;
  is_active: boolean;
  onClick: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ icon, label, is_active, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`flex items-center w-full px-4 py-3 text-sm font-medium rounded-lg transition-colors duration-200 ${
        is_active
          ? 'bg-blue-600 text-white'
          : 'text-slate-400 hover:bg-slate-700 hover:text-white'
      }`}
    >
      {React.cloneElement(icon as React.ReactElement<{ className?: string }>, { className: 'w-5 h-5 mr-3' })}
      <span>{label}</span>
    </button>
  );
};

const Sidebar: React.FC<SidebarProps> = ({ current_view, set_view }) => {
  const { state: { current_user } } = use_app_context();

  return (
    <aside className="w-64 flex-shrink-0 bg-slate-800 border-r border-slate-700 flex flex-col">
      <div className="h-16 flex items-center px-6 border-b border-slate-700">
        <h1 className="text-xl font-bold text-blue-500">CaseFlow</h1>
      </div>
      <nav className="flex-1 p-4 space-y-2">
        <NavItem
          icon={<Icon name="dashboard" />}
          label="Dashboard"
          is_active={current_view === 'dashboard'}
          onClick={() => set_view('dashboard')}
        />
        <NavItem
          icon={<Icon name="clients" />}
          label="Clients"
          is_active={current_view === 'clients' || current_view === 'client-profile'}
          onClick={() => set_view('clients')}
        />
        <NavItem
          icon={<Icon name="tasks" />}
          label="Tasks"
          is_active={current_view === 'tasks'}
          onClick={() => set_view('tasks')}
        />
        <NavItem
          icon={<Icon name="dollar-sign" />}
          label="Payments"
          is_active={current_view === 'payments'}
          onClick={() => set_view('payments')}
        />
      </nav>
      {current_user && (
          <div className="p-4 border-t border-slate-700">
            <div
              className="flex items-center w-full px-4 py-3 text-sm font-medium rounded-lg text-slate-400 hover:bg-slate-700 hover:text-white cursor-pointer"
              onClick={() => set_view('settings')}
            >
              <img src={current_user.avatar_url} alt={current_user.name} className="w-8 h-8 rounded-full mr-3" />
              <div className="flex-1">
                <p className="font-semibold text-slate-100">{current_user.name}</p>
                <p className="text-xs">Case Manager</p>
              </div>
              <Icon name="settings" className="w-5 h-5" />
            </div>
          </div>
      )}
    </aside>
  );
};

export default Sidebar;
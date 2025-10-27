import React from 'react';
import GlobalSearch from './GlobalSearch';
import Notifications from './Notifications';
import type { View } from '../types';

interface HeaderProps {
    title: string;
    navigate_to_client: (client_id: string) => void;
    set_view: (view: View) => void;
}

const Header: React.FC<HeaderProps> = ({ title, navigate_to_client, set_view }) => {
  return (
    <header className="h-16 bg-slate-800 border-b border-slate-700 flex-shrink-0 flex items-center justify-between px-6">
      <h1 className="text-xl font-semibold text-slate-100">{title}</h1>
      <div className="flex items-center space-x-4">
        <GlobalSearch navigate_to_client={navigate_to_client} set_view={set_view} />
        <Notifications navigate_to_client={navigate_to_client} />
      </div>
    </header>
  );
};

export default Header;
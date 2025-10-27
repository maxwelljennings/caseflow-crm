import React from 'react';
import type { User } from '../../types';
import Icon from './Icon';

interface UserPopoverProps {
  user: User;
  position: { top: number; left: number };
  on_close: () => void;
}

const UserPopover: React.FC<UserPopoverProps> = ({ user, position, on_close }) => {
  return (
    <div
      className="fixed bg-slate-700 border border-slate-600 rounded-lg shadow-xl z-50 w-64 p-4"
      style={{ top: position.top, left: position.left }}
    >
      <div className="flex items-start">
        <img src={user.avatar_url} alt={user.name} className="w-12 h-12 rounded-full mr-4" />
        <div className="flex-1">
          <p className="font-bold text-slate-100">{user.name}</p>
          <p className="text-sm text-blue-400">@{user.username}</p>
          <p className="text-xs text-slate-400 mt-1">{user.description || 'Case Manager'}</p>
        </div>
        <button onClick={on_close} className="text-slate-500 hover:text-slate-200">
            <Icon name="x" className="w-4 h-4" />
        </button>
      </div>
      {user.phone && (
        <div className="mt-3 pt-3 border-t border-slate-600 flex items-center text-sm">
            <Icon name="phone" className="w-4 h-4 mr-2 text-slate-400" />
            <span className="text-slate-200">{user.phone}</span>
        </div>
      )}
    </div>
  );
};

export default UserPopover;

import React from 'react';
import type { User } from '../../types';

interface MentionSuggestionsProps {
  users: User[];
  on_select: (username: string) => void;
  position: { top: number; left: number };
}

const MentionSuggestions: React.FC<MentionSuggestionsProps> = ({ users, on_select, position }) => {
  if (users.length === 0) {
    return null;
  }

  return (
    <div
      className="fixed bg-slate-700 border border-slate-600 rounded-md shadow-lg z-50 max-h-48 overflow-y-auto"
      style={{ top: position.top, left: position.left }}
    >
      <ul>
        {users.map(user => (
          <li
            key={user.id}
            onClick={() => on_select(user.username)}
            className="flex items-center px-3 py-2 cursor-pointer hover:bg-slate-600"
          >
            <img src={user.avatar_url} alt={user.name} className="w-6 h-6 rounded-full mr-2" />
            <span className="text-sm font-medium text-slate-100">{user.name}</span>
            <span className="text-sm text-slate-400 ml-2">@{user.username}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default MentionSuggestions;
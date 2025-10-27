import React from 'react';
import type { User } from '../../types';

interface MentionRendererProps {
  content: string;
  users: User[];
  on_mention_click: (user: User, event: React.MouseEvent) => void;
}

const MentionRenderer: React.FC<MentionRendererProps> = ({ content, users, on_mention_click }) => {
  // Regex to find @usernames that may contain letters, numbers, underscores, and dots
  const parts = content.split(/(@[a-z0-9_.]+)/gi);

  return (
    <p className="text-slate-300 whitespace-pre-wrap mt-1">
      {parts.map((part, index) => {
        if (part.startsWith('@')) {
          const username = part.substring(1);
          const user = users.find(u => u.username?.toLowerCase() === username.toLowerCase());
          if (user) {
            return (
              <button 
                key={index} 
                onClick={(e) => on_mention_click(user, e)}
                className="text-blue-400 font-semibold bg-blue-900/50 px-1 rounded-sm hover:bg-blue-900/80 transition-colors"
              >
                @{user.username}
              </button>
            );
          }
        }
        return <React.Fragment key={index}>{part}</React.Fragment>;
      })}
    </p>
  );
};

export default MentionRenderer;
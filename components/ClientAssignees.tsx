import React, { useState, useRef, useEffect, useMemo } from 'react';
import { use_app_context } from '../hooks/useAppContext';
import type { Client } from '../types';
import Icon from './common/Icon';

interface ClientAssigneesProps {
    client: Client;
}

const ClientAssignees: React.FC<ClientAssigneesProps> = ({ client }) => {
    const { state: { users }, update_client } = use_app_context();
    const [is_adding, set_is_adding] = useState(false);
    const add_user_ref = useRef<HTMLDivElement>(null);

    const assignees = useMemo(() => {
        return users.filter(user => client.assignee_ids.includes(user.id));
    }, [client.assignee_ids, users]);

    const available_users_to_add = useMemo(() => {
        return users.filter(user => !client.assignee_ids.includes(user.id));
    }, [client.assignee_ids, users]);

    useEffect(() => {
        const handle_click_outside = (event: MouseEvent) => {
            if (add_user_ref.current && !add_user_ref.current.contains(event.target as Node)) {
                set_is_adding(false);
            }
        };
        document.addEventListener('mousedown', handle_click_outside);
        return () => document.removeEventListener('mousedown', handle_click_outside);
    }, []);

    const handle_add_assignee = async (user_id: string) => {
        if (!client.assignee_ids.includes(user_id)) {
            const new_assignee_ids = [...client.assignee_ids, user_id];
            await update_client({ ...client, assignee_ids: new_assignee_ids });
        }
        set_is_adding(false);
    };

    const handle_remove_assignee = async (user_id_to_remove: string) => {
        if (client.assignee_ids.length <= 1) {
            alert("A client must have at least one assignee.");
            return;
        }
        const new_assignee_ids = client.assignee_ids.filter(id => id !== user_id_to_remove);
        await update_client({ ...client, assignee_ids: new_assignee_ids });
    };

    return (
        <div>
            <label className="block text-xs font-medium text-slate-400">Assignees</label>
            <div className="flex items-center flex-wrap gap-2 mt-2">
                {assignees.map(user => (
                    <div key={user.id} className="group relative flex items-center bg-slate-700 rounded-full pr-2">
                        <img
                            src={user.avatar_url}
                            alt={user.name}
                            className="w-8 h-8 rounded-full"
                            title={user.name}
                        />
                        <span className="ml-2 text-sm font-medium text-slate-200">{user.name}</span>
                        <button
                            onClick={() => handle_remove_assignee(user.id)}
                            className="absolute inset-0 bg-red-600 bg-opacity-0 group-hover:bg-opacity-80 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            aria-label={`Remove ${user.name}`}
                        >
                            <Icon name="user-minus" className="w-5 h-5 text-white" />
                        </button>
                    </div>
                ))}
                <div className="relative" ref={add_user_ref}>
                    <button
                        onClick={() => set_is_adding(prev => !prev)}
                        className="w-8 h-8 bg-slate-700 hover:bg-blue-600 text-slate-300 hover:text-white rounded-full flex items-center justify-center transition-colors"
                        aria-label="Add assignee"
                    >
                        <Icon name="plus" className="w-5 h-5" />
                    </button>
                    {is_adding && (
                        <div className="absolute top-full left-0 mt-2 w-64 bg-slate-700 rounded-lg shadow-lg border border-slate-600 z-10">
                             <h4 className="px-4 py-2 text-sm font-semibold text-slate-100 border-b border-slate-600">Add Team Member</h4>
                            {available_users_to_add.length > 0 ? (
                                <ul>
                                    {available_users_to_add.map(user => (
                                        <li
                                            key={user.id}
                                            onClick={() => handle_add_assignee(user.id)}
                                            className="px-4 py-2 hover:bg-slate-600 cursor-pointer flex items-center text-sm text-slate-200"
                                        >
                                            <img src={user.avatar_url} alt={user.name} className="w-6 h-6 rounded-full mr-3" />
                                            {user.name}
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="p-4 text-sm text-slate-400">All users are assigned.</p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ClientAssignees;

import React, { useState, useEffect, useRef } from 'react';
import { use_app_context } from '../hooks/useAppContext';
import Icon from './common/Icon';
import { Client, Task, ActionLogEntry, User, File as ClientFile, View } from '../types';

interface AugmentedActionLog extends ActionLogEntry {
    client_name: string;
}

interface AugmentedFile extends ClientFile {
    client_name: string;
}

interface SearchResults {
    clients: Client[];
    tasks: Task[];
    action_logs: AugmentedActionLog[];
    users: User[];
    files: AugmentedFile[];
}

interface GlobalSearchProps {
    navigate_to_client: (client_id: string) => void;
    set_view: (view: View) => void;
}

const GlobalSearch: React.FC<GlobalSearchProps> = ({ navigate_to_client, set_view }) => {
    const { state } = use_app_context();
    const [search_term, set_search_term] = useState('');
    const [results, set_results] = useState<SearchResults>({ clients: [], tasks: [], action_logs: [], users: [], files: [] });
    const [is_dropdown_visible, set_is_dropdown_visible] = useState(false);
    const search_ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (search_term.length < 2) {
            set_results({ clients: [], tasks: [], action_logs: [], users: [], files: [] });
            set_is_dropdown_visible(false);
            return;
        }

        const lowercased_term = search_term.toLowerCase();

        // Search Clients
        const filtered_clients = state.clients.filter(client => {
            // Fix: Access phone from the nested contact object.
            const phone = client.contact.phone?.replace(/\D/g, '') || '';
            const search_term_phone = lowercased_term.replace(/\D/g, '');
            return client.name.toLowerCase().includes(lowercased_term) ||
                   (client.immigration_case.case_number || '').toLowerCase().includes(lowercased_term) ||
                   (search_term_phone && phone.includes(search_term_phone));
        });

        // Search Tasks
        const filtered_tasks = state.tasks.filter(task =>
            task.title.toLowerCase().includes(lowercased_term)
        );
        
        // Fix: Search logs and files from the global state instead of client objects.
        const filtered_logs: AugmentedActionLog[] = state.action_logs
            .filter(log => log.content.toLowerCase().includes(lowercased_term))
            .map(log => {
                const client = state.clients.find(c => c.id === log.client_id);
                return { ...log, client_name: client?.name || 'Unknown Client' };
            });

        const filtered_files: AugmentedFile[] = state.files
            .filter(file => file.name.toLowerCase().includes(lowercased_term))
            .map(file => {
                const client = state.clients.find(c => c.id === file.client_id);
                return { ...file, client_name: client?.name || 'Unknown Client' };
            });


        // Search Users
        const filtered_users = state.users.filter(user =>
            user.name.toLowerCase().includes(lowercased_term) ||
            user.username?.toLowerCase().includes(lowercased_term)
        );

        set_results({ 
            clients: filtered_clients, 
            tasks: filtered_tasks, 
            action_logs: filtered_logs,
            users: filtered_users,
            files: filtered_files
        });
        set_is_dropdown_visible(true);

    }, [search_term, state.clients, state.tasks, state.users, state.action_logs, state.files]);

    useEffect(() => {
        const handle_click_outside = (event: MouseEvent) => {
            if (search_ref.current && !search_ref.current.contains(event.target as Node)) {
                set_is_dropdown_visible(false);
            }
        };
        document.addEventListener('mousedown', handle_click_outside);
        return () => {
            document.removeEventListener('mousedown', handle_click_outside);
        };
    }, []);
    
    const handle_result_click = (client_id: string) => {
        navigate_to_client(client_id);
        set_search_term('');
        set_is_dropdown_visible(false);
    };

    const handle_user_click = () => {
        set_view('settings');
        set_search_term('');
        set_is_dropdown_visible(false);
    }

    const has_results = results.clients.length > 0 || results.tasks.length > 0 || results.action_logs.length > 0 || results.users.length > 0 || results.files.length > 0;

    return (
        <div className="relative" ref={search_ref}>
            <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
            <input
                type="text"
                placeholder="Search everything..."
                value={search_term}
                onChange={(e) => set_search_term(e.target.value)}
                onFocus={() => { if(has_results) set_is_dropdown_visible(true); }}
                className="w-64 pl-10 pr-4 py-2 text-sm bg-slate-700 text-slate-100 border border-slate-600 rounded-lg placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            {is_dropdown_visible && (
                <div className="absolute top-full mt-2 w-96 bg-slate-700 rounded-lg shadow-lg border border-slate-600 z-20 max-h-96 overflow-y-auto">
                    {has_results ? (
                        <div>
                            {/* Clients */}
                            {results.clients.length > 0 && (
                                <div>
                                    <h4 className="px-4 py-2 text-xs font-bold text-slate-400 uppercase bg-slate-800">Clients</h4>
                                    <ul>
                                        {results.clients.slice(0, 3).map(client => (
                                            <li key={`client-${client.id}`} onClick={() => handle_result_click(client.id)} className="px-4 py-2 hover:bg-slate-600 cursor-pointer flex items-center">
                                                <Icon name="clients" className="w-4 h-4 mr-3 text-slate-400" />
                                                <div>
                                                    <p className="text-sm font-medium text-slate-100">{client.name}</p>
                                                    <p className="text-xs text-slate-400">{client.immigration_case.case_number}</p>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            {/* Users */}
                            {results.users.length > 0 && (
                                <div>
                                    <h4 className="px-4 py-2 text-xs font-bold text-slate-400 uppercase bg-slate-800 border-t border-slate-600">Users</h4>
                                    <ul>
                                        {results.users.slice(0, 3).map(user => (
                                            <li key={`user-${user.id}`} onClick={handle_user_click} className="px-4 py-2 hover:bg-slate-600 cursor-pointer flex items-center">
                                                <Icon name="user" className="w-4 h-4 mr-3 text-slate-400" />
                                                <div>
                                                    <p className="text-sm font-medium text-slate-100">{user.name}</p>
                                                    <p className="text-xs text-slate-400">@{user.username}</p>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            {/* Files */}
                            {results.files.length > 0 && (
                                <div>
                                    <h4 className="px-4 py-2 text-xs font-bold text-slate-400 uppercase bg-slate-800 border-t border-slate-600">Files</h4>
                                    <ul>
                                        {results.files.slice(0, 3).map(file => (
                                            <li key={`file-${file.id}`} onClick={() => handle_result_click(file.client_id)} className="px-4 py-2 hover:bg-slate-600 cursor-pointer flex items-center">
                                                <Icon name="file" className="w-4 h-4 mr-3 text-slate-400 flex-shrink-0" />
                                                <div className="min-w-0">
                                                    <p className="text-sm font-medium text-slate-100 truncate" title={file.name}>{file.name}</p>
                                                    <p className="text-xs text-slate-400">In: {file.client_name}</p>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            {/* Tasks */}
                            {results.tasks.length > 0 && (
                                <div>
                                    <h4 className="px-4 py-2 text-xs font-bold text-slate-400 uppercase bg-slate-800 border-t border-slate-600">Tasks</h4>
                                    <ul>
                                        {results.tasks.slice(0, 3).map(task => {
                                            const client = state.clients.find(c => c.id === task.client_id);
                                            return (
                                                <li key={`task-${task.id}`} onClick={() => handle_result_click(task.client_id)} className="px-4 py-2 hover:bg-slate-600 cursor-pointer flex items-center">
                                                    <Icon name="tasks" className="w-4 h-4 mr-3 text-slate-400 flex-shrink-0" />
                                                     <div className="min-w-0">
                                                        <p className="text-sm font-medium text-slate-100 truncate" title={task.title}>{task.title}</p>
                                                        <p className="text-xs text-slate-400">For: {client?.name}</p>
                                                    </div>
                                                </li>
                                            )
                                        })}
                                    </ul>
                                </div>
                            )}
                             {/* Comments */}
                             {results.action_logs.length > 0 && (
                                <div>
                                    <h4 className="px-4 py-2 text-xs font-bold text-slate-400 uppercase bg-slate-800 border-t border-slate-600">Comments</h4>
                                    <ul>
                                        {results.action_logs.slice(0, 3).map(log => (
                                            <li key={`log-${log.id}`} onClick={() => handle_result_click(log.client_id)} className="px-4 py-2 hover:bg-slate-600 cursor-pointer flex items-center">
                                                <Icon name="message-square" className="w-4 h-4 mr-3 text-slate-400 flex-shrink-0" />
                                                <div className="min-w-0">
                                                    <p className="text-sm font-medium text-slate-100 truncate" title={log.content}>{log.content}</p>
                                                    <p className="text-xs text-slate-400">In: {log.client_name}</p>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="p-4 text-sm text-slate-400">No results found for "{search_term}"</div>
                    )}
                </div>
            )}
        </div>
    );
};

export default GlobalSearch;
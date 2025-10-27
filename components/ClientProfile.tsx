// Fix: Import useMemo from React to resolve the "Cannot find name" error.
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { use_app_context } from '../hooks/useAppContext';
import Icon, { type IconName } from './common/Icon';
import { Task, File as ClientFile, ActionLogEntry, TaskStatus, View, Client, User } from '../types';
import EditClientModal from './EditClientModal';
import TaskModal from './TaskModal';
import ClientQuestionnaire from './ClientQuestionnaire';
import ClientPayments from './ClientPayments';
import ClientImmigrationCase from './ClientImmigrationCase';
import ClientCaseDescription from './ClientCaseDescription';
import ClientAssignees from './ClientAssignees';
import MentionRenderer from './common/MentionRenderer';
import MentionSuggestions from './common/MentionSuggestions';
import UserPopover from './common/UserPopover';
import getCaretCoordinates from '../lib/getCaretCoordinates';
import ClientFilesView from './ClientFilesView';


interface ClientProfileProps {
    client_id: string;
    set_view: (view: View) => void;
}

const get_icon_for_file = (file: ClientFile): IconName => {
    const extension = file.type?.toLowerCase() || file.name.split('.').pop()?.toLowerCase();
    switch (extension) {
        case 'pdf':
            return 'pdf';
        case 'doc':
        case 'docx':
            return 'doc';
        case 'jpg':
        case 'jpeg':
            return 'jpg';
        case 'png':
            return 'png';
        default:
            return 'file';
    }
};


const ClientProfile: React.FC<ClientProfileProps> = ({ client_id, set_view }) => {
    const context = use_app_context();
    const { state, add_action_log, update_task_status, update_file, delete_file, update_action_log, delete_action_log } = context;
    const { clients, users, files, tasks, action_logs, payments, current_user } = state;

    // This useMemo is critical for getting the complete, up-to-date client object
    const client = useMemo(() => {
        const base_client = clients.find(c => c.id === client_id);
        if (!base_client) return undefined;
        return {
            ...base_client,
            tasks: tasks.filter(t => t.client_id === client_id),
            files: files.filter(f => f.client_id === client_id),
            action_log: action_logs.filter(a => a.client_id === client_id).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
            payments: payments.filter(p => p.client_id === client_id),
        }
    }, [client_id, clients, tasks, files, action_logs, payments]);

    // Redirect if client is deleted or scroll to comment
    useEffect(() => {
        if (!client) {
            set_view('clients');
            return;
        }

        if (window.location.hash && window.location.hash.startsWith('#log-')) {
            const log_id = window.location.hash.substring(1);
            const element = document.getElementById(log_id);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                // Add a temporary highlight
                element.classList.add('transition-all', 'duration-1000', 'bg-blue-900/50', 'ring-2', 'ring-blue-500');
                setTimeout(() => {
                    element.classList.remove('bg-blue-900/50', 'ring-2', 'ring-blue-500');
                    // Clean up the URL hash without reloading
                    history.pushState("", document.title, window.location.pathname + window.location.search);
                }, 3000);
            }
        }

    }, [client, set_view, action_logs]);


    const [is_edit_modal_open, set_is_edit_modal_open] = useState(false);
    const [is_task_modal_open, set_is_task_modal_open] = useState(false);
    const [editing_task, set_editing_task] = useState<Task | undefined>(undefined);
    const [new_log_entry, set_new_log_entry] = useState('');
    const [active_tab, set_active_tab] = useState('overview');
    
    // State for editing action logs
    const [editing_log_id, set_editing_log_id] = useState<string | null>(null);
    const [editing_log_content, set_editing_log_content] = useState('');

    // State for file management
    const [active_file_menu, set_active_file_menu] = useState<string | null>(null);
    const [editing_file_id, set_editing_file_id] = useState<string | null>(null);
    const [new_file_name, set_new_file_name] = useState('');
    const file_menu_ref = useRef<HTMLDivElement>(null);
    const [is_uploading, set_is_uploading] = useState(false);

    // State for Action Log file upload & mentions
    const [files_to_upload, set_files_to_upload] = useState<File[]>([]);
    const file_input_ref = useRef<HTMLInputElement>(null);
    const new_log_textarea_ref = useRef<HTMLTextAreaElement>(null);

    // State for mention autocomplete popover
    const [mention_query, set_mention_query] = useState('');
    const [show_mention_suggestions, set_show_mention_suggestions] = useState(false);
    const [mention_suggestions_position, set_mention_suggestions_position] = useState({ top: 0, left: 0 });
    const mention_suggestions = useMemo(() => {
        if (!mention_query) return [];
        return users.filter(user =>
            user.username?.toLowerCase().includes(mention_query.toLowerCase()) &&
            !new_log_entry.includes(`@${user.username}`) // Exclude already mentioned
        );
    }, [mention_query, users, new_log_entry]);

    // State for user info popover on mention click
    const [popover_user, set_popover_user] = useState<User | null>(null);
    const [popover_position, set_popover_position] = useState({ top: 0, left: 0 });
    const popover_ref = useRef<HTMLDivElement>(null);
    
    // State for main profile view
    const [active_view, set_active_view] = useState<'overview' | 'files'>('overview');

    const sorted_files_by_date = useMemo(() => {
        return (client?.files || []).sort((a,b) => new Date(b.upload_date).getTime() - new Date(a.upload_date).getTime());
    }, [client?.files]);

    const show_user_popover = (user: User, event: React.MouseEvent) => {
        const rect = (event.target as HTMLElement).getBoundingClientRect();
        set_popover_position({ top: rect.bottom + window.scrollY, left: rect.left + window.scrollX });
        set_popover_user(user);
    };

    // Effect to close popovers on outside click
    useEffect(() => {
        const handle_click_outside = (event: MouseEvent) => {
            if (file_menu_ref.current && !file_menu_ref.current.contains(event.target as Node)) set_active_file_menu(null);
            if (popover_ref.current && !popover_ref.current.contains(event.target as Node)) set_popover_user(null);
            if (new_log_textarea_ref.current && !new_log_textarea_ref.current.contains(event.target as Node)) set_show_mention_suggestions(false);
        };
        document.addEventListener("mousedown", handle_click_outside);
        return () => document.removeEventListener("mousedown", handle_click_outside);
    }, []);

    if (!client) {
        return <div className="text-center text-slate-500">Client not found or has been deleted. Redirecting...</div>;
    }

    const handle_add_log = async (e: React.FormEvent) => {
        e.preventDefault();
        if ((!new_log_entry.trim() && files_to_upload.length === 0) || is_uploading) return;

        set_is_uploading(true);
        const content = new_log_entry.trim() || `Uploaded ${files_to_upload.length} file(s).`;
        
        // Parse mentions
        const mention_regex = /@([a-z0-9_.]+)/gi;
        const matches = content.match(mention_regex);
        let mentioned_user_ids: string[] = [];

        if (matches) {
            const mentioned_usernames = matches.map(match => match.substring(1).toLowerCase());
            mentioned_user_ids = users
                .filter(user => user.username && mentioned_usernames.includes(user.username.toLowerCase()))
                .map(user => user.id);
        }

        await add_action_log({
            client_id: client.id,
            content: content,
            files_to_upload: files_to_upload,
            mentions: mentioned_user_ids,
        });

        set_new_log_entry('');
        set_files_to_upload([]);
        set_is_uploading(false);
    };
    
    const handle_file_select = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            set_files_to_upload(prev => [...prev, ...Array.from(e.target.files!)]);
        }
        e.target.value = '';
    };

    const trigger_file_input = () => {
        file_input_ref.current?.click();
    };

    const handle_log_text_change = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const text = e.target.value;
        set_new_log_entry(text);
      
        const caret_position = e.target.selectionStart;
        const text_before_caret = text.substring(0, caret_position);
        const mention_match = text_before_caret.match(/@([a-z0-9_.]*)$/);
      
        if (mention_match && new_log_textarea_ref.current) {
          const query = mention_match[1];
          set_mention_query(query);
          const coords = getCaretCoordinates(new_log_textarea_ref.current, caret_position);
          const rect = new_log_textarea_ref.current.getBoundingClientRect();
          set_mention_suggestions_position({
            top: rect.top + coords.top + coords.height,
            left: rect.left + coords.left
          });
          set_show_mention_suggestions(true);
        } else {
          set_show_mention_suggestions(false);
        }
    };

    const handle_select_mention = (username: string) => {
        const text = new_log_entry;
        const textarea = new_log_textarea_ref.current;
        if (!textarea) return;
    
        const caret_position = textarea.selectionStart;
        const text_before_caret = text.substring(0, caret_position);
        const new_text_before_caret = text_before_caret.replace(/@([a-z0-9_.]*)$/, `@${username} `);
        const new_text = new_text_before_caret + text.substring(caret_position);
    
        set_new_log_entry(new_text);
        set_show_mention_suggestions(false);
    
        // Focus and set cursor position after the inserted mention
        setTimeout(() => {
            textarea.focus();
            textarea.selectionStart = new_text_before_caret.length;
            textarea.selectionEnd = new_text_before_caret.length;
        }, 0);
    };
    
    const handle_toggle_task_status = async (task: Task) => {
        const new_status = task.status === TaskStatus.DONE ? TaskStatus.TO_DO : TaskStatus.DONE;
        await update_task_status(task.id, new_status);
    };

    const open_task_modal = (task?: Task) => {
        set_editing_task(task);
        set_is_task_modal_open(true);
    };
    
    const sorted_tasks = [...(client.tasks || [])].sort((a, b) => 
        a.status === TaskStatus.DONE && b.status !== TaskStatus.DONE ? 1 :
        a.status !== TaskStatus.DONE && b.status === TaskStatus.DONE ? -1 :
        0
    );

    // File management handlers
    const handle_start_rename_file = (file: ClientFile) => {
        set_editing_file_id(file.id);
        set_new_file_name(file.name);
        set_active_file_menu(null);
    };

    const handle_cancel_rename_file = () => {
        set_editing_file_id(null);
        set_new_file_name('');
    };

    const handle_save_rename_file = async (file: ClientFile) => {
        if (!new_file_name.trim()) return;
        await update_file(file.id, new_file_name);
        handle_cancel_rename_file();
    };

    const handle_delete_file_confirm = async (file_id: string) => {
        const file_to_delete = client.files?.find(f => f.id === file_id);
        if (window.confirm(`Are you sure you want to delete "${file_to_delete?.name}"?`)) {
            await delete_file(file_id);
        }
        set_active_file_menu(null);
    };

    // Action Log handlers
    const handle_start_edit_log = (log: ActionLogEntry) => {
        set_editing_log_id(log.id);
        set_editing_log_content(log.content);
    };

    const handle_cancel_edit_log = () => {
        set_editing_log_id(null);
        set_editing_log_content('');
    };

    const handle_save_edit_log = async () => {
        if (!editing_log_id || !editing_log_content.trim()) return;
        await update_action_log(editing_log_id, editing_log_content);
        handle_cancel_edit_log();
    };

    const handle_delete_log = async (log_id: string) => {
        if (window.confirm('Are you sure you want to delete this comment? This action cannot be undone.')) {
            await delete_action_log(log_id);
        }
    };


    const TabButton: React.FC<{label: string, tab_name: string}> = ({label, tab_name}) => (
        <button
            onClick={() => set_active_tab(tab_name)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors border-b-2 ${
                active_tab === tab_name
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-slate-400 hover:text-slate-100'
            }`}
        >
            {label}
        </button>
    );
    
    if (active_view === 'files') {
        return <ClientFilesView client={client} on_back={() => set_active_view('overview')} />;
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold text-slate-100">{client.name}</h1>
                    <p className="text-slate-400">{client.case_number}</p>
                </div>
                <button
                    onClick={() => set_is_edit_modal_open(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                >
                    Edit Client
                </button>
            </div>
            
            {/* Tabs */}
            <div className="flex space-x-2 border-b border-slate-700">
                <TabButton label="Overview" tab_name="overview" />
                <TabButton label="Questionnaire" tab_name="questionnaire" />
                <TabButton label="Payments" tab_name="payments" />
            </div>
            
             {active_tab === 'overview' && (
                <ClientCaseDescription client={client} />
             )}

            {/* Tab Content */}
            <div className="pt-6">
                {active_tab === 'overview' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Left Column: Details */}
                        <div className="lg:col-span-1 space-y-6">
                            <div className="bg-slate-800 p-6 rounded-lg shadow-sm">
                                <h3 className="text-lg font-semibold mb-4 text-slate-100">Client Details</h3>
                                <div className="space-y-4 text-sm">
                                    <ClientAssignees client={client} />
                                    <DetailItem label="Email" value={client.contact.email || 'N/A'} />
                                    <DetailItem label="Phone" value={client.contact.phone || 'N/A'} />
                                    <DetailItem label="Nationality" value={client.details.nationality || 'N/A'} />
                                    <DetailItem label="Passport No." value={client.details.passport_number || 'N/A'} />
                                </div>
                            </div>

                            <ClientImmigrationCase client={client} />

                            <div className="bg-slate-800 p-6 rounded-lg shadow-sm">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-lg font-semibold text-slate-100">Files</h3>
                                    <div>
                                        <button onClick={trigger_file_input} className="text-sm font-medium text-blue-400 hover:underline mr-4">Upload</button>
                                        {(client.files || []).length > 0 && (
                                            <button onClick={() => set_active_view('files')} className="text-sm font-medium text-blue-400 hover:underline">View All</button>
                                        )}
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    {sorted_files_by_date.length > 0 ? sorted_files_by_date.slice(0, 5).map(file => (
                                        <div key={file.id} className="flex items-center justify-between text-sm">
                                            <div className="flex items-center flex-1 min-w-0">
                                                <Icon name={get_icon_for_file(file)} className="w-5 h-5 mr-3 text-slate-400 flex-shrink-0" />
                                                {editing_file_id === file.id ? (
                                                    <div className="flex items-center flex-1">
                                                        <input 
                                                            type="text"
                                                            value={new_file_name}
                                                            onChange={(e) => set_new_file_name(e.target.value)}
                                                            onKeyDown={(e) => e.key === 'Enter' && handle_save_rename_file(file)}
                                                            className="text-sm p-1 bg-slate-700 border border-blue-500 rounded-md flex-1 text-slate-100"
                                                            autoFocus
                                                        />
                                                        <button onClick={() => handle_save_rename_file(file)} className="ml-2 text-green-500 hover:text-green-400"><Icon name="check" className="w-4 h-4" /></button>
                                                        <button onClick={handle_cancel_rename_file} className="ml-1 text-red-500 hover:text-red-400"><Icon name="x" className="w-4 h-4" /></button>
                                                    </div>
                                                ) : (
                                                    <a href={file.url} target="_blank" rel="noopener noreferrer" className="font-medium text-slate-200 hover:text-blue-400 truncate" title={file.name}>{file.name}</a>
                                                )}
                                            </div>
                                            <div className="flex items-center ml-2">
                                                <div className="text-right mr-2">
                                                    <p className="text-xs text-slate-500">{file.upload_date}</p>
                                                    <p className="text-xs text-slate-400">{file.size}</p>
                                                </div>
                                                <div className="relative" ref={file_menu_ref}>
                                                     <button onClick={() => set_active_file_menu(active_file_menu === file.id ? null : file.id)} className="text-slate-400 hover:text-slate-100">
                                                        <Icon name="more-horizontal" className="w-5 h-5" />
                                                    </button>
                                                    {active_file_menu === file.id && (
                                                        <div className="absolute right-0 mt-2 w-32 bg-slate-700 rounded-md shadow-lg border border-slate-600 z-10">
                                                            <a href={file.url} target="_blank" rel="noopener noreferrer" className="block w-full text-left px-4 py-2 text-sm text-slate-200 hover:bg-slate-600">Download</a>
                                                            <button onClick={() => handle_start_rename_file(file)} className="block w-full text-left px-4 py-2 text-sm text-slate-200 hover:bg-slate-600">Rename</button>
                                                            <button onClick={() => handle_delete_file_confirm(file.id)} className="block w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-slate-600">Delete</button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )) : <p className="text-sm text-slate-500">No files uploaded.</p>}
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Activity */}
                        <div className="lg:col-span-2 space-y-6">
                            <div className="bg-slate-800 p-6 rounded-lg shadow-sm">
                                 <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-lg font-semibold text-slate-100">Tasks</h3>
                                    <button onClick={() => open_task_modal()} className="text-sm font-medium text-blue-400 hover:underline">Add Task</button>
                                </div>
                                <div className="space-y-3">
                                    {sorted_tasks.length > 0 ? sorted_tasks.map(task => {
                                        const is_done = task.status === TaskStatus.DONE;
                                        return (
                                        <div key={task.id} className={`p-3 bg-slate-700/50 rounded-md flex items-start ${is_done ? 'opacity-60' : ''}`}>
                                            <input
                                                type="checkbox"
                                                className="h-5 w-5 rounded border-slate-500 bg-slate-700 text-blue-600 focus:ring-blue-500 mr-4 mt-1"
                                                checked={is_done}
                                                onChange={() => handle_toggle_task_status(task)}
                                            />
                                            <div className="flex-1">
                                                <p className={`font-medium text-slate-100 cursor-pointer hover:text-blue-400 ${is_done ? 'line-through' : ''}`} onClick={() => open_task_modal(task)}>{task.title}</p>
                                                <div className="flex justify-between items-center text-xs text-slate-400 mt-1">
                                                    <span>Due: {task.due_date || 'N/A'}</span>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => open_task_modal(task)}
                                                className="ml-4 text-blue-400 hover:text-blue-300"
                                                title="Edit Task"
                                            >
                                                <Icon name="edit" className="w-5 h-5" />
                                            </button>
                                        </div>
                                        )
                                    }) : <p className="text-sm text-slate-500">No tasks for this client.</p>}
                                </div>
                            </div>
                            <div className="bg-slate-800 p-6 rounded-lg shadow-sm">
                                <h3 className="text-lg font-semibold mb-4 text-slate-100">Action Log</h3>
                                <form onSubmit={handle_add_log} className="mb-4 relative">
                                    <textarea
                                        ref={new_log_textarea_ref}
                                        value={new_log_entry}
                                        onChange={handle_log_text_change}
                                        placeholder="Add a new log entry... You can @mention users."
                                        rows={2}
                                        className="w-full p-2 bg-slate-700 text-slate-100 border border-slate-600 rounded-md text-sm placeholder:text-slate-400 focus:ring-blue-500 focus:border-blue-500"
                                    ></textarea>
                                    {show_mention_suggestions && mention_suggestions.length > 0 && (
                                        <MentionSuggestions
                                            users={mention_suggestions}
                                            on_select={handle_select_mention}
                                            position={mention_suggestions_position}
                                        />
                                    )}
                                    {files_to_upload.length > 0 && (
                                        <div className="mt-2 space-y-2">
                                            {files_to_upload.map((file, index) => (
                                                <div key={`${file.name}-${index}`} className="p-2 bg-slate-700 rounded-md flex justify-between items-center text-sm">
                                                    <div className="flex items-center min-w-0">
                                                        <Icon name="file" className="w-4 h-4 mr-2 text-slate-400 flex-shrink-0" />
                                                        <span className="text-slate-200 truncate">{file.name}</span>
                                                    </div>
                                                    <button type="button" onClick={() => set_files_to_upload(prev => prev.filter((_, i) => i !== index))} className="text-red-500 hover:text-red-400 flex-shrink-0 ml-2">
                                                        <Icon name="x" className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    <div className="flex justify-between items-center mt-2">
                                        <button 
                                            type="button" 
                                            onClick={trigger_file_input}
                                            className="p-2 text-slate-400 hover:text-blue-400 rounded-full transition-colors"
                                            title="Attach file(s)"
                                        >
                                            <Icon name="paperclip" className="w-5 h-5" />
                                        </button>
                                        <button 
                                            type="submit" 
                                            disabled={is_uploading}
                                            className="px-3 py-1 bg-blue-600 text-white text-sm font-semibold rounded-md hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed"
                                        >
                                            {is_uploading ? 'Uploading...' : 'Add Entry'}
                                        </button>
                                    </div>
                                    <input type="file" ref={file_input_ref} onChange={handle_file_select} className="hidden" multiple />
                                </form>
                                <ul className="space-y-4">
                                    {(client.action_log || []).map(log => {
                                        const user = users.find(u => u.id === log.user_id);
                                        const attached_files = log.file_ids ? (client.files || []).filter(f => log.file_ids!.includes(f.id)) : [];
                                        const is_editing_this_log = editing_log_id === log.id;
                                        const can_edit_or_delete = log.user_id === current_user?.id;
                                        
                                        return (
                                        <li key={log.id} id={`log-${log.id}`} className="flex items-start text-sm p-2 rounded-md -mx-2">
                                            <img src={user?.avatar_url} alt={user?.name} className="w-8 h-8 rounded-full mr-3 flex-shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <strong className="text-slate-100">{user?.name}</strong>
                                                        <span className="text-slate-500 ml-2">{new Date(log.date).toLocaleString()}</span>
                                                    </div>
                                                    {can_edit_or_delete && !is_editing_this_log && (
                                                        <div className="flex items-center space-x-2 flex-shrink-0 ml-4">
                                                            <button onClick={() => handle_start_edit_log(log)} className="text-blue-400 hover:text-blue-300"><Icon name="edit" className="w-4 h-4" /></button>
                                                            <button onClick={() => handle_delete_log(log.id)} className="text-red-400 hover:text-red-300"><Icon name="trash" className="w-4 h-4" /></button>
                                                        </div>
                                                    )}
                                                </div>
                                                {is_editing_this_log ? (
                                                    <div className="mt-2">
                                                        <textarea 
                                                            value={editing_log_content}
                                                            onChange={(e) => set_editing_log_content(e.target.value)}
                                                            rows={3}
                                                            className="w-full p-2 bg-slate-700 text-slate-100 border border-blue-500 rounded-md text-sm"
                                                            autoFocus
                                                        />
                                                        <div className="flex justify-end space-x-2 mt-2">
                                                            <button onClick={handle_cancel_edit_log} className="px-3 py-1 text-sm font-medium text-slate-200 bg-slate-600 rounded-md hover:bg-slate-500">Cancel</button>
                                                            <button onClick={handle_save_edit_log} className="px-3 py-1 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">Save</button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <MentionRenderer content={log.content} users={users} on_mention_click={show_user_popover} />
                                                        {attached_files.length > 0 && (
                                                            <div className="mt-2 space-y-2">
                                                                {attached_files.map(attached_file => (
                                                                    <a key={attached_file.id} href={attached_file.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center p-2 bg-slate-700 rounded-md hover:bg-slate-600 transition-colors mr-2">
                                                                        <Icon name={get_icon_for_file(attached_file)} className="w-5 h-5 mr-2 text-slate-400 flex-shrink-0" />
                                                                        <div className="text-sm">
                                                                            <p className="font-medium text-slate-200">{attached_file.name}</p>
                                                                            <p className="text-xs text-slate-400">{attached_file.size}</p>
                                                                        </div>
                                                                    </a>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        </div>
                    </div>
                )}
                {active_tab === 'questionnaire' && (
                    <ClientQuestionnaire client={client} />
                )}
                {active_tab === 'payments' && (
                    <ClientPayments client={client} />
                )}
            </div>
            
            {popover_user && (
                <div ref={popover_ref}>
                    <UserPopover user={popover_user} position={popover_position} on_close={() => set_popover_user(null)} />
                </div>
            )}
            {is_edit_modal_open && <EditClientModal isOpen={is_edit_modal_open} onClose={() => set_is_edit_modal_open(false)} client={client} />}
            {is_task_modal_open && <TaskModal isOpen={is_task_modal_open} onClose={() => { set_is_task_modal_open(false); set_editing_task(undefined); }} task={editing_task} client_id={client.id} />}
        </div>
    );
};

// Sub-component for details list
interface DetailItemProps {
    label: string;
    value: string;
}
const DetailItem: React.FC<DetailItemProps> = ({ label, value }) => (
    <div>
        <p className="text-xs text-slate-400">{label}</p>
        <p className="font-medium text-slate-200">{value}</p>
    </div>
);

export default ClientProfile;
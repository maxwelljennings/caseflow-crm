import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { Client, File as ClientFile } from '../types';
import { use_app_context } from '../hooks/useAppContext';
import Icon, { type IconName } from './common/Icon';

interface ClientFilesViewProps {
    client: Client;
    on_back: () => void;
}

const get_icon_for_file = (file: ClientFile): IconName => {
    const extension = file.type?.toLowerCase() || file.name.split('.').pop()?.toLowerCase();
    switch (extension) {
        case 'pdf': return 'pdf';
        case 'doc': case 'docx': return 'doc';
        case 'jpg': case 'jpeg': return 'jpg';
        case 'png': return 'png';
        default: return 'file';
    }
};

const ClientFilesView: React.FC<ClientFilesViewProps> = ({ client, on_back }) => {
    const { update_file, delete_file } = use_app_context();
    
    type SortKey = 'name' | 'type' | 'size' | 'upload_date';
    const [sort_key, set_sort_key] = useState<SortKey>('upload_date');
    const [sort_direction, set_sort_direction] = useState<'asc' | 'desc'>('desc');
    
    // State for file management
    const [active_file_menu, set_active_file_menu] = useState<string | null>(null);
    const [editing_file_id, set_editing_file_id] = useState<string | null>(null);
    const [new_file_name, set_new_file_name] = useState('');
    const file_menu_ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handle_click_outside = (event: MouseEvent) => {
            if (file_menu_ref.current && !file_menu_ref.current.contains(event.target as Node)) {
                set_active_file_menu(null);
            }
        };
        document.addEventListener("mousedown", handle_click_outside);
        return () => document.removeEventListener("mousedown", handle_click_outside);
    }, []);

    const sorted_files = useMemo(() => {
        const parse_size = (size_str: string): number => {
            const parts = size_str.split(' ');
            const value = parseFloat(parts[0]);
            const unit = parts[1]?.toUpperCase();
            if (unit === 'KB') return value * 1024;
            if (unit === 'MB') return value * 1024 * 1024;
            if (unit === 'GB') return value * 1024 * 1024 * 1024;
            return value;
        };
        
        return [...(client.files || [])].sort((a, b) => {
            let result = 0;
            switch (sort_key) {
                case 'name':
                    result = a.name.localeCompare(b.name);
                    break;
                case 'type':
                    result = a.type.localeCompare(b.type);
                    break;
                case 'size':
                    result = parse_size(a.size) - parse_size(b.size);
                    break;
                case 'upload_date':
                    result = new Date(a.upload_date).getTime() - new Date(b.upload_date).getTime();
                    break;
            }
            return sort_direction === 'asc' ? result : -result;
        });
    }, [client.files, sort_key, sort_direction]);

    const handle_sort = (key: SortKey) => {
        if (sort_key === key) {
            set_sort_direction(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            set_sort_key(key);
            set_sort_direction('asc');
        }
    };

    const handle_start_rename_file = (file: ClientFile) => {
        set_editing_file_id(file.id);
        set_new_file_name(file.name);
        set_active_file_menu(null);
    };

    const handle_cancel_rename_file = () => {
        set_editing_file_id(null);
        set_new_file_name('');
    };

    const handle_save_rename_file = async (file_id: string) => {
        if (!new_file_name.trim()) return;
        await update_file(file_id, new_file_name);
        handle_cancel_rename_file();
    };

    const handle_delete_file_confirm = async (file: ClientFile) => {
        if (window.confirm(`Are you sure you want to delete "${file.name}"?`)) {
            await delete_file(file.id);
        }
        set_active_file_menu(null);
    };

    const SortableHeader: React.FC<{ label: string; sort_key: SortKey }> = ({ label, sort_key: key }) => {
        const is_active = sort_key === key;
        const icon_name = sort_direction === 'asc' ? 'chevron-up' : 'chevron-down';
        return (
            <th scope="col" className="px-6 py-3">
                <button onClick={() => handle_sort(key)} className="flex items-center space-x-1 font-semibold text-xs uppercase text-slate-400 hover:text-slate-100">
                    <span>{label}</span>
                    {is_active && <Icon name={icon_name} className="w-4 h-4" />}
                </button>
            </th>
        );
    };

    return (
        <div className="bg-slate-800 p-6 rounded-lg shadow-sm">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-slate-100">All Files for {client.name}</h2>
                <button onClick={on_back} className="flex items-center text-sm font-medium text-blue-400 hover:underline">
                    <Icon name="chevron-left" className="w-4 h-4 mr-1" />
                    Back to Overview
                </button>
            </div>
            <div className="overflow-x-auto">
                 <table className="w-full text-sm text-left text-slate-400">
                    <thead className="text-xs text-slate-400 uppercase bg-slate-900">
                        <tr>
                            <SortableHeader label="File Name" sort_key="name" />
                            <SortableHeader label="Type" sort_key="type" />
                            <SortableHeader label="Size" sort_key="size" />
                            <SortableHeader label="Upload Date" sort_key="upload_date" />
                            <th scope="col" className="px-6 py-3"><span className="sr-only">Actions</span></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                        {sorted_files.map(file => (
                            <tr key={file.id} className="hover:bg-slate-700/50">
                                <td className="px-6 py-4 font-medium text-slate-100 whitespace-nowrap">
                                    <div className="flex items-center">
                                        <Icon name={get_icon_for_file(file)} className="w-5 h-5 mr-3 text-slate-400 flex-shrink-0" />
                                        {editing_file_id === file.id ? (
                                             <div className="flex items-center flex-1">
                                                <input 
                                                    type="text"
                                                    value={new_file_name}
                                                    onChange={(e) => set_new_file_name(e.target.value)}
                                                    onKeyDown={(e) => e.key === 'Enter' && handle_save_rename_file(file.id)}
                                                    className="text-sm p-1 bg-slate-700 border border-blue-500 rounded-md flex-1 text-slate-100"
                                                    autoFocus
                                                />
                                                <button onClick={() => handle_save_rename_file(file.id)} className="ml-2 text-green-500 hover:text-green-400"><Icon name="check" className="w-4 h-4" /></button>
                                                <button onClick={handle_cancel_rename_file} className="ml-1 text-red-500 hover:text-red-400"><Icon name="x" className="w-4 h-4" /></button>
                                            </div>
                                        ) : (
                                            <a href={file.url} target="_blank" rel="noopener noreferrer" className="hover:text-blue-400" title={file.name}>{file.name}</a>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4 uppercase">{file.type}</td>
                                <td className="px-6 py-4">{file.size}</td>
                                <td className="px-6 py-4">{file.upload_date}</td>
                                <td className="px-6 py-4 text-right">
                                     <div className="relative inline-block" ref={file_menu_ref}>
                                         <button onClick={() => set_active_file_menu(active_file_menu === file.id ? null : file.id)} className="text-slate-400 hover:text-slate-100">
                                            <Icon name="more-horizontal" className="w-5 h-5" />
                                        </button>
                                        {active_file_menu === file.id && (
                                            <div className="absolute right-0 mt-2 w-32 bg-slate-700 rounded-md shadow-lg border border-slate-600 z-10">
                                                <a href={file.url} target="_blank" rel="noopener noreferrer" className="block w-full text-left px-4 py-2 text-sm text-slate-200 hover:bg-slate-600">Download</a>
                                                <button onClick={() => handle_start_rename_file(file)} className="block w-full text-left px-4 py-2 text-sm text-slate-200 hover:bg-slate-600">Rename</button>
                                                <button onClick={() => handle_delete_file_confirm(file)} className="block w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-slate-600">Delete</button>
                                            </div>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                 </table>
                 {sorted_files.length === 0 && <p className="p-4 text-center text-slate-500">No files for this client.</p>}
            </div>
        </div>
    );
};

export default ClientFilesView;
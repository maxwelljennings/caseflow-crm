


import React, { createContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { Client, User, Task, File as ClientFile, ActionLogEntry, Payment, PaymentPlan, ImmigrationOffice, Notification, Session } from '../types';
import { TaskStatus } from '../types';

interface AppState {
    clients: Client[];
    users: User[]; // These are profiles
    tasks: Task[];
    immigration_offices: ImmigrationOffice[];
    notifications: Notification[];
    current_user: User | null; // Can be null before profile is loaded
    session: Session | null;
    loading: boolean;
    files: ClientFile[];
    action_logs: ActionLogEntry[];
    payments: Payment[];
}

export interface AppContextType {
    state: AppState;
    add_client: (client_data: Omit<Client, 'id'>) => Promise<void>;
    update_client: (client: Client) => Promise<void>;
    delete_client: (client_id: string) => Promise<void>;
    add_task: (task_data: Omit<Task, 'id' | 'status'>) => Promise<void>;
    update_task: (task: Task) => Promise<void>;
    delete_task: (task_id: string) => Promise<void>;
    update_task_status: (task_id: string, status: TaskStatus) => Promise<void>;
    add_action_log: (payload: { client_id: string; content: string; files_to_upload?: File[]; mentions?: string[] }) => Promise<void>;
    update_action_log: (log_id: string, content: string) => Promise<void>;
    delete_action_log: (log_id: string) => Promise<void>;
    update_client_payments: (client_id: string, payment_plan: PaymentPlan | undefined, payments: Payment[]) => Promise<void>;
    update_file: (file_id: string, new_name: string) => Promise<void>;
    delete_file: (file_id: string) => Promise<void>;
    mark_notification_read: (notification_id: string) => Promise<void>;
    mark_all_notifications_read: () => Promise<void>;
    sign_out: () => Promise<void>;
    update_user_avatar: (file: File) => Promise<void>;
}


export const AppContext = createContext<AppContextType | undefined>(undefined);

interface AppProviderProps {
    children: ReactNode;
    session: Session | null;
}

// Helper to format file size
const format_file_size = (bytes: number, decimals = 2): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// --- DATA TRANSFORMATION HELPERS ---
// This is the Adapter Pattern to resolve the mismatch between
// the flat DB schema and the nested frontend Client type.

const transform_flat_to_nested = (client: any): Client => {
    return {
        id: client.id,
        name: client.name,
        assignee_ids: client.assignee_ids || [],
        last_activity_date: client.last_activity_date,
        payment_plan: client.payment_plan,
        questionnaire: client.questionnaire,
        case_description: client.case_description, // Handle new field
        contact: {
            phone: client.phone,
            email: client.email,
        },
        details: {
            nationality: client.nationality,
            passport_number: client.passport_number,
        },
        immigration_case: {
            office_id: client.office_id,
            case_number: client.case_number,
            case_password: client.immigration_case_password,
            is_transferring: client.is_transferring,
            transfer_office_id: client.transfer_office_id,
        },
    };
};

const transform_nested_to_flat = (client: Partial<Client>) => {
    const flat_client: any = {
        ...client,
        phone: client.contact?.phone,
        email: client.contact?.email,
        nationality: client.details?.nationality,
        passport_number: client.details?.passport_number,
        office_id: client.immigration_case?.office_id,
        case_number: client.immigration_case?.case_number,
        immigration_case_password: client.immigration_case?.case_password,
        is_transferring: client.immigration_case?.is_transferring,
        transfer_office_id: client.immigration_case?.transfer_office_id,
    };
    // Remove the nested objects as they don't exist in the DB table
    delete flat_client.contact;
    delete flat_client.details;
    delete flat_client.immigration_case;
    delete flat_client.tasks;
    delete flat_client.files;
    delete flat_client.action_log;
    delete flat_client.payments;
    return flat_client;
};


export const AppProvider: React.FC<AppProviderProps> = ({ children, session }) => {
    const [clients, set_clients] = useState<Client[]>([]);
    const [users, set_users] = useState<User[]>([]); // These are all profiles
    const [tasks, set_tasks] = useState<Task[]>([]);
    const [immigration_offices, set_immigration_offices] = useState<ImmigrationOffice[]>([]);
    const [notifications, set_notifications] = useState<Notification[]>([]);
    const [files, set_files] = useState<ClientFile[]>([]);
    const [action_logs, set_action_logs] = useState<ActionLogEntry[]>([]);
    const [payments, set_payments] = useState<Payment[]>([]);
    const [loading, set_loading] = useState(true);
    const [current_user, set_current_user] = useState<User | null>(null);

    // This effect now ONLY depends on the user's ID.
    useEffect(() => {
        const user_id = session?.user?.id;

        const fetch_user_profile = async (id: string) => {
            const { data: profile, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', id)
                .single();
            if (error) console.error('Error fetching user profile:', error);
            else set_current_user(profile);
        };

        if (user_id) {
            fetch_user_profile(user_id);
            const fetch_data = async () => {
                set_loading(true);
                try {
                    const [
                        { data: clients_data, error: clients_error },
                        { data: users_data, error: users_error },
                        { data: tasks_data, error: tasks_error },
                        { data: offices_data, error: offices_error },
                        { data: notifications_data, error: notifications_error },
                        { data: files_data, error: files_error },
                        { data: logs_data, error: logs_error },
                        { data: payments_data, error: payments_error }
                    ] = await Promise.all([
                        supabase.from('clients').select('*'),
                        supabase.from('profiles').select('*'),
                        supabase.from('tasks').select('*'),
                        supabase.from('immigration_offices').select('*'),
                        supabase.from('notifications').select('*').or(`recipient_user_id.eq.${user_id},recipient_user_id.is.null`),
                        supabase.from('files').select('*'),
                        supabase.from('action_log').select('*'),
                        supabase.from('payments').select('*'),
                    ]);

                    if (clients_error) throw clients_error;
                    if (users_error) throw users_error;
                    if (tasks_error) throw tasks_error;
                    if (offices_error) throw offices_error;
                    if (notifications_error) throw notifications_error;
                    if (files_error) throw files_error;
                    if (logs_error) throw logs_error;
                    if (payments_error) throw payments_error;
                    
                    // Transform flat client data to nested structure
                    set_clients(clients_data.map(transform_flat_to_nested));
                    set_users(users_data);
                    set_tasks(tasks_data);
                    set_immigration_offices(offices_data);
                    set_notifications(notifications_data);
                    set_files(files_data as ClientFile[]);
                    set_action_logs(logs_data as ActionLogEntry[]);
                    set_payments(payments_data);

                } catch (error) {
                    console.error("Error fetching data:", error);
                } finally {
                    set_loading(false);
                }
            };
            fetch_data();
        } else {
            set_clients([]);
            set_users([]);
            set_tasks([]);
            set_immigration_offices([]);
            set_notifications([]);
            set_files([]);
            set_action_logs([]);
            set_payments([]);
            set_loading(false);
            set_current_user(null);
        }
    }, [session?.user?.id]);

    const add_client = async (client_data: Omit<Client, 'id'>) => {
        const flat_client_data = transform_nested_to_flat(client_data);
        const { data, error } = await supabase.from('clients').insert(flat_client_data).select().single();
        if (error) {
            console.error('Error adding client:', error);
            alert(`Error adding client: ${error.message}`);
        } else if (data) {
            set_clients(prev => [...prev, transform_flat_to_nested(data)]);
        }
    };

    const update_client = async (client: Client) => {
        const flat_client_data = transform_nested_to_flat(client);
        const { data, error } = await supabase.from('clients').update(flat_client_data).eq('id', client.id).select().single();
        if (error) {
            console.error('Error updating client:', error);
            alert(`Error updating client: ${error.message}`);
        }
        else if (data) {
             set_clients(prev => prev.map(c => c.id === data.id ? transform_flat_to_nested(data) : c));
        }
    };

    const delete_client = async (client_id: string) => {
        const { error } = await supabase.from('clients').delete().eq('id', client_id);
        if (error) {
            console.error('Error deleting client:', error);
            alert(`Failed to delete client: ${error.message}`);
        } else {
            set_clients(prev => prev.filter(c => c.id !== client_id));
        }
    };
    
    const add_task = async (task_data: Omit<Task, 'id' | 'status'>) => {
        const new_task: Omit<Task, 'id'> = { ...task_data, status: TaskStatus.TO_DO };
        const { data, error } = await supabase.from('tasks').insert(new_task).select().single();
        if (error) console.error('Error adding task:', error);
        else if (data) set_tasks(prev => [...prev, data]);
    };
    
    const update_task = async (task: Task) => {
        const { data, error } = await supabase.from('tasks').update(task).eq('id', task.id).select().single();
        if (error) console.error('Error updating task:', error);
        else if (data) set_tasks(prev => prev.map(t => t.id === data.id ? data : t));
    };
    
    const delete_task = async (task_id: string) => {
        const { error } = await supabase.from('tasks').delete().eq('id', task_id);
        if (error) {
            console.error('Error deleting task:', error);
            alert(`Failed to delete task: ${error.message}`);
        } else {
            set_tasks(prev => prev.filter(t => t.id !== task_id));
        }
    };

    const update_task_status = async (task_id: string, status: TaskStatus) => {
        const { data, error } = await supabase.from('tasks').update({ status }).eq('id', task_id).select().single();
        if (error) console.error('Error updating task status:', error);
        else if (data) set_tasks(prev => prev.map(t => t.id === data.id ? data : t));
    };
    
    const add_action_log = async (payload: { client_id: string; content: string; files_to_upload?: File[]; mentions?: string[] }) => {
        if (!current_user) {
            alert("You must be logged in to perform this action.");
            return;
        }

        const { client_id, content, files_to_upload, mentions } = payload;
        let uploaded_file_ids: string[] = [];

        try {
            if (files_to_upload && files_to_upload.length > 0) {
                const upload_promises = files_to_upload.map(async (file) => {
                    const file_ext = file.name.split('.').pop()?.toLowerCase() || 'unknown';
                    const file_path = `${client_id}/${crypto.randomUUID()}-${file.name}`;

                    const { error: upload_error } = await supabase.storage.from('client-files').upload(file_path, file);
                    if (upload_error) throw new Error(`Failed to upload ${file.name}: ${upload_error.message}`);
                    
                    const { data: url_data } = supabase.storage.from('client-files').getPublicUrl(file_path);
                    
                    return {
                        client_id,
                        name: file.name,
                        type: file_ext,
                        size: format_file_size(file.size),
                        upload_date: new Date().toISOString().split('T')[0],
                        url: url_data.publicUrl,
                        storage_path: file_path, // Store the direct path for reliable deletion
                    };
                });
                
                const files_metadata = await Promise.all(upload_promises);
                const { data: new_files_data, error: insert_error } = await supabase.from('files').insert(files_metadata).select();
                if (insert_error) throw insert_error;

                uploaded_file_ids = new_files_data.map(f => f.id);
                set_files(prev => [...prev, ...(new_files_data as ClientFile[])]);
            }

            const new_log = { 
                user_id: current_user.id, 
                client_id, 
                content, 
                file_ids: uploaded_file_ids.length > 0 ? uploaded_file_ids : undefined,
                mentions: mentions && mentions.length > 0 ? mentions : undefined,
            };
            const { data: log_data, error: log_error } = await supabase.from('action_log').insert(new_log).select().single();
            if (log_error) throw log_error;

            if (mentions && mentions.length > 0) {
                const client = clients.find(c => c.id === client_id);
                const notifications_to_add = mentions
                    .filter(user_id => user_id !== current_user.id) // Don't notify self
                    .map(user_id => ({
                        type: 'mention',
                        message: `${current_user.name} mentioned you on ${client?.name}'s profile.`,
                        client_id,
                        recipient_user_id: user_id,
                        actor_user_id: current_user.id,
                        entity_id: log_data.id,
                    }));
    
                if (notifications_to_add.length > 0) {
                    const { data: new_notifications, error: notification_error } = await supabase.from('notifications').insert(notifications_to_add).select();
                    if (notification_error) {
                        console.error("Error creating mention notifications:", notification_error);
                    } else if (new_notifications) {
                        // Optimistically update local state if the current user was mentioned in another browser, for example.
                        // For simplicity, we'll rely on the next global fetch.
                    }
                }
            }
            
            set_action_logs(prev => [log_data, ...prev].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()) as ActionLogEntry[]);

        } catch (error: any) {
            console.error("Error in add_action_log:", error);
            alert(`An error occurred: ${error.message}`);
        }
    };

    const update_action_log = async (log_id: string, content: string) => {
        const { data, error } = await supabase.from('action_log').update({ content }).eq('id', log_id).select().single();
        if (error) {
            console.error('Error updating action log:', error);
            alert(`Failed to update comment: ${error.message}`);
        } else {
            set_action_logs(prev => prev.map(log => log.id === log_id ? data as ActionLogEntry : log));
        }
    };
    
    const delete_action_log = async (log_id: string) => {
        const log_to_delete = action_logs.find(log => log.id === log_id);
        if (!log_to_delete) {
            alert('Could not find the log entry to delete.');
            return;
        }

        try {
            if (log_to_delete.file_ids && log_to_delete.file_ids.length > 0) {
                const files_to_process = files.filter(f => log_to_delete.file_ids!.includes(f.id));
                
                if (files_to_process.length > 0) {
                    const file_paths_to_delete: string[] = [];
                    const bucket_name = 'client-files';

                    for (const file of files_to_process) {
                        let file_path = file.storage_path;
                         if (!file_path) {
                            console.warn(`File '${file.name}' is missing a storage_path. Falling back to robust URL parsing.`);
                            try {
                                const url = new URL(file.url);
                                const path_parts = url.pathname.split(`/${bucket_name}/`);
                                if (path_parts.length > 1 && path_parts[1]) {
                                    file_path = decodeURIComponent(path_parts[1]);
                                    console.log(`Fallback parsed path for ${file.name}: ${file_path}`);
                                } else {
                                     throw new Error(`Could not find bucket '${bucket_name}' in the URL path.`);
                                }
                            } catch (e) {
                                console.error(`Could not parse path from invalid URL for file ID ${file.id}: "${file.url}"`);
                                // Optionally skip this file or throw an error for the whole operation
                                continue; 
                            }
                        }
                        if(file_path) file_paths_to_delete.push(file_path);
                    }

                    if (file_paths_to_delete.length > 0) {
                        console.log('Attempting to delete from storage, paths:', file_paths_to_delete);
                        const { error: storage_error } = await supabase.storage.from(bucket_name).remove(file_paths_to_delete);
                        if (storage_error) {
                           console.error("Supabase storage error:", storage_error);
                           throw new Error(`Failed to delete associated files from storage. See console for details.`);
                        }
                        console.log('Successfully deleted files from storage.');
                    }

                    console.log('Deleting file records from database for log entry.');
                    const { error: db_error } = await supabase.from('files').delete().in('id', log_to_delete.file_ids);
                    if (db_error) {
                        console.error("Supabase DB error:", db_error);
                        throw new Error(`Database file record deletion failed. See console for details.`);
                    }
                    
                    set_files(prev => prev.filter(f => !log_to_delete.file_ids!.includes(f.id)));
                    console.log('Successfully deleted file records from DB.');
                }
            }

            console.log(`Deleting action log entry with ID: ${log_id}`);
            const { error: log_error } = await supabase.from('action_log').delete().eq('id', log_id);
            if (log_error) {
                console.error("Supabase log deletion error:", log_error);
                throw log_error;
            }

            set_action_logs(prev => prev.filter(log => log.id !== log_id));
            console.log('Successfully deleted action log entry.');

        } catch (error: any) {
            console.error('Error deleting action log and associated files:', error);
            alert(`Failed to delete comment: ${error.message}`);
        }
    };

    const update_client_payments = async (client_id: string, payment_plan: PaymentPlan | undefined, payments_data: Payment[]) => {
        try {
            const { error: client_update_error } = await supabase.from('clients').update({ payment_plan }).eq('id', client_id);
            if (client_update_error) throw client_update_error;

            const { error: delete_error } = await supabase.from('payments').delete().eq('client_id', client_id);
            if (delete_error) throw delete_error;

            const valid_payments = payments_data.filter(p => p.amount || p.due_date);

            if (valid_payments.length > 0) {
                const payments_to_insert = valid_payments.map(p => ({
                    client_id: client_id,
                    due_date: p.due_date || null, // Ensure empty strings become null
                    amount: p.amount || null,
                    status: p.status,
                }));

                const { data, error: insert_error } = await supabase.from('payments').insert(payments_to_insert).select();
                
                if (insert_error) throw insert_error;

                set_clients(prev => prev.map(c => c.id === client_id ? {...c, payment_plan} : c));
                set_payments(prev => [...prev.filter(p => p.client_id !== client_id), ...data]);
            } else {
                 set_clients(prev => prev.map(c => c.id === client_id ? {...c, payment_plan} : c));
                 set_payments(prev => prev.filter(p => p.client_id !== client_id));
            }

        } catch (error: any) {
            console.error("Error updating payments:", error);
            alert(`Failed to update payments: ${error.message}`);
        }
    };
    
    const update_file = async (file_id: string, new_name: string) => {
        const file_to_update = files.find(f => f.id === file_id);
        if (!file_to_update) {
            alert("File not found for renaming.");
            return;
        }

        if (!new_name.trim()) {
            alert("File name cannot be empty.");
            return;
        }
        if (file_to_update.name === new_name.trim()) {
            return;
        }

        const { data, error } = await supabase
            .from('files')
            .update({ name: new_name.trim() })
            .eq('id', file_id)
            .select()
            .single();

        if (error) {
            console.error("Error updating file name:", error);
            alert(`Failed to rename file: ${error.message}`);
        } else if (data) {
            set_files(prev => prev.map(f => (f.id === file_id ? data as ClientFile : f)));
        }
    };

    const delete_file = async (file_id: string) => {
        const file_to_delete = files.find(f => f.id === file_id);
        if (!file_to_delete) {
            alert('File not found to delete.');
            return;
        }
    
        try {
            // 1. Delete from storage
            if (file_to_delete.storage_path) {
                const { error: storage_error } = await supabase.storage
                    .from('client-files')
                    .remove([file_to_delete.storage_path]);
                
                if (storage_error) {
                    console.error("Error deleting from storage:", storage_error.message);
                }
            }
    
            // 2. Delete from database
            const { error: db_error } = await supabase
                .from('files')
                .delete()
                .eq('id', file_id);
    
            if (db_error) {
                throw db_error;
            }
    
            // 3. Update local state
            set_files(prev => prev.filter(f => f.id !== file_id));
    
        } catch (error: any) {
            console.error('Error deleting file:', error);
            alert(`Failed to delete file: ${error.message}`);
        }
    };

    const mark_notification_read = async (notification_id: string) => {
        const { data, error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id', notification_id)
            .select()
            .single();

        if (error) {
            console.error("Error marking notification read:", error);
        } else if (data) {
            set_notifications(prev => prev.map(n => n.id === notification_id ? data : n));
        }
    };

    const mark_all_notifications_read = async () => {
        if (!current_user) return;
        const unread_ids = notifications.filter(n => !n.is_read).map(n => n.id);
        if (unread_ids.length === 0) return;

        const { data, error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .in('id', unread_ids)
            .select();

        if (error) {
            console.error("Error marking all notifications read:", error);
        } else if (data) {
            const updated_ids = new Set(data.map(d => d.id));
            set_notifications(prev => prev.map(n => updated_ids.has(n.id) ? { ...n, is_read: true } : n));
        }
    };

    const sign_out = async () => {
        await supabase.auth.signOut();
    };

    const update_user_avatar = async (file: File) => {
        if (!current_user) return;

        const file_ext = file.name.split('.').pop();
        const file_path = `${current_user.id}/avatar.${file_ext}`;

        try {
            const { error: upload_error } = await supabase.storage
                .from('avatars')
                .upload(file_path, file, { upsert: true });

            if (upload_error) throw upload_error;

            const { data: url_data } = supabase.storage
                .from('avatars')
                .getPublicUrl(file_path);
            
            // Bust cache by adding a timestamp
            const public_url = `${url_data.publicUrl}?t=${new Date().getTime()}`;

            const { data: updated_user, error: update_error } = await supabase
                .from('profiles')
                .update({ avatar_url: public_url })
                .eq('id', current_user.id)
                .select()
                .single();

            if (update_error) throw update_error;

            set_current_user(updated_user);
            set_users(prev => prev.map(u => u.id === updated_user.id ? updated_user : u));

        } catch (error: any) {
            console.error("Error updating avatar:", error);
            alert(`Failed to update avatar: ${error.message}`);
        }
    };
    
    const context_value = useMemo(() => ({
        state: { clients, users, tasks, immigration_offices, notifications, loading, current_user, session, files, action_logs, payments },
        add_client,
        update_client,
        delete_client,
        add_task,
        update_task,
        delete_task,
        update_task_status,
        add_action_log,
        update_action_log,
        delete_action_log,
        update_client_payments,
        update_file,
        delete_file,
        mark_notification_read,
        mark_all_notifications_read,
        sign_out,
        update_user_avatar,
    }), [clients, users, tasks, immigration_offices, notifications, loading, current_user, session, files, action_logs, payments]);

    return (
        <AppContext.Provider value={context_value}>
            {children}
        </AppContext.Provider>
    );
};

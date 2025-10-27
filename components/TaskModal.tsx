import React, { useState } from 'react';
import { use_app_context } from '../hooks/useAppContext';
import { Task, TaskStatus } from '../types';
import Icon from './common/Icon';

interface TaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    task?: Task;
    client_id?: string;
}


// A simple, reusable two-click date picker component
const DatePicker: React.FC<{ selected: string, onChange: (date: string) => void }> = ({ selected, onChange }) => {
    const [is_open, set_is_open] = useState(false);
    const [current_month, set_current_month] = useState(selected ? new Date(selected) : new Date());

    const selected_date = selected ? new Date(selected) : null;
     if (selected_date) {
        const timezone_offset = selected_date.getTimezoneOffset() * 60000;
        const corrected_date = new Date(selected_date.getTime() + timezone_offset);
        selected_date.setFullYear(corrected_date.getFullYear(), corrected_date.getMonth(), corrected_date.getDate());
    }


    const days_in_month = () => new Date(current_month.getFullYear(), current_month.getMonth() + 1, 0).getDate();
    const start_day_of_month = () => new Date(current_month.getFullYear(), current_month.getMonth(), 1).getDay();

    const render_days = () => {
        const days = [];
        const month_days = days_in_month();
        const first_day = start_day_of_month();

        for (let i = 0; i < first_day; i++) {
            days.push(<div key={`empty-${i}`} className="w-8 h-8"></div>);
        }

        for (let day = 1; day <= month_days; day++) {
            const date = new Date(current_month.getFullYear(), current_month.getMonth(), day);
            const is_selected = selected_date && date.toDateString() === selected_date.toDateString();
            days.push(
                <div 
                    key={day}
                    onClick={() => {
                        onChange(date.toISOString().split('T')[0]);
                        set_is_open(false);
                    }}
                    className={`w-8 h-8 flex items-center justify-center rounded-full cursor-pointer text-slate-100 ${
                        is_selected ? 'bg-blue-600 text-white' : 'hover:bg-slate-600'
                    }`}
                >
                    {day}
                </div>
            );
        }
        return days;
    };
    
    const change_month = (offset: number) => {
        set_current_month(prev => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
    };

    return (
        <div className="relative">
            <input 
                type="text" 
                value={selected} 
                onFocus={() => set_is_open(true)}
                readOnly
                placeholder="YYYY-MM-DD"
                className="mt-1 block w-full px-3 py-2 bg-slate-700 text-slate-100 border border-slate-600 rounded-md shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
            {is_open && (
                 <div className="absolute top-full mt-2 bg-slate-700 border border-slate-600 rounded-lg shadow-lg p-2 z-10">
                     <div className="flex justify-between items-center mb-2">
                        <button type="button" onClick={() => change_month(-1)} className="text-slate-300 hover:text-white"><Icon name="chevron-left" className="w-5 h-5" /></button>
                        <div className="font-semibold text-slate-100">{current_month.toLocaleString('default', { month: 'long', year: 'numeric' })}</div>
                        <button type="button" onClick={() => change_month(1)} className="text-slate-300 hover:text-white"><Icon name="chevron-right" className="w-5 h-5" /></button>
                     </div>
                     <div className="grid grid-cols-7 gap-1 text-center text-sm">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d} className="font-bold text-slate-400">{d.slice(0,2)}</div>)}
                        {render_days()}
                     </div>
                 </div>
            )}
        </div>
    );
};


const TaskModal: React.FC<TaskModalProps> = ({ isOpen, onClose, task, client_id }) => {
    const { state, add_task, update_task, delete_task } = use_app_context();
    const { users, clients, current_user } = state;
    
    const [title, set_title] = React.useState(task?.title || '');
    const [description, set_description] = React.useState(task?.description || '');
    const [assignee_id, set_assignee_id] = React.useState(task?.assignee_id || current_user.id);
    const [task_client_id, set_task_client_id] = React.useState(task?.client_id || client_id || '');
    const [due_date, set_due_date] = React.useState(task?.due_date || '');

    if (!isOpen) return null;

    const handle_submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !task_client_id) {
            alert('Title and Client are required.');
            return;
        }
        
        if (task) { // Update existing task
            const task_data: Task = {
                ...task,
                title,
                description,
                client_id: task_client_id,
                assignee_id: assignee_id,
                due_date: due_date || null,
            };
            await update_task(task_data);
        } else { // Add new task
            const task_data: Omit<Task, 'id' | 'status'> = {
                title,
                description,
                client_id: task_client_id,
                assignee_id: assignee_id,
                due_date: due_date || null,
            };
            await add_task(task_data);
        }

        onClose();
    };

    const handle_delete = async () => {
        if (task && window.confirm('Are you sure you want to delete this task?')) {
            await delete_task(task.id);
            onClose();
        }
    };

    const input_styles = "mt-1 block w-full px-3 py-2 bg-slate-700 text-slate-100 border border-slate-600 rounded-md shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm";
    
    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center"
            onClick={onClose}
        >
            <div 
                className="bg-slate-800 rounded-lg shadow-xl p-8 w-full max-w-lg border border-slate-700"
                onClick={e => e.stopPropagation()}
            >
                <h2 className="text-2xl font-bold text-slate-100 mb-6">{task ? 'Edit Task' : 'Add New Task'}</h2>
                <form onSubmit={handle_submit} className="space-y-4">
                    <div>
                        <label htmlFor="title" className="block text-sm font-medium text-slate-300">Title</label>
                        <input type="text" id="title" value={title} onChange={e => set_title(e.target.value)} required className={input_styles} />
                    </div>
                    <div>
                        <label htmlFor="client" className="block text-sm font-medium text-slate-300">Client</label>
                        <select id="client" value={task_client_id} onChange={e => set_task_client_id(e.target.value)} required className={input_styles} disabled={!!task || !!client_id}>
                            <option value="">Select a client</option>
                            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="description" className="block text-sm font-medium text-slate-300">Description</label>
                        <textarea id="description" value={description} onChange={e => set_description(e.target.value)} rows={3} className={input_styles}></textarea>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="assignee" className="block text-sm font-medium text-slate-300">Assignee</label>
                            <select id="assignee" value={assignee_id} onChange={e => set_assignee_id(e.target.value)} className={input_styles}>
                                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="due_date" className="block text-sm font-medium text-slate-300">Due Date</label>
                            <DatePicker selected={due_date} onChange={set_due_date} />
                        </div>
                    </div>
                    <div className="mt-6 flex justify-between items-center">
                        <div>
                            {task && (
                                <button
                                    type="button"
                                    onClick={handle_delete}
                                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
                                >
                                    Delete Task
                                </button>
                            )}
                        </div>
                        <div className="space-x-4">
                            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-200 bg-slate-700 rounded-lg hover:bg-slate-600">Cancel</button>
                            <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">
                               {task ? 'Save Changes' : 'Add Task'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default TaskModal;
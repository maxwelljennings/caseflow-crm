import React, { useState, useMemo, useRef, useEffect } from 'react';
import { use_app_context } from '../hooks/useAppContext';
import { Task, TaskStatus } from '../types';
import TaskModal from './TaskModal';
import Icon from './common/Icon';

interface TasksProps {
    navigate_to_client: (client_id: string) => void;
}

const get_task_priority = (due_date: string | null | undefined): { label: 'High' | 'Medium' | 'Low' | 'None', color_classes: string, value: number } => {
  if (!due_date) {
    return { label: 'None', color_classes: 'bg-slate-700 text-slate-300', value: 0 };
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(due_date);
  const timezone_offset = due.getTimezoneOffset() * 60000;
  const corrected_due = new Date(due.getTime() + timezone_offset);
  corrected_due.setHours(0, 0, 0, 0);
  const diff_time = corrected_due.getTime() - today.getTime();
  const diff_days = Math.ceil(diff_time / (1000 * 60 * 60 * 24));
  if (diff_days < 0) return { label: 'High', color_classes: 'bg-red-500/10 text-red-400', value: 3 }; // Overdue
  if (diff_days === 0) return { label: 'High', color_classes: 'bg-red-500/10 text-red-400', value: 3 }; // Due today
  if (diff_days <= 7) return { label: 'Medium', color_classes: 'bg-yellow-500/10 text-yellow-400', value: 2 }; // Due within a week
  return { label: 'Low', color_classes: 'bg-green-500/10 text-green-400', value: 1 }; // Due later
};


const Tasks: React.FC<TasksProps> = ({ navigate_to_client }) => {
    const { state, update_task_status } = use_app_context();
    const { tasks, clients, users, immigration_offices } = state;
    const [is_modal_open, set_is_modal_open] = useState(false);
    const [editing_task, set_editing_task] = useState<Task | undefined>(undefined);
    
    const [is_filter_panel_open, set_is_filter_panel_open] = useState(false);
    type Urgency = 'High' | 'Medium' | 'Low';
    const [filters, set_filters] = useState<{ assignees: string[], statuses: TaskStatus[], urgencies: Urgency[] }>({ assignees: [], statuses: [], urgencies: [] });
    const filter_ref = useRef<HTMLDivElement>(null);
    
    type Sort_Key = 'title' | 'client' | 'assignee' | 'due_date' | 'urgency' | 'office';
    const [sort_key, set_sort_key] = useState<Sort_Key>('due_date');
    const [sort_direction, set_sort_direction] = useState<'asc' | 'desc'>('asc');

    useEffect(() => {
        const handle_click_outside = (event: MouseEvent) => {
            if (filter_ref.current && !filter_ref.current.contains(event.target as Node)) {
                set_is_filter_panel_open(false);
            }
        };
        document.addEventListener('mousedown', handle_click_outside);
        return () => document.removeEventListener('mousedown', handle_click_outside);
    }, []);

    const handle_filter_change = (type: 'assignees' | 'statuses' | 'urgencies', value: string) => {
        set_filters(prev => {
            const current_values = prev[type];
            const new_values = current_values.includes(value as never)
                ? current_values.filter(item => item !== value)
                : [...current_values, value];
            return { ...prev, [type]: new_values };
        });
    };

    const clear_filters = () => {
        set_filters({ assignees: [], statuses: [], urgencies: [] });
    };

    const active_filter_count = filters.assignees.length + filters.statuses.length + filters.urgencies.length;

    const open_task_modal = (task?: Task) => {
        set_editing_task(task);
        set_is_modal_open(true);
    };

    const close_task_modal = () => {
        set_editing_task(undefined);
        set_is_modal_open(false);
    };
    
    const handle_toggle_task_status = (task: Task) => {
        const new_status = task.status === TaskStatus.DONE ? TaskStatus.TO_DO : TaskStatus.DONE;
        update_task_status(task.id, new_status);
    };

    const filtered_tasks = useMemo(() => {
        return tasks.filter(task => {
            const assignee_match = filters.assignees.length === 0 || filters.assignees.includes(task.assignee_id);
            const status_match = filters.statuses.length === 0 || filters.statuses.includes(task.status);
            
            const task_urgency_label = get_task_priority(task.due_date).label;
            const urgency_match = filters.urgencies.length === 0 || (task_urgency_label !== 'None' && filters.urgencies.includes(task_urgency_label as Urgency));

            return assignee_match && status_match && urgency_match;
        });
    }, [tasks, filters]);

    const sorted_tasks = useMemo(() => {
        let sortable_tasks = [...filtered_tasks];
        sortable_tasks.sort((a, b) => {
            if (a.status === TaskStatus.DONE && b.status !== TaskStatus.DONE) return 1;
            if (a.status !== TaskStatus.DONE && b.status === TaskStatus.DONE) return -1;
            
            let result = 0;
            if (a.status !== TaskStatus.DONE && b.status !== TaskStatus.DONE) {
                switch(sort_key) {
                    case 'title':
                        result = a.title.localeCompare(b.title);
                        break;
                    case 'client':
                        const client_a_name = clients.find(c => c.id === a.client_id)?.name || '';
                        const client_b_name = clients.find(c => c.id === b.client_id)?.name || '';
                        result = client_a_name.localeCompare(client_b_name);
                        break;
                    case 'assignee':
                        const assignee_a = users.find(u => u.id === a.assignee_id)?.name || '';
                        const assignee_b = users.find(u => u.id === b.assignee_id)?.name || '';
                        result = assignee_a.localeCompare(assignee_b);
                        break;
                    case 'due_date':
                        const date_a = a.due_date ? new Date(a.due_date).getTime() : Infinity;
                        const date_b = b.due_date ? new Date(b.due_date).getTime() : Infinity;
                        result = date_a - date_b;
                        break;
                    case 'urgency':
                        const priority_a = get_task_priority(a.due_date).value;
                        const priority_b = get_task_priority(b.due_date).value;
                        result = priority_b - priority_a; // Higher value first
                        break;
                    case 'office':
                        const client_a_office_obj = clients.find(c => c.id === a.client_id);
                        const client_b_office_obj = clients.find(c => c.id === b.client_id);
                        const office_a = immigration_offices.find(o => o.id === client_a_office_obj?.immigration_case.office_id)?.name || '';
                        const office_b = immigration_offices.find(o => o.id === client_b_office_obj?.immigration_case.office_id)?.name || '';
                        result = office_a.localeCompare(office_b);
                        break;
                }
            }
            return sort_direction === 'asc' ? result : -result;
        });
        return sortable_tasks;
    }, [filtered_tasks, sort_key, sort_direction, clients, users, immigration_offices]);
    
    const handle_sort = (key: Sort_Key) => {
        if (sort_key === key) {
            set_sort_direction(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            set_sort_key(key);
            set_sort_direction('asc');
        }
    };

    const SortableHeader: React.FC<{ label: string; sort_key: Sort_Key }> = ({ label, sort_key: key }) => {
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
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-slate-100">Tasks</h1>
                <div className="flex items-center space-x-4">
                    <div className="relative" ref={filter_ref}>
                        <button
                            onClick={() => set_is_filter_panel_open(p => !p)}
                            className="flex items-center bg-slate-700 text-slate-200 px-4 py-2 rounded-lg font-medium hover:bg-slate-600 transition-colors"
                        >
                            <Icon name="filter" className="w-4 h-4 mr-2"/>
                            Filters
                            {active_filter_count > 0 && <span className="ml-2 bg-blue-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">{active_filter_count}</span>}
                        </button>
                        {is_filter_panel_open && (
                            <div className="absolute top-full right-0 mt-2 w-80 bg-slate-700 rounded-lg shadow-lg border border-slate-600 z-10 p-4">
                                <div className="flex justify-between items-center mb-4">
                                    <h4 className="font-semibold text-slate-100">Filter Tasks</h4>
                                    <button onClick={clear_filters} className="text-sm text-blue-400 hover:underline">Clear</button>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <h5 className="text-sm font-semibold text-slate-300 mb-2">Assignee</h5>
                                        <div className="space-y-2 max-h-32 overflow-y-auto pr-2">
                                            {users.map(user => (
                                                <div key={user.id} className="flex items-center">
                                                    <input type="checkbox" id={`task-assignee-${user.id}`} checked={filters.assignees.includes(user.id)} onChange={() => handle_filter_change('assignees', user.id)} className="h-4 w-4 rounded bg-slate-600 border-slate-500 text-blue-600 focus:ring-blue-500"/>
                                                    <label htmlFor={`task-assignee-${user.id}`} className="ml-2 text-sm text-slate-200">{user.name}</label>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <h5 className="text-sm font-semibold text-slate-300 mb-2">Status</h5>
                                        <div className="space-y-2">
                                            <div className="flex items-center"><input type="checkbox" id="status-todo" checked={filters.statuses.includes(TaskStatus.TO_DO)} onChange={() => handle_filter_change('statuses', TaskStatus.TO_DO)} className="h-4 w-4 rounded bg-slate-600 border-slate-500 text-blue-600 focus:ring-blue-500"/><label htmlFor="status-todo" className="ml-2 text-sm text-slate-200">In Progress</label></div>
                                            <div className="flex items-center"><input type="checkbox" id="status-done" checked={filters.statuses.includes(TaskStatus.DONE)} onChange={() => handle_filter_change('statuses', TaskStatus.DONE)} className="h-4 w-4 rounded bg-slate-600 border-slate-500 text-blue-600 focus:ring-blue-500"/><label htmlFor="status-done" className="ml-2 text-sm text-slate-200">Done</label></div>
                                        </div>
                                    </div>
                                    <div>
                                        <h5 className="text-sm font-semibold text-slate-300 mb-2">Urgency</h5>
                                        <div className="space-y-2">
                                            {(['High', 'Medium', 'Low'] as Urgency[]).map(urgency => (
                                                 <div key={urgency} className="flex items-center"><input type="checkbox" id={`urgency-${urgency}`} checked={filters.urgencies.includes(urgency)} onChange={() => handle_filter_change('urgencies', urgency)} className="h-4 w-4 rounded bg-slate-600 border-slate-500 text-blue-600 focus:ring-blue-500"/><label htmlFor={`urgency-${urgency}`} className="ml-2 text-sm text-slate-200">{urgency}</label></div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <button onClick={() => set_is_filter_panel_open(false)} className="mt-4 w-full bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors">Done</button>
                            </div>
                        )}
                    </div>
                    <button
                        onClick={() => open_task_modal()}
                        className="flex items-center bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                    >
                        <Icon name="plus" className="w-5 h-5 mr-2" />
                        Add Task
                    </button>
                </div>
            </div>
            
            <div className="bg-slate-800 rounded-lg shadow-sm overflow-hidden">
                <table className="w-full text-sm text-left text-slate-400">
                    <thead className="text-xs text-slate-400 uppercase bg-slate-900">
                        <tr>
                            <th scope="col" className="p-4 w-4"></th>
                            <SortableHeader label="Task" sort_key="title" />
                            <SortableHeader label="Client" sort_key="client" />
                            <SortableHeader label="Assignee" sort_key="assignee" />
                            <SortableHeader label="Due Date" sort_key="due_date" />
                            <SortableHeader label="Urgency" sort_key="urgency" />
                            <SortableHeader label="Office" sort_key="office" />
                            <th scope="col" className="px-6 py-3"><span className="sr-only">Edit</span></th>
                        </tr>
                    </thead>
                    <tbody>
                        {sorted_tasks.map(task => {
                            const client = clients.find(c => c.id === task.client_id);
                            const assignee = users.find(u => u.id === task.assignee_id);
                            const office = immigration_offices.find(o => o.id === client?.immigration_case.office_id);
                            const is_done = task.status === TaskStatus.DONE;
                            const priority = get_task_priority(task.due_date);

                            return (
                                <tr 
                                    key={task.id} 
                                    onClick={() => client && navigate_to_client(client.id)}
                                    className={`border-b border-slate-700 ${is_done ? 'bg-slate-800/50' : 'bg-slate-800 hover:bg-slate-700 cursor-pointer'}`}
                                >
                                    <td className="p-4">
                                        <input
                                            type="checkbox"
                                            className="h-5 w-5 rounded border-slate-500 bg-slate-700 text-blue-600 focus:ring-blue-500"
                                            checked={is_done}
                                            onChange={() => handle_toggle_task_status(task)}
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    </td>
                                    <td className="px-6 py-4 font-medium">
                                        <span className={is_done ? 'line-through text-slate-500' : 'text-slate-100'}>{task.title}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={is_done ? 'text-slate-500' : 'text-slate-300'}>
                                            {client?.name}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">{assignee?.name}</td>
                                    <td className={`px-6 py-4 ${is_done ? 'text-slate-500' : ''}`}>{task.due_date}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${priority.color_classes}`}>
                                            {priority.label}
                                        </span>
                                    </td>
                                    <td className={`px-6 py-4 truncate ${is_done ? 'text-slate-500' : ''}`} title={office?.name}>{office?.name || 'N/A'}</td>
                                    <td className="px-6 py-4 text-right">
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                open_task_modal(task);
                                            }} 
                                            className="text-blue-400 hover:text-blue-300"
                                            title="Edit Task"
                                        >
                                            <Icon name="edit" className="w-5 h-5" />
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                 {sorted_tasks.length === 0 && <p className="p-4 text-center text-slate-500">No tasks match the current filters.</p>}
            </div>


            {is_modal_open && <TaskModal isOpen={is_modal_open} onClose={close_task_modal} task={editing_task} />}
        </div>
    );
};

export default Tasks;
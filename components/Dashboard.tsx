import React, { useState, useMemo } from 'react';
import { use_app_context } from '../hooks/useAppContext';
import { Task, TaskStatus, View } from '../types';
import TaskModal from './TaskModal';
import Icon from './common/Icon';

interface DashboardProps {
  set_view: (view: View) => void;
  navigate_to_client: (client_id: string) => void;
}

const get_task_priority = (due_date: string | null | undefined): { label: 'High' | 'Medium' | 'Low' | 'None', color_classes: string } => {
  if (!due_date) {
    return { label: 'None', color_classes: 'bg-slate-700 text-slate-300' };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0); 

  const due = new Date(due_date);
  const timezone_offset = due.getTimezoneOffset() * 60000;
  const corrected_due = new Date(due.getTime() + timezone_offset);
  corrected_due.setHours(0, 0, 0, 0);

  const diff_time = corrected_due.getTime() - today.getTime();
  const diff_days = Math.ceil(diff_time / (1000 * 60 * 60 * 24));

  if (diff_days < 0) {
    return { label: 'High', color_classes: 'bg-red-500/10 text-red-400' }; // Overdue
  }
  if (diff_days === 0) {
    return { label: 'High', color_classes: 'bg-red-500/10 text-red-400' }; // Due today
  }
  if (diff_days <= 7) {
    return { label: 'Medium', color_classes: 'bg-yellow-500/10 text-yellow-400' }; // Due within a week
  }
  return { label: 'Low', color_classes: 'bg-green-500/10 text-green-400' }; // Due later
};

const get_payment_urgency = (due_date: Date): { text: string, color_class: string } => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const diff_time = due_date.getTime() - today.getTime();
    const diff_days = Math.ceil(diff_time / (1000 * 60 * 60 * 24));

    if (diff_days < 0) {
        return { text: `Overdue by ${Math.abs(diff_days)} day(s)`, color_class: 'text-red-400' };
    }
    if (diff_days === 0) {
        return { text: 'Due today', color_class: 'text-red-400' };
    }
    if (diff_days <= 7) {
        return { text: `Due in ${diff_days} day(s)`, color_class: 'text-yellow-400' };
    }
    return { text: `Due in ${diff_days} day(s)`, color_class: 'text-slate-400' };
};


const Dashboard: React.FC<DashboardProps> = ({ set_view, navigate_to_client }) => {
  const { state, update_task_status } = use_app_context();
  const { current_user, tasks, clients, immigration_offices, payments } = state;

  const [is_task_modal_open, set_is_task_modal_open] = useState(false);
  const [editing_task, set_editing_task] = useState<Task | undefined>(undefined);
  const [sort_key, set_sort_key] = useState<'due_date' | 'office' | null>('due_date');
  const [sort_direction, set_sort_direction] = useState<'asc' | 'desc'>('asc');


  const my_tasks = tasks.filter(task => task.assignee_id === current_user?.id && task.status !== TaskStatus.DONE);
  
  const sorted_tasks = useMemo(() => {
    let sortable_tasks = [...my_tasks];
    if (sort_key) {
        sortable_tasks.sort((a, b) => {
            if (sort_key === 'due_date') {
                const date_a = a.due_date ? new Date(a.due_date).getTime() : Infinity;
                const date_b = b.due_date ? new Date(b.due_date).getTime() : Infinity;
                const result = date_a - date_b;
                return sort_direction === 'asc' ? result : -result;
            }
            if (sort_key === 'office') {
                const client_a = clients.find(c => c.id === a.client_id);
                const client_b = clients.find(c => c.id === b.client_id);
                const office_a = immigration_offices.find(o => o.id === client_a?.immigration_case.office_id)?.name || '';
                const office_b = immigration_offices.find(o => o.id === client_b?.immigration_case.office_id)?.name || '';
                const result = office_a.localeCompare(office_b);
                return sort_direction === 'asc' ? result : -result;
            }
            return 0;
        });
    }
    return sortable_tasks;
  }, [my_tasks, sort_key, sort_direction, clients, immigration_offices]);

  const recent_clients = [...clients]
    .sort((a, b) => new Date(b.last_activity_date).getTime() - new Date(a.last_activity_date).getTime())
    .slice(0, 5);

  const upcoming_payments = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const thirty_days_from_now = new Date();
    thirty_days_from_now.setDate(today.getDate() + 30);

    return payments
        .filter(p => p.status === 'Unpaid' && p.due_date)
        .map(p => {
            const due = new Date(p.due_date!);
            const timezone_offset = due.getTimezoneOffset() * 60000;
            const corrected_due = new Date(due.getTime() + timezone_offset);
            corrected_due.setHours(0, 0, 0, 0);
            return { ...p, corrected_due };
        })
        .filter(p => p.corrected_due <= thirty_days_from_now) // Overdue or due within 30 days
        .sort((a, b) => a.corrected_due.getTime() - b.corrected_due.getTime());
  }, [payments]);

  const currency_formatter = new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' });

  const open_task_modal = (task: Task) => {
    set_editing_task(task);
    set_is_task_modal_open(true);
  };
  
  const handle_toggle_task_status = (task: Task) => {
    const new_status = task.status === TaskStatus.DONE ? TaskStatus.TO_DO : TaskStatus.DONE;
    update_task_status(task.id, new_status);
  };

  const close_task_modal = () => {
    set_editing_task(undefined);
    set_is_task_modal_open(false);
  };

  const handle_sort = (key: 'due_date' | 'office') => {
    if (sort_key === key) {
        set_sort_direction(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
        set_sort_key(key);
        set_sort_direction('asc');
    }
  };

  const SortableHeader: React.FC<{ label: string; sort_key: 'due_date' | 'office' }> = ({ label, sort_key: key }) => {
    const is_active = sort_key === key;
    const icon_name = sort_direction === 'asc' ? 'chevron-up' : 'chevron-down';
    return (
      <button onClick={() => handle_sort(key)} className="flex items-center space-x-1 font-semibold text-xs uppercase text-slate-400 hover:text-slate-100">
        <span>{label}</span>
        {is_active && <Icon name={icon_name as any} className="w-4 h-4" />}
      </button>
    );
  };


  return (
    <div>
      <h1 className="text-3xl font-bold text-slate-100 mb-6">Welcome back, {current_user?.name}!</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* My Tasks */}
        <div className="lg:col-span-3 bg-slate-800 p-6 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold text-slate-100 mb-4">My Open Tasks</h2>
          <div className="space-y-3">
             {/* Headers */}
             <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-4 px-3 text-left">
                <span className="font-semibold text-xs uppercase text-slate-400">Task / Client</span>
                <SortableHeader label="Due Date" sort_key="due_date" />
                <SortableHeader label="Office" sort_key="office" />
                <span className="sr-only">Edit</span>
             </div>

            {sorted_tasks.length > 0 ? sorted_tasks.slice(0, 5).map(task => {
              const client = clients.find(c => c.id === task.client_id);
              const office = immigration_offices.find(o => o.id === client?.immigration_case.office_id);
              const priority = get_task_priority(task.due_date);
              return (
                <div 
                  key={task.id}
                  onClick={() => client && navigate_to_client(client.id)}
                  className="grid grid-cols-[1fr_1fr_1fr_auto] gap-4 items-center p-3 bg-slate-700/50 rounded-md transition-colors cursor-pointer hover:bg-slate-700"
                >
                  {/* Task & Client */}
                  <div className="flex items-center min-w-0">
                     <input
                        type="checkbox"
                        className="h-5 w-5 rounded border-slate-500 bg-slate-700 text-blue-600 focus:ring-blue-500 mr-4 flex-shrink-0"
                        checked={task.status === TaskStatus.DONE}
                        onChange={() => handle_toggle_task_status(task)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    <div className="min-w-0">
                      <p className="font-medium text-slate-100 truncate" title={task.title}>{task.title}</p>
                      <p className="text-sm text-slate-400 hover:underline truncate" title={client?.name}>
                        {client?.name}
                      </p>
                    </div>
                  </div>
                  {/* Due Date & Priority */}
                  <div>
                     <p className="text-sm text-slate-300 font-medium">{task.due_date}</p>
                     <span className={`px-2 py-1 text-xs font-semibold rounded-full ${priority.color_classes}`}>
                        {priority.label}
                     </span>
                  </div>
                  {/* Office */}
                  <div className="min-w-0">
                    <p className="text-sm text-slate-300 truncate" title={office?.name}>{office?.name || 'N/A'}</p>
                  </div>
                  {/* Edit button */}
                  <div className="text-right">
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
                  </div>
                </div>
              );
            }) : <p className="text-slate-400 p-3">No open tasks. Great job!</p>}
             <button onClick={() => set_view('tasks')} className="text-sm font-medium text-blue-400 hover:underline mt-4 px-3">View All Tasks</button>
          </div>
        </div>
        
        {/* Upcoming Payments */}
        <div className="lg:col-span-2 bg-slate-800 p-6 rounded-lg shadow-sm">
            <h2 className="text-xl font-semibold text-slate-100 mb-4">Upcoming & Overdue Payments</h2>
            <div className="space-y-3">
                {upcoming_payments.length > 0 ? upcoming_payments.slice(0, 5).map(payment => {
                    const client = clients.find(c => c.id === payment.client_id);
                    if (!client) return null;
                    const urgency = get_payment_urgency(payment.corrected_due);
                    return (
                        <div 
                            key={payment.id} 
                            onClick={() => navigate_to_client(client.id)}
                            className="flex justify-between items-center p-3 bg-slate-700/50 rounded-md transition-colors cursor-pointer hover:bg-slate-700"
                        >
                            <div className="flex items-center min-w-0">
                                <Icon name="user" className="w-5 h-5 mr-3 text-slate-400 flex-shrink-0" />
                                <div className="min-w-0">
                                    <p className="font-medium text-slate-100 truncate hover:underline" title={client.name}>{client.name}</p>
                                    <p className={`text-sm font-semibold ${urgency.color_class}`}>{urgency.text}</p>
                                </div>
                            </div>
                            <div className="text-right flex-shrink-0 ml-2">
                                <p className="font-bold text-lg text-slate-100">{currency_formatter.format(payment.amount || 0)}</p>
                                <p className="text-xs text-slate-500">{payment.due_date}</p>
                            </div>
                        </div>
                    );
                }) : <p className="text-slate-400 p-3">No payments due soon.</p>}
                 <button onClick={() => set_view('payments')} className="text-sm font-medium text-blue-400 hover:underline mt-4 px-3">View All Payments</button>
            </div>
        </div>


        {/* Recent Activity */}
        <div className="lg:col-span-3 bg-slate-800 p-6 rounded-lg shadow-sm">
            <h2 className="text-xl font-semibold text-slate-100 mb-4">Recently Active Clients</h2>
            <div className="divide-y divide-slate-700">
                {recent_clients.map(client => {
                    // Fix: Calculate open tasks count by filtering the global tasks state.
                    const open_tasks_count = tasks.filter(t => t.client_id === client.id && t.status === TaskStatus.TO_DO).length;
                    const is_active = open_tasks_count > 0;
                    return (
                        <div key={client.id} onClick={() => navigate_to_client(client.id)} className="flex justify-between items-center py-3 cursor-pointer hover:bg-slate-700/50 -mx-3 px-3 rounded-md">
                            <div>
                                <p className="font-medium text-slate-100">{client.name}</p>
                                <p className="text-sm text-slate-400">{client.immigration_case.case_number}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm text-slate-400">Last activity: {client.last_activity_date}</p>
                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${is_active ? 'bg-green-500/10 text-green-400' : 'bg-slate-700 text-slate-300'}`}>
                                    {is_active ? `Active (${open_tasks_count} open)` : 'Inactive'}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>

        {/* Quick Stats */}
        <div className="lg:col-span-2 bg-slate-800 p-6 rounded-lg shadow-sm">
           <h2 className="text-xl font-semibold text-slate-100 mb-4">Overview</h2>
           <div className="space-y-4">
             <div className="flex justify-between items-center p-4 bg-blue-900/50 rounded-lg">
                <p className="font-semibold text-blue-300">Total Clients</p>
                <p className="text-2xl font-bold text-blue-400">{clients.length}</p>
             </div>
              <div className="flex justify-between items-center p-4 bg-green-900/50 rounded-lg">
                <p className="font-semibold text-green-300">Open Tasks</p>
                <p className="text-2xl font-bold text-green-400">{tasks.filter(t => t.status !== TaskStatus.DONE).length}</p>
             </div>
           </div>
        </div>

      </div>
      
      {is_task_modal_open && <TaskModal isOpen={is_task_modal_open} onClose={close_task_modal} task={editing_task} />}
    </div>
  );
};

export default Dashboard;
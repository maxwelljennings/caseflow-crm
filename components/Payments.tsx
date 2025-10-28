import React, { useState, useMemo, useRef, useEffect } from 'react';
import { use_app_context } from '../hooks/useAppContext';
import Icon from './common/Icon';
import type { Payment } from '../types';

interface PaymentsProps {
    navigate_to_client: (client_id: string) => void;
}

interface EnrichedPayment extends Payment {
    corrected_due: Date;
    urgency_value: number;
}

const get_payment_urgency = (due_date: Date): { text: string; color_class: string; value: number } => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const diff_time = due_date.getTime() - today.getTime();
    const diff_days = Math.ceil(diff_time / (1000 * 60 * 60 * 24));

    if (diff_days < 0) {
        return { text: `Overdue by ${Math.abs(diff_days)}d`, color_class: 'bg-red-500/10 text-red-400', value: 3 };
    }
    if (diff_days === 0) {
        return { text: 'Due today', color_class: 'bg-red-500/10 text-red-400', value: 3 };
    }
    if (diff_days <= 7) {
        return { text: `Due in ${diff_days}d`, color_class: 'bg-yellow-500/10 text-yellow-400', value: 2 };
    }
    return { text: `Due in ${diff_days}d`, color_class: 'bg-slate-700 text-slate-300', value: 1 };
};


const Payments: React.FC<PaymentsProps> = ({ navigate_to_client }) => {
    const { state } = use_app_context();
    const { payments, clients, users } = state;
    
    const [is_filter_panel_open, set_is_filter_panel_open] = useState(false);
    type UrgencyCategory = 'Overdue & Today' | 'Upcoming';
    const [filters, set_filters] = useState<{ assignees: string[], urgencies: UrgencyCategory[] }>({ assignees: [], urgencies: [] });
    const filter_ref = useRef<HTMLDivElement>(null);
    const [assignee_search, set_assignee_search] = useState('');
    
    type Sort_Key = 'client' | 'amount' | 'due_date' | 'urgency' | 'assignee';
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

    const handle_filter_change = (type: 'assignees' | 'urgencies', value: string) => {
        set_filters(prev => {
            const current_values = prev[type];
            const new_values = current_values.includes(value as never)
                ? current_values.filter(item => item !== value)
                : [...current_values, value];
            return { ...prev, [type]: new_values };
        });
    };
    
    const clear_filters = () => {
        set_filters({ assignees: [], urgencies: [] });
        set_assignee_search('');
    };
    
    const active_filter_count = filters.assignees.length + filters.urgencies.length;
    const show_all_assignees = filters.assignees.length === 0;

    const enriched_payments = useMemo((): EnrichedPayment[] => {
        return payments
            .filter(p => p.status === 'Unpaid' && p.due_date)
            .map(p => {
                const due = new Date(p.due_date!);
                const timezone_offset = due.getTimezoneOffset() * 60000;
                const corrected_due = new Date(due.getTime() + timezone_offset);
                corrected_due.setHours(0, 0, 0, 0);
                return { ...p, corrected_due, urgency_value: get_payment_urgency(corrected_due).value };
            });
    }, [payments]);

    const filtered_payments = useMemo(() => {
        return enriched_payments.filter(p => {
            const client = clients.find(c => c.id === p.client_id);
            if (!client) return false;

            const assignee_match = filters.assignees.length === 0 || 
                client.assignee_ids.some(assignee_id => filters.assignees.includes(assignee_id));

            const today = new Date(); today.setHours(0,0,0,0);
            const diff_time = p.corrected_due.getTime() - today.getTime();
            const diff_days = Math.ceil(diff_time / (1000 * 60 * 60 * 24));
            
            const urgency_category = diff_days <= 0 ? 'Overdue & Today' : 'Upcoming';
            const urgency_match = filters.urgencies.length === 0 || filters.urgencies.includes(urgency_category);

            return assignee_match && urgency_match;
        });
    }, [enriched_payments, filters, clients]);


    const sorted_payments = useMemo(() => {
        return [...filtered_payments].sort((a, b) => {
            let result = 0;
            switch(sort_key) {
                case 'client':
                    const client_a_name = clients.find(c => c.id === a.client_id)?.name || '';
                    const client_b_name = clients.find(c => c.id === b.client_id)?.name || '';
                    result = client_a_name.localeCompare(client_b_name);
                    break;
                case 'amount':
                    result = (a.amount || 0) - (b.amount || 0);
                    break;
                case 'due_date':
                    result = a.corrected_due.getTime() - b.corrected_due.getTime();
                    break;
                case 'urgency':
                    result = a.urgency_value - b.urgency_value;
                    break;
                case 'assignee':
                    const client_a = clients.find(c => c.id === a.client_id);
                    const client_b = clients.find(c => c.id === b.client_id);
                    const assignee_a_name = users.find(u => u.id === client_a?.assignee_ids[0])?.name || '';
                    const assignee_b_name = users.find(u => u.id === client_b?.assignee_ids[0])?.name || '';
                    result = assignee_a_name.localeCompare(assignee_b_name);
                    break;
            }
            return sort_direction === 'asc' ? result : -result;
        });
    }, [filtered_payments, sort_key, sort_direction, clients, users]);
    
    const handle_sort = (key: Sort_Key) => {
        if (sort_key === key) {
            set_sort_direction(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            set_sort_key(key);
            set_sort_direction('asc');
        }
    };
    
    const currency_formatter = new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' });

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
                <h1 className="text-3xl font-bold text-slate-100">Upcoming Payments</h1>
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
                                <h4 className="font-semibold text-slate-100">Filter Payments</h4>
                                <button onClick={clear_filters} className="text-sm text-blue-400 hover:underline">Clear</button>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <h5 className="text-sm font-semibold text-slate-300 mb-2">Assignee</h5>
                                    <div className="relative mb-2">
                                        <Icon name="search" className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input
                                            type="text"
                                            placeholder="Search assignee..."
                                            value={assignee_search}
                                            onChange={(e) => set_assignee_search(e.target.value)}
                                            className="w-full pl-8 pr-2 py-1 text-sm bg-slate-600 text-slate-100 border border-slate-500 rounded-md placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div className="space-y-2 max-h-32 overflow-y-auto pr-2">
                                        {users
                                            .filter(user => user.name.toLowerCase().includes(assignee_search.toLowerCase()))
                                            .map(user => (
                                            <div key={user.id} className="flex items-center">
                                                <input type="checkbox" id={`pay-assignee-${user.id}`} checked={filters.assignees.includes(user.id)} onChange={() => handle_filter_change('assignees', user.id)} className="h-4 w-4 rounded bg-slate-600 border-slate-500 text-blue-600 focus:ring-blue-500"/>
                                                <label htmlFor={`pay-assignee-${user.id}`} className="ml-2 text-sm text-slate-200">{user.name}</label>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                 <div>
                                    <h5 className="text-sm font-semibold text-slate-300 mb-2">Urgency</h5>
                                    <div className="space-y-2">
                                        {(['Overdue & Today', 'Upcoming'] as UrgencyCategory[]).map(urgency => (
                                            <div key={urgency} className="flex items-center">
                                                <input type="checkbox" id={`urgency-${urgency}`} checked={filters.urgencies.includes(urgency)} onChange={() => handle_filter_change('urgencies', urgency)} className="h-4 w-4 rounded bg-slate-600 border-slate-500 text-blue-600 focus:ring-blue-500"/>
                                                <label htmlFor={`urgency-${urgency}`} className="ml-2 text-sm text-slate-200">{urgency}</label>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                             <button onClick={() => set_is_filter_panel_open(false)} className="mt-4 w-full bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors">Done</button>
                         </div>
                    )}
                </div>
            </div>
            
            <div className="bg-slate-800 rounded-lg shadow-sm overflow-hidden">
                <table className="w-full text-sm text-left text-slate-400">
                    <thead className="text-xs text-slate-400 uppercase bg-slate-900">
                        <tr>
                            <SortableHeader label="Client" sort_key="client" />
                            <SortableHeader label="Amount" sort_key="amount" />
                            <SortableHeader label="Due Date" sort_key="due_date" />
                            <SortableHeader label="Urgency" sort_key="urgency" />
                            {show_all_assignees && <SortableHeader label="Assignees" sort_key="assignee" />}
                        </tr>
                    </thead>
                    <tbody>
                        {sorted_payments.map(payment => {
                            const client = clients.find(c => c.id === payment.client_id);
                            const assignees = show_all_assignees ? users.filter(u => client?.assignee_ids.includes(u.id)) : [];
                            const urgency = get_payment_urgency(payment.corrected_due);

                            return (
                                <tr 
                                    key={payment.id} 
                                    onClick={() => client && navigate_to_client(client.id)}
                                    className="bg-slate-800 border-b border-slate-700 hover:bg-slate-700 cursor-pointer"
                                >
                                    <td className="px-6 py-4 font-medium text-slate-100">{client?.name}</td>
                                    <td className="px-6 py-4 font-semibold text-slate-100">{currency_formatter.format(payment.amount || 0)}</td>
                                    <td className="px-6 py-4">{payment.due_date}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${urgency.color_class}`}>
                                            {urgency.text}
                                        </span>
                                    </td>
                                    {show_all_assignees && (
                                        <td className="px-6 py-4">
                                            <div className="flex items-center -space-x-2">
                                                {assignees.slice(0, 3).map(assignee => (
                                                    <img key={assignee.id} src={assignee.avatar_url} alt={assignee.name} title={assignee.name} className="w-8 h-8 rounded-full border-2 border-slate-800" />
                                                ))}
                                                {assignees.length > 3 && (
                                                    <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center text-xs font-bold text-slate-200 border-2 border-slate-800">
                                                        +{assignees.length - 3}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                 {sorted_payments.length === 0 && <p className="p-4 text-center text-slate-500">No upcoming payments match the current filters.</p>}
            </div>
        </div>
    );
};

export default Payments;
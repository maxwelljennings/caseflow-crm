import React, { useState, useMemo, useRef, useEffect } from 'react';
import { use_app_context } from '../hooks/useAppContext';
import AddClientModal from './AddClientModal';
import Icon from './common/Icon';

interface ClientsProps {
  navigate_to_client: (client_id: string) => void;
}

const Clients: React.FC<ClientsProps> = ({ navigate_to_client }) => {
  const { state } = use_app_context();
  const { clients, users, immigration_offices } = state;
  const [search_term, set_search_term] = useState('');
  const [is_modal_open, set_is_modal_open] = useState(false);
  
  const [is_filter_panel_open, set_is_filter_panel_open] = useState(false);
  const [filters, set_filters] = useState<{ assignees: string[], offices: string[] }>({ assignees: [], offices: [] });
  const filter_ref = useRef<HTMLDivElement>(null);
  const [assignee_search, set_assignee_search] = useState('');
  
  type Sort_Key = 'name' | 'case_number' | 'assignee' | 'last_activity_date';
  const [sort_key, set_sort_key] = useState<Sort_Key>('last_activity_date');
  const [sort_direction, set_sort_direction] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    const handle_click_outside = (event: MouseEvent) => {
        if (filter_ref.current && !filter_ref.current.contains(event.target as Node)) {
            set_is_filter_panel_open(false);
        }
    };
    document.addEventListener('mousedown', handle_click_outside);
    return () => document.removeEventListener('mousedown', handle_click_outside);
  }, []);

  const handle_filter_change = (type: 'assignees' | 'offices', value: string) => {
    set_filters(prev => {
        const current_values = prev[type];
        const new_values = current_values.includes(value)
            ? current_values.filter(item => item !== value)
            : [...current_values, value];
        return { ...prev, [type]: new_values };
    });
  };

  const clear_filters = () => {
    set_filters({ assignees: [], offices: [] });
    set_assignee_search('');
  };
  
  const active_filter_count = filters.assignees.length + filters.offices.length;

  const filtered_clients = useMemo(() => {
    return clients.filter(client => {
        const search_match = client.name.toLowerCase().includes(search_term.toLowerCase()) ||
            (client.immigration_case.case_number || '').toLowerCase().includes(search_term.toLowerCase());
        
        const assignee_match = filters.assignees.length === 0 || 
            client.assignee_ids.some(assignee_id => filters.assignees.includes(assignee_id));
        
        const office_match = filters.offices.length === 0 || filters.offices.includes(client.immigration_case.office_id);

        return search_match && assignee_match && office_match;
      });
  }, [clients, search_term, filters]);

  const sorted_clients = useMemo(() => {
    let sortable_clients = [...filtered_clients];
    sortable_clients.sort((a, b) => {
        let result = 0;
        switch (sort_key) {
            case 'name':
                result = a.name.localeCompare(b.name);
                break;
            case 'case_number':
                result = (a.immigration_case.case_number || '').localeCompare(b.immigration_case.case_number || '');
                break;
            case 'assignee':
                const first_assignee_a = users.find(u => u.id === a.assignee_ids[0])?.name || '';
                const first_assignee_b = users.find(u => u.id === b.assignee_ids[0])?.name || '';
                result = first_assignee_a.localeCompare(first_assignee_b);
                break;
            case 'last_activity_date':
                result = new Date(a.last_activity_date).getTime() - new Date(b.last_activity_date).getTime();
                break;
            default:
                return 0;
        }
        return sort_direction === 'asc' ? result : -result;
    });
    return sortable_clients;
  }, [filtered_clients, sort_key, sort_direction, users]);
  
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
        <h1 className="text-3xl font-bold text-slate-100">Clients</h1>
        <button
          onClick={() => set_is_modal_open(true)}
          className="flex items-center bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
        >
          <Icon name="plus" className="w-5 h-5 mr-2" />
          Add Client
        </button>
      </div>

      <div className="mb-6 flex space-x-4">
          <div className="relative flex-grow">
            <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
                type="text"
                placeholder="Search by name or case number..."
                value={search_term}
                onChange={e => set_search_term(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-800 text-slate-100 border border-slate-600 rounded-lg placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
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
                        <h4 className="font-semibold text-slate-100">Filter Clients</h4>
                        <button onClick={clear_filters} className="text-sm text-blue-400 hover:underline">Clear</button>
                    </div>
                    
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
                        <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                            {users
                                .filter(user => user.name.toLowerCase().includes(assignee_search.toLowerCase()))
                                .map(user => (
                                <div key={user.id} className="flex items-center">
                                    <input type="checkbox" id={`assignee-${user.id}`} checked={filters.assignees.includes(user.id)} onChange={() => handle_filter_change('assignees', user.id)} className="h-4 w-4 rounded bg-slate-600 border-slate-500 text-blue-600 focus:ring-blue-500"/>
                                    <label htmlFor={`assignee-${user.id}`} className="ml-2 text-sm text-slate-200">{user.name}</label>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="mt-4">
                        <h5 className="text-sm font-semibold text-slate-300 mb-2">Immigration Office</h5>
                        <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                            {immigration_offices.map(office => (
                                <div key={office.id} className="flex items-center">
                                    <input type="checkbox" id={`office-${office.id}`} checked={filters.offices.includes(office.id)} onChange={() => handle_filter_change('offices', office.id)} className="h-4 w-4 rounded bg-slate-600 border-slate-500 text-blue-600 focus:ring-blue-500"/>
                                    <label htmlFor={`office-${office.id}`} className="ml-2 text-sm text-slate-200">{office.name}</label>
                                </div>
                            ))}
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
              <SortableHeader label="Client Name" sort_key="name" />
              <SortableHeader label="Case Number" sort_key="case_number" />
              <SortableHeader label="Assignee" sort_key="assignee" />
              <SortableHeader label="Last Activity" sort_key="last_activity_date" />
            </tr>
          </thead>
          <tbody>
            {sorted_clients.map(client => {
              const assignees = users.filter(u => client.assignee_ids.includes(u.id));
              return (
                <tr
                  key={client.id}
                  onClick={() => navigate_to_client(client.id)}
                  className="bg-slate-800 border-b border-slate-700 hover:bg-slate-700 cursor-pointer"
                >
                  <td className="px-6 py-4 font-medium text-slate-100 whitespace-nowrap">{client.name}</td>
                  <td className="px-6 py-4">{client.immigration_case.case_number}</td>
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
                  <td className="px-6 py-4">{client.last_activity_date}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <AddClientModal isOpen={is_modal_open} onClose={() => set_is_modal_open(false)} />
    </div>
  );
};

export default Clients;
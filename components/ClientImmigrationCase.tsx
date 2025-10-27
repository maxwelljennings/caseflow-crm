import React, { useState, useEffect } from 'react';
import type { Client, ImmigrationCase } from '../types';
import { use_app_context } from '../hooks/useAppContext';
import Icon from './common/Icon';

interface ClientImmigrationCaseProps {
    client: Client;
}

const ReadOnlyField: React.FC<{ label: string; value?: string | null; children?: React.ReactNode }> = ({ label, value, children }) => (
    <div>
        <label className="block text-xs font-medium text-slate-400">{label}</label>
        {children ? <div className="text-sm text-slate-200">{children}</div> : <p className="text-sm text-slate-200">{value || 'N/A'}</p>}
    </div>
);

const EditField: React.FC<React.InputHTMLAttributes<HTMLInputElement | HTMLSelectElement> & { label: string }> = ({ label, ...props }) => (
    <div>
        <label htmlFor={props.id || props.name} className="block text-sm font-medium text-slate-300">{label}</label>
        {props.type === 'select' ? (
            <select {...props} className="mt-1 block w-full px-3 py-2 bg-slate-700 text-slate-100 border border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">{props.children}</select>
        ) : (
            <input {...props} className="mt-1 block w-full px-3 py-2 bg-slate-700 text-slate-100 border border-slate-600 rounded-md shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
        )}
    </div>
);


const ClientImmigrationCase: React.FC<ClientImmigrationCaseProps> = ({ client }) => {
    const { state: { immigration_offices }, update_client } = use_app_context();
    const [is_editing, set_is_editing] = useState(false);
    const [form_data, set_form_data] = useState<ImmigrationCase>(client.immigration_case);

    useEffect(() => {
        set_form_data(client.immigration_case);
    }, [client]);

    const current_office = immigration_offices.find(o => o.id === form_data.office_id);
    const transfer_office = immigration_offices.find(o => o.id === form_data.transfer_office_id);
    
    const handle_save = async () => {
        await update_client({ ...client, immigration_case: form_data });
        set_is_editing(false);
    };

    const handle_cancel = () => {
        set_form_data(client.immigration_case);
        set_is_editing(false);
    };

    const handle_mark_as_transferred = async () => {
        if (!form_data.transfer_office_id) return;
        const new_immigration_case: ImmigrationCase = {
            ...form_data,
            office_id: form_data.transfer_office_id,
            is_transferring: false,
            transfer_office_id: undefined,
        };
        await update_client({ ...client, immigration_case: new_immigration_case });
        set_form_data(new_immigration_case); // Update local state immediately
        set_is_editing(false);
    };
    
    return (
        <div className="bg-slate-800 p-6 rounded-lg shadow-sm">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-slate-100">Immigration Office Case</h3>
                 <div>
                    {is_editing ? (
                        <>
                            <button onClick={handle_cancel} className="px-3 py-1 text-sm font-medium text-slate-200 bg-slate-700 rounded-md hover:bg-slate-600 mr-2">Cancel</button>
                            <button onClick={handle_save} className="px-3 py-1 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">
                               Save
                            </button>
                        </>
                    ) : (
                        <button onClick={() => set_is_editing(true)} className="px-3 py-1 text-sm font-medium text-slate-300 rounded-md hover:bg-slate-700">
                            Edit
                        </button>
                    )}
                </div>
            </div>

            {is_editing ? (
                <div className="space-y-4">
                    <EditField label="Immigration Office (Urząd)" type="select" value={form_data.office_id} onChange={e => set_form_data({...form_data, office_id: e.target.value})}>
                        {immigration_offices.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                    </EditField>
                    <EditField label="Case Number" placeholder="e.g., 123/P/2024" value={form_data.case_number || ''} onChange={e => set_form_data({...form_data, case_number: e.target.value})} />
                    <EditField label="Password to Case" placeholder="e.g., Abc12345" value={form_data.case_password || ''} onChange={e => set_form_data({...form_data, case_password: e.target.value})} />
                    
                    <div className="pt-2">
                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                id="is_transferring"
                                checked={!!form_data.is_transferring}
                                onChange={e => set_form_data({...form_data, is_transferring: e.target.checked, transfer_office_id: e.target.checked ? form_data.transfer_office_id : undefined })}
                                className="h-4 w-4 rounded border-slate-500 bg-slate-600 text-blue-600 focus:ring-blue-500"
                            />
                            <label htmlFor="is_transferring" className="ml-2 text-sm font-medium text-slate-300">Case is being transferred?</label>
                        </div>
                    </div>

                    {form_data.is_transferring && (
                        <EditField label="Transferring to Office" type="select" value={form_data.transfer_office_id || ''} onChange={e => set_form_data({...form_data, transfer_office_id: e.target.value})}>
                             <option value="">Select destination office...</option>
                             {immigration_offices.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                        </EditField>
                    )}
                </div>
            ) : (
                <div className="space-y-4">
                    <ReadOnlyField label="Immigration Office (Urząd)">
                        <p className="font-semibold">{current_office?.name}</p>
                        <p className="text-xs text-slate-400">{current_office?.address}</p>
                    </ReadOnlyField>
                    <ReadOnlyField label="Case Number" value={form_data.case_number} />
                    <ReadOnlyField label="Password to Case" value={form_data.case_password} />
                    
                    {form_data.is_transferring && (
                        <div className="p-3 bg-yellow-900/50 border border-yellow-800 rounded-lg">
                            <ReadOnlyField label="Transfer in Progress">
                                <p className="font-semibold text-yellow-300">Transferring to: {transfer_office?.name}</p>
                            </ReadOnlyField>
                            <button 
                                onClick={handle_mark_as_transferred}
                                className="mt-2 text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700 px-3 py-1 rounded-md"
                            >
                                Mark as Transferred
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ClientImmigrationCase;
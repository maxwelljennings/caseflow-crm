import React, { useState, useEffect } from 'react';
import type { Client } from '../types';
import { use_app_context } from '../hooks/useAppContext';
import Icon from './common/Icon';

interface ClientCaseDescriptionProps {
    client: Client;
}

const ClientCaseDescription: React.FC<ClientCaseDescriptionProps> = ({ client }) => {
    const { update_client } = use_app_context();
    const [is_editing, set_is_editing] = useState(false);
    const [description, set_description] = useState(client.case_description || '');

    useEffect(() => {
        set_description(client.case_description || '');
    }, [client.case_description]);

    const handle_save = async () => {
        await update_client({ ...client, case_description: description });
        set_is_editing(false);
    };

    const handle_cancel = () => {
        set_description(client.case_description || '');
        set_is_editing(false);
    };

    return (
        <div className="bg-slate-800 p-6 rounded-lg shadow-sm mb-6">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-slate-100">Case Summary</h3>
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
                <textarea
                    value={description}
                    onChange={e => set_description(e.target.value)}
                    placeholder="Enter a summary of the case, client's question, etc..."
                    rows={4}
                    className="w-full p-2 bg-slate-700 text-slate-100 border border-blue-500 rounded-md text-sm placeholder:text-slate-400 focus:ring-blue-500 focus:border-blue-500"
                    autoFocus
                ></textarea>
            ) : (
                <p className="text-sm text-slate-300 whitespace-pre-wrap">
                    {description || <span className="text-slate-500">No case summary provided. Click 'Edit' to add one.</span>}
                </p>
            )}
        </div>
    );
};

export default ClientCaseDescription;
import React, { useState, useEffect } from 'react';
import { use_app_context } from '../hooks/useAppContext';
import type { Client } from '../types';
import Icon from './common/Icon';

interface EditClientModalProps {
    isOpen: boolean;
    onClose: () => void;
    client: Client;
}

const EditClientModal: React.FC<EditClientModalProps> = ({ isOpen, onClose, client }) => {
    const { update_client, delete_client, state: { users, immigration_offices } } = use_app_context();
    const [client_data, set_client_data] = useState({
        name: '',
        case_number: '',
        email: '',
        phone: '',
        nationality: '',
        passport_number: '',
        office_id: '',
    });

    useEffect(() => {
        if (client) {
            // Fix: Initialize state from the nested client object structure.
            set_client_data({
                name: client.name,
                case_number: client.case_number,
                email: client.contact.email || '',
                phone: client.contact.phone || '',
                nationality: client.details.nationality || '',
                passport_number: client.details.passport_number || '',
                office_id: client.immigration_case.office_id,
            });
        }
    }, [client]);

    if (!isOpen) return null;

    const handle_change = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        set_client_data(prev => ({ ...prev, [name]: value }));
    };

    const handle_submit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Fix: Construct the updated client with the correct nested structure.
        const updated_client: Client = {
            ...client,
            name: client_data.name,
            case_number: client_data.case_number,
            contact: {
                ...client.contact,
                email: client_data.email,
                phone: client_data.phone,
            },
            details: {
                ...client.details,
                nationality: client_data.nationality,
                passport_number: client_data.passport_number,
            },
            immigration_case: {
                ...client.immigration_case,
                office_id: client_data.office_id,
            }
        };

        await update_client(updated_client);
        onClose();
    };

    const handle_delete = async () => {
        if (window.confirm(`Are you sure you want to permanently delete ${client.name}? This action cannot be undone.`)) {
            await delete_client(client.id);
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
                className="bg-slate-800 rounded-lg shadow-xl p-8 w-full max-w-2xl border border-slate-700"
                onClick={e => e.stopPropagation()}
            >
                <h2 className="text-2xl font-bold text-slate-100 mb-6">Edit Client Details</h2>
                <form onSubmit={handle_submit}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-slate-300">Full Name</label>
                            <input type="text" name="name" id="name" value={client_data.name} onChange={handle_change} required className={input_styles} />
                        </div>
                        <div>
                            <label htmlFor="case_number" className="block text-sm font-medium text-slate-300">Case Number</label>
                            <input type="text" name="case_number" id="case_number" value={client_data.case_number} onChange={handle_change} required className={input_styles} />
                        </div>
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-slate-300">Email Address</label>
                            <input type="email" name="email" id="email" value={client_data.email} onChange={handle_change} className={input_styles} />
                        </div>
                        <div>
                            <label htmlFor="phone" className="block text-sm font-medium text-slate-300">Phone Number</label>
                            <input type="tel" name="phone" id="phone" value={client_data.phone} onChange={handle_change} className={input_styles} />
                        </div>
                        <div>
                            <label htmlFor="nationality" className="block text-sm font-medium text-slate-300">Nationality</label>
                            <input type="text" name="nationality" id="nationality" value={client_data.nationality} onChange={handle_change} className={input_styles} />
                        </div>
                         <div>
                            <label htmlFor="passport_number" className="block text-sm font-medium text-slate-300">Passport Number</label>
                            <input type="text" name="passport_number" id="passport_number" value={client_data.passport_number} onChange={handle_change} className={input_styles} />
                        </div>
                        <div className="md:col-span-2">
                            <label htmlFor="office_id" className="block text-sm font-medium text-slate-300">Immigration Office</label>
                            <select name="office_id" id="office_id" value={client_data.office_id} onChange={handle_change} className={input_styles}>
                                {immigration_offices.map(office => <option key={office.id} value={office.id}>{office.name}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="mt-8 flex justify-between items-center">
                         <button 
                            type="button" 
                            onClick={handle_delete}
                            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
                        >
                            Delete Client
                        </button>
                        <div className="space-x-4">
                            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-200 bg-slate-700 rounded-lg hover:bg-slate-600">Cancel</button>
                            <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">
                                Save Changes
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditClientModal;
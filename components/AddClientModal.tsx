import React, { useState, useEffect } from 'react';
import { use_app_context } from '../hooks/useAppContext';
import type { Client } from '../types';
import Icon from './common/Icon';
import { useCountryOptions } from '../hooks/useCountryOptions';

interface AddClientModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const AddClientModal: React.FC<AddClientModalProps> = ({ isOpen, onClose }) => {
    const { add_client, state: { users, current_user, immigration_offices } } = use_app_context();
    const sorted_countries = useCountryOptions();
    const [new_client, set_new_client] = useState({
        first_name: '',
        last_name: '',
        case_number: '',
        email: '',
        phone: '',
        nationality: '',
        passport_number: '',
        office_id: '', // Start with empty string to prevent sending invalid default
    });

    // Set default office_id once the offices are loaded to prevent sending an empty string
    useEffect(() => {
        if (isOpen && immigration_offices.length > 0 && !new_client.office_id) {
            set_new_client(prev => ({ ...prev, office_id: immigration_offices[0].id }));
        }
    }, [isOpen, immigration_offices, new_client.office_id]);


    if (!isOpen || !current_user) return null;

    const handle_change = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        set_new_client(prev => ({ ...prev, [name]: value }));
    };

    const handle_submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!new_client.first_name || !new_client.last_name) {
            alert('First Name and Last Name are required.');
            return;
        }
        // Add validation for office_id
        if (!new_client.office_id) {
            alert('Please select an Immigration Office.');
            return;
        }

        const client_to_add: Omit<Client, 'id'> = {
            name: `${new_client.first_name} ${new_client.last_name}`.trim(),
            assignee_ids: [current_user.id],
            last_activity_date: new Date().toISOString().split('T')[0],
            immigration_case: {
                office_id: new_client.office_id,
                case_number: new_client.case_number,
            },
            contact: {
                phone: new_client.phone,
                email: new_client.email,
            },
            details: {
                nationality: new_client.nationality,
                passport_number: new_client.passport_number,
            },
        };

        await add_client(client_to_add as Omit<Client, 'id'>);
        onClose();
    };

    const input_styles = "mt-1 block w-full px-3 py-2 bg-slate-700 text-slate-100 border border-slate-600 rounded-md shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm";

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center"
            onClick={onClose}
        >
            <div 
                className="bg-slate-800 rounded-lg shadow-xl p-8 w-full max-w-2xl transform transition-all border border-slate-700"
                onClick={e => e.stopPropagation()}
            >
                <h2 className="text-2xl font-bold text-slate-100 mb-6">Add New Client</h2>
                <form onSubmit={handle_submit}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Column 1 */}
                        <div>
                            <label htmlFor="first_name" className="block text-sm font-medium text-slate-300">First Name</label>
                            <input type="text" name="first_name" id="first_name" value={new_client.first_name} onChange={handle_change} required className={input_styles} />
                        </div>
                        <div>
                            <label htmlFor="last_name" className="block text-sm font-medium text-slate-300">Last Name</label>
                            <input type="text" name="last_name" id="last_name" value={new_client.last_name} onChange={handle_change} required className={input_styles} />
                        </div>
                        <div>
                            <label htmlFor="case_number" className="block text-sm font-medium text-slate-300">Case Number</label>
                            <input type="text" name="case_number" id="case_number" value={new_client.case_number} onChange={handle_change} className={input_styles} />
                        </div>
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-slate-300">Email Address</label>
                            <input type="email" name="email" id="email" value={new_client.email} onChange={handle_change} className={input_styles} />
                        </div>
                        <div>
                            <label htmlFor="phone" className="block text-sm font-medium text-slate-300">Phone Number</label>
                            <input type="tel" name="phone" id="phone" value={new_client.phone} onChange={handle_change} className={input_styles} />
                        </div>

                        {/* Column 2 */}
                        <div>
                            <label htmlFor="nationality" className="block text-sm font-medium text-slate-300">Nationality</label>
                            <select name="nationality" id="nationality" value={new_client.nationality} onChange={handle_change} className={input_styles}>
                                <option value="">Select a country</option>
                                {sorted_countries.map(country => <option key={country} value={country}>{country}</option>)}
                            </select>
                        </div>
                         <div>
                            <label htmlFor="passport_number" className="block text-sm font-medium text-slate-300">Passport Number</label>
                            <input type="text" name="passport_number" id="passport_number" value={new_client.passport_number} onChange={handle_change} className={input_styles} />
                        </div>
                        <div className="md:col-span-2">
                            <label htmlFor="office_id" className="block text-sm font-medium text-slate-300">Immigration Office (Urząd)</label>
                            <select name="office_id" id="office_id" value={new_client.office_id} onChange={handle_change} required className={input_styles}>
                                <option value="" disabled>Loading offices...</option>
                                {immigration_offices.map(office => <option key={office.id} value={office.id}>{office.name}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="mt-8 flex justify-end space-x-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-200 bg-slate-700 rounded-lg hover:bg-slate-600">Cancel</button>
                        <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">
                            Save Client
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddClientModal;
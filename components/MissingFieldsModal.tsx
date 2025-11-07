import React, { useState, useEffect } from 'react';
import { MissingField } from '../types';
import Icon from './common/Icon';

interface MissingFieldsModalProps {
    isOpen: boolean;
    onClose: () => void;
    missingFields: MissingField[];
    onSubmit: (updatedData: Record<string, string>, shouldSave: boolean) => void;
}

const MissingFieldsModal: React.FC<MissingFieldsModalProps> = ({ isOpen, onClose, missingFields, onSubmit }) => {
    const [formData, setFormData] = useState<Record<string, string>>({});
    const [shouldSave, setShouldSave] = useState(true);

    useEffect(() => {
        if (isOpen) {
            const initialData = missingFields.reduce((acc, field) => {
                acc[field.path] = field.value;
                return acc;
            }, {} as Record<string, string>);
            setFormData(initialData);
        }
    }, [isOpen, missingFields]);

    if (!isOpen) return null;

    const handleInputChange = (path: string, value: string) => {
        setFormData(prev => ({ ...prev, [path]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(formData, shouldSave);
    };

    const input_styles = "mt-1 block w-full px-3 py-2 bg-slate-700 text-slate-100 border border-slate-600 rounded-md shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm";

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center"
            onClick={onClose}
        >
            <div 
                className="bg-slate-800 rounded-lg shadow-xl p-8 w-full max-w-lg transform transition-all border border-slate-700"
                onClick={e => e.stopPropagation()}
            >
                <h2 className="text-2xl font-bold text-slate-100 mb-2">Missing Information</h2>
                <p className="text-slate-400 mb-6">The selected template requires the following information which is missing from the client's profile. Please fill it in to proceed.</p>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="max-h-60 overflow-y-auto pr-2 space-y-4">
                        {missingFields.map(field => (
                            <div key={field.path}>
                                <label htmlFor={field.path} className="block text-sm font-medium text-slate-300">{field.label}</label>
                                <input
                                    type="text"
                                    id={field.path}
                                    value={formData[field.path] || ''}
                                    onChange={e => handleInputChange(field.path, e.target.value)}
                                    className={input_styles}
                                    required
                                />
                            </div>
                        ))}
                    </div>
                    
                    <div className="pt-4">
                        <div className="flex items-center">
                            <input
                                id="save-to-profile"
                                type="checkbox"
                                checked={shouldSave}
                                onChange={e => setShouldSave(e.target.checked)}
                                className="h-4 w-4 rounded border-slate-500 bg-slate-600 text-blue-600 focus:ring-blue-500"
                            />
                            <label htmlFor="save-to-profile" className="ml-2 block text-sm text-slate-300">
                                Save this information to the client's profile
                            </label>
                        </div>
                    </div>
                    
                    <div className="mt-8 flex justify-end space-x-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-200 bg-slate-700 rounded-lg hover:bg-slate-600">Cancel</button>
                        <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">
                           Generate Document
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default MissingFieldsModal;

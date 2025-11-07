import React, { useState, useRef } from 'react';
import { use_app_context } from '../hooks/useAppContext';
import Icon from './common/Icon';

interface UploadTemplateModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const UploadTemplateModal: React.FC<UploadTemplateModalProps> = ({ isOpen, onClose }) => {
    const { upload_document_template } = use_app_context();
    const [name, set_name] = useState('');
    const [description, set_description] = useState('');
    const [file, set_file] = useState<File | null>(null);
    const [error, set_error] = useState<string | null>(null);
    const [is_uploading, set_is_uploading] = useState(false);
    const file_input_ref = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const handle_file_change = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const selected_file = e.target.files[0];
            if (selected_file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
                set_file(selected_file);
                set_error(null);
            } else {
                set_error('Invalid file type. Please upload a .docx file.');
                set_file(null);
            }
        }
    };

    const handle_submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !file) {
            set_error('Template name and a .docx file are required.');
            return;
        }

        set_is_uploading(true);
        set_error(null);

        try {
            await upload_document_template({ file, name, description });
            onClose();
        } catch (err: any) {
            set_error(err.message || 'An unexpected error occurred.');
        } finally {
            set_is_uploading(false);
        }
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
                <h2 className="text-2xl font-bold text-slate-100 mb-6">Upload New Template</h2>
                <form onSubmit={handle_submit} className="space-y-4">
                    <div>
                        <label htmlFor="template-name" className="block text-sm font-medium text-slate-300">Template Name</label>
                        <input 
                            type="text" 
                            id="template-name" 
                            value={name} 
                            onChange={e => set_name(e.target.value)} 
                            required 
                            className={input_styles} 
                        />
                    </div>
                    <div>
                        <label htmlFor="template-description" className="block text-sm font-medium text-slate-300">Description</label>
                        <textarea 
                            id="template-description" 
                            value={description} 
                            onChange={e => set_description(e.target.value)} 
                            rows={3} 
                            className={input_styles} 
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-300">Template File (.docx)</label>
                        <div 
                            className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-600 border-dashed rounded-md cursor-pointer hover:border-blue-500"
                            onClick={() => file_input_ref.current?.click()}
                        >
                            <div className="space-y-1 text-center">
                                <Icon name="file" className="mx-auto h-12 w-12 text-slate-400" />
                                {file ? (
                                    <p className="text-sm text-slate-200">{file.name}</p>
                                ) : (
                                    <p className="text-sm text-slate-400">
                                        <span className="font-medium text-blue-400">Click to upload</span> or drag and drop
                                    </p>
                                )}
                                <p className="text-xs text-slate-500">DOCX up to 10MB</p>
                            </div>
                        </div>
                        <input 
                            ref={file_input_ref}
                            id="file-upload" 
                            name="file-upload" 
                            type="file" 
                            className="sr-only" 
                            accept=".docx"
                            onChange={handle_file_change}
                        />
                    </div>
                    
                    {error && <p className="text-sm text-red-400">{error}</p>}

                    <div className="mt-8 flex justify-end space-x-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-200 bg-slate-700 rounded-lg hover:bg-slate-600">Cancel</button>
                        <button 
                            type="submit" 
                            disabled={is_uploading}
                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed"
                        >
                            {is_uploading ? 'Uploading...' : 'Save Template'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default UploadTemplateModal;

import React, { useState, useMemo } from 'react';
import { use_app_context } from '../hooks/useAppContext';
import { Client, DocumentTemplate, UserRole, MissingField } from '../types';
import Icon from './common/Icon';
import MissingFieldsModal from './MissingFieldsModal';
import { supabase } from '../lib/supabaseClient';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import saveAs from 'file-saver';

interface ClientDocumentGeneratorProps {
    client: Client;
}

// Helper functions copied from DocumentGenerator.tsx
function getValueByPath(obj: any, path: string): any {
    return path.split('.').reduce((acc, part) => acc && acc[part], obj);
}
function setValueByPath(obj: any, path: string, value: any) {
    const keys = path.split('.');
    let current = obj;
    for (let i = 0; i < keys.length - 1; i++) {
        if (current[keys[i]] === undefined || typeof current[keys[i]] !== 'object') {
            current[keys[i]] = {};
        }
        current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = value;
}

const ClientDocumentGenerator: React.FC<ClientDocumentGeneratorProps> = ({ client }) => {
    const { state, increment_template_usage_count, update_client, add_action_log } = use_app_context();
    const { document_templates, users, immigration_offices } = state;

    const [selected_template, set_selected_template] = useState<DocumentTemplate | null>(null);
    const [is_generating, set_is_generating] = useState(false);
    const [error, set_error] = useState<string | null>(null);
    const [template_search_term, set_template_search_term] = useState('');
    const [missing_fields, set_missing_fields] = useState<MissingField[]>([]);
    const [is_missing_fields_modal_open, set_is_missing_fields_modal_open] = useState(false);
    const [data_for_generation, set_data_for_generation] = useState<any>(null);
    const [add_log_entry, set_add_log_entry] = useState(true);

    const sorted_and_filtered_templates = useMemo(() => {
        const sorted = [...document_templates].sort((a, b) => b.usage_count - a.usage_count || a.name.localeCompare(b.name));
        if (!template_search_term) return sorted;
        const lower_search = template_search_term.toLowerCase();
        return sorted.filter(t => t.name.toLowerCase().includes(lower_search) || (t.description || '').toLowerCase().includes(lower_search));
    }, [document_templates, template_search_term]);
    
    const standard_templates = sorted_and_filtered_templates.filter(t => t.category === 'standard');
    const custom_templates = sorted_and_filtered_templates.filter(t => t.category === 'custom');

    const prepare_template_data = (current_client: Client) => {
        const office = immigration_offices.find(o => o.id === current_client.immigration_case.office_id);
        const assignees = users.filter(u => current_client.assignee_ids.includes(u.id));
        return {
            client: { id: current_client.id, name: current_client.name, last_activity_date: current_client.last_activity_date, case_description: current_client.case_description, payment_plan: current_client.payment_plan, phone: current_client.contact.phone, email: current_client.contact.email, nationality: current_client.details.nationality, passport_number: current_client.details.passport_number },
            questionnaire: current_client.questionnaire,
            case: { ...current_client.immigration_case, office_name: office?.name, office_address: office?.address },
            assignees,
            primary_assignee: assignees.length > 0 ? users.find(u => u.id === current_client.assignee_ids[0]) : {},
            date: { today: new Date().toLocaleDateString('pl-PL'), iso: new Date().toISOString().split('T')[0] }
        };
    };

    const process_document_generation = async (data_to_render: any, template_array_buffer: ArrayBuffer) => {
         try {
            const zip = new PizZip(template_array_buffer);
            const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true, nullGetter: () => "" });
            doc.setData(data_to_render);
            doc.render();
            const out_blob = doc.getZip().generate({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
            const file_name = `${selected_template!.name.replace(/[^\w\s]/gi, '').replace(/\s/g, '_')}_${client.name.replace(/[^\w\s]/gi, '').replace(/\s/g, '_')}.docx`;
            if (add_log_entry) {
                await add_action_log({ client_id: client.id, content: `Generated document: "${selected_template!.name}"` });
            }
            saveAs(out_blob, file_name);
            await increment_template_usage_count(selected_template!.id);
         } catch (error: any) {
            console.error("Docxtemplater render error:", error);
            if(error.properties) throw new Error(`Template Error: ${error.properties.explanation}. Check tag '{${error.properties.id}}' in your template.`);
            throw error;
        }
    };

    const handle_generate = async () => {
        if (!selected_template) {
            set_error("Please select a template.");
            return;
        }
        set_is_generating(true);
        set_error(null);
        try {
            const { data: blob, error: download_error } = await supabase.storage.from('document-templates').download(selected_template.storage_path);
            if (download_error) throw download_error;
            const array_buffer = await blob.arrayBuffer();
            const zip = new PizZip(array_buffer);
            const doc = new Docxtemplater(zip, { nullGetter: () => "" });
            // Fix: Cast doc to any to access inspectModule, which is not in the type definitions.
            const tags = (doc as any).inspectModule("parser").getTags();
            const template_data = prepare_template_data(client);
            const found_missing_fields = find_missing_fields(tags, template_data);
            if (found_missing_fields.length > 0) {
                set_missing_fields(found_missing_fields);
                set_data_for_generation(template_data);
                set_is_missing_fields_modal_open(true);
                set_is_generating(false);
            } else {
                await process_document_generation(template_data, array_buffer);
                set_is_generating(false);
            }
        } catch (err: any) {
            console.error("Error generating document:", err);
            set_error(err.message || 'An unknown error occurred.');
            set_is_generating(false);
        }
    };

    const handle_missing_data_submit = async (updated_data: Record<string, string>, should_save: boolean) => {
        set_is_missing_fields_modal_open(false);
        set_is_generating(true);
        try {
            let final_template_data = JSON.parse(JSON.stringify(data_for_generation));
            let client_to_update = should_save ? JSON.parse(JSON.stringify(client)) : null;
            let update_log_messages: string[] = [];
            Object.entries(updated_data).forEach(([template_path, value]) => {
                setValueByPath(final_template_data, template_path, value);
                if (should_save && client_to_update) {
                    const tag_info = TAG_MAP[template_path];
                    if (tag_info) {
                        setValueByPath(client_to_update, tag_info.clientPath, value);
                        update_log_messages.push(`- "${tag_info.label}" was updated.`);
                    }
                }
            });
            if (should_save && client_to_update) {
                await update_client(client_to_update);
                if (add_log_entry && update_log_messages.length > 0) {
                    const log_content = `Client profile updated during document generation:\n${update_log_messages.join('\n')}`;
                    await add_action_log({ client_id: client_to_update.id, content: log_content });
                }
            }
            const { data: blob, error: download_error } = await supabase.storage.from('document-templates').download(selected_template!.storage_path);
            if(download_error) throw download_error;
            const array_buffer = await blob.arrayBuffer();
            await process_document_generation(final_template_data, array_buffer);
        } catch (err: any) {
            console.error("Error during final document generation:", err);
            set_error(err.message || 'An error occurred.');
        } finally {
            set_is_generating(false);
            set_data_for_generation(null);
        }
    };

    const TemplateList: React.FC<{templates: DocumentTemplate[], title: string}> = ({templates, title}) => (
        <>
            <h4 className="text-xs font-bold uppercase text-slate-500 mt-4 mb-2">{title}</h4>
            {templates.length > 0 ? templates.map(template => (
                <div key={template.id} onClick={() => set_selected_template(template)}
                    className={`p-3 rounded-md cursor-pointer border-2 transition-colors mb-2 ${selected_template?.id === template.id ? 'bg-blue-900/50 border-blue-600' : 'bg-slate-700/50 border-transparent hover:border-slate-600'}`}>
                    <p className="font-semibold text-slate-100 truncate" title={template.name}>{template.name}</p>
                    <p className="text-xs text-slate-400 mt-1 truncate" title={template.description}>{template.description}</p>
                </div>
            )) : <div className="text-sm text-slate-500 p-3 bg-slate-900/50 rounded-md">No {title.toLowerCase()} available.</div>}
        </>
    );

    return (
        <div className="bg-slate-800 p-6 rounded-lg shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1">
                    <h3 className="text-lg font-semibold text-slate-100">Templates</h3>
                    <div className="relative my-4">
                        <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input type="text" placeholder="Search templates..." value={template_search_term} onChange={e => set_template_search_term(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-700 text-slate-100 border border-slate-600 rounded-lg placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                    </div>
                    <div className="max-h-[60vh] overflow-y-auto pr-2">
                        <TemplateList templates={standard_templates} title="Standard Templates" />
                        <TemplateList templates={custom_templates} title="Custom Templates" />
                    </div>
                </div>

                <div className="md:col-span-2">
                    <h3 className="text-lg font-semibold text-slate-100 mb-4">Generate Document for {client.name}</h3>
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-300">1. Selected Template</label>
                            <div className="mt-1 p-3 bg-slate-700 rounded-md min-h-[40px]">
                                <p className="text-slate-100">{selected_template?.name || 'Please select a template from the list.'}</p>
                            </div>
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-slate-300">2. Options</label>
                            <div className="mt-2 p-3 bg-slate-700/50 rounded-md">
                                <div className="flex items-center">
                                    <input id="add-log-entry-client" type="checkbox" checked={add_log_entry} onChange={e => set_add_log_entry(e.target.checked)}
                                        className="h-4 w-4 rounded border-slate-500 bg-slate-600 text-blue-600 focus:ring-blue-500" />
                                    <label htmlFor="add-log-entry-client" className="ml-2 block text-sm text-slate-300">Add an action log entry about this generation?</label>
                                </div>
                            </div>
                        </div>
                        {error && <p className="text-sm text-red-400 bg-red-900/50 p-3 rounded-md">{error}</p>}
                        <button onClick={handle_generate} disabled={!selected_template || is_generating}
                            className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-slate-800 disabled:bg-slate-600 disabled:cursor-not-allowed">
                            {is_generating ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Generating...
                                </>
                            ) : 'Generate & Download'}
                        </button>
                    </div>
                </div>
            </div>
            {is_missing_fields_modal_open && <MissingFieldsModal isOpen={is_missing_fields_modal_open} onClose={() => set_is_missing_fields_modal_open(false)} missingFields={missing_fields} onSubmit={handle_missing_data_submit} />}
        </div>
    );
};

const TAG_MAP: Record<string, { label: string; clientPath: string }> = {
    'client.name': { label: 'Full Name', clientPath: 'name' },
    'client.email': { label: 'Email Address', clientPath: 'contact.email' },
    'client.phone': { label: 'Phone Number', clientPath: 'contact.phone' },
    'client.nationality': { label: 'Nationality', clientPath: 'details.nationality' },
    'client.passport_number': { label: 'Passport Number', clientPath: 'details.passport_number' },
    'client.case_description': { label: 'Case Summary', clientPath: 'case_description'},
    'case.case_number': { label: 'Case Number', clientPath: 'immigration_case.case_number' },
    'case.case_password': { label: 'Password to Case', clientPath: 'immigration_case.case_password' },
    'questionnaire.personal_data.surname': { label: 'Surname (Questionnaire)', clientPath: 'questionnaire.personal_data.surname' },
    'questionnaire.personal_data.name': { label: 'First Name(s) (Questionnaire)', clientPath: 'questionnaire.personal_data.name' },
    'questionnaire.personal_data.family_name': { label: 'Family Name (Questionnaire)', clientPath: 'questionnaire.personal_data.family_name' },
    'questionnaire.personal_data.date_of_birth': { label: 'Date of Birth (Questionnaire)', clientPath: 'questionnaire.personal_data.date_of_birth' },
    'questionnaire.personal_data.place_of_birth': { label: 'Place of Birth (Questionnaire)', clientPath: 'questionnaire.personal_data.place_of_birth' },
    'questionnaire.personal_data.country_of_birth': { label: 'Country of Birth (Questionnaire)', clientPath: 'questionnaire.personal_data.country_of_birth' },
    'questionnaire.personal_data.pesel': { label: 'PESEL Number (Questionnaire)', clientPath: 'questionnaire.personal_data.pesel' },
    'questionnaire.place_of_residence_in_poland': { label: 'Place of Residence in Poland', clientPath: 'questionnaire.place_of_residence_in_poland'},
    'questionnaire.last_entry_date_to_poland': { label: 'Date of Last Entry to Poland', clientPath: 'questionnaire.last_entry_date_to_poland'},
};

const find_missing_fields = (tags: {value: string}[], template_data: any): MissingField[] => {
    const missing: MissingField[] = [];
    const unique_tags = [...new Set(tags.map(t => t.value))];
    for (const tag of unique_tags) {
        if (TAG_MAP[tag]) {
            const value = getValueByPath(template_data, tag);
            if (!value) {
                missing.push({ path: tag, label: TAG_MAP[tag].label, value: '' });
            }
        }
    }
    return missing;
};

export default ClientDocumentGenerator;
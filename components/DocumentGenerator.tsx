import React, { useState, useMemo } from 'react';
import { use_app_context } from '../hooks/useAppContext';
import { Client, DocumentTemplate, UserRole, MissingField } from '../types';
import Icon from './common/Icon';
import UploadTemplateModal from './UploadTemplateModal';
import MissingFieldsModal from './MissingFieldsModal';
import { supabase } from '../lib/supabaseClient';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import saveAs from 'file-saver';

// --- Helper Functions ---

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


// --- Sub-Components ---

const TabButton: React.FC<{ label: string; tab_name: string; active_tab: string; set_active_tab: (name: string) => void; }> = ({ label, tab_name, active_tab, set_active_tab }) => (
    <button
        onClick={() => set_active_tab(tab_name)}
        className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors border-b-2 ${
            active_tab === tab_name
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-100'
        }`}
    >
        {label}
    </button>
);

const TagExplanation: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
     <div className="mb-6 bg-slate-900/50 rounded-md border border-slate-700 p-4">
        <h4 className="text-lg font-semibold text-slate-200 mb-2">{title}</h4>
        <div className="text-slate-300 text-sm space-y-2">
            {children}
        </div>
    </div>
);

const TagTable: React.FC<{tags: {tag: string, desc: string}[]}> = ({tags}) => (
    <div className="overflow-x-auto">
        <table className="w-full text-sm">
            <thead>
                <tr className="border-b border-slate-700">
                    <th className="p-3 text-left font-medium text-slate-300 w-2/5">Tag</th>
                    <th className="p-3 text-left font-medium text-slate-300">Description</th>
                </tr>
            </thead>
            <tbody>
                {tags.map(({tag, desc}) => (
                    <tr key={tag} className="border-b border-slate-700 last:border-0">
                        <td className="p-3 font-mono text-blue-300">{`{{${tag}}}`}</td>
                        <td className="p-3 text-slate-300">{desc}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);


const DocumentGenerator: React.FC = () => {
    const { state, delete_document_template, increment_template_usage_count, update_client, upload_generated_document, add_action_log } = use_app_context();
    const { document_templates, clients, users, immigration_offices, current_user } = state;

    const [active_tab, set_active_tab] = useState('generate');
    const [is_upload_modal_open, set_is_upload_modal_open] = useState(false);
    
    const [selected_template, set_selected_template] = useState<DocumentTemplate | null>(null);
    const [selected_client_id, set_selected_client_id] = useState<string>('');
    const [is_generating, set_is_generating] = useState(false);
    const [error, set_error] = useState<string | null>(null);
    const [template_search_term, set_template_search_term] = useState('');
    
    // State for missing fields modal
    const [missing_fields, set_missing_fields] = useState<MissingField[]>([]);
    const [is_missing_fields_modal_open, set_is_missing_fields_modal_open] = useState(false);
    const [data_for_generation, set_data_for_generation] = useState<any>(null);
    
    // New state for generation options
    const [upload_to_profile, set_upload_to_profile] = useState(true);
    const [add_log_entry, set_add_log_entry] = useState(true);


    const sorted_and_filtered_templates = useMemo(() => {
        const sorted = [...document_templates].sort((a, b) => {
            if (a.usage_count !== b.usage_count) {
                return b.usage_count - a.usage_count; // Sort by usage descending
            }
            return a.name.localeCompare(b.name); // Then alphabetically
        });

        if (!template_search_term) {
            return sorted;
        }

        const lower_search = template_search_term.toLowerCase();
        return sorted.filter(template => 
            template.name.toLowerCase().includes(lower_search) ||
            (template.description || '').toLowerCase().includes(lower_search)
        );
    }, [document_templates, template_search_term]);
    
    const standard_templates = sorted_and_filtered_templates.filter(t => t.category === 'standard');
    const custom_templates = sorted_and_filtered_templates.filter(t => t.category === 'custom');


    const handle_delete_template = async (template: DocumentTemplate) => {
        if (window.confirm(`Are you sure you want to delete the template "${template.name}"?`)) {
            if (selected_template?.id === template.id) {
                set_selected_template(null);
            }
            await delete_document_template(template.id);
        }
    };
    
    const prepare_template_data = (client: Client) => {
        const office = immigration_offices.find(o => o.id === client.immigration_case.office_id);
        const assignees = users.filter(u => client.assignee_ids.includes(u.id));
        
        return {
            client: {
                id: client.id,
                name: client.name,
                last_activity_date: client.last_activity_date,
                case_description: client.case_description,
                payment_plan: client.payment_plan,
                phone: client.contact.phone,
                email: client.contact.email,
                nationality: client.details.nationality,
                passport_number: client.details.passport_number,
            },
            questionnaire: client.questionnaire,
            case: {
                ...client.immigration_case,
                office_name: office?.name,
                office_address: office?.address
            },
            assignees,
            primary_assignee: assignees.length > 0 ? users.find(u => u.id === client.assignee_ids[0]) : {},
            date: {
                today: new Date().toLocaleDateString('pl-PL'),
                iso: new Date().toISOString().split('T')[0],
            }
        };
    };

    const process_document_generation = async (data_to_render: any, template_array_buffer: ArrayBuffer) => {
         try {
            const zip = new PizZip(template_array_buffer);
            const doc = new Docxtemplater(zip, {
                paragraphLoop: true,
                linebreaks: true,
                nullGetter: () => ""
            });
            
            doc.setData(data_to_render);
            doc.render();

            const out_blob = doc.getZip().generate({
                type: 'blob',
                mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            });

            const client = clients.find(c => c.id === selected_client_id);
            const file_name = `${selected_template!.name.replace(/[^\w\s]/gi, '').replace(/\s/g, '_')}_${client!.name.replace(/[^\w\s]/gi, '').replace(/\s/g, '_')}.docx`;
            
            let uploaded_file_id: string | undefined;
            if (upload_to_profile) {
                uploaded_file_id = await upload_generated_document({
                    file_blob: out_blob,
                    file_name: file_name,
                    client_id: client!.id
                });
            }

            if (add_log_entry) {
                await add_action_log({
                    client_id: client!.id,
                    content: `Generated document: "${selected_template!.name}"`,
                    uploaded_file_ids: uploaded_file_id ? [uploaded_file_id] : undefined,
                });
            }

            // Always download the file for the user
            saveAs(out_blob, file_name);
            
            await increment_template_usage_count(selected_template!.id);

         } catch (error: any) {
            console.error("Docxtemplater render error:", error);
            if(error.properties) {
                throw new Error(`Template Error: ${error.properties.explanation}. Check tag '{${error.properties.id}}' in your template.`);
            }
            throw error;
        }
    };
    

    const handle_generate = async () => {
        if (!selected_template || !selected_client_id) {
            set_error("Please select a template and a client.");
            return;
        }
        const client = clients.find(c => c.id === selected_client_id);
        if (!client) {
            set_error("Client not found.");
            return;
        }

        set_is_generating(true);
        set_error(null);

        try {
            const { data: blob, error: download_error } = await supabase.storage
                .from('document-templates')
                .download(selected_template.storage_path);

            if (download_error) throw download_error;
            
            const array_buffer = await blob.arrayBuffer();
            const zip = new PizZip(array_buffer);
            const doc = new Docxtemplater(zip, { nullGetter: () => "" });
            
            const tags = doc.inspectModule("parser").getTags();
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
            set_error(err.message || 'An unknown error occurred during document generation.');
            set_is_generating(false);
        }
    };

    const handle_missing_data_submit = async (updated_data: Record<string, string>, should_save: boolean) => {
        set_is_missing_fields_modal_open(false);
        set_is_generating(true);
    
        try {
            let final_template_data = JSON.parse(JSON.stringify(data_for_generation));
            let client_to_update = should_save ? JSON.parse(JSON.stringify(clients.find(c => c.id === selected_client_id))) : null;
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
            
            const { data: blob, error: download_error } = await supabase.storage
                .from('document-templates')
                .download(selected_template!.storage_path);
            if(download_error) throw download_error;

            const array_buffer = await blob.arrayBuffer();
            await process_document_generation(final_template_data, array_buffer);
    
        } catch (err: any) {
            console.error("Error during final document generation:", err);
            set_error(err.message || 'An error occurred while generating the document with new data.');
        } finally {
            set_is_generating(false);
            set_data_for_generation(null);
        }
    };
    

    const is_admin = current_user?.role === UserRole.ADMIN;
    
    // Fix for JSX parser error: Move strings with "{/" sequence into variables
    const loopExample = `{#assignees}
- {{name}}, {{phone}}
{/assignees}`;

    const conditionalExample = `{#questionnaire.has_family_in_poland}
Client has family members residing in Poland.
{/questionnaire.has_family_in_poland}`;

    const TemplateList: React.FC<{templates: DocumentTemplate[], title: string}> = ({templates, title}) => (
        <>
            <h4 className="text-xs font-bold uppercase text-slate-500 mt-4 mb-2">{title}</h4>
            {templates.length > 0 ? templates.map(template => (
                <div 
                    key={template.id}
                    onClick={() => set_selected_template(template)}
                    className={`p-3 rounded-md cursor-pointer border-2 transition-colors mb-2 ${selected_template?.id === template.id ? 'bg-blue-900/50 border-blue-600' : 'bg-slate-700/50 border-transparent hover:border-slate-600'}`}
                >
                    <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                            <p className="font-semibold text-slate-100 truncate" title={template.name}>{template.name}</p>
                            <p className="text-xs text-slate-400 mt-1 truncate" title={template.description}>{template.description}</p>
                        </div>
                        {is_admin && template.category === 'custom' && (
                            <button 
                                onClick={(e) => { e.stopPropagation(); handle_delete_template(template); }}
                                className="text-slate-500 hover:text-red-400 ml-2 flex-shrink-0"
                                title="Delete template"
                            >
                                <Icon name="trash" className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>
            )) : (
                <div className="text-sm text-slate-500 p-3 bg-slate-900/50 rounded-md">No {title.toLowerCase()} available.</div>
            )}
        </>
    );

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-3xl font-bold text-slate-100">Document Generator</h1>
            </div>
            
            <div className="flex space-x-2 border-b border-slate-700 mb-6">
                <TabButton label="Generate Document" tab_name="generate" active_tab={active_tab} set_active_tab={set_active_tab} />
                <TabButton label="Tag Reference" tab_name="tags" active_tab={active_tab} set_active_tab={set_active_tab} />
            </div>

            {active_tab === 'generate' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Column 1: Templates List */}
                    <div className="md:col-span-1 bg-slate-800 p-6 rounded-lg shadow-sm">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="text-lg font-semibold text-slate-100">Templates</h3>
                            {is_admin && (
                                <button onClick={() => set_is_upload_modal_open(true)} className="flex items-center text-sm text-blue-400 hover:underline">
                                    <Icon name="upload" className="w-4 h-4 mr-1" /> Upload New
                                </button>
                            )}
                        </div>
                        <div className="relative mb-4">
                            <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search templates..."
                                value={template_search_term}
                                onChange={e => set_template_search_term(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 text-sm bg-slate-700 text-slate-100 border border-slate-600 rounded-lg placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                        </div>
                        <div className="max-h-[calc(60vh)] overflow-y-auto pr-2">
                            <TemplateList templates={standard_templates} title="Standard Templates" />
                            <TemplateList templates={custom_templates} title="Custom Templates" />
                        </div>
                    </div>

                    {/* Column 2: Generator */}
                    <div className="md:col-span-2 bg-slate-800 p-6 rounded-lg shadow-sm">
                        <h3 className="text-lg font-semibold text-slate-100 mb-4">Generate Document</h3>
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-300">1. Selected Template</label>
                                <div className="mt-1 p-3 bg-slate-700 rounded-md min-h-[40px]">
                                    <p className="text-slate-100">{selected_template?.name || 'Please select a template from the list.'}</p>
                                </div>
                            </div>
                            <div>
                                <label htmlFor="client-select" className="block text-sm font-medium text-slate-300">2. Select Client</label>
                                <select 
                                    id="client-select" 
                                    value={selected_client_id}
                                    onChange={(e) => set_selected_client_id(e.target.value)}
                                    className="mt-1 block w-full px-3 py-2 bg-slate-700 text-slate-100 border border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                >
                                    <option value="">-- Choose a client --</option>
                                    {clients.sort((a,b) => a.name.localeCompare(b.name)).map(client => (
                                        <option key={client.id} value={client.id}>{client.name}</option>
                                    ))}
                                </select>
                            </div>
                            
                             <div>
                                <label className="block text-sm font-medium text-slate-300">3. Options</label>
                                <div className="mt-2 space-y-2 p-3 bg-slate-700/50 rounded-md">
                                    <div className="flex items-center">
                                        <input
                                            id="upload-to-profile"
                                            type="checkbox"
                                            checked={upload_to_profile}
                                            onChange={e => set_upload_to_profile(e.target.checked)}
                                            className="h-4 w-4 rounded border-slate-500 bg-slate-600 text-blue-600 focus:ring-blue-500"
                                        />
                                        <label htmlFor="upload-to-profile" className="ml-2 block text-sm text-slate-300">
                                            Upload generated document to client's profile?
                                        </label>
                                    </div>
                                    <div className="flex items-center">
                                        <input
                                            id="add-log-entry"
                                            type="checkbox"
                                            checked={add_log_entry}
                                            onChange={e => set_add_log_entry(e.target.checked)}
                                            className="h-4 w-4 rounded border-slate-500 bg-slate-600 text-blue-600 focus:ring-blue-500"
                                        />
                                        <label htmlFor="add-log-entry" className="ml-2 block text-sm text-slate-300">
                                            Add an action log entry about this generation?
                                        </label>
                                    </div>
                                </div>
                            </div>
                            
                            {error && <p className="text-sm text-red-400 bg-red-900/50 p-3 rounded-md">{error}</p>}
                            
                            <button 
                                onClick={handle_generate}
                                disabled={!selected_template || !selected_client_id || is_generating}
                                className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-slate-800 disabled:bg-slate-600 disabled:cursor-not-allowed"
                            >
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
            )}
            
            {active_tab === 'tags' && (
                 <div className="bg-slate-800 p-6 rounded-lg shadow-sm">
                    <p className="text-slate-300 mb-6">Use these tags in your `.docx` templates. They will be replaced with the selected client's data upon generation. If a value is not available for a client, it will be replaced with an empty string.</p>
                    
                    <TagExplanation title="Working with Lists (Loops)">
                        <p>{'Some data, like family members or assignees, is stored as a list. To display all items, you need to use a loop block in your template. The block starts with `{#list_name}` and ends with `{/list_name}`. Inside the block, you can use tags like `{{name}}` to access properties of each item.'}</p>
                        <p>Example for listing all assigned case managers:</p>
                        <pre className="bg-slate-900 p-2 rounded-md text-xs text-blue-300 font-mono">
                           {loopExample}
                        </pre>
                    </TagExplanation>

                    <TagExplanation title="Conditional Blocks">
                        <p>{'You can show a block of text only if a value exists or is `true`. This is useful for optional information. The block starts with `{#variable_name}` and ends with `{/variable_name}`.'}</p>
                        <p>Example for showing a section only if the client has family in Poland:</p>
                         <pre className="bg-slate-900 p-2 rounded-md text-xs text-blue-300 font-mono">
                           {conditionalExample}
                        </pre>
                    </TagExplanation>

                    <div className="space-y-6">
                        <TagExplanation title="General Tags"><TagTable tags={TAGS.general} /></TagExplanation>
                        <TagExplanation title="Client Tags"><TagTable tags={TAGS.client} /></TagExplanation>
                        <TagExplanation title="Case Tags"><TagTable tags={TAGS.case} /></TagExplanation>
                        <TagExplanation title="Primary Assignee Tags"><TagTable tags={TAGS.primary_assignee} /></TagExplanation>
                        <TagExplanation title="All Assignees (Loop)">
                           <p>{'Use `{#assignees}` to loop through all case managers. Inside the loop, you can use the same tags as "Primary Assignee Tags" (e.g., `{{name}}`, `{{email}}`).'}</p>
                        </TagExplanation>
                        <TagExplanation title="Questionnaire: Personal Data"><TagTable tags={TAGS.questionnaire_personal} /></TagExplanation>
                        <TagExplanation title="Questionnaire: Main Info"><TagTable tags={TAGS.questionnaire_main} /></TagExplanation>
                        <TagExplanation title="Questionnaire: Family Members (Loop)">
                           <p>{'Use `{#questionnaire.family_members_in_poland}` to loop. Available tags inside:'}</p>
                           <ul className="list-disc list-inside mt-2">
                                <li>{'`{{full_name}}`, `{{sex}}`, `{{date_of_birth}}`, `{{degree_of_kinship}}`, `{{citizenship}}`, `{{place_of_residence}}`'}</li>
                                <li>{'`{{is_applying}}` (true/false), `{{is_dependent}}` (true/false)'}</li>
                           </ul>
                        </TagExplanation>
                         <TagExplanation title="Questionnaire: Travels (Loop)">
                           <p>{'Use `{#questionnaire.travels_and_stays_outside_poland}` to loop. Available tags inside:'}</p>
                           <ul className="list-disc list-inside mt-2">
                                <li>{'`{{from_date}}`, `{{to_date}}`, `{{country}}`'}</li>
                           </ul>
                        </TagExplanation>
                    </div>
                </div>
            )}
            
            {is_upload_modal_open && <UploadTemplateModal isOpen={is_upload_modal_open} onClose={() => set_is_upload_modal_open(false)} />}
            {is_missing_fields_modal_open && <MissingFieldsModal isOpen={is_missing_fields_modal_open} onClose={() => set_is_missing_fields_modal_open(false)} missingFields={missing_fields} onSubmit={handle_missing_data_submit} />}
        </div>
    );
};

// --- Tag Mapping & Logic for Missing Fields ---

const TAG_MAP: Record<string, { label: string; clientPath: string }> = {
    // Client Details
    'client.name': { label: 'Full Name', clientPath: 'name' },
    'client.email': { label: 'Email Address', clientPath: 'contact.email' },
    'client.phone': { label: 'Phone Number', clientPath: 'contact.phone' },
    'client.nationality': { label: 'Nationality', clientPath: 'details.nationality' },
    'client.passport_number': { label: 'Passport Number', clientPath: 'details.passport_number' },
    'client.case_description': { label: 'Case Summary', clientPath: 'case_description'},
    // Case Details
    'case.case_number': { label: 'Case Number', clientPath: 'immigration_case.case_number' },
    'case.case_password': { label: 'Password to Case', clientPath: 'immigration_case.case_password' },
    // Questionnaire - Personal Data
    'questionnaire.personal_data.surname': { label: 'Surname (Questionnaire)', clientPath: 'questionnaire.personal_data.surname' },
    'questionnaire.personal_data.name': { label: 'First Name(s) (Questionnaire)', clientPath: 'questionnaire.personal_data.name' },
    'questionnaire.personal_data.family_name': { label: 'Family Name (Questionnaire)', clientPath: 'questionnaire.personal_data.family_name' },
    'questionnaire.personal_data.date_of_birth': { label: 'Date of Birth (Questionnaire)', clientPath: 'questionnaire.personal_data.date_of_birth' },
    'questionnaire.personal_data.place_of_birth': { label: 'Place of Birth (Questionnaire)', clientPath: 'questionnaire.personal_data.place_of_birth' },
    'questionnaire.personal_data.country_of_birth': { label: 'Country of Birth (Questionnaire)', clientPath: 'questionnaire.personal_data.country_of_birth' },
    'questionnaire.personal_data.pesel': { label: 'PESEL Number (Questionnaire)', clientPath: 'questionnaire.personal_data.pesel' },
     // Questionnaire - Main
    'questionnaire.place_of_residence_in_poland': { label: 'Place of Residence in Poland', clientPath: 'questionnaire.place_of_residence_in_poland'},
    'questionnaire.last_entry_date_to_poland': { label: 'Date of Last Entry to Poland', clientPath: 'questionnaire.last_entry_date_to_poland'},
};

const find_missing_fields = (tags: {value: string}[], template_data: any): MissingField[] => {
    const missing: MissingField[] = [];
    const unique_tags = [...new Set(tags.map(t => t.value))];

    for (const tag of unique_tags) {
        if (TAG_MAP[tag]) { // Is it a tag we care about checking?
            const value = getValueByPath(template_data, tag);
            if (!value) { // Simple check for falsy values (null, undefined, '')
                missing.push({
                    path: tag,
                    label: TAG_MAP[tag].label,
                    value: ''
                });
            }
        }
    }
    return missing;
};

// --- Tags for Reference Page ---
const TAGS = {
    general: [ {tag: 'date.today', desc: 'Current date (e.g., 16.08.2024)'}, {tag: 'date.iso', desc: 'Current date in ISO format (e.g., 2024-08-16)'}, ],
    client: [ {tag: 'client.name', desc: "Client's full name"}, {tag: 'client.email', desc: "Client's email address"}, {tag: 'client.phone', desc: "Client's phone number"}, {tag: 'client.nationality', desc: "Client's nationality"}, {tag: 'client.passport_number', desc: "Client's passport number"}, {tag: 'client.case_description', desc: 'The case summary from the client profile'}, ],
    case: [ {tag: 'case.case_number', desc: 'The immigration case number'}, {tag: 'case.case_password', desc: 'Password for the online case portal'}, {tag: 'case.office_name', desc: 'Name of the Immigration Office'}, {tag: 'case.office_address', desc: 'Address of the Immigration Office'}, ],
    primary_assignee: [ {tag: 'primary_assignee.name', desc: 'Full name of the primary case manager'}, {tag: 'primary_assignee.email', desc: 'Email of the primary case manager'}, {tag: 'primary_assignee.phone', desc: 'Phone number of the primary case manager'}, {tag: 'primary_assignee.description', desc: 'Profile description of the primary case manager'}, ],
    questionnaire_personal: [
        {tag: 'questionnaire.personal_data.surname', desc: 'Surname'},
        {tag: 'questionnaire.personal_data.name', desc: 'First name(s)'},
        {tag: 'questionnaire.personal_data.family_name', desc: 'Family name'},
        {tag: 'questionnaire.personal_data.previously_used_surnames', desc: 'Previously used surnames'},
        {tag: 'questionnaire.personal_data.previously_used_names', desc: 'Previously used names'},
        {tag: 'questionnaire.personal_data.fathers_name', desc: "Father's name"},
        {tag: 'questionnaire.personal_data.mothers_name', desc: "Mother's name"},
        {tag: 'questionnaire.personal_data.mothers_maiden_name', desc: "Mother's maiden name"},
        {tag: 'questionnaire.personal_data.date_of_birth', desc: 'Date of birth (YYYY-MM-DD)'},
        {tag: 'questionnaire.personal_data.place_of_birth', desc: 'Place of birth'},
        {tag: 'questionnaire.personal_data.country_of_birth', desc: 'Country of birth'},
        {tag: 'questionnaire.personal_data.citizenship', desc: 'Citizenship'},
        {tag: 'questionnaire.personal_data.marital_status', desc: 'Marital Status (Single, Married, etc.)'},
        {tag: 'questionnaire.personal_data.education', desc: 'Education level (Primary, Secondary, etc.)'},
        {tag: 'questionnaire.personal_data.height', desc: 'Height in cm'},
        {tag: 'questionnaire.personal_data.eye_color', desc: 'Eye color'},
        {tag: 'questionnaire.personal_data.special_marks', desc: 'Special marks'},
        {tag: 'questionnaire.personal_data.pesel', desc: 'PESEL number'},
    ],
    questionnaire_main: [
        {tag: 'questionnaire.place_of_residence_in_poland', desc: 'Full address in Poland'},
        {tag: 'questionnaire.last_entry_date_to_poland', desc: 'Date of last entry to Poland (YYYY-MM-DD)'},
        {tag: 'questionnaire.has_family_in_poland', desc: 'True/False if family is in Poland'},
        {tag: 'questionnaire.was_sentenced_in_poland', desc: 'True/False if sentenced by a court'},
        {tag: 'questionnaire.is_subject_of_criminal_proceedings', desc: 'True/False if subject to criminal proceedings'},
        {tag: 'questionnaire.has_liabilities', desc: 'True/False if has financial liabilities'},
    ],
};

export default DocumentGenerator;
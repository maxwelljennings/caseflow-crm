import React, { useState, useMemo } from 'react';
import type { Client, Questionnaire, TravelEntry, FamilyMember } from '../types';
import { use_app_context } from '../hooks/useAppContext';
import Icon from './common/Icon';
import { useCountryOptions } from '../hooks/useCountryOptions';

interface ClientQuestionnaireProps {
    client: Client;
}

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="mt-6">
        <h3 className="text-lg font-semibold text-slate-100 border-b border-slate-700 pb-2 mb-4">{title}</h3>
        {children}
    </div>
);

const ReadOnlyField: React.FC<{ label: string; value?: string | number | null }> = ({ label, value }) => (
    <div>
        <label className="block text-xs font-medium text-slate-400">{label}</label>
        <p className="text-sm text-slate-200">{value || 'N/A'}</p>
    </div>
);

const EditField: React.FC<React.InputHTMLAttributes<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement> & { label: string }> = ({ label, ...props }) => {
    const common_styles = "mt-1 block w-full px-3 py-2 bg-slate-700 text-slate-100 border border-slate-600 rounded-md shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm";
    
    if (props.type === 'textarea') {
      return (
        <div>
            <label htmlFor={props.id || props.name} className="block text-sm font-medium text-slate-300">{label}</label>
            <textarea {...props} className={common_styles}></textarea>
        </div>
      )
    }

    if (props.type === 'select') {
      return (
        <div>
          <label htmlFor={props.id || props.name} className="block text-sm font-medium text-slate-300">{label}</label>
          <select {...props} className={common_styles}>{props.children}</select>
        </div>
      )
    }

    return (
        <div>
            <label htmlFor={props.id || props.name} className="block text-sm font-medium text-slate-300">{label}</label>
            <input {...props} className={common_styles} />
        </div>
    );
};


const ClientQuestionnaire: React.FC<ClientQuestionnaireProps> = ({ client }) => {
    const { update_client } = use_app_context();
    const sorted_countries = useCountryOptions();
    const [is_editing, set_is_editing] = useState(false);

    const get_initial_state = useMemo(() => {
        const [first_name, ...last_name_parts] = client.name.split(' ');
        const last_name = last_name_parts.join(' ');

        return {
            personal_data: {
                name: first_name,
                surname: last_name,
                // Fix: Access nationality, phone, and email from nested client properties.
                nationality: client.details.nationality,
                telephone_number: client.contact.phone,
                email: client.contact.email,
                ...client.questionnaire?.personal_data,
            },
            ...client.questionnaire,
        };
    }, [client]);

    const [form_data, set_form_data] = useState<Questionnaire>(get_initial_state);

    const handle_save = async () => {
        const updated_client: Client = {
            ...client,
            name: `${form_data.personal_data?.name || ''} ${form_data.personal_data?.surname || ''}`.trim(),
            // Fix: Update nested contact and details objects instead of top-level properties.
            contact: {
                ...client.contact,
                phone: form_data.personal_data?.telephone_number,
                email: form_data.personal_data?.email,
            },
            details: {
                ...client.details,
                nationality: form_data.personal_data?.nationality,
            },
            questionnaire: form_data,
        };
        await update_client(updated_client);
        set_is_editing(false);
    };

    const handle_cancel = () => {
        set_form_data(get_initial_state);
        set_is_editing(false);
    };

    const handle_form_change = (section: keyof Questionnaire, field: string, value: any) => {
        set_form_data(prev => ({
            ...prev,
            [section]: {
                ...(prev[section] as object),
                [field]: value,
            }
        }));
    };
    
    const handle_dynamic_list_change = (list_name: 'travels_and_stays_outside_poland' | 'family_members_in_poland', index: number, field: string, value: any) => {
      set_form_data(prev => {
        const list = (prev[list_name] as any[] || []).map((item, i) => 
          i === index ? { ...item, [field]: value } : item
        );
        return { ...prev, [list_name]: list };
      });
    };

    const add_dynamic_list_item = (list_name: 'travels_and_stays_outside_poland' | 'family_members_in_poland') => {
      const new_item = list_name === 'travels_and_stays_outside_poland' 
        ? { id: crypto.randomUUID(), from_date: '', to_date: '', country: '' } 
        : { id: crypto.randomUUID(), full_name: '', sex: 'Male' as const };
      set_form_data(prev => ({ ...prev, [list_name]: [...(prev[list_name] as any[] || []), new_item] }));
    };
    
    const remove_dynamic_list_item = (list_name: 'travels_and_stays_outside_poland' | 'family_members_in_poland', id: string) => {
      set_form_data(prev => ({
        ...prev,
        [list_name]: (prev[list_name] as any[] || []).filter(item => item.id !== id)
      }));
    };

    const YesNoRadio: React.FC<{label: string, name: keyof Questionnaire, value: boolean}> = ({label, name, value}) => (
        <div className="flex items-center space-x-4">
          <label className="text-sm text-slate-200">{label}</label>
          <div className="flex items-center">
            <input type="radio" id={`${name}-yes`} name={name} checked={value === true} onChange={() => set_form_data(p => ({...p, [name]: true}))} disabled={!is_editing} className="h-4 w-4 text-blue-600 bg-slate-700 border-slate-500 focus:ring-blue-500" />
            <label htmlFor={`${name}-yes`} className="ml-2 mr-4 text-sm text-slate-300">Yes</label>
            <input type="radio" id={`${name}-no`} name={name} checked={value === false} onChange={() => set_form_data(p => ({...p, [name]: false}))} disabled={!is_editing} className="h-4 w-4 text-blue-600 bg-slate-700 border-slate-500 focus:ring-blue-500" />
            <label htmlFor={`${name}-no`} className="ml-2 text-sm text-slate-300">No</label>
          </div>
        </div>
      );

    return (
        <div className="bg-slate-800 p-6 rounded-lg shadow-sm">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-slate-100">Application Questionnaire</h2>
                <div>
                    {is_editing ? (
                        <>
                            <button onClick={handle_cancel} className="px-3 py-1 text-sm font-medium text-slate-200 bg-slate-700 rounded-md hover:bg-slate-600 mr-2">Cancel</button>
                            <button onClick={handle_save} className="px-3 py-1 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 flex items-center">
                               <Icon name="check" className="w-4 h-4 mr-1" /> Save
                            </button>
                        </>
                    ) : (
                        <button onClick={() => set_is_editing(true)} className="px-3 py-1 text-sm font-medium text-white bg-slate-600 rounded-md hover:bg-slate-500 flex items-center">
                            <Icon name="edit" className="w-4 h-4 mr-1" /> Edit
                        </button>
                    )}
                </div>
            </div>

            {/* Personal Data */}
            <Section title="Personal Data of the Foreigner">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {is_editing ? (
                        <>
                            <EditField label="Surname" name="surname" value={form_data.personal_data?.surname || ''} onChange={(e) => handle_form_change('personal_data', 'surname', e.target.value)} />
                            <EditField label="Previously used surname(s)" name="previously_used_surnames" value={form_data.personal_data?.previously_used_surnames || ''} onChange={(e) => handle_form_change('personal_data', 'previously_used_surnames', e.target.value)} />
                            <EditField label="Family name" name="family_name" value={form_data.personal_data?.family_name || ''} onChange={(e) => handle_form_change('personal_data', 'family_name', e.target.value)} />
                            <EditField label="Name (names)" name="name" value={form_data.personal_data?.name || ''} onChange={(e) => handle_form_change('personal_data', 'name', e.target.value)} />
                            <EditField label="Previously used name(s)" name="previously_used_names" value={form_data.personal_data?.previously_used_names || ''} onChange={(e) => handle_form_change('personal_data', 'previously_used_names', e.target.value)} />
                            <EditField label="Father's name" name="fathers_name" value={form_data.personal_data?.fathers_name || ''} onChange={(e) => handle_form_change('personal_data', 'fathers_name', e.target.value)} />
                            <EditField label="Mother's name" name="mothers_name" value={form_data.personal_data?.mothers_name || ''} onChange={(e) => handle_form_change('personal_data', 'mothers_name', e.target.value)} />
                            <EditField label="Mother's maiden name" name="mothers_maiden_name" value={form_data.personal_data?.mothers_maiden_name || ''} onChange={(e) => handle_form_change('personal_data', 'mothers_maiden_name', e.target.value)} />
                            <EditField label="Date of birth" type="date" name="date_of_birth" value={form_data.personal_data?.date_of_birth || ''} onChange={(e) => handle_form_change('personal_data', 'date_of_birth', e.target.value)} />
                            <EditField label="Place of birth" name="place_of_birth" value={form_data.personal_data?.place_of_birth || ''} onChange={(e) => handle_form_change('personal_data', 'place_of_birth', e.target.value)} />
                            <EditField label="Country of birth" type="select" name="country_of_birth" value={form_data.personal_data?.country_of_birth || ''} onChange={(e) => handle_form_change('personal_data', 'country_of_birth', e.target.value)}>
                                <option value="">Select a country</option>
                                {sorted_countries.map(country => <option key={country} value={country}>{country}</option>)}
                            </EditField>
                            <EditField label="Nationality" type="select" name="nationality" value={form_data.personal_data?.nationality || ''} onChange={(e) => handle_form_change('personal_data', 'nationality', e.target.value)}>
                                <option value="">Select a country</option>
                                {sorted_countries.map(country => <option key={country} value={country}>{country}</option>)}
                            </EditField>
                            <EditField label="Citizenship" name="citizenship" value={form_data.personal_data?.citizenship || ''} onChange={(e) => handle_form_change('personal_data', 'citizenship', e.target.value)} />
                            <EditField label="Marital Status" type="select" name="marital_status" value={form_data.personal_data?.marital_status || ''} onChange={(e) => handle_form_change('personal_data', 'marital_status', e.target.value)}>
                                <option value="">Select...</option><option>Single</option><option>Married</option><option>Divorced</option><option>Widowed</option>
                            </EditField>
                            <EditField label="Education" type="select" name="education" value={form_data.personal_data?.education || ''} onChange={(e) => handle_form_change('personal_data', 'education', e.target.value)}>
                                <option value="">Select...</option><option>Primary</option><option>Secondary</option><option>Higher</option><option>None</option>
                            </EditField>
                            <EditField label="Height (cm)" name="height" value={form_data.personal_data?.height || ''} onChange={(e) => handle_form_change('personal_data', 'height', e.target.value)} />
                            <EditField label="Colour of eyes" name="eye_color" value={form_data.personal_data?.eye_color || ''} onChange={(e) => handle_form_change('personal_data', 'eye_color', e.target.value)} />
                            <EditField label="Special marks" name="special_marks" value={form_data.personal_data?.special_marks || ''} onChange={(e) => handle_form_change('personal_data', 'special_marks', e.target.value)} />
                            <EditField label="PESEL number" name="pesel" value={form_data.personal_data?.pesel || ''} onChange={(e) => handle_form_change('personal_data', 'pesel', e.target.value)} />
                            <EditField label="Telephone number" name="telephone_number" value={form_data.personal_data?.telephone_number || ''} onChange={(e) => handle_form_change('personal_data', 'telephone_number', e.target.value)} />
                            <EditField label="Email" name="email" value={form_data.personal_data?.email || ''} onChange={(e) => handle_form_change('personal_data', 'email', e.target.value)} />
                        </>
                    ) : (
                        Object.entries({
                            "Surname": form_data.personal_data?.surname, "Previously used surname(s)": form_data.personal_data?.previously_used_surnames, "Family name": form_data.personal_data?.family_name, "Name (names)": form_data.personal_data?.name, "Previously used name(s)": form_data.personal_data?.previously_used_names,
                            "Father's name": form_data.personal_data?.fathers_name, "Mother's name": form_data.personal_data?.mothers_name, "Mother's maiden name": form_data.personal_data?.mothers_maiden_name, "Date of birth": form_data.personal_data?.date_of_birth, "Place of birth": form_data.personal_data?.place_of_birth,
                            "Country of birth": form_data.personal_data?.country_of_birth, "Nationality": form_data.personal_data?.nationality, "Citizenship": form_data.personal_data?.citizenship, "Marital status": form_data.personal_data?.marital_status, "Education": form_data.personal_data?.education,
                            "Height": form_data.personal_data?.height, "Colour of eyes": form_data.personal_data?.eye_color, "Special marks": form_data.personal_data?.special_marks, "PESEL number": form_data.personal_data?.pesel, "Telephone number": form_data.personal_data?.telephone_number, "Email": form_data.personal_data?.email
                        }).map(([label, value]) => <ReadOnlyField key={label} label={label} value={value} />)
                    )}
                </div>
            </Section>
            
            {/* Other Sections */}
            <Section title="Place of Residence">
                 {is_editing ? <EditField label="Current residence in Poland" type="textarea" value={form_data.place_of_residence_in_poland || ''} onChange={(e) => set_form_data(p => ({...p, place_of_residence_in_poland: e.target.value}))} /> : <ReadOnlyField label="Current residence in Poland" value={form_data.place_of_residence_in_poland} />}
            </Section>
            
            <Section title="Foreigner’s Stay in Poland">
                 {is_editing ? <EditField label="Date of last entry into Poland" type="date" value={form_data.last_entry_date_to_poland || ''} onChange={(e) => set_form_data(p => ({...p, last_entry_date_to_poland: e.target.value}))} /> : <ReadOnlyField label="Date of last entry into Poland" value={form_data.last_entry_date_to_poland} />}
            </Section>

            <Section title="Foreigner’s Travels">
                {(form_data.travels_and_stays_outside_poland?.length || 0) > 0 ? (
                    form_data.travels_and_stays_outside_poland?.map((travel, index) => (
                    <div key={travel.id} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_auto] gap-4 mb-2 p-3 bg-slate-700/50 rounded-md items-center">
                       {is_editing ? (
                        <>
                           <EditField label="From" type="date" value={travel.from_date || ''} onChange={(e) => handle_dynamic_list_change('travels_and_stays_outside_poland', index, 'from_date', e.target.value)} />
                           <EditField label="To" type="date" value={travel.to_date || ''} onChange={(e) => handle_dynamic_list_change('travels_and_stays_outside_poland', index, 'to_date', e.target.value)} />
                           <EditField label="Country" type="text" value={travel.country || ''} onChange={(e) => handle_dynamic_list_change('travels_and_stays_outside_poland', index, 'country', e.target.value)} />
                           <button onClick={() => remove_dynamic_list_item('travels_and_stays_outside_poland', travel.id)} className="text-red-400 hover:text-red-300 self-end mb-2"><Icon name="trash" className="w-5 h-5"/></button>
                        </>
                       ) : <p className="col-span-full text-sm text-slate-200">{travel.from_date} - {travel.to_date}: {travel.country}</p>}
                    </div>
                    ))
                ) : <p className="text-sm text-slate-500">No travels recorded.</p>}
                {is_editing && <button onClick={() => add_dynamic_list_item('travels_and_stays_outside_poland')} className="text-sm font-medium text-blue-400 hover:underline mt-2">Add Travel</button>}
            </Section>
            
            <Section title="Family Members in Poland">
                 <YesNoRadio label="Are there family members in Poland?" name="has_family_in_poland" value={!!form_data.has_family_in_poland} />
                 {form_data.has_family_in_poland && (
                    <div className="mt-4 space-y-3">
                        {form_data.family_members_in_poland?.map((member, index) => (
                            <div key={member.id} className="p-3 bg-slate-700/50 rounded-md relative">
                                {is_editing && (
                                    <button 
                                        onClick={() => remove_dynamic_list_item('family_members_in_poland', member.id)}
                                        className="absolute top-2 right-2 px-2 py-1 text-xs font-medium text-red-400 bg-red-900/50 rounded-md hover:bg-red-900/80"
                                    >
                                        Delete
                                    </button>
                                )}
                                <div className="grid grid-cols-2 gap-4">
                                {is_editing ? (
                                    <>
                                        <EditField label="Full Name" value={member.full_name || ''} onChange={e => handle_dynamic_list_change('family_members_in_poland', index, 'full_name', e.target.value)} />
                                        <EditField label="Sex" type="select" value={member.sex || ''} onChange={e => handle_dynamic_list_change('family_members_in_poland', index, 'sex', e.target.value)}><option>Male</option><option>Female</option></EditField>
                                        <EditField label="Date of Birth" type="date" value={member.date_of_birth || ''} onChange={e => handle_dynamic_list_change('family_members_in_poland', index, 'date_of_birth', e.target.value)} />
                                        <EditField label="Degree of Kinship" value={member.degree_of_kinship || ''} onChange={e => handle_dynamic_list_change('family_members_in_poland', index, 'degree_of_kinship', e.target.value)} />
                                        <EditField label="Citizenship" value={member.citizenship || ''} onChange={e => handle_dynamic_list_change('family_members_in_poland', index, 'citizenship', e.target.value)} />
                                        <EditField label="Place of Residence" value={member.place_of_residence || ''} onChange={e => handle_dynamic_list_change('family_members_in_poland', index, 'place_of_residence', e.target.value)} />
                                        <div className="flex items-center space-x-2"><input type="checkbox" checked={!!member.is_applying} onChange={e => handle_dynamic_list_change('family_members_in_poland', index, 'is_applying', e.target.checked)} className="h-4 w-4 rounded bg-slate-700 border-slate-500 text-blue-600 focus:ring-blue-500" /><label className="text-sm text-slate-300">Applying for permit?</label></div>
                                        <div className="flex items-center space-x-2"><input type="checkbox" checked={!!member.is_dependent} onChange={e => handle_dynamic_list_change('family_members_in_poland', index, 'is_dependent', e.target.checked)} className="h-4 w-4 rounded bg-slate-700 border-slate-500 text-blue-600 focus:ring-blue-500" /><label className="text-sm text-slate-300">Dependent?</label></div>
                                    </>
                                ) : (
                                    <>
                                        <ReadOnlyField label="Full Name" value={member.full_name} />
                                        <ReadOnlyField label="Sex" value={member.sex} />
                                        <ReadOnlyField label="Date of Birth" value={member.date_of_birth} />
                                        <ReadOnlyField label="Kinship" value={member.degree_of_kinship} />
                                        <ReadOnlyField label="Citizenship" value={member.citizenship} />
                                        <ReadOnlyField label="Residence" value={member.place_of_residence} />
                                        <ReadOnlyField label="Applying?" value={member.is_applying ? 'Yes' : 'No'} />
                                        <ReadOnlyField label="Dependent?" value={member.is_dependent ? 'Yes' : 'No'} />
                                    </>
                                )}
                                </div>
                            </div>
                        ))}
                        {is_editing && <button onClick={() => add_dynamic_list_item('family_members_in_poland')} className="text-sm font-medium text-blue-400 hover:underline mt-2">Add Family Member</button>}
                    </div>
                 )}
            </Section>
            
             <Section title="Criminal / Administrative Liability">
                <div className="space-y-3">
                  <YesNoRadio label="Sentenced by a court in Poland?" name="was_sentenced_in_poland" value={!!form_data.was_sentenced_in_poland} />
                  <YesNoRadio label="Subject of pending criminal proceedings?" name="is_subject_of_criminal_proceedings" value={!!form_data.is_subject_of_criminal_proceedings} />
                  <YesNoRadio label="Have liabilities from verdicts, etc.?" name="has_liabilities" value={!!form_data.has_liabilities} />
                </div>
            </Section>

        </div>
    );
};

export default ClientQuestionnaire;
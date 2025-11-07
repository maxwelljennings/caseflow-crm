import type { Session as SupabaseSession, User as SupabaseUser } from '@supabase/supabase-js';

// Re-export Supabase types for convenience
export type Session = SupabaseSession;
export type AuthUser = SupabaseUser;

// Fix: Create full content for types.ts to define all data structures for the application.
export type View = 'dashboard' | 'clients' | 'client-profile' | 'tasks' | 'settings' | 'payments' | 'admin' | 'document-generator';

export enum TaskStatus {
    TO_DO = 'To Do',
    DONE = 'Done',
}

export interface ImmigrationOffice {
    id: string;
    name: string;
    address: string;
}

export enum PaymentStatus {
    PAID = 'Paid',
    UNPAID = 'Unpaid',
}

export enum PaymentPlan {
    FULL_PAYMENT = 'Full Payment',
    TWO_INSTALLMENTS = '2 Installments',
    THREE_INSTALLMENTS = '3 Installments',
}

export interface Payment {
    id: string;
    // Fix: Add client_id to associate payment with a client.
    client_id: string;
    due_date: string | null;
    amount: number | null;
    status: PaymentStatus;
}

export enum UserRole {
    ADMIN = 'admin',
    MANAGER = 'manager',
}

export interface User {
    id:string;
    name: string;
    username: string;
    avatar_url: string;
    phone?: string;
    description?: string;
    role: UserRole;
}

// --- NEW Questionnaire Types ---

export interface PersonalData {
    surname?: string;
    previously_used_surnames?: string;
    family_name?: string;
    name?: string;
    previously_used_names?: string;
    fathers_name?: string;
    mothers_name?: string;
    mothers_maiden_name?: string;
    date_of_birth?: string; // YYYY-MM-DD
    place_of_birth?: string;
    country_of_birth?: string;
    nationality?: string;
    citizenship?: string;
    marital_status?: 'Single' | 'Married' | 'Divorced' | 'Widowed';
    education?: 'Primary' | 'Secondary' | 'Higher' | 'None';
    height?: string; // in cm
    eye_color?: string;
    special_marks?: string;
    pesel?: string;
    telephone_number?: string;
    email?: string;
}

export interface TravelEntry {
    id: string;
    from_date?: string;
    to_date?: string;
    country?: string;
}

export interface FamilyMember {
    id: string;
    full_name?: string;
    sex?: 'Male' | 'Female';
    date_of_birth?: string;
    degree_of_kinship?: string;
    citizenship?: string;
    place_of_residence?: string;
    is_applying?: boolean;
    is_dependent?: boolean;
}

export interface Questionnaire {
    personal_data?: PersonalData;
    place_of_residence_in_poland?: string;
    last_entry_date_to_poland?: string;
    travels_and_stays_outside_poland?: TravelEntry[];
    has_family_in_poland?: boolean;
    family_members_in_poland?: FamilyMember[];
    was_sentenced_in_poland?: boolean;
    is_subject_of_criminal_proceedings?: boolean;
    has_liabilities?: boolean;
}

export interface ImmigrationCase {
    office_id: string;
    case_number?: string;
    case_password?: string;
    is_transferring?: boolean;
    transfer_office_id?: string;
}


// --- Updated Client Type ---

// Fix: Add Contact and Details interfaces for nested client data structure.
export interface Contact {
    phone?: string;
    email?: string;
}

export interface Details {
    nationality?: string;
    passport_number?: string;
}

export interface Client {
    id: string;
    name: string;
    assignee_ids: string[];
    last_activity_date: string; // YYYY-MM-DD
    case_description?: string; // Add this line for the new feature
    // Fix: Use nested structure to align with application usage.
    contact: Contact;
    details: Details;
    immigration_case: ImmigrationCase;
    questionnaire?: Questionnaire;
    payment_plan?: PaymentPlan;
    // Fix: Add optional properties for related data, populated in detailed views.
    tasks?: Task[];
    files?: File[];
    action_log?: ActionLogEntry[];
    payments?: Payment[];
}

export interface AppContextType {
    // ... other properties
    delete_client: (client_id: string) => Promise<void>;
    delete_task: (task_id: string) => Promise<void>;
    update_action_log: (log_id: string, content: string) => Promise<void>;
    delete_action_log: (log_id: string) => Promise<void>;
}


export interface Task {
    id: string;
    title: string;
    description?: string;
    client_id: string;
    assignee_id: string;
    due_date: string | null; // YYYY-MM-DD
    status: TaskStatus;
}

export interface File {
    id: string;
    client_id: string;
    name: string;
    type: string;
    size: string; // e.g. "2.3 MB"
    upload_date: string; // YYYY-MM-DD
    url: string; // Public URL for viewing/downloading
    storage_path: string; // Private path for deletion
}

export interface ActionLogEntry {
    id: string;
    client_id: string;
    user_id: string;
    date: string; // ISO string
    content: string;
    file_ids?: string[]; // Link to one or more files
    mentions?: string[]; // Array of mentioned user IDs
}

// --- NEW Notification Types ---
export type NotificationType = 'task_due_soon' | 'task_overdue' | 'task_assigned' | 'mention';

export interface Notification {
    id: string;
    type: NotificationType;
    message: string;
    client_id: string; // The client this notification relates to
    is_read: boolean;
    timestamp: string; // ISO string
    // New fields for targeted notifications
    recipient_user_id?: string;
    actor_user_id?: string;
    entity_id?: string; // e.g., action_log_id
}

// --- NEW Document Generator Types ---
export interface DocumentTemplate {
    id: string;
    name: string;
    description: string;
    storage_path: string; // Path in Supabase storage
    uploaded_by: string; // user id
    created_at: string;
    usage_count: number;
    category: 'standard' | 'custom';
}
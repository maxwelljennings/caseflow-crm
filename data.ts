// Fix: Create full content for data.ts to provide mock data for the application.
import { Client, User, Task, File, ActionLogEntry, TaskStatus, PaymentPlan, PaymentStatus, ImmigrationOffice, Notification } from './types';

export const USERS: User[] = [
    {
        id: 'user-1',
        name: 'Pavel Novak',
        username: 'pavel',
        avatar_url: 'https://i.pravatar.cc/150?u=pavel',
        phone: '+48 123 456 789',
        description: 'Lead Case Manager specializing in temporary residence permits.'
    },
    {
        id: 'user-2',
        name: 'Anna Kowalska',
        username: 'anna',
        avatar_url: 'https://i.pravatar.cc/150?u=anna',
        phone: '+48 987 654 321',
        description: 'Case Manager with expertise in work permits and family reunification.'
    },
];

export const IMMIGRATION_OFFICES: ImmigrationOffice[] = [
    { id: 'office-1', name: 'Mazowiecki Urząd Wojewódzki w Warszawie', address: 'pl. Bankowy 3/5, 00-950 Warszawa' },
    { id: 'office-2', name: 'Małopolski Urząd Wojewódzki w Krakowie', address: 'ul. Basztowa 22, 31-156 Kraków' },
    { id: 'office-3', name: 'Pomorski Urząd Wojewódzki w Gdańsku', address: 'ul. Okopowa 21/27, 80-810 Gdańsk' },
    { id: 'office-4', name: 'Wielkopolski Urząd Wojewódzki w Poznaniu', address: 'al. Niepodległości 16/18, 61-713 Poznań' },
    { id: 'office-5', name: 'Dolnośląski Urząd Wojewódzki we Wrocławiu', address: 'pl. Powstańców Warszawy 1, 50-153 Wrocław' },
];


const TASKS_DATA: Omit<Task, 'status' | 'description'>[] = [
    { id: 'task-1', title: 'Submit initial application for Kateryna', client_id: 'client-1', assignee_id: 'user-1', due_date: '2024-08-15' },
    { id: 'task-2', title: 'Follow up on missing document', client_id: 'client-1', assignee_id: 'user-1', due_date: '2024-07-30' },
    { id: 'task-3', title: 'Schedule biometrics appointment for Oleksandr', client_id: 'client-2', assignee_id: 'user-1', due_date: '2024-08-05' },
    { id: 'task-4', title: 'Prepare for appeal hearing', client_id: 'client-3', assignee_id: 'user-2', due_date: '2024-08-20' },
    { id: 'task-5', title: 'Review employment contract for Aditi', client_id: 'client-4', assignee_id: 'user-2', due_date: null },
    { id: 'task-6', title: 'File for family reunification', client_id: 'client-2', assignee_id: 'user-1', due_date: '2024-09-01' },
];

export const TASKS: Task[] = TASKS_DATA.map((task, index) => ({
    ...task,
    description: `Description for task ${task.id}`,
    status: index % 4 === 0 ? TaskStatus.DONE : TaskStatus.TO_DO,
}));

// Fix: Add missing client_id to each file object.
// Fix: Add missing storage_path property to each file object.
const FILES: File[] = [
    { id: 'file-1', client_id: 'client-1', name: 'Passport_Scan.pdf', type: 'pdf', size: '1.2 MB', upload_date: '2024-07-01', url: '#', storage_path: 'client-1/Passport_Scan.pdf' },
    { id: 'file-2', client_id: 'client-1', name: 'Employment_Contract.pdf', type: 'pdf', size: '350 KB', upload_date: '2024-07-05', url: '#', storage_path: 'client-1/Employment_Contract.pdf' },
    { id: 'file-3', client_id: 'client-2', name: 'Residence_Photo.jpg', type: 'jpg', size: '2.5 MB', upload_date: '2024-07-10', url: '#', storage_path: 'client-2/Residence_Photo.jpg' },
];

// Fix: Add missing client_id to each action log entry.
const ACTION_LOGS: ActionLogEntry[] = [
    { id: 'log-1', client_id: 'client-1', user_id: 'user-1', date: new Date('2024-07-20T10:00:00Z').toISOString(), content: 'Called client to confirm appointment.' },
    { id: 'log-2', client_id: 'client-2', user_id: 'user-2', date: new Date('2024-07-19T14:30:00Z').toISOString(), content: 'Received new documents via email. @pavel please review.', mentions: ['user-1'] },
    { id: 'log-3', client_id: 'client-1', user_id: 'user-1', date: new Date('2024-07-18T09:00:00Z').toISOString(), content: 'Case created and assigned to Pavel Novak.' },
    { id: 'log-4', client_id: 'client-2', user_id: 'user-1', date: new Date('2024-07-21T11:00:00Z').toISOString(), content: '@anna can you check this payment?', mentions: ['user-2'] },
];

export const NOTIFICATIONS: Notification[] = [
    {
        id: 'notif-1',
        type: 'task_overdue',
        message: "Task 'Follow up on missing document' for Kateryna Ivanova is overdue.",
        client_id: 'client-1',
        is_read: false,
        timestamp: new Date(new Date().setDate(new Date().getDate() - 2)).toISOString(),
    },
    {
        id: 'notif-2',
        type: 'task_due_soon',
        message: "Task 'Schedule biometrics appointment' for Oleksandr Petrenko is due soon.",
        client_id: 'client-2',
        is_read: false,
        timestamp: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString(),
    },
    {
        id: 'notif-3',
        type: 'task_assigned',
        message: "Anna Kowalska assigned you 'Prepare for appeal hearing' for Yulia Shevchenko.",
        client_id: 'client-3',
        is_read: true,
        timestamp: new Date(new Date().setDate(new Date().getDate() - 4)).toISOString(),
    },
    {
        id: 'notif-4',
        type: 'task_assigned',
        message: "You were assigned 'File for family reunification' for Oleksandr Petrenko.",
        client_id: 'client-2',
        is_read: true,
        timestamp: new Date(new Date().setDate(new Date().getDate() - 5)).toISOString(),
    },
    {
        id: 'notif-5',
        type: 'mention',
        message: "Pavel Novak mentioned you in a comment on Oleksandr Petrenko's profile.",
        client_id: 'client-2',
        is_read: false,
        timestamp: new Date().toISOString(),
        recipient_user_id: 'user-2',
        actor_user_id: 'user-1',
        entity_id: 'log-4',
    },
];

export const CLIENTS: Client[] = [
    {
        id: 'client-1',
        name: 'Kateryna Ivanova',
        case_number: 'WAW-2024-1034',
// Fix: Changed property 'assignee_id' to 'assignee_ids' and wrapped the value in an array to match the Client type.
        assignee_ids: ['user-1'],
        last_activity_date: '2024-07-20',
        immigration_case: { office_id: 'office-1', case_number: '123/2024/AB' },
        contact: { email: 'k.ivanova@example.com', phone: '+48 555 111 222' },
        details: { nationality: 'Ukrainian', passport_number: 'AA123456' },
        tasks: TASKS.filter(t => t.client_id === 'client-1'),
        files: FILES.filter(f => f.client_id === 'client-1'),
        action_log: ACTION_LOGS.filter(l => l.client_id === 'client-1'),
        questionnaire: {},
        payment_plan: PaymentPlan.TWO_INSTALLMENTS,
        // Fix: Add client_id to each payment object.
        payments: [
            { id: 'payment-1', client_id: 'client-1', due_date: '2024-07-15', amount: 2500, status: PaymentStatus.PAID },
            { id: 'payment-2', client_id: 'client-1', due_date: '2024-08-15', amount: 2500, status: PaymentStatus.UNPAID },
        ],
    },
    {
        id: 'client-2',
        name: 'Oleksandr Petrenko',
        case_number: 'KRK-2024-0512',
// Fix: Changed property 'assignee_id' to 'assignee_ids' and wrapped the value in an array to match the Client type.
        assignee_ids: ['user-1'],
        last_activity_date: '2024-07-18',
        immigration_case: { office_id: 'office-2', is_transferring: true, transfer_office_id: 'office-5', case_number: '456/2024/CD' },
        contact: { email: 'o.petrenko@example.com' },
        details: { nationality: 'Ukrainian', passport_number: 'BB654321' },
        tasks: TASKS.filter(t => t.client_id === 'client-2'),
        files: FILES.filter(f => f.client_id === 'client-2'),
        action_log: ACTION_LOGS.filter(l => l.client_id === 'client-2'),
        questionnaire: {},
        payment_plan: PaymentPlan.FULL_PAYMENT,
        payments: [
             { id: 'payment-3', client_id: 'client-2', due_date: '2024-07-20', amount: 4000, status: PaymentStatus.PAID },
        ],
    },
    {
        id: 'client-3',
        name: 'Yulia Shevchenko',
        case_number: 'WAW-2023-8876',
// Fix: Changed property 'assignee_id' to 'assignee_ids' and wrapped the value in an array to match the Client type.
        assignee_ids: ['user-2'],
        last_activity_date: '2024-06-15',
        immigration_case: { office_id: 'office-1', case_number: '789/2023/EF' },
        contact: { email: 'y.shevchenko@example.com', phone: '+48 555 333 444' },
        details: { nationality: 'Ukrainian', passport_number: 'CC987654' },
        tasks: TASKS.filter(t => t.client_id === 'client-3'),
        files: [],
        action_log: [],
        questionnaire: {},
        payment_plan: PaymentPlan.FULL_PAYMENT,
        payments: [
             { id: 'payment-4', client_id: 'client-3', due_date: '2024-05-10', amount: 5000, status: PaymentStatus.PAID },
        ],
    },
    {
        id: 'client-4',
        name: 'Aditi Sharma',
        case_number: 'GDN-2024-2109',
// Fix: Changed property 'assignee_id' to 'assignee_ids' and wrapped the value in an array to match the Client type.
        assignee_ids: ['user-2'],
        last_activity_date: '2024-07-21',
        immigration_case: { office_id: 'office-3' },
        contact: { email: 'a.sharma@example.com', phone: '+48 555 555 666' },
        details: { nationality: 'Indian', passport_number: 'DD555444' },
        tasks: TASKS.filter(t => t.client_id === 'client-4'),
        files: [],
        action_log: [],
        questionnaire: {},
        payment_plan: PaymentPlan.THREE_INSTALLMENTS,
        payments: [
            { id: 'payment-5', client_id: 'client-4', due_date: '2024-07-25', amount: 2000, status: PaymentStatus.PAID },
            { id: 'payment-6', client_id: 'client-4', due_date: '2024-08-25', amount: 2000, status: PaymentStatus.UNPAID },
            { id: 'payment-7', client_id: 'client-4', due_date: '2024-09-25', amount: 2000, status: PaymentStatus.UNPAID },
        ],
    },
];
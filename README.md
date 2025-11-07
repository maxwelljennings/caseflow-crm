# CaseFlow CRM

## 1. Project Vision & Philosophy

**CaseFlow** is a bespoke CRM designed for a legal firm specializing in Polish residence permits for foreigners. Its mission is to be the **"single source of truth"** and the **"second brain"** for each Case Manager.

Our guiding principles are:
*   **Simplicity & Clarity First**: Every feature must be intuitive and serve a clear, practical purpose. Minimum clicks, maximum clarity.
*   **User-Centric Design**: We always think from the perspective of the Case Manager. How does this reduce their mental load?
*   **Iterative & Collaborative Process**: We build the system feature by feature, ensuring each addition provides tangible value.

---

## 2. Application Architecture & Data Flow

CaseFlow has evolved from a proof-of-concept into a robust, full-stack Single-Page Application (SPA) built with React, TypeScript, and a **Supabase** backend. This architecture provides a scalable, secure, and real-time foundation for case management.

### Backend (Supabase)
*   **PostgreSQL Database**: The core of our application is a relational PostgreSQL database, managed by Supabase. All data, from clients to tasks, is stored here. The schema is designed to be relational and type-safe.
*   **Authentication**: User sign-up, login, and session management are handled by Supabase Auth. This provides enterprise-level security out of the box.
*   **Row Level Security (RLS)**: Access to data is controlled by powerful RLS policies directly in the database. This ensures that users can only access the data they are permitted to see, providing a critical layer of security.
*   **Storage**: File management is handled by Supabase Storage, which allows us to securely store and serve client documents and user avatars.

### Storage Architecture
Our file storage is logically separated into distinct "buckets" for security and organization:
1.  **`client-files` (Private)**: This bucket is used exclusively for confidential documents related to client cases (e.g., passport scans, contracts, applications). In the future, it will be configured with strict RLS policies so that only the assigned case manager can access a client's files.
2.  **`avatars` (Public)**: This bucket stores public-facing images, specifically the profile pictures of the CRM users (Case Managers). Making this bucket public allows for fast and efficient loading of avatars in the UI without complex security checks.
3.  **`document-templates` (Private)**: This new bucket holds the `.docx` template files used by the Document Generator. These are private and accessed by the application to generate filled documents.

### Frontend (React)
*   **State Management (React Context)**: The application's state is managed through a custom `AppContext.tsx`. Instead of holding static data, this context is now responsible for:
    *   Managing the current user's authentication session.
    *   Fetching live data from Supabase after a user logs in.
    *   Providing asynchronous functions to all components for creating, updating, and deleting data (e.g., `add_client`, `update_task`).
*   **Data Flow Example: Adding a New Client**
    1.  A logged-in user clicks "Add Client" in the `Clients.tsx` component.
    2.  The `AddClientModal.tsx` opens. The user fills in the form.
    3.  On submission, the modal calls the `add_client` function from the context.
    4.  The `add_client` function in `AppContext.tsx` makes an asynchronous call to the Supabase API (`supabase.from('clients').insert(...)`).
    5.  The database's RLS policies verify that the logged-in user has permission to perform this action.
    6.  If successful, the new client record is inserted into the PostgreSQL database.
    7.  The `add_client` function receives the newly created client record back from Supabase and updates the local state in the React context.
    8.  Because the state has changed, all components subscribed to the context (like `Clients.tsx`) automatically re-render to display the new client.

---

## 3. Feature Guide

### Document Generator
*   **What is it?** A powerful tool to automatically generate `.docx` documents for clients based on pre-defined templates.
*   **Why is it important?** It dramatically reduces the time spent on repetitive paperwork, eliminates copy-paste errors, and ensures consistency across all client documentation.
*   **How to use it (All Users):**
    1.  Navigate to the **Doc Generator** tab in the sidebar.
    2.  Select a template from the list on the left.
    3.  In the "Generate Document" panel, choose a client from the dropdown menu.
    4.  Click "Generate & Download". A `.docx` file will be downloaded, with all the template tags (e.g., `{{client.name}}`) replaced with the selected client's data.
*   **How to use it (Admins):**
    1.  **Add Templates**: In the "Doc Generator" view, click "Upload New Template". Provide a name, a description, and select the `.docx` file from your computer.
    2.  **Delete Templates**: Click the trash icon next to any template in the list to permanently delete it.
    3.  **Create Templates**: To create a new template, make a standard `.docx` file and use the placeholders listed in the **Tag Reference** tab. For example, to insert the client's passport number, simply type `{{client.details.passport_number}}` into your document.

### User Authentication
*   **What is it?** A secure login system for Case Managers.
*   **Why is it important?** It protects sensitive client data and ensures that all actions in the CRM are tied to a specific user.
*   **How to use it?**
    *   Access the application to see a dedicated **Login Page**.
    *   Enter your registered email and password to sign in.
    *   Once logged in, your session is securely managed.
    *   You can update your profile details and change your avatar on the **Settings** page.
    *   Use the **Logout** button on the Settings page to securely end your session.

### Avatar Upload
*   **What is it?** The ability for users to personalize their profile by uploading a custom avatar.
*   **Why is it important?** It enhances the user experience and makes the application feel more personalized.
*   **How to use it?**
    *   Navigate to the **Settings** page.
    *   Hover your mouse over your current profile picture. An "upload" icon will appear.
    *   Click on the picture to open a file selection dialog.
    *   Choose an image file (e.g., JPG, PNG). The upload will start automatically.
    *   Your avatar will update instantly in the UI upon successful upload.

### File Management (Client Documents)
*   **What is it?** A complete system for uploading, managing, and deleting client-specific files. All files are securely stored in the `client-files` bucket in Supabase Storage.
*   **Why is it important?** It centralizes all case-related documents, ensuring they are securely stored and easily accessible from the client's profile.
*   **How to use it?**
    *   **Upload**: On a client's profile, click "Upload File" or use the paperclip icon in the "Action Log" to select and upload one or more documents.
    *   **View & Download**: Click on any file in the "Files" list to open it in a new tab for viewing or downloading.
    *   **Manage**: Hover over a file to see the "more options" icon. From there, you can **Rename** or **Delete** the file. Deleting a file removes it from both the database and the storage.

### Notification System
*   **What is it?** An alert system integrated into the main header.
*   **Why is it important?** It proactively informs you about critical, time-sensitive events like overdue tasks or upcoming deadlines.
*   **How to use it?**
    *   Look for the **bell icon** in the top-right header. A red dot indicates unread notifications.
    *   Click the bell icon to open a dropdown of your recent alerts.
    *   Click on any notification to be taken directly to the relevant client's profile.

### Global Search
*   **What is it?** An application-wide search bar located in the top header.
*   **Why is it important?** It provides an instant way to find any client, task, comment, CRM user, or file from anywhere in the application.
*   **How to use it?**
    *   Start typing a client's name, case number, phone number, a keyword from a task, a comment, a user's name, or a filename.
    *   A dropdown will appear with categorized results. Click any result to navigate directly to it.

---

## 4. Version History / Changelog

*   **2024-08-16**:
    *   **Feature: Document Generator**: Implemented a major new feature allowing users to generate `.docx` documents from templates populated with client data.
    *   **Admin Template Management**: Admins can now upload and delete `.docx` templates.
    *   **Tag Reference Guide**: Added an in-app guide detailing all available template tags.
*   **2024-08-15**:
    *   **Avatar Uploads**: Implemented user profile avatar uploads. Users can now click their avatar on the Settings page to upload a new picture.
    *   **Storage Architecture**: Established a two-bucket strategy in Supabase Storage: a private `client-files` bucket for sensitive documents and a public `avatars` bucket for user profile pictures.
*   **2024-08-14**:
    *   **Full-Stack Migration**: Completed the migration from a mock-data prototype to a full-stack application with a Supabase backend. The app now features a live PostgreSQL database, user authentication, and real-time data fetching.
    *   **File Management Implemented**: Replaced file upload placeholders with full functionality. Users can now upload client documents, which are stored securely in Supabase Storage. File renaming and deletion are also fully operational.
*   **2024-08-13**:
    *   **Initial Supabase Integration**: Rewired the entire application's data layer. Replaced the static `data.ts` and `useReducer` logic with asynchronous calls to a Supabase database via the React Context API.
*   **2024-08-12**:
    *   **Database Schema & Security**: Designed and implemented the complete PostgreSQL schema in Supabase. Enabled and configured Row Level Security (RLS) policies for all tables to ensure data access is restricted to authenticated users.
*   **2024-08-11**:
    *   **Notification System**: Implemented a new notification system in the header for overdue and due-soon tasks.
*   **2024-08-10**:
    *   **Intuitive Navigation**: Clicking on a task now navigates directly to that client's profile.
*   **2024-08-09**:
    *   **Tasks Page Enhancement**: Added a sortable "Office" column to the main tasks table.
*   **2024-08-08**:
    *   **Global Table Sorting**: Implemented sorting on all major data tables.
    *   **Enhanced Search**: The global search now also finds clients by their phone number.
*   **2024-08-07**:
    *   **Task Filtering & Sorting**: Added a filter on the "Tasks" page to toggle "My Tasks" / "All Tasks" and made the dashboard task list sortable.
*   **2024-08-05**:
    *   **Truly Global Search**: Expanded the global search to include CRM Users and Files.
*   **2024-08-04**:
    *   **Comprehensive Global Search**: The global search now indexes and returns results from Clients, Tasks, and Action Log entries (Comments).
*   **2024-08-03**:
    *   **Global Search**: Implemented a functional, live global search in the main header.
*   **2024-08-02**:
    *   **Removed Case Status**: Eliminated the `CaseStatus` field from the application.
    *   **File Management**: Added UI for renaming and deleting files.
*   **2024-08-01**:
    *   **Immigration Office Case Block**: Added a new block to the client profile for managing Urząd case details, including transfers.
*   **2024-07-31**:
    *   **Payments Tab**: Added a "Payments" tab to the client profile.
    *   **Tabbed Profile UI**: Reorganized the client profile into a tabbed interface.
*   **2024-07-30**:
    *   **Client Questionnaire**: Added a comprehensive, editable questionnaire to the client profile.
*   **2024-07-29**:
    *   **Task Management Overhaul**: Simplified to a checkbox system for one-click task completion.
*   **2024-07-28**:
    *   **Date Picker UX**: Implemented a custom two-click calendar for due dates.
    *   **Automatic Task Priority**: Removed manual priority selection in favor of automatic calculation.
*   **2024-07-27**:
    *   **Full Interactivity**: Enabled all buttons and forms.
*   **2024-07-26**:
    *   **Initial Scaffolding**: Project initialized with static data.
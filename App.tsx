
import React, { useState, useEffect } from 'react';
import type { View, Session } from './types';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Clients from './components/Clients';
import ClientProfile from './components/ClientProfile';
import Tasks from './components/Tasks';
import Settings from './components/Settings';
import Header from './components/Header';
import { AppProvider } from './context/AppContext';
import LoginPage from './components/LoginPage';
import { supabase } from './lib/supabaseClient';
import Payments from './components/Payments';
import AdminPanel from './components/AdminPanel';
import DocumentGenerator from './components/DocumentGenerator';


const App: React.FC = () => {
  // Fix: Use useState directly, consistent with the rest of the app.
  const [session, set_session] = useState<Session | null>(null);
  const [loading, set_loading] = useState(true);

  // Fix: Use useEffect directly, consistent with the rest of the app.
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      set_session(session);
      set_loading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      set_session(session);
    });

    return () => subscription.unsubscribe();
  }, []);


  if (loading) {
    return <div className="flex h-screen w-full items-center justify-center text-lg bg-slate-900 text-slate-300">Loading Session...</div>;
  }
  
  if (!session) {
    return <LoginPage />;
  }

  return (
    <AppProvider session={session}>
        <MainLayout />
    </AppProvider>
  );
};


// Main application layout component
const MainLayout: React.FC = () => {
    // Fix: useState is now imported and can be used directly.
    const [view, set_view] = useState<View>('dashboard');
    const [active_client_id, set_active_client_id] = useState<string | null>(null);

    const navigate_to_client = (client_id: string) => {
        set_active_client_id(client_id);
        set_view('client-profile');
    };

    const render_view = () => {
        switch (view) {
        case 'dashboard':
            return <Dashboard set_view={set_view} navigate_to_client={navigate_to_client} />;
        case 'clients':
            return <Clients navigate_to_client={navigate_to_client} />;
        case 'client-profile':
            if (active_client_id) {
            return <ClientProfile client_id={active_client_id} set_view={set_view} />;
            }
            // Fallback if no client is selected
            set_view('clients');
            return null;
        case 'tasks':
            return <Tasks navigate_to_client={navigate_to_client} />;
        case 'payments':
            return <Payments navigate_to_client={navigate_to_client} />;
        case 'document-generator':
            return <DocumentGenerator />;
        case 'settings':
            return <Settings />;
        case 'admin':
            return <AdminPanel />;
        default:
            return <Dashboard set_view={set_view} navigate_to_client={navigate_to_client} />;
        }
    };

    const get_header_text = () => {
        switch (view) {
            case 'dashboard': return 'Dashboard';
            case 'clients': return 'Clients';
            case 'client-profile': return 'Client Profile';
            case 'tasks': return 'Tasks';
            case 'payments': return 'Payments';
            case 'document-generator': return 'Document Generator';
            case 'settings': return 'Settings';
            case 'admin': return 'Admin Panel';
            default: return 'CaseFlow';
        }
    }

    return (
        <div className="flex h-screen bg-slate-900 font-sans">
            <Sidebar current_view={view} set_view={set_view} />
            <main className="flex-1 flex flex-col overflow-hidden">
                <Header title={get_header_text()} navigate_to_client={navigate_to_client} set_view={set_view} />
                <div className="flex-1 overflow-y-auto p-6">
                {render_view()}
                </div>
            </main>
        </div>
    );
}

export default App;
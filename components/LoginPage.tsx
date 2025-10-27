
import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import Icon from './common/Icon';

const LoginPage: React.FC = () => {
    const [loading, set_loading] = useState(false);
    const [email, set_email] = useState('');
    const [password, set_password] = useState('');
    const [error, set_error] = useState<string | null>(null);

    const handle_login = async (event: React.FormEvent) => {
        event.preventDefault();
        set_loading(true);
        set_error(null);

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            set_error(error.message);
        }
        set_loading(false);
    };

    const input_styles = "block w-full px-3 py-2 bg-slate-800 text-slate-100 border border-slate-600 rounded-md shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm";

    return (
        <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4">
            <div className="w-full max-w-md">
                 <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-blue-500">CaseFlow</h1>
                    <p className="text-slate-400 mt-2">Sign in to manage your cases</p>
                </div>
                <div className="bg-slate-800 border border-slate-700 shadow-lg rounded-lg p-8">
                    <form onSubmit={handle_login} className="space-y-6">
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-slate-300">
                                Email address
                            </label>
                            <div className="mt-1">
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    value={email}
                                    onChange={(e) => set_email(e.target.value)}
                                    className={input_styles}
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-slate-300">
                                Password
                            </label>
                            <div className="mt-1">
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    autoComplete="current-password"
                                    required
                                    value={password}
                                    onChange={(e) => set_password(e.target.value)}
                                    className={input_styles}
                                />
                            </div>
                        </div>
                        
                        {error && <p className="text-sm text-red-400">{error}</p>}

                        <div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-slate-900 disabled:bg-blue-800 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Signing in...' : 'Sign in'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;

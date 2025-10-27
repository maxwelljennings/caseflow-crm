

import React, { useState, useEffect, useRef } from 'react';
import { use_app_context } from '../hooks/useAppContext';
import { supabase } from '../lib/supabaseClient';
import type { User } from '../types';
import Icon from './common/Icon';

const Settings: React.FC = () => {
  const { state: { current_user, users }, sign_out, update_user_avatar } = use_app_context();
  const [profile, set_profile] = useState<User | null>(current_user);
  const [is_uploading, set_is_uploading] = useState(false);
  const file_input_ref = useRef<HTMLInputElement>(null);
  const [username_error, set_username_error] = useState<string | null>(null);

  useEffect(() => {
    set_profile(current_user);
  }, [current_user]);

  const handle_update_profile = async () => {
    if (!profile || !profile.username) {
        alert('Username is required.');
        return;
    }
    if (username_error) {
        alert(`Cannot update profile: ${username_error}`);
        return;
    }

    const { name, phone, description, id, username } = profile;
    const { error } = await supabase
        .from('profiles')
        .update({ name, phone, description, username })
        .eq('id', id);
    
    if (error) {
        alert('Error updating the profile: ' + error.message);
    } else {
        alert('Profile updated successfully!');
    }
  };

  const handle_username_change = (e: React.ChangeEvent<HTMLInputElement>) => {
    const new_username = e.target.value.toLowerCase();
    set_profile(p => p ? {...p, username: new_username} : null);

    if (!/^[a-z0-9_.]+$/.test(new_username)) {
        set_username_error("Username can only contain lowercase letters, numbers, underscores, and dots.");
    } else if (users.some(u => u.username === new_username && u.id !== profile?.id)) {
        set_username_error("This username is already taken.");
    } else {
        set_username_error(null);
    }
  };

  const handle_avatar_change = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
        const file = e.target.files[0];
        set_is_uploading(true);
        await update_user_avatar(file);
        set_is_uploading(false);
    }
    // Reset file input to allow selecting the same file again
    e.target.value = '';
  };
  
  const input_styles = "mt-1 block w-full px-3 py-2 bg-slate-700 text-slate-100 border border-slate-600 rounded-md shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm";
  const error_input_styles = "border-red-500 focus:ring-red-500 focus:border-red-500";

  if (!profile) {
    return <div>Loading profile...</div>;
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-slate-100 mb-6">Settings</h1>
      <div className="max-w-lg bg-slate-800 p-8 rounded-lg shadow-sm">
        <h2 className="text-xl font-semibold text-slate-100 mb-6">User Profile</h2>
        <div className="flex items-center space-x-6 mb-8">
            <div className="relative group">
                <img src={profile.avatar_url} alt={profile.name} className="w-24 h-24 rounded-full" />
                <button
                    onClick={() => file_input_ref.current?.click()}
                    className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 flex items-center justify-center rounded-full transition-opacity"
                    aria-label="Change profile picture"
                    disabled={is_uploading}
                >
                    {is_uploading ? (
                        <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                        <Icon name="upload" className="w-8 h-8 text-white opacity-0 group-hover:opacity-100" />
                    )}
                </button>
                <input
                    type="file"
                    ref={file_input_ref}
                    onChange={handle_avatar_change}
                    className="hidden"
                    accept="image/png, image/jpeg"
                />
            </div>
          <div>
            <p className="text-2xl font-bold text-slate-100">{profile.name}</p>
            <p className="text-slate-400">Case Manager</p>
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-slate-300">Name</label>
            <input 
                id="name"
                type="text" 
                value={profile.name}
                onChange={e => set_profile({...profile, name: e.target.value})}
                className={input_styles} 
            />
          </div>
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-slate-300">Username</label>
            <div className="relative mt-1">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <span className="text-slate-400 sm:text-sm">@</span>
                </div>
                <input 
                    id="username"
                    type="text" 
                    value={profile.username || ''}
                    onChange={handle_username_change}
                    placeholder="e.g., pavel.novak"
                    className={`${input_styles} pl-7 ${username_error ? error_input_styles : ''}`}
                />
            </div>
            {username_error && <p className="mt-1 text-xs text-red-400">{username_error}</p>}
          </div>
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-slate-300">Phone</label>
            <input 
                id="phone"
                type="text" 
                value={profile.phone || ''}
                onChange={e => set_profile({...profile, phone: e.target.value})}
                placeholder="e.g., +48 123 456 789"
                className={input_styles} 
            />
          </div>
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-slate-300">Short Description</label>
            <textarea
                id="description"
                value={profile.description || ''}
                onChange={e => set_profile(p => p ? {...p, description: e.target.value} : null)}
                rows={3}
                placeholder="A brief bio or description of your role."
                className={input_styles}
            ></textarea>
          </div>
           <button 
                onClick={handle_update_profile}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors mt-4"
            >
            Update Profile
          </button>
           <button 
                onClick={sign_out}
                className="w-full bg-slate-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-slate-700 transition-colors mt-4"
            >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
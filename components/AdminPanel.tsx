import React from 'react';
import { use_app_context } from '../hooks/useAppContext';
import { User, UserRole } from '../types';

const AdminPanel: React.FC = () => {
    const { state, update_user_role } = use_app_context();
    const { users, current_user } = state;

    const handle_role_change = (user_id: string, new_role: UserRole) => {
        update_user_role(user_id, new_role);
    };

    return (
        <div>
            <h1 className="text-3xl font-bold text-slate-100 mb-6">User Management</h1>
            <div className="bg-slate-800 rounded-lg shadow-sm overflow-hidden">
                <table className="w-full text-sm text-left text-slate-400">
                    <thead className="text-xs text-slate-400 uppercase bg-slate-900">
                        <tr>
                            <th scope="col" className="px-6 py-3">User</th>
                            <th scope="col" className="px-6 py-3">Username</th>
                            <th scope="col" className="px-6 py-3">Role</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.sort((a, b) => a.name.localeCompare(b.name)).map(user => {
                            return (
                                <tr key={user.id} className="bg-slate-800 border-b border-slate-700">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="flex-shrink-0 h-10 w-10">
                                                <img className="h-10 w-10 rounded-full" src={user.avatar_url} alt={user.name} />
                                            </div>
                                            <div className="ml-4">
                                                <div className="font-medium text-slate-100">{user.name}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-slate-300">@{user.username}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <select
                                            value={user.role}
                                            onChange={(e) => handle_role_change(user.id, e.target.value as UserRole)}
                                            className="block w-full pl-3 pr-10 py-2 bg-slate-700 text-slate-100 border border-slate-600 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                            aria-label={`Role for ${user.name}`}
                                        >
                                            <option value={UserRole.ADMIN}>Admin</option>
                                            <option value={UserRole.MANAGER}>Manager</option>
                                        </select>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AdminPanel;

import React, { useState, useEffect, useRef } from 'react';
import { use_app_context } from '../hooks/useAppContext';
import Icon from './common/Icon';
import type { Notification } from '../types';

interface NotificationsProps {
    navigate_to_client: (client_id: string) => void;
}

const Notifications: React.FC<NotificationsProps> = ({ navigate_to_client }) => {
    const { state, mark_notification_read, mark_all_notifications_read } = use_app_context();
    const { notifications } = state;
    const [is_open, set_is_open] = useState(false);
    const wrapper_ref = useRef<HTMLDivElement>(null);

    const unread_count = notifications.filter(n => !n.is_read).length;

    useEffect(() => {
        function handle_click_outside(event: MouseEvent) {
            if (wrapper_ref.current && !wrapper_ref.current.contains(event.target as Node)) {
                set_is_open(false);
            }
        }
        document.addEventListener("mousedown", handle_click_outside);
        return () => {
            document.removeEventListener("mousedown", handle_click_outside);
        };
    }, [wrapper_ref]);
    
    const handle_notification_click = (notification: Notification) => {
        if (!notification.is_read) {
            mark_notification_read(notification.id);
        }
        navigate_to_client(notification.client_id);
    
        if (notification.type === 'mention' && notification.entity_id) {
            // Use a slight delay to ensure the component has re-rendered before setting hash
            setTimeout(() => {
                window.location.hash = `log-${notification.entity_id}`;
            }, 100);
        }
    
        set_is_open(false);
    };

    const handle_mark_all_as_read = () => {
        mark_all_notifications_read();
    };

    const get_icon_for_type = (type: Notification['type']) => {
        switch (type) {
            case 'task_overdue': return <Icon name="calendar" className="w-5 h-5 text-red-400" />;
            case 'task_due_soon': return <Icon name="calendar" className="w-5 h-5 text-yellow-400" />;
            case 'task_assigned': return <Icon name="plus" className="w-5 h-5 text-blue-400" />;
            case 'mention': return <Icon name="at-sign" className="w-5 h-5 text-purple-400" />;
            default: return <Icon name="bell" className="w-5 h-5 text-slate-400" />;
        }
    };

    return (
        <div className="relative" ref={wrapper_ref}>
            <button
                onClick={() => set_is_open(!is_open)}
                className="relative p-2 rounded-full text-slate-400 hover:bg-slate-700 hover:text-slate-100 focus:outline-none"
                aria-label="View notifications"
            >
                <Icon name="bell" className="w-6 h-6" />
                {unread_count > 0 && (
                    <span className="absolute top-1 right-1 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                    </span>
                )}
            </button>

            {is_open && (
                <div className="absolute right-0 mt-2 w-80 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-20">
                    <div className="flex justify-between items-center p-3 border-b border-slate-700">
                        <h3 className="font-semibold text-slate-100">Notifications</h3>
                        {unread_count > 0 && (
                            <button onClick={handle_mark_all_as_read} className="text-xs font-medium text-blue-400 hover:underline">
                                Mark all as read
                            </button>
                        )}
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                        {notifications.length > 0 ? (
                             [...notifications].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map(notification => (
                                <div
                                    key={notification.id}
                                    onClick={() => handle_notification_click(notification)}
                                    className={`flex items-start p-3 cursor-pointer hover:bg-slate-700 ${!notification.is_read ? 'bg-slate-900/50' : ''}`}
                                >
                                    {!notification.is_read && <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>}
                                    <div className={`flex-shrink-0 mr-3 ${notification.is_read ? 'ml-5' : ''}`}>
                                        {get_icon_for_type(notification.type)}
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm text-slate-200">{notification.message}</p>
                                        <p className="text-xs text-slate-500 mt-1">{new Date(notification.timestamp).toLocaleString()}</p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="p-4 text-sm text-slate-500 text-center">No new notifications.</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Notifications;
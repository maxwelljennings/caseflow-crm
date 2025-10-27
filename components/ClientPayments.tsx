import React, { useState, useEffect } from 'react';
import type { Client, Payment, PaymentPlan } from '../types';
import { PaymentStatus, PaymentPlan as PaymentPlanEnum } from '../types';
import { use_app_context } from '../hooks/useAppContext';
import Icon from './common/Icon';

interface ClientPaymentsProps {
    client: Client;
}

const ClientPayments: React.FC<ClientPaymentsProps> = ({ client }) => {
    const { update_client_payments } = use_app_context();
    const [is_editing, set_is_editing] = useState(false);
    const [plan, set_plan] = useState<PaymentPlan | undefined>(client.payment_plan);
    // Fix: Use optional chaining to safely access payments, defaulting to an empty array.
    const [payments, set_payments] = useState<Payment[]>(client.payments || []);

    useEffect(() => {
        set_plan(client.payment_plan);
        // Fix: Use optional chaining to safely access payments, defaulting to an empty array.
        set_payments(client.payments || []);
    }, [client]);

    const handle_plan_change = (new_plan: PaymentPlan) => {
        set_plan(new_plan);
        const num_installments = 
            new_plan === PaymentPlanEnum.FULL_PAYMENT ? 1 : 
            new_plan === PaymentPlanEnum.TWO_INSTALLMENTS ? 2 : 3;
        
        const new_payments: Payment[] = Array.from({ length: num_installments }, (_, i) => ({
            id: payments[i]?.id || crypto.randomUUID(),
            client_id: client.id,
            due_date: payments[i]?.due_date || null,
            amount: payments[i]?.amount || null,
            status: payments[i]?.status || PaymentStatus.UNPAID,
        }));
        set_payments(new_payments);
    };

    const handle_payment_change = (index: number, field: keyof Omit<Payment, 'id' | 'client_id'>, value: any) => {
        const updated_payments = [...payments];
        (updated_payments[index] as any)[field] = value;
        set_payments(updated_payments);
    };

    const handle_save = async () => {
        await update_client_payments(client.id, plan, payments);
        set_is_editing(false);
    };
    
    const handle_cancel = () => {
        set_plan(client.payment_plan);
        // Fix: Use optional chaining to safely access payments, defaulting to an empty array.
        set_payments(client.payments || []);
        set_is_editing(false);
    };
    
    const total_amount = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const total_paid = payments.filter(p => p.status === PaymentStatus.PAID).reduce((sum, p) => sum + (p.amount || 0), 0);
    const currency_formatter = new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' });

    return (
        <div className="bg-slate-800 p-6 rounded-lg shadow-sm">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-slate-100">Payments</h2>
                <div>
                    {is_editing ? (
                        <>
                            <button onClick={handle_cancel} className="px-3 py-1 text-sm font-medium text-slate-200 bg-slate-700 rounded-md hover:bg-slate-600 mr-2">Cancel</button>
                            <button onClick={handle_save} className="px-3 py-1 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">
                               Save
                            </button>
                        </>
                    ) : (
                        <button onClick={() => set_is_editing(true)} className="px-3 py-1 text-sm font-medium text-white bg-slate-600 rounded-md hover:bg-slate-500">
                            Edit
                        </button>
                    )}
                </div>
            </div>

            {is_editing ? (
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-300">Payment Plan</label>
                        <select 
                            value={plan} 
                            onChange={(e) => handle_plan_change(e.target.value as PaymentPlan)} 
                            className="mt-1 block w-full md:w-1/3 px-3 py-2 bg-slate-700 text-slate-100 border border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        >
                            {Object.values(PaymentPlanEnum).map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                    </div>
                    {payments.map((p, index) => (
                        <div key={p.id} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end p-3 bg-slate-700/50 rounded-md">
                            <div>
                                <label className="block text-xs font-medium text-slate-400">Installment {index + 1}</label>
                                <input 
                                    type="number"
                                    placeholder="Amount (PLN)"
                                    value={p.amount || ''}
                                    onChange={(e) => handle_payment_change(index, 'amount', Number(e.target.value))}
                                    className="mt-1 block w-full px-3 py-2 bg-slate-700 text-slate-100 border border-slate-600 rounded-md"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-400">Due Date</label>
                                <input 
                                    type="date"
                                    value={p.due_date || ''}
                                    onChange={(e) => handle_payment_change(index, 'due_date', e.target.value)}
                                    className="mt-1 block w-full px-3 py-2 bg-slate-700 text-slate-100 border border-slate-600 rounded-md"
                                />
                            </div>
                            <div className="flex items-center h-full pb-2">
                                <input 
                                    type="checkbox"
                                    id={`paid-${p.id}`}
                                    checked={p.status === PaymentStatus.PAID}
                                    onChange={(e) => handle_payment_change(index, 'status', e.target.checked ? PaymentStatus.PAID : PaymentStatus.UNPAID)}
                                    className="h-5 w-5 rounded border-slate-500 bg-slate-600 text-blue-600 focus:ring-blue-500"
                                />
                                <label htmlFor={`paid-${p.id}`} className="ml-2 text-sm font-medium text-slate-300">Paid</label>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="space-y-3">
                    <p className="text-sm"><span className="font-medium text-slate-400">Plan:</span> {plan || 'Not set'}</p>
                     <div className="divide-y divide-slate-700 border-t border-slate-700">
                        {payments.length > 0 ? payments.map((p, index) => (
                            <div key={p.id} className="flex justify-between items-center py-3">
                                <div className="flex items-center">
                                    <Icon name={p.status === PaymentStatus.PAID ? 'check' : 'calendar'} className={`w-5 h-5 mr-4 ${p.status === PaymentStatus.PAID ? 'text-green-400' : 'text-slate-500'}`} />
                                    <div>
                                        <p className="font-medium text-slate-100">Installment {index + 1}</p>
                                        <p className="text-sm text-slate-400">Due: {p.due_date || 'N/A'}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-semibold text-lg text-slate-100">{currency_formatter.format(p.amount || 0)}</p>
                                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${p.status === PaymentStatus.PAID ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
                                        {p.status}
                                    </span>
                                </div>
                            </div>
                        )) : <p className="text-sm text-slate-500 py-4">No payment plan has been set up for this client.</p>}
                    </div>
                    {payments.length > 0 && (
                        <div className="flex justify-end pt-4 border-t border-slate-700 mt-4 space-x-6">
                            <div className="text-right">
                                <p className="text-sm text-slate-400">Total Paid</p>
                                <p className="font-bold text-xl text-green-400">{currency_formatter.format(total_paid)}</p>
                            </div>
                             <div className="text-right">
                                <p className="text-sm text-slate-400">Total Amount</p>
                                <p className="font-bold text-xl text-slate-100">{currency_formatter.format(total_amount)}</p>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ClientPayments;
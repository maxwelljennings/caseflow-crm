import { useMemo } from 'react';
import { use_app_context } from './useAppContext';
import { COUNTRIES } from '../data/countries';

export const useCountryOptions = () => {
    const { state } = use_app_context();
    const { clients, current_user } = state;

    const sorted_countries = useMemo(() => {
        if (!current_user) {
            return COUNTRIES; // Return default if no user
        }

        // Get clients assigned to the current user
        const my_clients = clients.filter(client => 
            client.assignee_ids.includes(current_user.id)
        );

        // Count nationalities from those clients
        const nationality_counts: { [key: string]: number } = {};
        my_clients.forEach(client => {
            const nationality = client.details.nationality;
            if (nationality) {
                nationality_counts[nationality] = (nationality_counts[nationality] || 0) + 1;
            }
        });

        // Sort the main COUNTRIES list
        const sorted = [...COUNTRIES].sort((a, b) => {
            const count_a = nationality_counts[a] || 0;
            const count_b = nationality_counts[b] || 0;

            // If counts are different, sort by count descending
            if (count_a !== count_b) {
                return count_b - count_a;
            }

            // If counts are the same, sort alphabetically
            return a.localeCompare(b);
        });

        return sorted;
    }, [clients, current_user]);

    return sorted_countries;
};

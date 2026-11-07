import { useQuery } from '@tanstack/react-query';

import { api } from '@/shared/api/axios.ts';
import {
    DASHBOARD_DEFAULT_PERIOD,
    type DashboardPeriod,
} from '@/features/dashboard/constants/dashboard.ts';
import type { DashboardStats } from '@/features/dashboard/types/dashboard.ts';
import { DASHBOARD_STATS } from '@/shared/utils/query-keys.ts';

export function useDashboardStats(period: DashboardPeriod = DASHBOARD_DEFAULT_PERIOD) {
    return useQuery({
        queryKey: [DASHBOARD_STATS, period],
        queryFn: async () => {
            const { data } = await api.get<DashboardStats>('/dashboard/stats', {
                params: { period },
            });

            return data;
        },
    });
}

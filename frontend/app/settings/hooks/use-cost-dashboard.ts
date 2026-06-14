'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchCostDashboard } from '../../../lib/api/cost';
import { useAuth } from '../../features/auth/hooks/use-auth';

export function useCostDashboard() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['cost-dashboard', user?.id],
    queryFn: fetchCostDashboard,
    enabled: Boolean(user?.id),
    staleTime: 30_000,
  });
}

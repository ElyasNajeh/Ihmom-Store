import { useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { useState } from 'react';

import {
    fetchVerifiedOrderHistory,
    verifyOrderHistoryAccess,
} from '@/features/orders/api/orders-api.ts';
import type { OrderHistoryItem, OrderHistoryRequest } from '@/features/orders/types/order.ts';
import { getApiErrorMessage } from '@/shared/utils/api-error.ts';

export type OrderHistoryLookupError = 'invalid_details' | 'rate_limited' | 'unexpected';

function isUnauthorized(error: unknown): boolean {
    return axios.isAxiosError(error) && error.response?.status === 401;
}

function classifyError(error: unknown): OrderHistoryLookupError {
    if (!axios.isAxiosError(error)) {
        return 'unexpected';
    }

    if (error.response?.status === 404) {
        return 'invalid_details';
    }

    if (error.response?.status === 429) {
        return 'rate_limited';
    }

    return 'unexpected';
}

export function useOrderHistoryLookup() {
    const [credentials, setCredentials] = useState<OrderHistoryRequest | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const lookupMutation = useMutation({
        mutationFn: async (values: OrderHistoryRequest): Promise<OrderHistoryItem> => {
            const verification = await verifyOrderHistoryAccess(values);
            setToken(verification.access_token);

            try {
                return await fetchVerifiedOrderHistory(verification.access_token);
            } catch (error) {
                if (!isUnauthorized(error)) {
                    throw error;
                }

                // The short-lived token expired between requests; verify once more.
                const renewed = await verifyOrderHistoryAccess(values);
                setToken(renewed.access_token);

                return fetchVerifiedOrderHistory(renewed.access_token);
            }
        },
    });

    function startLookup(values: OrderHistoryRequest) {
        if (lookupMutation.isPending) {
            return;
        }

        setToken(null);
        setCredentials(values);
        lookupMutation.reset();
        lookupMutation.mutate(values);
    }

    function retry() {
        if (!credentials || lookupMutation.isPending) {
            return;
        }

        lookupMutation.reset();
        lookupMutation.mutate(credentials);
    }

    const errorKind = lookupMutation.isError ? classifyError(lookupMutation.error) : null;

    return {
        hasSearched: credentials !== null,
        result: lookupMutation.data ?? null,
        token,
        isSearching: lookupMutation.isPending,
        errorKind,
        errorMessage:
            errorKind === 'unexpected' && lookupMutation.isError
                ? getApiErrorMessage(lookupMutation.error)
                : null,
        search: startLookup,
        retry,
    };
}

import { useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { useCallback, useState } from 'react';

import {
    downloadOrderHistoryInvoice,
    fetchVerifiedOrderHistory,
    verifyOrderHistoryAccess,
} from '@/features/orders/api/orders-api.ts';
import type { OrderHistoryItem, OrderHistoryRequest } from '@/features/orders/types/order.ts';
import { getApiErrorMessage } from '@/shared/utils/api-error.ts';

export type OrderHistoryLookupError = 'invalid_details' | 'rate_limited' | 'unexpected';

type InvoiceLanguage = Parameters<typeof downloadOrderHistoryInvoice>[1];

interface LookupVariables {
    credentials: OrderHistoryRequest;
    flowId: number;
}

interface LookupResult {
    result: OrderHistoryItem;
    token: string;
    flowId: number;
}

interface InvoiceVariables {
    credentials: OrderHistoryRequest;
    token: string;
    language: InvoiceLanguage;
    flowId: number;
}

interface InvoiceResult {
    blob: Blob;
    token: string;
    flowId: number;
}

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

async function fetchOrderHistoryWithToken(
    credentials: OrderHistoryRequest,
): Promise<{ result: OrderHistoryItem; token: string }> {
    const verification = await verifyOrderHistoryAccess(credentials);

    try {
        const result = await fetchVerifiedOrderHistory(verification.access_token);

        return {
            result,
            token: verification.access_token,
        };
    } catch (error) {
        if (!isUnauthorized(error)) {
            throw error;
        }

        // Re-verify once if the short-lived token expires before the request.
        const renewed = await verifyOrderHistoryAccess(credentials);
        const result = await fetchVerifiedOrderHistory(renewed.access_token);

        return {
            result,
            token: renewed.access_token,
        };
    }
}

export function useOrderHistoryLookup() {
    const [credentials, setCredentials] = useState<OrderHistoryRequest | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [flowId, setFlowId] = useState(0);

    const lookupMutation = useMutation({
        mutationFn: async ({ credentials, flowId }: LookupVariables): Promise<LookupResult> => {
            const { result, token } = await fetchOrderHistoryWithToken(credentials);

            return {
                result,
                token,
                flowId,
            };
        },
        onSuccess: ({ token, flowId: completedFlowId }) => {
            if (completedFlowId === flowId) {
                setToken(token);
            }
        },
    });

    const invoiceMutation = useMutation({
        mutationFn: async ({
            credentials,
            token,
            language,
            flowId,
        }: InvoiceVariables): Promise<InvoiceResult> => {
            try {
                const blob = await downloadOrderHistoryInvoice(token, language);

                return {
                    blob,
                    token,
                    flowId,
                };
            } catch (error) {
                if (!isUnauthorized(error)) {
                    throw error;
                }

                // Re-verify once if the token has expired before invoice download.
                const verification = await verifyOrderHistoryAccess(credentials);
                const renewedToken = verification.access_token;
                const blob = await downloadOrderHistoryInvoice(renewedToken, language);

                return {
                    blob,
                    token: renewedToken,
                    flowId,
                };
            }
        },
        onSuccess: ({ token, flowId: completedFlowId }) => {
            if (completedFlowId === flowId) {
                setToken(token);
            }
        },
    });

    function startLookup(values: OrderHistoryRequest): void {
        if (lookupMutation.isPending) {
            return;
        }

        const nextFlowId = flowId + 1;

        setFlowId(nextFlowId);
        setToken(null);
        setCredentials(values);

        lookupMutation.reset();
        invoiceMutation.reset();

        lookupMutation.mutate({
            credentials: values,
            flowId: nextFlowId,
        });
    }

    function retry(): void {
        if (!credentials || lookupMutation.isPending) {
            return;
        }

        lookupMutation.reset();

        lookupMutation.mutate({
            credentials,
            flowId,
        });
    }

    function downloadInvoice(language: InvoiceLanguage): void {
        if (!credentials || !token || invoiceMutation.isPending) {
            return;
        }

        invoiceMutation.reset();

        invoiceMutation.mutate({
            credentials,
            token,
            language,
            flowId,
        });
    }

    const clear = useCallback((): void => {
        setFlowId((current) => current + 1);
        setCredentials(null);
        setToken(null);

        lookupMutation.reset();
        invoiceMutation.reset();
    }, [lookupMutation.reset, invoiceMutation.reset]);

    const errorKind = lookupMutation.isError ? classifyError(lookupMutation.error) : null;

    const currentLookup = lookupMutation.data?.flowId === flowId ? lookupMutation.data : null;

    const currentInvoice = invoiceMutation.data?.flowId === flowId ? invoiceMutation.data : null;

    return {
        hasAttemptedLookup: credentials !== null,
        hasSuccessfulLookup: currentLookup !== null,

        result: currentLookup?.result ?? null,
        token,

        isSearching: lookupMutation.isPending,
        errorKind,
        errorMessage:
            errorKind === 'unexpected' && lookupMutation.isError
                ? getApiErrorMessage(lookupMutation.error)
                : null,

        isDownloadingInvoice: invoiceMutation.isPending,
        invoiceBlob: currentInvoice?.blob ?? null,
        invoiceErrorMessage: invoiceMutation.isError
            ? getApiErrorMessage(invoiceMutation.error)
            : null,

        search: startLookup,
        retry,
        downloadInvoice,
        clear,
    };
}

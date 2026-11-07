import type {
    Customer,
    CreateCustomer,
    QueryCustomer,
    UpdateCustomer,
} from '@/features/customers/types/customer.ts';
import { api } from '@/shared/api/axios.ts';
import type { PaginatedResponse } from '@/shared/types/query.ts';

export async function fetchCustomers(params: QueryCustomer): Promise<PaginatedResponse<Customer>> {
    const response = await api.get<PaginatedResponse<Customer>>('/customers/', { params });

    return response.data;
}

export async function createCustomer(customerData: CreateCustomer): Promise<Customer> {
    const response = await api.post<Customer>('/customers/', customerData);

    return response.data;
}

export async function updateCustomer(
    customerId: number,
    customerData: UpdateCustomer,
): Promise<Customer> {
    const response = await api.patch<Customer>(`/customers/${customerId}`, customerData);

    return response.data;
}

export async function deleteCustomer(customerId: number): Promise<void> {
    await api.delete(`/customers/${customerId}`);
}

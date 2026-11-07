import { z } from 'zod';
import { loginAdminSchema } from '@/schemas/auth.ts';

export type LoginAdmin = z.infer<typeof loginAdminSchema>;

export interface LoginAdminResponse {
    message: string;
    username: string;
    access_token: string;
    token_type: string;
    expires_in: number;
}

export interface RefreshAdminResponse {
    message: string;
    access_token: string;
    token_type: string;
    expires_in: number;
}

export interface CurrentAdmin {
    id: number;
    username: string;
    email: string;
}

export interface MessageResponse {
    message: string;
}

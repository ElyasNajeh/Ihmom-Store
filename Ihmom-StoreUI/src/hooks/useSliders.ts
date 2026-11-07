import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/services/axios.ts';
import type { CreateSlider, QuerySlider, Slider, UpdateSlider } from '@/models/slider.ts';
import { type PaginatedResponse, withDefaultQuery } from '@/models/query.ts';
import { SLIDERS } from '@/utils/query-keys.ts';
import { invalidateAdminCollection } from '@/utils/query-invalidation.ts';

export function useSliders(params: QuerySlider = {}) {
    const queryParams = withDefaultQuery(params);

    return useQuery({
        queryKey: [SLIDERS, queryParams],

        queryFn: async (): Promise<PaginatedResponse<Slider>> => {
            const response = await api.get<PaginatedResponse<Slider>>('/sliders/', {
                params: queryParams,
            });

            return response.data;
        },
    });
}

export function useCreateSlider() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            sliderData,
            image,
        }: {
            sliderData: CreateSlider;
            image: File;
        }): Promise<Slider> => {
            const formData = new FormData();

            formData.append('title_ar', sliderData.title_ar);
            formData.append('title_en', sliderData.title_en);
            formData.append('display_order', String(sliderData.display_order ?? 0));
            formData.append('is_active', String(sliderData.is_active ?? true));
            formData.append('image', image);

            const response = await api.post<Slider>('/sliders/', formData);

            return response.data;
        },

        onSuccess: () => {
            invalidateAdminCollection(queryClient, SLIDERS);
        },
    });
}

export function useUpdateSlider() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            sliderId,
            sliderData,
        }: {
            sliderId: number;
            sliderData: UpdateSlider;
        }): Promise<Slider> => {
            const response = await api.patch<Slider>(`/sliders/${sliderId}`, sliderData);

            return response.data;
        },

        onSuccess: () => {
            invalidateAdminCollection(queryClient, SLIDERS);
        },
    });
}

export function useReplaceSliderImage() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            sliderId,
            image,
        }: {
            sliderId: number;
            image: File;
        }): Promise<Slider> => {
            const formData = new FormData();

            formData.append('image', image);

            const response = await api.patch<Slider>(`/sliders/${sliderId}/image`, formData);

            return response.data;
        },

        onSuccess: () => {
            invalidateAdminCollection(queryClient, SLIDERS);
        },
    });
}

export function useDeleteSlider() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (sliderId: number): Promise<void> => {
            await api.delete(`/sliders/${sliderId}`);
        },

        onSuccess: () => {
            invalidateAdminCollection(queryClient, SLIDERS);
        },
    });
}

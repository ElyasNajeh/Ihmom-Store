import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
    createSlider,
    deleteSlider,
    fetchSliders,
    replaceSliderImage,
    updateSlider,
} from '@/features/catalog/api/sliders-api.ts';
import type { CreateSlider, QuerySlider, UpdateSlider } from '@/features/catalog/types/slider.ts';
import { withDefaultQuery } from '@/shared/types/query.ts';
import { SLIDERS } from '@/shared/utils/query-keys.ts';
import { invalidateAdminCollection } from '@/shared/utils/query-invalidation.ts';

export function useSliders(params: QuerySlider = {}) {
    const queryParams = withDefaultQuery(params);

    return useQuery({
        queryKey: [SLIDERS, queryParams],
        queryFn: () => fetchSliders(queryParams),
    });
}

export function useCreateSlider() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ sliderData, image }: { sliderData: CreateSlider; image: File }) =>
            createSlider(sliderData, image),

        onSuccess: () => {
            invalidateAdminCollection(queryClient, SLIDERS);
        },
    });
}

export function useUpdateSlider() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ sliderId, sliderData }: { sliderId: number; sliderData: UpdateSlider }) =>
            updateSlider(sliderId, sliderData),

        onSuccess: () => {
            invalidateAdminCollection(queryClient, SLIDERS);
        },
    });
}

export function useReplaceSliderImage() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ sliderId, image }: { sliderId: number; image: File }) =>
            replaceSliderImage(sliderId, image),

        onSuccess: () => {
            invalidateAdminCollection(queryClient, SLIDERS);
        },
    });
}

export function useDeleteSlider() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: deleteSlider,

        onSuccess: () => {
            invalidateAdminCollection(queryClient, SLIDERS);
        },
    });
}

import type {
    CreateSlider,
    QuerySlider,
    Slider,
    UpdateSlider,
} from '@/features/catalog/types/slider.ts';
import { api } from '@/shared/api/axios.ts';
import type { PaginatedResponse } from '@/shared/types/query.ts';

export async function fetchSliders(params: QuerySlider): Promise<PaginatedResponse<Slider>> {
    const response = await api.get<PaginatedResponse<Slider>>('/sliders/', { params });

    return response.data;
}

export async function createSlider(sliderData: CreateSlider, image: File): Promise<Slider> {
    const formData = new FormData();

    formData.append('title_ar', sliderData.title_ar);
    formData.append('title_en', sliderData.title_en);
    formData.append('display_order', String(sliderData.display_order ?? 0));
    formData.append('is_active', String(sliderData.is_active ?? true));
    formData.append('image', image);

    const response = await api.post<Slider>('/sliders/', formData);

    return response.data;
}

export async function updateSlider(sliderId: number, sliderData: UpdateSlider): Promise<Slider> {
    const response = await api.patch<Slider>(`/sliders/${sliderId}`, sliderData);

    return response.data;
}

export async function replaceSliderImage(sliderId: number, image: File): Promise<Slider> {
    const formData = new FormData();

    formData.append('image', image);

    const response = await api.patch<Slider>(`/sliders/${sliderId}/image`, formData);

    return response.data;
}

export async function deleteSlider(sliderId: number): Promise<void> {
    await api.delete(`/sliders/${sliderId}`);
}

import { useLocation } from 'react-router-dom';

import ShopPage from '@/features/catalog/pages/store/shop-page.tsx';

// The search field is seeded from the URL, so remount when the query changes.
export function ShopRoute() {
    const location = useLocation();

    return <ShopPage key={new URLSearchParams(location.search).get('search') ?? ''} />;
}

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, X } from 'lucide-react';

import { Button } from '@/shared/components/ui/button.tsx';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/shared/components/ui/dialog.tsx';
import { Input } from '@/shared/components/ui/input.tsx';

interface StoreSearchDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function StoreSearchDialog({ open, onOpenChange }: StoreSearchDialogProps) {
    const { t } = useTranslation('navigation');
    const navigate = useNavigate();
    const [term, setTerm] = useState('');

    const handleOpenChange = (nextOpen: boolean) => {
        if (!nextOpen) {
            setTerm('');
        }

        onOpenChange(nextOpen);
    };

    const submit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const query = term.trim();
        onOpenChange(false);
        navigate(query ? `/shop?search=${encodeURIComponent(query)}` : '/shop');
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent showCloseButton={false} className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>{t('header.search')}</DialogTitle>
                </DialogHeader>

                <form onSubmit={submit} className="flex gap-2" role="search">
                    <div className="relative min-w-0 flex-1">
                        <Search
                            className="text-muted-foreground pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2"
                            aria-hidden="true"
                        />
                        <Input
                            autoFocus
                            value={term}
                            onChange={(event) => setTerm(event.target.value)}
                            placeholder={t('header.searchPlaceholder')}
                            aria-label={t('header.search')}
                            className="h-11 ps-9"
                        />
                    </div>

                    <Button type="submit" className="h-11 shrink-0">
                        {t('header.searchSubmit')}
                    </Button>

                    <DialogClose
                        render={
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="size-11 shrink-0"
                                aria-label={t('header.closeSearch')}
                            />
                        }
                    >
                        <X className="size-4" aria-hidden="true" />
                    </DialogClose>
                </form>
            </DialogContent>
        </Dialog>
    );
}

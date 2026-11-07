interface BilingualNameCellProps {
    nameAr: string;
    nameEn: string;
    isArabic: boolean;
}

export function BilingualNameCell({ nameAr, nameEn, isArabic }: BilingualNameCellProps) {
    return (
        <div className="min-w-0">
            <p className="truncate font-medium">{isArabic ? nameAr : nameEn}</p>
            <p className="text-muted-foreground truncate text-xs" dir={isArabic ? 'ltr' : 'rtl'}>
                {isArabic ? nameEn : nameAr}
            </p>
        </div>
    );
}

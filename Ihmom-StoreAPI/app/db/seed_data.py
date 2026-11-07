"""Static store data inserted by ``python -m app.db.seed``.

Each list is intentionally plain data so it can be edited without touching the
seed runner. Reference records are matched by their bilingual names and
products by name and brand, so the seed command only inserts missing rows; it
does not update or delete records that already exist.
"""

from decimal import Decimal

CATEGORIES = [
    {"name_ar": "الشيشة", "name_en": "Hookahs"},
    {"name_ar": "الفيب", "name_en": "Vapes"},
    {"name_ar": "المباخر", "name_en": "Incense Burners"},
    {"name_ar": "ملحقات الكمبيوتر", "name_en": "Computer Accessories"},
    {"name_ar": "الألعاب", "name_en": "Gaming"},
]

BRANDS = [
    {"name_ar": "خليل مأمون", "name_en": "Khalil Mamoon"},
    {"name_ar": "الفاخر", "name_en": "Al Fakher"},
    {"name_ar": "ستار بز", "name_en": "Starbuzz"},
    {"name_ar": "فابوريسو", "name_en": "Vaporesso"},
    {"name_ar": "لوجيتك", "name_en": "Logitech"},
    {"name_ar": "ريزر", "name_en": "Razer"},
    {"name_ar": "إحموم", "name_en": "Ihmom"},
]

DELIVERY_AREAS = [
    {"name_ar": "نابلس", "name_en": "Nablus", "delivery_fee": Decimal("10.00")},
    {"name_ar": "حوارة", "name_en": "Huwara", "delivery_fee": Decimal("15.00")},
    {
        "name_ar": "بيت فوريك",
        "name_en": "Beit Furik",
        "delivery_fee": Decimal("15.00"),
    },
    {
        "name_ar": "عصيرة الشمالية",
        "name_en": "Asira ash-Shamaliya",
        "delivery_fee": Decimal("15.00"),
    },
    {
        "name_ar": "مخيم عسكر",
        "name_en": "Askar Camp",
        "delivery_fee": Decimal("10.00"),
    },
    {
        "name_ar": "مخيم بلاطة",
        "name_en": "Balata Camp",
        "delivery_fee": Decimal("10.00"),
    },
]

# A product with ``variants`` uses those selectable variants. A product without
# them is a simple product and requires ``price`` (optionally ``sku``).
PRODUCTS = [
    {
        "category": "Hookahs",
        "brand": "Khalil Mamoon",
        "name_ar": "شيشة خليل مأمون كلاسيك",
        "name_en": "Khalil Mamoon Classic Hookah",
        "description_ar": "شيشة تقليدية من النحاس بتصميم كلاسيكي، متوفرة بثلاثة أحجام.",
        "description_en": (
            "Traditional brass hookah with a classic design, available in "
            "three sizes."
        ),
        "variants": [
            {
                "name_ar": "صغير",
                "name_en": "Small",
                "sku": "KM-CLASSIC-S",
                "price": Decimal("120.00"),
            },
            {
                "name_ar": "متوسط",
                "name_en": "Medium",
                "sku": "KM-CLASSIC-M",
                "price": Decimal("160.00"),
            },
            {
                "name_ar": "كبير",
                "name_en": "Large",
                "sku": "KM-CLASSIC-L",
                "price": Decimal("220.00"),
            },
        ],
    },
    {
        "category": "Hookahs",
        "brand": "Ihmom",
        "name_ar": "شيشة إحموم الصغيرة",
        "name_en": "Ihmom Mini Hookah",
        "description_ar": "شيشة صغيرة وسهلة الحمل مناسبة للاستخدام اليومي.",
        "description_en": (
            "Compact hookah that is easy to carry and ideal for everyday use."
        ),
        "price": Decimal("85.00"),
        "sku": "IHM-HOOKAH-MINI",
    },
    {
        "category": "Hookahs",
        "brand": "Al Fakher",
        "name_ar": "معسل الفاخر تفاحتين 250 غرام",
        "name_en": "Al Fakher Double Apple 250g",
        "description_ar": "معسل تفاحتين بطعم غني ومنعش، عبوة 250 غرام.",
        "description_en": "Rich and refreshing double apple flavour, 250 g pack.",
        "price": Decimal("30.00"),
        "sku": "AF-DA-250",
    },
    {
        "category": "Vapes",
        "brand": "Starbuzz",
        "name_ar": "سائل فيب ستار بز بلو مايست 60 مل",
        "name_en": "Starbuzz Blue Mist 60ml",
        "description_ar": "سائل فيب بطعم التوت الأزرق المنعش، عبوة 60 مل.",
        "description_en": "Refreshing blueberry vape liquid, 60 ml bottle.",
        "price": Decimal("35.00"),
        "sku": "SB-BLUE-MIST-60",
    },
    {
        "category": "Vapes",
        "brand": "Starbuzz",
        "name_ar": "سائل فيب ستار بز نعناع 60 مل",
        "name_en": "Starbuzz Mint 60ml",
        "description_ar": "سائل فيب بنكهة النعناع البارد، عبوة 60 مل.",
        "description_en": "Cool mint vape liquid, 60 ml bottle.",
        "price": Decimal("35.00"),
        "sku": "SB-MINT-60",
    },
    {
        "category": "Vapes",
        "brand": "Vaporesso",
        "name_ar": "طقم فيب فابوريسو إكسروس 4",
        "name_en": "Vaporesso XROS 4 Pod Kit",
        "description_ar": "طقم فيب صغير الحجم ببطارية طويلة العمر ونكهة ثابتة.",
        "description_en": (
            "Compact pod kit with long battery life and consistent flavour."
        ),
        "variants": [
            {
                "name_ar": "أسود",
                "name_en": "Black",
                "sku": "VAP-XROS4-BLK",
                "price": Decimal("130.00"),
            },
            {
                "name_ar": "فضي",
                "name_en": "Silver",
                "sku": "VAP-XROS4-SLV",
                "price": Decimal("130.00"),
            },
        ],
    },
    {
        "category": "Incense Burners",
        "brand": "Ihmom",
        "name_ar": "مبخرة سيراميك إحموم",
        "name_en": "Ihmom Ceramic Incense Burner",
        "description_ar": "مبخرة سيراميك أنيقة مناسبة للبخور والعود.",
        "description_en": "Elegant ceramic burner suitable for bakhoor and oud.",
        "price": Decimal("45.00"),
        "sku": "IHM-BURNER-CERAMIC",
    },
    {
        "category": "Incense Burners",
        "brand": "Ihmom",
        "name_ar": "مبخرة كهربائية إحموم",
        "name_en": "Ihmom Electric Incense Burner",
        "description_ar": "مبخرة كهربائية بتحكم في الحرارة وتصميم عصري.",
        "description_en": (
            "Electric incense burner with temperature control and a modern "
            "design."
        ),
        "price": Decimal("120.00"),
        "sku": "IHM-BURNER-ELECTRIC",
    },
    {
        "category": "Computer Accessories",
        "brand": "Logitech",
        "name_ar": "ماوس لاسلكي لوجيتك M185",
        "name_en": "Logitech M185 Wireless Mouse",
        "description_ar": "ماوس لاسلكي موثوق بتصميم مريح لليد.",
        "description_en": "Reliable wireless mouse with a comfortable shape.",
        "price": Decimal("65.00"),
        "sku": "LOG-M185",
    },
    {
        "category": "Gaming",
        "brand": "Razer",
        "name_ar": "هيدست ألعاب ريزر كراكن X",
        "name_en": "Razer Kraken X Gaming Headset",
        "description_ar": "هيدست ألعاب خفيف الوزن بصوت محيطي واضح.",
        "description_en": "Lightweight gaming headset with clear surround sound.",
        "price": Decimal("210.00"),
        "sku": "RAZ-KRAKEN-X",
    },
    {
        "category": "Gaming",
        "brand": "Ihmom",
        "name_ar": "لوحة ماوس للألعاب إحموم RGB",
        "name_en": "Ihmom RGB Gaming Mouse Pad",
        "description_ar": "لوحة ماوس كبيرة بإضاءة RGB وحواف مخيطة.",
        "description_en": "Large mouse pad with RGB lighting and stitched edges.",
        "variants": [
            {
                "name_ar": "متوسط",
                "name_en": "Medium",
                "sku": "IHM-PAD-M",
                "price": Decimal("35.00"),
            },
            {
                "name_ar": "كبير",
                "name_en": "Large",
                "sku": "IHM-PAD-L",
                "price": Decimal("55.00"),
            },
        ],
    },
]

import * as React from 'react';

/** Replicates the Customer Support headset illustration[cite: 1]. */
export function CustomerSupportIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 100 100"
            fill="none"
            stroke="#000"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            {...props}
        >
            <path d="M35 50 a15 15 0 1 0 30 0 a15 15 0 0 0 -30 0 z" fill="#9FCA9C" />
            <path d="M40 60 l-5 10 l10 -7" fill="#9FCA9C" />
            <circle cx="43" cy="50" r="2" fill="#fff" stroke="none" />
            <circle cx="50" cy="50" r="2" fill="#fff" stroke="none" />
            <circle cx="57" cy="50" r="2" fill="#fff" stroke="none" />
            <path d="M25 55 v-15 a25 25 0 0 1 50 0 v15" fill="none" />
            <path d="M35 25 q15 -8 30 0" stroke="#E8D5B5" strokeWidth="10" />
            <rect x="15" y="45" width="12" height="24" rx="6" fill="#E8D5B5" />
            <rect x="73" y="45" width="12" height="24" rx="6" fill="#E8D5B5" />
            <rect x="10" y="50" width="5" height="14" rx="2" fill="#9FCA9C" />
            <rect x="85" y="50" width="5" height="14" rx="2" fill="#9FCA9C" />
            <path d="M78 70 c0 15 -15 15 -25 15" fill="none" />
            <rect x="42" y="81" width="12" height="8" rx="4" fill="#E8D5B5" />
        </svg>
    );
}

/** Replicates the Easy Returns box and arrow illustration[cite: 2]. */
export function EasyReturnsIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 100 100"
            fill="none"
            stroke="#000"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            {...props}
        >
            <path
                d="M30 75 A 35 35 0 0 1 50 15 A 35 35 0 0 1 80 35"
                stroke="#9FCA9C"
                strokeWidth="8"
            />
            <path d="M80 35 l-10 -5 M80 35 l-5 -10" stroke="#9FCA9C" strokeWidth="6" />
            <path d="M35 45 l15 -8 l15 8 v15 l-15 8 l-15 -8 z" fill="#E8D5B5" />
            <path d="M50 37 v15 M35 45 l15 8 M65 45 l-15 8" />
            <path d="M44 41 l6 3.5 v10 l-6 -3.5 z" fill="#D3BA95" />
            <path d="M80 65 A 35 35 0 0 1 20 50" stroke="#9FCA9C" strokeWidth="8" />
            <path d="M15 30 q5 0 5 -5 q0 5 5 5 q-5 0 -5 5 q0 -5 -5 -5" fill="#E0A97E" />
            <path d="M75 75 q5 0 5 -5 q0 5 5 5 q-5 0 -5 5 q0 -5 -5 -5" fill="#E0A97E" />
        </svg>
    );
}

/** Replicates the Fast Delivery truck illustration[cite: 3]. */
export function FastDeliveryIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 100 100"
            fill="none"
            stroke="#000"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            {...props}
        >
            <rect x="30" y="30" width="25" height="20" fill="#E8D5B5" />
            <path d="M40 30 v10 h5 v-10" fill="#D3BA95" />
            <rect x="20" y="50" width="40" height="15" fill="#9FCA9C" />
            <path d="M60 45 h10 l10 15 v5 h-20 z" fill="#E8D5B5" />
            <path d="M65 50 h8 l4 6 h-12 z" fill="#fff" />
            <rect x="73" y="50" width="4" height="6" rx="2" fill="#333" />
            <rect x="18" y="58" width="5" height="7" rx="2" fill="#E0A97E" />
            <path d="M80 60 h5 v5 h-5 z" fill="#E0A97E" />
            <circle cx="35" cy="70" r="9" fill="#333" />
            <circle cx="35" cy="70" r="4" fill="#a0a0a0" />
            <circle cx="70" cy="70" r="9" fill="#333" />
            <circle cx="70" cy="70" r="4" fill="#a0a0a0" />
            <path d="M10 45 h8 M5 55 h12 M12 65 h6" strokeWidth="4" strokeLinecap="round" />
        </svg>
    );
}

/** Replicates the Local Store awning and map pin illustration[cite: 4]. */
export function LocalStoreIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 100 100"
            fill="none"
            stroke="#000"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            {...props}
        >
            <rect x="25" y="50" width="50" height="35" fill="#E8D5B5" />
            <path d="M20 85 h60" strokeWidth="4" />
            <rect x="55" y="60" width="15" height="25" fill="#E8D5B5" />
            <rect x="57" y="62" width="11" height="21" fill="#fff" />
            <circle cx="66" cy="74" r="1.5" fill="#000" />
            <rect x="30" y="60" width="18" height="15" fill="#fff" />
            <path d="M28 75 h22 v5 h-22 z" fill="#9FCA9C" />
            <path d="M20 50 l5 -12 h50 l5 12 z" fill="#9FCA9C" />
            <path d="M35 38 l-3 12 M50 38 l-1 12 M65 38 l1 12" stroke="#fff" strokeWidth="4" />
            <path
                d="M50 10 c-8 0 -15 7 -15 15 c0 10 15 25 15 25 c0 0 15 -15 15 -25 c0 -8 -7 -15 -15 -15 z"
                fill="#E8D5B5"
            />
            <circle cx="50" cy="23" r="5" fill="#fff" />
            <path
                d="M68 30 q4 0 4 -4 q0 4 4 4 q-4 0 -4 4 q0 -4 -4 -4"
                fill="#E0A97E"
                stroke="none"
            />
        </svg>
    );
}

/** Replicates the Quality Guarantee box and seal illustration[cite: 5]. */
export function QualityGuaranteeIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 100 100"
            fill="none"
            stroke="#000"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            {...props}
        >
            <path d="M20 40 l25 -12 l25 12 v25 l-25 12 l-25 -12 z" fill="#E8D5B5" />
            <path d="M45 28 v25 M20 40 l25 12 M70 40 l-25 12" />
            <path d="M38 31 l8 4 v12 l-8 -4 z" fill="#D3BA95" />
            <path
                d="M70 45 c4 -4 10 -4 14 0 c4 4 4 10 0 14 c4 4 4 10 0 14 c-4 4 -10 4 -14 0 c-4 4 -10 4 -14 0 c-4 -4 -4 -10 0 -14 c-4 -4 -4 -10 0 -14 c4 -4 10 -4 14 0 z"
                fill="#9FCA9C"
            />
            <path d="M60 60 l5 5 l10 -12" stroke="#fff" strokeWidth="4" />
            <path d="M15 20 q5 0 5 -5 q0 5 5 5 q-5 0 -5 5 q0 -5 -5 -5" fill="#E0A97E" />
            <path d="M85 25 q4 0 4 -4 q0 4 4 4 q-4 0 -4 4 q0 -4 -4 -4" fill="#E0A97E" />
        </svg>
    );
}

/** Replicates the Secure Payments card and shield illustration[cite: 6]. */
export function SecurePaymentsIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 100 100"
            fill="none"
            stroke="#000"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            {...props}
        >
            <rect x="10" y="25" width="65" height="45" rx="6" fill="#E8D5B5" />
            <path d="M10 40 h65" fill="#fff" strokeWidth="8" />
            <rect x="20" y="50" width="12" height="10" rx="2" fill="#E0A97E" />
            <path d="M26 50 v10 M20 55 h12" stroke="#000" strokeWidth="1.5" />
            <path d="M50 50 l30 0 v15 c0 15 -15 25 -15 25 c0 0 -15 -10 -15 -25 z" fill="#9FCA9C" />
            <path d="M57 65 l5 5 l10 -12" stroke="#fff" strokeWidth="5" />
        </svg>
    );
}

/** Replicates the Shop Categories grid illustration[cite: 7]. */
export function ShopCategoriesIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 100 100"
            fill="none"
            stroke="#000"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            {...props}
        >
            <rect x="15" y="15" width="32" height="32" rx="6" fill="#E8D5B5" />
            <rect x="53" y="15" width="32" height="32" rx="6" fill="#9FCA9C" />
            <rect x="15" y="53" width="32" height="32" rx="6" fill="#9FCA9C" />
            <rect x="53" y="53" width="32" height="32" rx="6" fill="#E8D5B5" />

            {/* Phone */}
            <rect x="23" y="20" width="16" height="22" rx="3" fill="#333" />
            <rect x="25" y="22" width="12" height="18" rx="2" fill="#E8D5B5" />

            {/* Cable */}
            <circle cx="69" cy="31" r="7" stroke="#fff" strokeWidth="4" />
            <path d="M69 24 v-5 h-3 v-3 h6 v3 h-3 M69 38 v5" stroke="#fff" strokeWidth="2" />

            {/* Gift Box */}
            <rect x="21" y="65" width="20" height="15" fill="#fff" />
            <rect x="19" y="60" width="24" height="5" fill="#fff" />
            <path d="M31 60 v20" stroke="#D3BA95" strokeWidth="3" />
            <path d="M31 60 c-3 -4 -8 -2 -4 3 c3 -4 8 -2 4 3" fill="#E0A97E" />

            {/* Bottle */}
            <rect x="63" y="63" width="12" height="18" rx="4" fill="#fff" />
            <rect x="65" y="58" width="8" height="5" fill="#333" />
            <path d="M65 58 c0 -5 8 -5 8 0" stroke="#333" strokeWidth="2" />

            {/* Sparkles */}
            <path
                d="M10 25 q3 0 3 -3 q0 3 3 3 q-3 0 -3 3 q0 -3 -3 -3"
                fill="#E0A97E"
                stroke="none"
            />
            <path
                d="M85 20 q3 0 3 -3 q0 3 3 3 q-3 0 -3 3 q0 -3 -3 -3"
                fill="#E0A97E"
                stroke="none"
            />
            <path
                d="M12 60 q3 0 3 -3 q0 3 3 3 q-3 0 -3 3 q0 -3 -3 -3"
                fill="#E0A97E"
                stroke="none"
            />
            <path
                d="M88 65 q3 0 3 -3 q0 3 3 3 q-3 0 -3 3 q0 -3 -3 -3"
                fill="#E0A97E"
                stroke="none"
            />
        </svg>
    );
}

/** Replicates the Shopping Options tote bag illustration[cite: 8]. */
export function ShoppingOptionsIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 100 100"
            fill="none"
            stroke="#000"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            {...props}
        >
            <rect
                x="25"
                y="25"
                width="20"
                height="30"
                rx="3"
                fill="#E8D5B5"
                transform="rotate(-15 35 40)"
            />
            <rect
                x="27"
                y="27"
                width="16"
                height="26"
                rx="2"
                fill="#fff"
                transform="rotate(-15 35 40)"
            />
            <circle cx="50" cy="40" r="10" stroke="#fff" strokeWidth="5" />
            <circle cx="50" cy="40" r="6" stroke="#000" strokeWidth="2" />
            <path d="M50 30 v-8 h-4 v-5 h8 v5 h-4" fill="#fff" />
            <rect
                x="58"
                y="35"
                width="20"
                height="15"
                fill="#E8D5B5"
                transform="rotate(10 68 42)"
            />
            <path d="M68 35 v15" stroke="#D3BA95" strokeWidth="4" transform="rotate(10 68 42)" />
            <path
                d="M63 30 c-5 -5 -10 0 -5 5 c5 -5 10 0 5 5"
                fill="#E0A97E"
                transform="rotate(10 68 42)"
            />
            <path d="M20 50 l-5 35 a5 5 0 0 0 5 5 h60 a5 5 0 0 0 5 -5 l-5 -35 z" fill="#E8D5B5" />
            <path d="M18 50 h64" strokeWidth="4" />
            <path d="M35 50 c0 25 30 25 30 0" fill="none" stroke="#9FCA9C" strokeWidth="5" />
            <circle cx="35" cy="50" r="2" fill="#000" />
            <circle cx="65" cy="50" r="2" fill="#000" />
            <path d="M15 35 q5 0 5 -5 q0 5 5 5 q-5 0 -5 5 q0 -5 -5 -5" fill="#E0A97E" />
            <path d="M85 30 q5 0 5 -5 q0 5 5 5 q-5 0 -5 5 q0 -5 -5 -5" fill="#E0A97E" />
        </svg>
    );
}

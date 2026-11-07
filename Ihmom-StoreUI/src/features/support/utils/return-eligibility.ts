export type ReturnCondition = 'unused' | 'opened' | 'damaged';
export type ReturnWindow = 'under7' | '7to14' | 'over14';
export type ReturnCategory = 'electronics' | 'hookah' | 'lifestyle' | 'consumable';
export type ReturnReason = 'outsideWindow' | 'opened' | 'hygiene' | 'damagedLate';
export type ReturnStatus = 'eligible' | 'conditional' | 'notEligible';

export interface ReturnAssessment {
    status: ReturnStatus;
    reasons: ReturnReason[];
}

interface ReturnInput {
    condition: ReturnCondition;
    window: ReturnWindow;
    category: ReturnCategory;
}

/**
 * Mirrors the public return policy described on the Returns page. Kept as a
 * pure function so the checker UI only renders the result.
 */
export function assessReturnEligibility({
    condition,
    window,
    category,
}: ReturnInput): ReturnAssessment {
    if (category === 'consumable') {
        return { status: 'notEligible', reasons: ['hygiene'] };
    }

    if (condition === 'damaged') {
        if (window === 'under7') {
            return { status: 'eligible', reasons: [] };
        }

        if (window === '7to14') {
            return { status: 'conditional', reasons: ['damagedLate'] };
        }

        return { status: 'notEligible', reasons: ['damagedLate', 'outsideWindow'] };
    }

    if (condition === 'opened') {
        return { status: 'notEligible', reasons: ['opened'] };
    }

    if (window === 'over14') {
        return { status: 'notEligible', reasons: ['outsideWindow'] };
    }

    return { status: 'eligible', reasons: [] };
}

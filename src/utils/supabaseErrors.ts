interface SupabaseErrorLike {
    code?: string;
    message?: string;
    details?: string;
    hint?: string;
}

const MISSING_TABLE_REGEX = /table '([^']+)'/i;

export const isMissingSupabaseTableError = (error: unknown): error is SupabaseErrorLike => {
    if (!error || typeof error !== 'object') {
        return false;
    }

    const e = error as SupabaseErrorLike;
    return e.code === 'PGRST205' || Boolean(e.message && e.message.includes('Could not find the table'));
};

export const getMissingSupabaseTableName = (error: unknown): string | null => {
    if (!isMissingSupabaseTableError(error)) {
        return null;
    }

    const message = (error as SupabaseErrorLike).message || '';
    const matched = message.match(MISSING_TABLE_REGEX);

    if (!matched || !matched[1]) {
        return null;
    }

    return matched[1];
};

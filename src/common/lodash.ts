export const get = (obj: any, path: string | string[]): any => {
    const keys = Array.isArray(path) ? path : path.split('.');
    let result = obj;
    for (const key of keys) {
        if (result == null || typeof result !== 'object') return undefined;
        result = result[key];
    }
    return result;
};

export const merge = (target: any, source: any): any => {
    if (!source || typeof source !== 'object') return target;
    if (!target || typeof target !== 'object') return source;

    const result = { ...target };
    for (const key in source) {
        if (source.hasOwnProperty(key)) {
            if (
                typeof source[key] === 'object' &&
                source[key] !== null &&
                typeof result[key] === 'object' &&
                result[key] !== null
            ) {
                result[key] = merge(result[key], source[key]);
            } else {
                result[key] = source[key];
            }
        }
    }
    return result;
};

/**
 * Performs a deep comparison between two values to determine if they are equivalent.
 * Similar to lodash.isEqual
 */
export function isEqual(value: any, other: any): boolean {
    // Handle primitive types and same reference
    if (value === other) {
        return true;
    }

    // Handle null/undefined cases
    if (value == null || other == null) {
        return value === other;
    }

    // Handle different types
    if (typeof value !== typeof other) {
        return false;
    }

    // Handle Date objects
    if (value instanceof Date && other instanceof Date) {
        return value.getTime() === other.getTime();
    }

    // Handle RegExp objects
    if (value instanceof RegExp && other instanceof RegExp) {
        return value.toString() === other.toString();
    }

    // Handle arrays
    if (Array.isArray(value) && Array.isArray(other)) {
        if (value.length !== other.length) {
            return false;
        }
        for (let i = 0; i < value.length; i++) {
            if (!isEqual(value[i], other[i])) {
                return false;
            }
        }
        return true;
    }

    // Handle objects
    if (typeof value === 'object' && typeof other === 'object') {
        const keysA = Object.keys(value);
        const keysB = Object.keys(other);

        if (keysA.length !== keysB.length) {
            return false;
        }

        // Check if all keys from A exist in B and values are equal
        for (const key of keysA) {
            if (!keysB.includes(key)) {
                return false;
            }
            if (!isEqual(value[key], other[key])) {
                return false;
            }
        }

        return true;
    }

    // For other types (functions, symbols, etc.), use strict equality
    return false;
}

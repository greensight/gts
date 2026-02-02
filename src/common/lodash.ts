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

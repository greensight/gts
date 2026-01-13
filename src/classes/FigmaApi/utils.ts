export const preparedParams = (params: Record<string, any>) => {
    const newParams = new URLSearchParams();

    Object.keys(params).forEach(p => {
        if (Array.isArray(params[p])) {
            params[p].forEach((val: any) => newParams.append(`${p}[]`, val));
        } else {
            newParams.append(p, params[p]);
        }
    });

    return newParams;
};

export const chunkIds = (ids: string[], step = 50) => {
    const result = [];

    for (let i = 0; i < ids.length; i += step) {
        result.push(ids.slice(i, i + step));
    }

    return result;
};

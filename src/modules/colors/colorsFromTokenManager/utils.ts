import type { IColorFigmaGradientValue, IDSTokenStyleColor } from '../../../classes/TokenManager/types';

const getMappedColorsFromStops = (stops: { color: string; position: number }[]) =>
    stops
        .reduce<string[]>((acc, stop) => {
            const position = Number((stop.position * 100).toFixed(1));
            return [...acc, `${stop.color}${position > 0 && position < 100 ? ` ${position}%` : ''}`];
        }, [])
        .join(', ');

const getGradientLinear = (gradient: IColorFigmaGradientValue) => {
    const colorString = getMappedColorsFromStops(gradient.stops);
    return `linear-gradient(${gradient.angle}deg, ${colorString})`;
};

const getGradientRadial = (gradient: IColorFigmaGradientValue) => {
    const colorString = getMappedColorsFromStops(gradient.stops);
    return `radial-gradient(circle, ${colorString})`;
};

const getGradientAngular = (gradient: IColorFigmaGradientValue) => {
    const colorString = getMappedColorsFromStops(gradient.stops);
    return `conic-gradient(from ${gradient.angle}deg, ${colorString})`;
};

const getGradientDiamond = (gradient: IColorFigmaGradientValue) => {
    const colorString = getMappedColorsFromStops(gradient.stops);
    return `linear-gradient(${gradient.angle}deg, ${colorString})`;
};

export const variableToColorToken = (value: IDSTokenStyleColor['value']) => {
    if (typeof value === 'string') return value;

    if (value.type === 'linear') return getGradientLinear(value);
    if (value.type === 'radial') return getGradientRadial(value);
    if (value.type === 'conic') return getGradientAngular(value);
    if (value.type === 'diamond') return getGradientDiamond(value);

    return '';
};

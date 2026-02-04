export interface IContainerValueCenter {
    alignment: 'center';
    width: number;
    margin: 'auto';
}
export interface IContainerValueStretch {
    alignment: 'stretch';
    margin: string;
}

type TContainerValue = IContainerValueCenter | IContainerValueStretch;

export interface IContainerToken {
    name: string;
    value: TContainerValue;
}

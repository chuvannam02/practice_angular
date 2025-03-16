interface IMenu {
    id: number;
    name: string;
    url: string;
    icon: string;
    children: IMenu[];
}

export type {
    IMenu
}

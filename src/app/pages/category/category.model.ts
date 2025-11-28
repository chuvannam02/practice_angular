interface ICategory {
    name: string;
    code: string;
    id: string;
}

type ICategoryOptional = Partial<ICategory>;

export type { ICategory, ICategoryOptional };

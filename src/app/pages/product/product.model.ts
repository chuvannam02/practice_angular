// product.model.ts
export interface Product {
    id: number;
    name: string;
    price: number;
    stock?: number;
}

// Metadata rule cho từng field
export const productRules: Record<keyof Product, any[]> = {
    id: [],
    name: [{ type: 'required', message: 'Tên sản phẩm là bắt buộc' }],
    price: [
        { type: 'required', message: 'Giá là bắt buộc' },
        { type: 'min', value: 1, message: 'Giá phải lớn hơn 0' },
    ],
    stock: [{ type: 'min', value: 0, message: 'Tồn kho không âm' }],
};

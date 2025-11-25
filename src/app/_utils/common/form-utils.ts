/**
 * @Project: practice_angular
 * @Author: CHUNAM
 * @Date: 11/14/2025
 * @Time: 1:01 AM
 * @File: form-utils.ts
 */
import {FormControl, FormGroup, ValidatorFn, Validators} from '@angular/forms';

// Tạo FormGroup từ Model T
export type FormGroupFrom<T> = {
    [K in keyof T]: FormControl<T[K]>;
};

export function createFormGroup<T>(model: T): FormGroup<FormGroupFrom<T>> {
    const group: any = {};
    for (const key in model) {
        group[key] = new FormControl(model[key]);
    }
    return new FormGroup(group);
}

// 1. Định nghĩa các loại Rule cụ thể (Discriminated Unions)
export type ValidatorRule =
    | { type: 'required' }
    | { type: 'email' }
    | { type: 'min'; value: number }
    | { type: 'max'; value: number }
    | { type: 'minLength'; value: number }
    | { type: 'maxLength'; value: number }
    | { type: 'pattern'; value: string | RegExp };

// 2. Định nghĩa Map Lookup (Strategy Pattern)
// Key là 'type', Value là hàm nhận Rule và trả về ValidatorFn
const VALIDATOR_STRATEGIES: Record<string, (rule: any) => ValidatorFn> = {
    required: () => Validators.required,
    email: () => Validators.email,
    min: (rule) => Validators.min(rule.value),
    max: (rule) => Validators.max(rule.value),
    minLength: (rule) => Validators.minLength(rule.value),
    maxLength: (rule) => Validators.maxLength(rule.value),
    pattern: (rule) => Validators.pattern(rule.value),
};

function buildValidators(rules: ValidatorRule[]): ValidatorFn[] {
    return rules
        .map(rule => {
            const strategy = VALIDATOR_STRATEGIES[rule.type];
            if (!strategy) {
                console.warn(`Validator type "${rule.type}" is not supported.`);
                return null;
            }
            return strategy(rule);
        })
        .filter((v): v is ValidatorFn => v !== null); // Lọc bỏ null
}

// function buildValidators(rules: any[]) {
//     const fns = [];
//     for (const rule of rules) {
//         switch (rule.type) {
//             case 'required':
//                 fns.push(Validators.required);
//                 break;
//             case 'min':
//                 fns.push(Validators.min(rule.value));
//                 break;
//             case 'max':
//                 fns.push(Validators.max(rule.value));
//                 break;
//             case 'pattern':
//                 fns.push(Validators.pattern(rule.value));
//                 break;
//         }
//     }
//     return fns;
// }

// export function createFormGroupWithRules<T>(
//     model: T,
//     rules: Record<keyof T, any[]>
// ): FormGroup<FormGroupFrom<T>> {
//     const group: any = {};
//     for (const key in model) {
//         const validators = buildValidators(rules[key] || []);
//         group[key] = new FormControl(model[key], validators);
//     }
//     return new FormGroup(group);
// }

// Type helper để định nghĩa cấu trúc Rules cho Model
export type ModelRules<T> = Partial<Record<keyof T, ValidatorRule[]>>;
export function createFormGroupWithRules<T extends object>(
    model: T,
    rules: ModelRules<T> = {} // Mặc định là object rỗng
): FormGroup { // Nếu dùng Angular 14+, có thể để FormGroup<FormGroupFrom<T>>
    const group: any = {};

    for (const key in model) {
        if (Object.hasOwn(model, key)) {
            // Lấy rules tương ứng với key, nếu không có thì là mảng rỗng
            const fieldRules = rules[key] || [];
            const validators = buildValidators(fieldRules);

            group[key] = new FormControl(model[key], validators);
        }
    }

    return new FormGroup(group);
}

interface UserProfile {
    username: string;
    age: number;
    email: string;
}

const initialData: UserProfile = {
    username: '',
    age: 0,
    email: ''
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const form = createFormGroupWithRules(initialData, {
    username: [
        { type: 'required' },
        { type: 'minLength', value: 3 } // ✅ OK: TS biết minLength cần value
    ],
    age: [
        { type: 'min', value: 18 },
        { type: 'required' }
        // { type: 'min' } ❌ Lỗi ngay lập tức: Property 'value' is missing.
    ],
    // email: có thể bỏ qua, không bắt buộc khai báo
});

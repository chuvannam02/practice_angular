/**
 * @Project: practice_angular
 * @Author: CHUNAM
 * @Date: 11/14/2025
 * @Time: 1:11 AM
 * @File: user.schema.ts
 */
// user.schema.ts
import { z } from "zod";

export const userSchema = z.object({
    name: z.string().min(3, "Tên phải có ít nhất 3 ký tự"),
    email: z.string().email("Email không hợp lệ"),
    age: z.number().min(18, "Tuổi phải >= 18"),
});

export type User = z.infer<typeof userSchema>;

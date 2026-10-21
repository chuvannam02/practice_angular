/**
 * @Project: practice_angular
 * @Author: CHUNAM
 * @Date: 2/3/2026
 * @Time: 11:07 PM
 * @File: icon-data.ts
 */

// icon-data.ts
// Import toàn bộ icon dưới dạng Object
import * as HeroOutline from '@ng-icons/heroicons/outline';
import * as HeroSolid from '@ng-icons/heroicons/solid';
import * as HeroMini from '@ng-icons/heroicons/mini';

// Hàm helper để lấy danh sách tên icon
function getIconNames(iconSet: any): string[] {
    return Object.keys(iconSet);
}

export const ICON_SETS = {
    outline: getIconNames(HeroOutline),
    solid: getIconNames(HeroSolid),
    mini: getIconNames(HeroMini),
};

// Gom tất cả lại để register vào module (cần thiết để ng-icon hiển thị được)
export const ALL_ICONS = {
    ...HeroOutline,
    ...HeroSolid,
    ...HeroMini,
};

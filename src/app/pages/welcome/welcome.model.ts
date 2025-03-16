export interface WelcomeModel {
    id: number;
    name: string;
    url: string;
    icon: string;
    children: WelcomeModel[];
}

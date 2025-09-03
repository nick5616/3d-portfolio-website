export interface Meteor {
    id: number;
    x: number;
    y: number;
    z: number;
    problem: string;
    answer: number;
    choices: number[];
    color?: string;
    answered?: boolean;
}

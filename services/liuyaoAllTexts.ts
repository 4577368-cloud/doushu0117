import { YAO_TEXTS_PART1 } from './liuyaoYaoTexts1';
import { YAO_TEXTS_PART2 } from './liuyaoYaoTexts2';

export const ALL_YAO_TEXTS = {
    ...YAO_TEXTS_PART1,
    ...YAO_TEXTS_PART2
};

export type HexagramKey = keyof typeof ALL_YAO_TEXTS;

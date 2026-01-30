import { HEXAGRAM_DATA, getHexagram, Trigram, TRIGRAMS } from './liuyaoData';
import { YAO_TEXTS_PART1 } from './liuyaoYaoTexts1';
import { YAO_TEXTS_PART2 } from './liuyaoYaoTexts2';

// Combine Yao Texts
export const YAO_TEXTS = { ...YAO_TEXTS_PART1, ...YAO_TEXTS_PART2 };

export interface YaoText {
    position: number;
    name: string;
    text: string;
    vernacular: string;
}

// 0 = Yin (--), 1 = Yang (—)
// Coin toss:
// 1 Head + 2 Tails = 7 (Shaoyang, Static Yang) -> 1
// 2 Heads + 1 Tail = 8 (Shaoyin, Static Yin) -> 0
// 3 Heads = 9 (Laoyang, Moving Yang) -> 1 -> 0
// 3 Tails = 6 (Laoyin, Moving Yin) -> 0 -> 1

export type YaoValue = 6 | 7 | 8 | 9;

export interface LiuYaoResult {
    lines: YaoValue[]; // Index 0 is Bottom
    baseHexagram: {
        binary: number[];
        data: any;
        key: string;
    };
    changedHexagram: {
        binary: number[];
        data: any;
        key: string;
    } | null;
    timestamp: Date;
}

/**
 * Simulates throwing 3 coins.
 * Returns:
 * 6: Old Yin (X) - 3 Tails
 * 7: Young Yang (-) - 1 Head, 2 Tails
 * 8: Young Yin (--) - 2 Heads, 1 Tail
 * 9: Old Yang (O) - 3 Heads
 * 
 * Probability (standard):
 * HHH (1/8) -> 9
 * HHT, HTH, THH (3/8) -> 8
 * HTT, THT, TTH (3/8) -> 7
 * TTT (1/8) -> 6
 */
export const castCoinLine = (): YaoValue => {
    // 0 = Tail, 1 = Head
    const c1 = Math.random() < 0.5 ? 0 : 1;
    const c2 = Math.random() < 0.5 ? 0 : 1;
    const c3 = Math.random() < 0.5 ? 0 : 1;
    
    const heads = c1 + c2 + c3;
    
    if (heads === 3) return 9; // Old Yang
    if (heads === 2) return 8; // Young Yin
    if (heads === 1) return 7; // Young Yang
    return 6; // Old Yin
};

export const getHexagramKey = (binaryLines: number[]): string => {
    // lines: array of 6 integers (0 or 1). Index 0 is Bottom line.
    // Lower Trigram: lines[2], lines[1], lines[0]
    const lowerBin = `${binaryLines[2]}${binaryLines[1]}${binaryLines[0]}`;
    // Upper Trigram: lines[5], lines[4], lines[3]
    const upperBin = `${binaryLines[5]}${binaryLines[4]}${binaryLines[3]}`;
    return `${upperBin}-${lowerBin}`;
};

export const getYaoText = (hexagramKey: string, position: number): YaoText | null => {
    // position: 1-6
    const texts = (YAO_TEXTS as any)[hexagramKey];
    if (!texts) return null;
    return texts.find((t: YaoText) => t.position === position) || null;
};

export const analyzeHexagram = (lines: YaoValue[]) => {
    // 1. Build Base Hexagram (Original)
    // 6->0, 7->1, 8->0, 9->1
    const baseBinary = lines.map(v => (v === 7 || v === 9) ? 1 : 0);
    const baseKey = getHexagramKey(baseBinary);
    const baseHex = getHexagram(baseBinary);
    
    // 2. Build Changed Hexagram (Future)
    // 6->1, 7->1, 8->0, 9->0
    // Only moving lines change.
    const hasMoving = lines.some(v => v === 6 || v === 9);
    
    let changedHex = null;
    let changedBinary: number[] = [];
    let changedKey = "";
    
    if (hasMoving) {
        changedBinary = lines.map(v => {
            if (v === 6) return 1; // Old Yin becomes Yang
            if (v === 9) return 0; // Old Yang becomes Yin
            if (v === 7) return 1;
            return 0; // 8
        });
        changedKey = getHexagramKey(changedBinary);
        changedHex = getHexagram(changedBinary);
    }

    return {
        lines,
        base: {
            binary: baseBinary,
            info: baseHex,
            key: baseKey
        },
        changed: hasMoving ? {
            binary: changedBinary,
            info: changedHex,
            key: changedKey
        } : null,
        movingLines: lines.map((v, i) => (v === 6 || v === 9) ? i + 1 : null).filter(Boolean) as number[]
    };
};

import { BaziChart } from '../types';
import combosRaw from '../bazi/data/combos.ts?raw';

const parseCombos = (raw: string): Record<string, string> => {
  const map: Record<string, string> = {};
  const lines = raw.split(/\r?\n/);
  let currentKey: string | null = null;
  let buf: string[] = [];
  const startInline = /^\s*'([^']+)':\s*$/;
  const startTriple = /^\s*'([^']+)':\s*'''\s*$/;
  const endTriple = /^\s*'''[,，]?\s*$/;
  for (const line of lines) {
    const mTriple = line.match(startTriple);
    if (mTriple) { if (currentKey) { map[currentKey] = buf.join('\n').trim(); } currentKey = mTriple[1]; buf = []; continue; }
    const mInline = line.match(startInline);
    if (mInline) { if (currentKey) { map[currentKey] = buf.join('\n').trim(); } currentKey = mInline[1]; buf = []; continue; }
    if (currentKey && endTriple.test(line)) { map[currentKey] = buf.join('\n').trim(); currentKey = null; buf = []; continue; }
    if (currentKey) { buf.push(line.replace(/^\s{0,4}/, '')); }
  }
  if (currentKey) { map[currentKey] = buf.join('\n').trim(); }
  return map;
};

const DAY_HOUR_COMBOS = parseCombos(combosRaw);

export const getDayHourComboText = (chart: BaziChart): string => {
  try {
    const dayGan = chart.pillars.day.ganZhi.gan;
    const hourGan = chart.pillars.hour.ganZhi.gan;
    const hourZhi = chart.pillars.hour.ganZhi.zhi;
    const key = `${dayGan}日${hourGan}${hourZhi}`;
    const txt = DAY_HOUR_COMBOS[key] || '';
    const monthZhi = chart.pillars.month.ganZhi.zhi;
    const dayZhi = chart.pillars.day.ganZhi.zhi;
    const lines = txt.split(/\r?\n/);
    const branchStart = new RegExp(`^\\s*${dayGan}(子|丑|寅|卯|辰|巳|午|未|申|酉|戌|亥|已|己)日${hourGan}${hourZhi}时`);
    const specificStart = new RegExp(`^\\s*${dayGan}${dayZhi}日${hourGan}${hourZhi}时`);
    let firstBranchIdx = -1;
    let startIdx = -1;
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (firstBranchIdx < 0 && branchStart.test(l)) firstBranchIdx = i;
      if (specificStart.test(l)) { startIdx = i; break; }
    }
    let endIdx = lines.length;
    if (startIdx >= 0) {
      for (let i = startIdx + 1; i < lines.length; i++) {
        if (branchStart.test(lines[i])) { endIdx = i; break; }
      }
    }
    const generalPart = firstBranchIdx > 0 ? lines.slice(0, firstBranchIdx).join('\n').trim() : '';
    const specificPart = startIdx >= 0 ? lines.slice(startIdx, endIdx).join('\n').trim() : '';
    const monthHintLines = (specificPart || txt).split(/\r?\n/).map(s => s.trim()).filter(Boolean).filter(l => l.includes('月') && l.includes(monthZhi));
    const hint = monthHintLines.length ? `【当月提示】\n${monthHintLines.join('\n')}\n\n` : '';
    const finalText = (hint + [generalPart, specificPart || txt].filter(Boolean).join('\n\n')).trim();
    return finalText || '暂无此组合的传统解读';
  } catch {
    return '暂无此组合的传统解读';
  }
};

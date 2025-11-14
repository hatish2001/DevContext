import { and, between, desc, eq, gte, lte } from 'drizzle-orm';
import { getDb } from '../config/database';
import { contexts } from '../models/schema';
import { openaiService } from './openaiService';

type SummaryType = 'daily' | 'weekly';

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day + 6) % 7; // make Monday=0
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfWeek(date: Date): Date {
  const start = startOfWeek(date);
  const d = new Date(start);
  d.setDate(start.getDate() + 6);
  d.setHours(23, 59, 59, 999);
  return d;
}

export class SummaryService {
  async generate(userId: string, type: SummaryType): Promise<string> {
    if (type === 'daily') return this.generateDaily(userId);
    return this.generateWeekly(userId);
  }

  private async generateDaily(userId: string): Promise<string> {
    const db = getDb();
    const now = new Date();
    const items = await db
      .select()
      .from(contexts)
      .where(
        and(
          eq(contexts.userId, userId),
          between(contexts.updatedAt, startOfDay(now), endOfDay(now))
        )
      )
      .orderBy(desc(contexts.updatedAt));

    if (!items.length) return 'No activity today.';

    const compact = this.buildCompactActivity(items as any[], 12, 6);
    const prompt = [
      'You are writing a human-friendly developer update. Keep it crisp and readable.',
      'From the activity JSON below, produce a daily standup in 3–6 short bullet points:',
      '- What I completed yesterday (action-focused, reference repos/features)',
      "- What I'm working on today (next concrete steps)",
      '- Any blockers (only if present)',
      'Rules:',
      '- Do not write N/A sections; omit any section that has no data.',
      '- Prefer natural language over raw IDs. Mention ticket keys (e.g., PROJ-123) if present.',
      '- Keep total under 120 words. No raw links.',
      '',
      JSON.stringify(compact)
    ].join('\n');

    return openaiService.generateText(prompt, { model: 'gpt-4o-mini', maxTokens: 280, temperature: 0.55 });
  }

  private async generateWeekly(userId: string): Promise<string> {
    const db = getDb();
    const now = new Date();
    const items = await db
      .select()
      .from(contexts)
      .where(
        and(
          eq(contexts.userId, userId),
          between(contexts.updatedAt, startOfWeek(now), endOfWeek(now))
        )
      )
      .orderBy(desc(contexts.updatedAt));

    if (!items.length) return 'No activity this week yet.';

    const compact = this.buildCompactActivity(items as any[], 30, 10);
    const prompt = [
      'You are writing a weekly progress note for a dev audience. Be specific and concise.',
      'Using the activity JSON, generate:',
      '- Key accomplishments (2–4 bullets, mention repos/features/tickets).',
      '- Work in progress (1–3 bullets with clear next steps).',
      '- Metrics summary (only include metrics that are non-zero).',
      '- Next week priorities (2–3 bullets).',
      'Rules: no “N/A”; no raw URLs; ≤ 180 words; natural phrasing.',
      '',
      JSON.stringify(compact)
    ].join('\n');

    return openaiService.generateText(prompt, { model: 'gpt-4o-mini', maxTokens: 360, temperature: 0.6 });
  }

  private groupBySource(items: any[]) {
    return items.reduce((acc: Record<string, any[]>, item) => {
      const key = item.source;
      if (!acc[key]) acc[key] = [];
      acc[key].push({ title: item.title, metadata: item.metadata, url: item.url });
      return acc;
    }, {} as Record<string, any[]>);
  }

  /**
   * Build a compact representation to stay well within model context limits.
   * - Limits items per source
   * - Truncates titles
   * - Picks only key metadata fields
   */
  private buildCompactActivity(items: any[], maxTotal: number, maxPerSource: number) {
    const bySource: Record<string, any[]> = {};
    for (const it of items) {
      const src = it.source;
      if (!bySource[src]) bySource[src] = [];
      if (bySource[src].length >= maxPerSource) continue;
      bySource[src].push({
        title: String(it.title || '').slice(0, 140),
        url: it.url,
        metadata: this.pickMetadata(it.metadata),
      });
    }
    // Cap total
    const compact: Record<string, any[]> = {};
    let remaining = maxTotal;
    for (const [src, arr] of Object.entries(bySource)) {
      if (remaining <= 0) break;
      const take = Math.min(arr.length, Math.max(1, Math.floor(maxTotal / Object.keys(bySource).length)));
      compact[src] = arr.slice(0, take);
      remaining -= take;
    }
    // Add simple counts
    const counts: Record<string, number> = {};
    for (const [src, arr] of Object.entries(bySource)) counts[src] = arr.length;
    return { counts, items: compact };
  }

  private pickMetadata(md: any) {
    if (!md) return undefined;
    const keys = ['key','type','status','priority','assignee','repo','author','storyPoints'];
    const out: Record<string, any> = {};
    for (const k of keys) if (md[k] !== undefined) out[k] = md[k];
    return out;
  }
}

export const summaryService = new SummaryService();



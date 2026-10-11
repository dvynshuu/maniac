import { db } from '../db/database';
import { SecurityService } from './securityService';
import { batchDecrypt } from './cryptoWorker';

interface IntelligenceCache {
  nextActions: any[] | null;
  nextActionsTimestamp: number;
  forgetting: any | null;
  forgettingTimestamp: number;
  weeklyFocus: any | null;
  weeklyFocusTimestamp: number;
  knowledgeVelocity: any | null;
  velocityTimestamp: number;
}

let _intelligenceCache: IntelligenceCache = {
  nextActions: null,
  nextActionsTimestamp: 0,
  forgetting: null,
  forgettingTimestamp: 0,
  weeklyFocus: null,
  weeklyFocusTimestamp: 0,
  knowledgeVelocity: null,
  velocityTimestamp: 0,
};
const CACHE_TTL = 30000;

export class IntelligenceService {
  static invalidateCache(): void {
    _intelligenceCache = {
      nextActions: null,
      nextActionsTimestamp: 0,
      forgetting: null,
      forgettingTimestamp: 0,
      weeklyFocus: null,
      weeklyFocusTimestamp: 0,
      knowledgeVelocity: null,
      velocityTimestamp: 0,
    };
  }

  static async getNextActions(key: CryptoKey | null): Promise<any[]> {
    const now = Date.now();
    if (_intelligenceCache.nextActions && (now - _intelligenceCache.nextActionsTimestamp < CACHE_TTL)) {
      return _intelligenceCache.nextActions;
    }

    const todos = await db.blocks
      .where('type')
      .equals('todo')
      .reverse()
      .limit(30)
      .sortBy('updatedAt');

    const decryptTodo = async (todo: any, k: CryptoKey | null) => {
      let props = todo.properties || {};
      let content = todo.content || '';
      if (k && todo._isEncrypted) {
        try {
          if (typeof props === 'string') props = JSON.parse((await SecurityService.decrypt(props, k)) || '{}');
          if (typeof content === 'string') content = (await SecurityService.decrypt(content, k)) || '';
        } catch {
          props = {};
          content = 'Encrypted...';
        }
      }
      return { ...todo, properties: props, content };
    };

    const decrypted = key ? await batchDecrypt(todos, key, decryptTodo, 15) : todos;
    
    const result = decrypted
      .filter((t: any) => {
        if (t.properties?.checked) return false;
        const clean = (t.content || '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').trim();
        return Boolean(clean);
      })
      .map((t: any) => {
        const cleanContent = (t.content || '')
          .replace(/<[^>]*>/g, ' ')
          .replace(/&nbsp;/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();

        let priority = 0;
        if (cleanContent.includes('!!!')) priority = 3;
        else if (cleanContent.includes('!!')) priority = 2;
        else if (cleanContent.includes('!')) priority = 1;
        
        return { ...t, content: cleanContent, priority };
      })
      .sort((a: any, b: any) => b.priority - a.priority || b.updatedAt - a.updatedAt)
      .slice(0, 10);

    _intelligenceCache.nextActions = result;
    _intelligenceCache.nextActionsTimestamp = now;
    return result;
  }

  static async getForgetting(key: CryptoKey | null): Promise<any> {
    const now = Date.now();
    if (_intelligenceCache.forgetting && (now - _intelligenceCache.forgettingTimestamp < CACHE_TTL)) {
      return _intelligenceCache.forgetting;
    }

    const weekAgo = now - (7 * 24 * 60 * 60 * 1000);

    const stalePages = await db.pages
      .filter(p => ((p.lastViewedAt || p.updatedAt) ?? 0) < weekAgo)
      .limit(10)
      .toArray();

    const decryptPage = async (page: any, k: CryptoKey | null) => {
      let title = page.title || '';
      if (k && page._isEncrypted) {
        try {
          title = (await SecurityService.decrypt(title, k)) || '';
        } catch {
          title = 'Encrypted...';
        }
      }
      return { ...page, title };
    };

    const decryptedPages = await Promise.all(stalePages.map(p => decryptPage(p, key)));

    const twoWeeksAgo = now - (14 * 24 * 60 * 60 * 1000);
    const abandonedTodosRaw = await db.blocks
      .where('type')
      .equals('todo')
      .and(b => b.updatedAt < twoWeeksAgo)
      .limit(20)
      .toArray();

    const decryptTodo = async (todo: any, k: CryptoKey | null) => {
      let props = todo.properties || {};
      let content = todo.content || '';
      if (k && todo._isEncrypted) {
        try {
          if (typeof props === 'string') props = JSON.parse((await SecurityService.decrypt(props, k)) || '{}');
          if (typeof content === 'string') content = (await SecurityService.decrypt(content, k)) || '';
        } catch {
          props = {};
          content = 'Encrypted...';
        }
      }
      return { ...todo, properties: props, content };
    };

    const decryptedTodos = await Promise.all(abandonedTodosRaw.map(t => decryptTodo(t, key)));
    const abandonedTodos = decryptedTodos
      .filter((t: any) => {
        if (t.properties?.checked) return false;
        const clean = (t.content || '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').trim();
        return Boolean(clean);
      })
      .map((t: any) => {
        const cleanContent = (t.content || '')
          .replace(/<[^>]*>/g, ' ')
          .replace(/&nbsp;/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        return { ...t, content: cleanContent };
      })
      .sort((a: any, b: any) => a.updatedAt - b.updatedAt);

    const result = {
      stalePages: decryptedPages.sort((a: any, b: any) => a.updatedAt - b.updatedAt),
      abandonedTodos: abandonedTodos
    };
    _intelligenceCache.forgetting = result;
    _intelligenceCache.forgettingTimestamp = now;
    return result;
  }

  static async getWeeklyFocus(key: CryptoKey | null): Promise<any> {
    const now = Date.now();
    if (_intelligenceCache.weeklyFocus && (now - _intelligenceCache.weeklyFocusTimestamp < CACHE_TTL)) {
      return _intelligenceCache.weeklyFocus;
    }

    const weekAgo = now - (7 * 24 * 60 * 60 * 1000);

    const recentPages = await db.pages
      .where('updatedAt')
      .above(weekAgo)
      .limit(20)
      .toArray();

    const recentEntries = await db.tracker_entries
      .where('createdAt')
      .above(weekAgo)
      .limit(50)
      .toArray();

    const decryptPage = async (page: any, k: CryptoKey | null) => {
      let title = page.title || '';
      if (k && page._isEncrypted) {
        try {
          title = (await SecurityService.decrypt(title, k)) || '';
        } catch {
          title = 'Encrypted...';
        }
      }
      return { ...page, title };
    };

    const decryptedPages = await Promise.all(recentPages.map(p => decryptPage(p, key)));
    
    const trackers = await db.trackers.toArray();
    const trackerStats = trackers.map(t => {
      const count = recentEntries.filter(e => e.trackerId === t.id).length;
      return { ...t, count };
    }).filter(t => t.count > 0);

    const result = {
      activePages: decryptedPages.length,
      trackerStats,
      topPages: decryptedPages.slice(0, 5)
    };
    _intelligenceCache.weeklyFocus = result;
    _intelligenceCache.weeklyFocusTimestamp = now;
    return result;
  }

  static async getKnowledgeVelocity(): Promise<any> {
    const now = Date.now();
    if (_intelligenceCache.knowledgeVelocity && (now - _intelligenceCache.velocityTimestamp < CACHE_TTL)) {
      return _intelligenceCache.knowledgeVelocity;
    }

    const dayAgo = now - (24 * 60 * 60 * 1000);
    const weekAgo = now - (7 * 24 * 60 * 60 * 1000);

    const [dayBlocks, weekBlocks, totalBlocks, totalRelations] = await Promise.all([
      db.blocks.where('updatedAt').above(dayAgo).count(),
      db.blocks.where('updatedAt').above(weekAgo).count(),
      db.blocks.count(),
      db.relations.count()
    ]);

    const dailyActivity = [0, 0, 0, 0, 0, 0, 0];
    const weeklyBlocks = await db.blocks.where('updatedAt').above(weekAgo).limit(100).toArray();
    
    weeklyBlocks.forEach(b => {
      const daysAgo = Math.floor((now - b.updatedAt) / (24 * 60 * 60 * 1000));
      if (daysAgo >= 0 && daysAgo < 7) {
        dailyActivity[6 - daysAgo]++;
      }
    });

    const maxActivity = Math.max(...dailyActivity, 1);
    const normalizedActivity = dailyActivity.map(count => Math.max(5, Math.round((count / maxActivity) * 100)));

    let depthLevel = 1;
    if (totalBlocks > 2000 && totalRelations > 200) depthLevel = 5;
    else if (totalBlocks > 500 && totalRelations > 50) depthLevel = 4;
    else if (totalBlocks > 100 && totalRelations > 10) depthLevel = 3;
    else if (totalBlocks > 50) depthLevel = 2;

    const velocity = Math.min(100, Math.round((dayBlocks * 5) + (weekBlocks * 0.5)));
    
    const result = {
      velocity,
      dayBlocks,
      weekBlocks,
      totalBlocks,
      totalRelations,
      dailyActivity: normalizedActivity,
      depthLevel
    };
    _intelligenceCache.knowledgeVelocity = result;
    _intelligenceCache.velocityTimestamp = now;
    return result;
  }
}

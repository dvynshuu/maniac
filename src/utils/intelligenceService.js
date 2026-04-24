import { db } from '../db/database';
import { SecurityService } from './securityService';
import { batchDecrypt } from './cryptoWorker';

export class IntelligenceService {
  static async getNextActions(key) {
    const todos = await db.blocks
      .where('type')
      .equals('todo')
      .reverse()
      .sortBy('updatedAt');

    const decryptTodo = async (todo, k) => {
      let props = todo.properties || {};
      let content = todo.content || '';
      if (k && todo._isEncrypted) {
        try {
          if (typeof props === 'string') props = JSON.parse(await SecurityService.decrypt(props, k));
          if (typeof content === 'string') content = await SecurityService.decrypt(content, k);
        } catch {
          props = {};
          content = 'Encrypted...';
        }
      }
      return { ...todo, properties: props, content };
    };

    const decrypted = await batchDecrypt(todos, key, decryptTodo, 20);
    
    // Prioritize: Unchecked, then by updatedAt (already sorted)
    // We can also look for "high priority" markers like ! or tags in content
    return decrypted
      .filter(t => !t.properties?.checked)
      .map(t => {
        let priority = 0;
        if (t.content.includes('!!!')) priority = 3;
        else if (t.content.includes('!!')) priority = 2;
        else if (t.content.includes('!')) priority = 1;
        
        return { ...t, priority };
      })
      .sort((a, b) => b.priority - a.priority || b.updatedAt - a.updatedAt)
      .slice(0, 10);
  }

  static async getForgetting(key) {
    const now = Date.now();
    const weekAgo = now - (7 * 24 * 60 * 60 * 1000);

    // Stale pages: not viewed or updated in a week
    const stalePages = await db.pages
      .filter(p => (p.lastViewedAt || p.updatedAt) < weekAgo)
      .limit(10)
      .toArray();

    const decryptPage = async (page, k) => {
        let title = page.title || '';
        if (k && page._isEncrypted) {
            try {
                title = await SecurityService.decrypt(title, k);
            } catch {
                title = 'Encrypted...';
            }
        }
        return { ...page, title };
    };

    const decryptedPages = await Promise.all(stalePages.map(p => decryptPage(p, key)));

    // Abandoned tasks: older than 2 weeks, unchecked
    const twoWeeksAgo = now - (14 * 24 * 60 * 60 * 1000);
    const abandonedTodosRaw = await db.blocks
      .where('type')
      .equals('todo')
      .and(b => b.updatedAt < twoWeeksAgo)
      .limit(20)
      .toArray();

    const decryptTodo = async (todo, k) => {
        let props = todo.properties || {};
        let content = todo.content || '';
        if (k && todo._isEncrypted) {
            try {
                if (typeof props === 'string') props = JSON.parse(await SecurityService.decrypt(props, k));
                if (typeof content === 'string') content = await SecurityService.decrypt(content, k);
            } catch {
                props = {};
                content = 'Encrypted...';
            }
        }
        return { ...todo, properties: props, content };
    };

    const decryptedTodos = await Promise.all(abandonedTodosRaw.map(t => decryptTodo(t, key)));
    const abandonedTodos = decryptedTodos.filter(t => !t.properties?.checked);

    return {
        stalePages: decryptedPages.sort((a, b) => a.updatedAt - b.updatedAt),
        abandonedTodos: abandonedTodos.sort((a, b) => a.updatedAt - b.updatedAt)
    };
  }

  static async getWeeklyFocus(key) {
    const now = Date.now();
    const weekAgo = now - (7 * 24 * 60 * 60 * 1000);

    // Get pages updated this week
    const recentPages = await db.pages
        .where('updatedAt')
        .above(weekAgo)
        .toArray();

    // Get tracker entries this week
    const recentEntries = await db.tracker_entries
        .where('createdAt')
        .above(weekAgo)
        .toArray();

    // Simple frequency analysis on page titles (needs decryption)
    const decryptPage = async (page, k) => {
        let title = page.title || '';
        if (k && page._isEncrypted) {
            try {
                title = await SecurityService.decrypt(title, k);
            } catch {
                title = 'Encrypted...';
            }
        }
        return { ...page, title };
    };

    const decryptedPages = await Promise.all(recentPages.map(p => decryptPage(p, key)));
    
    // Group entries by tracker
    const trackers = await db.trackers.toArray();
    const trackerStats = trackers.map(t => {
        const count = recentEntries.filter(e => e.trackerId === t.id).length;
        return { ...t, count };
    }).filter(t => t.count > 0);

    return {
        activePages: decryptedPages.length,
        trackerStats,
        topPages: decryptedPages.slice(0, 5)
    };
  }

  static async getKnowledgeVelocity() {
    const now = Date.now();
    const dayAgo = now - (24 * 60 * 60 * 1000);
    const weekAgo = now - (7 * 24 * 60 * 60 * 1000);

    const [dayBlocks, weekBlocks, totalBlocks] = await Promise.all([
        db.blocks.where('updatedAt').above(dayAgo).count(),
        db.blocks.where('updatedAt').above(weekAgo).count(),
        db.blocks.count()
    ]);

    // Velocity = growth rate + interaction density
    // Simple mock metric for now: (new blocks today / 10) + (new blocks this week / 50)
    const velocity = Math.min(100, Math.round((dayBlocks * 5) + (weekBlocks * 0.5)));
    
    return {
        velocity,
        dayBlocks,
        weekBlocks,
        totalBlocks
    };
  }
}

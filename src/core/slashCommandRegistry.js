/**
 * ─── Slash Command Registry ────────────────────────────────────
 * Provider-based command framework with fuzzy scoring,
 * async providers, categorization, and extension API.
 *
 * Replaces the hardcoded BLOCK_TYPE_META filter in SlashMenu.
 */

import { BLOCK_TYPE_META } from '../utils/constants';
import { usePageStore } from '../stores/pageStore';

// ─── Fuzzy Scoring ──────────────────────────────────────────────

function fuzzyScore(query, target) {
  if (!query) return 1;
  const q = query.toLowerCase();
  const t = target.toLowerCase();
  
  // Exact match
  if (t === q) return 100;
  // Prefix match
  if (t.startsWith(q)) return 80 + (q.length / t.length) * 20;
  // Contains match
  const idx = t.indexOf(q);
  if (idx !== -1) return 50 + (q.length / t.length) * 20;
  // Word-start match (e.g. "bl" matches "Bullet List")
  const words = t.split(/\s+/);
  for (const word of words) {
    if (word.startsWith(q)) return 60 + (q.length / word.length) * 15;
  }
  // Subsequence match
  let qi = 0;
  let matched = 0;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) { matched++; qi++; }
  }
  if (qi === q.length) return 20 + (matched / t.length) * 20;
  return 0;
}

// ─── Provider Registry ──────────────────────────────────────────

const _providers = [];

/**
 * Register a command provider.
 *
 * @param {object} provider
 * @param {string} provider.id - Unique provider ID
 * @param {string} provider.name - Display name
 * @param {number} provider.priority - Sort priority (lower = higher priority)
 * @param {Function} provider.getItems - async (query) => [CommandItem]
 */
export function registerProvider(provider) {
  const existing = _providers.findIndex(p => p.id === provider.id);
  if (existing !== -1) {
    _providers[existing] = provider;
  } else {
    _providers.push(provider);
  }
  _providers.sort((a, b) => (a.priority || 50) - (b.priority || 50));
}

/**
 * Get all commands matching a query, merged and scored across all providers.
 *
 * @param {string} query - Search query
 * @returns {Promise<Array<{ id, label, description, icon, category, score, action, providerIcon }>>}
 */
export async function getCommands(query) {
  const results = await Promise.all(
    _providers.map(async (provider) => {
      try {
        const items = await provider.getItems(query);
        return items.map(item => ({
          ...item,
          providerId: provider.id,
          providerName: provider.name,
        }));
      } catch (e) {
        console.warn(`[SlashRegistry] Provider "${provider.id}" failed:`, e);
        return [];
      }
    })
  );

  // Flatten, deduplicate by id, sort by score desc
  const all = results.flat();
  const seen = new Set();
  const deduped = [];
  for (const item of all) {
    if (!seen.has(item.id)) {
      seen.add(item.id);
      deduped.push(item);
    }
  }

  return deduped
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score);
}

/**
 * Get commands grouped by category.
 */
export async function getCommandsByCategory(query) {
  const commands = await getCommands(query);
  const categories = new Map();
  
  for (const cmd of commands) {
    const cat = cmd.category || 'Other';
    if (!categories.has(cat)) categories.set(cat, []);
    categories.get(cat).push(cmd);
  }

  return categories;
}

// ─── Built-in Providers ─────────────────────────────────────────

// 1. Block Type Provider
registerProvider({
  id: 'block-types',
  name: 'Basic Blocks',
  priority: 10,
  getItems: async (query) => {
    return Object.entries(BLOCK_TYPE_META).map(([type, meta]) => {
      const labelScore = fuzzyScore(query, meta.label);
      const typeScore = fuzzyScore(query, type);
      const descScore = fuzzyScore(query, meta.description || '');
      const score = Math.max(labelScore, typeScore, descScore * 0.5);

      // Categorize
      let category = 'Basic';
      if (['heading1', 'heading2', 'heading3'].includes(type)) category = 'Basic';
      else if (['image', 'embed', 'code'].includes(type)) category = 'Media & Code';
      else if (['database', 'table', 'tracker'].includes(type)) category = 'Database';
      else if (['toggle', 'callout', 'quote', 'divider'].includes(type)) category = 'Advanced';

      return {
        id: `block:${type}`,
        type,
        label: meta.label,
        description: meta.description,
        icon: meta.icon,
        category,
        score,
        action: 'create_block',
      };
    });
  },
});

// 2. Page Link Provider (replaces MentionMenu)
registerProvider({
  id: 'page-links',
  name: 'Link to Page',
  priority: 20,
  getItems: async (query) => {
    if (!query || query.length < 1) return [];
    
    const pages = usePageStore.getState().pages;
    return pages
      .filter(p => !p.isArchived)
      .map(p => {
        const title = p.title || 'Untitled';
        const score = fuzzyScore(query, title);
        return {
          id: `page:${p.id}`,
          pageId: p.id,
          label: title,
          description: 'Link to page',
          icon: 'FileText',
          category: 'Pages',
          score: score * 0.9, // Slightly lower than block types
          action: 'link_page',
          pageIcon: p.icon,
        };
      });
  },
});

// 3. Turn Into Provider (for changing block type of current block)
registerProvider({
  id: 'turn-into',
  name: 'Turn into',
  priority: 30,
  getItems: async (query) => {
    const turnQuery = query.toLowerCase();
    if (!turnQuery.startsWith('turn') && !turnQuery.startsWith('change') && !turnQuery.startsWith('convert')) {
      return [];
    }
    
    const subQuery = turnQuery
      .replace(/^(turn\s*into|change\s*to|convert\s*to)\s*/i, '')
      .trim();

    return Object.entries(BLOCK_TYPE_META).map(([type, meta]) => {
      const score = subQuery ? fuzzyScore(subQuery, meta.label) : 40;
      return {
        id: `turninto:${type}`,
        type,
        label: `Turn into ${meta.label}`,
        description: `Convert current block to ${meta.label.toLowerCase()}`,
        icon: meta.icon,
        category: 'Turn into',
        score,
        action: 'change_type',
      };
    });
  },
});

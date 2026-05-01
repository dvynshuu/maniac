/**
 * ─── Core: Plugin Registry ──────────────────────────────────────
 * Unified extensibility point for the Maniac platform.
 */

export class PluginRegistry {
  constructor() {
    this.blockTypes = new Map();
    this.slashCommands = [];
    this.hooks = {
      onBlockCreate: new Set(),
      onBlockUpdate: new Set(),
      onPageOpen: new Set(),
    };
  }

  /**
   * Register a new block type.
   */
  registerBlockType(id, config) {
    this.blockTypes.set(id, {
      id,
      label: config.label || id,
      icon: config.icon || 'Cube',
      render: config.render,
      schema: config.schema || {},
    });
  }

  /**
   * Register a slash command provider.
   */
  registerSlashCommand(command) {
    this.slashCommands.push(command);
  }

  /**
   * Register a lifecycle hook.
   */
  addHook(hookName, fn) {
    if (this.hooks[hookName]) {
      this.hooks[hookName].add(fn);
    }
  }

  /**
   * Execute hooks for a given lifecycle event.
   */
  async runHook(hookName, context) {
    const hooks = this.hooks[hookName];
    if (!hooks) return;
    
    for (const hook of hooks) {
      await hook(context);
    }
  }
}

// Global instance
export const maniacPlugins = new PluginRegistry();

export class FeatureFlagService {
  private static flags: Map<string, { enabled: boolean; rolloutPct: number }> = new Map([
    ['NEW_AI_MODEL', { enabled: true, rolloutPct: 50 }],
    ['DISTRIBUTED_CACHE', { enabled: true, rolloutPct: 100 }],
  ]);

  static isEnabled(flag: string, userId?: string): boolean {
    const config = this.flags.get(flag);
    if (!config) return false;
    if (!config.enabled) return false;

    if (config.rolloutPct >= 100) return true;
    if (config.rolloutPct <= 0) return false;

    // Sticky percentage rollout using simple hash of userId
    if (!userId) return Math.random() * 100 < config.rolloutPct;
    
    const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return (hash % 100) < config.rolloutPct;
  }
}

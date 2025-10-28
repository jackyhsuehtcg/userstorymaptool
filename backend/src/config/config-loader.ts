import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

/**
 * Load configuration from YAML file with environment variable overrides
 */
export class ConfigLoader {
  private static configCache: Record<string, any> = {};

  /**
   * Load config from YAML file
   * @param configPath Path to config file (without extension)
   * @returns Loaded configuration object
   */
  static load(configPath: string = 'config/default'): Record<string, any> {
    // Check cache first
    if (this.configCache[configPath]) {
      return this.configCache[configPath];
    }

    let config: Record<string, any> = {};

    // Try to load from .yaml first, then .yml, then .json
    const extensions = ['.yaml', '.yml', '.json'];
    let loaded = false;

    for (const ext of extensions) {
      const fullPath = path.resolve(configPath + ext);
      if (fs.existsSync(fullPath)) {
        try {
          const fileContent = fs.readFileSync(fullPath, 'utf8');
          if (ext === '.json') {
            config = JSON.parse(fileContent);
          } else {
            config = yaml.load(fileContent) as Record<string, any>;
          }
          console.log(`✓ Loaded config from ${fullPath}`);
          loaded = true;
          break;
        } catch (error) {
          console.error(`Error loading config from ${fullPath}:`, error);
          throw new Error(`Failed to load config from ${fullPath}`);
        }
      }
    }

    if (!loaded) {
      console.warn(
        `No config file found at ${configPath}, using environment variables only`
      );
    }

    // Override with environment variables
    config = this.applyEnvironmentOverrides(config);

    // Cache the config
    this.configCache[configPath] = config;

    return config;
  }

  /**
   * Apply environment variable overrides to config
   * Environment variables should follow pattern: CONFIG_section_subsection_key=value
   * Example: CONFIG_database_uri=mongodb://... or CONFIG_jwt_secret=...
   */
  private static applyEnvironmentOverrides(
    config: Record<string, any>
  ): Record<string, any> {
    const result = JSON.parse(JSON.stringify(config)); // Deep clone

    // Process all environment variables
    for (const [key, value] of Object.entries(process.env)) {
      if (key.startsWith('CONFIG_')) {
        const configKey = key.substring(7); // Remove 'CONFIG_' prefix
        const keys = configKey.toLowerCase().split('_');

        this.setNestedValue(result, keys, value);
      }
    }

    return result;
  }

  /**
   * Set nested value in object using key path
   */
  private static setNestedValue(
    obj: Record<string, any>,
    keys: string[],
    value: any
  ): void {
    let current = obj;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!current[key]) {
        current[key] = {};
      }
      current = current[key];
    }

    const lastKey = keys[keys.length - 1];
    // Try to parse boolean and number values
    current[lastKey] = this.parseValue(value);
  }

  /**
   * Parse environment variable value to appropriate type
   */
  private static parseValue(value: any): any {
    if (value === null || value === undefined) {
      return value;
    }

    const strValue = String(value);

    // Parse boolean
    if (strValue.toLowerCase() === 'true') return true;
    if (strValue.toLowerCase() === 'false') return false;

    // Parse number
    if (!isNaN(Number(strValue)) && strValue !== '') {
      return Number(strValue);
    }

    // Parse null
    if (strValue.toLowerCase() === 'null') return null;

    // Parse undefined
    if (strValue.toLowerCase() === 'undefined') return undefined;

    // Parse JSON arrays and objects
    if ((strValue.startsWith('[') && strValue.endsWith(']')) ||
        (strValue.startsWith('{') && strValue.endsWith('}'))) {
      try {
        return JSON.parse(strValue);
      } catch (e) {
        return strValue;
      }
    }

    return strValue;
  }

  /**
   * Get config value with dot notation
   * Example: getConfigValue('database.uri') or getConfigValue(config, 'database.uri')
   */
  static getConfigValue(
    configOrKey: Record<string, any> | string,
    keyPath?: string
  ): any {
    let config: Record<string, any>;
    let path: string;

    if (typeof configOrKey !== 'string' && keyPath) {
      // Called as getConfigValue(config, 'path.to.key')
      config = configOrKey as Record<string, any>;
      path = keyPath;
    } else if (typeof configOrKey === 'string') {
      // Called as getConfigValue('path.to.key')
      config = this.configCache['config/default'] || {};
      path = configOrKey;
    } else {
      throw new Error('Invalid arguments to getConfigValue');
    }

    const keys = path.split('.');
    let value = config;

    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return undefined;
      }
    }

    return value;
  }

  /**
   * Clear cache (useful for testing)
   */
  static clearCache(): void {
    this.configCache = {};
  }

  /**
   * Validate required config values
   */
  static validateRequired(config: Record<string, any>, required: string[]): void {
    const missing: string[] = [];

    for (const key of required) {
      const value = this.getConfigValue(config, key);
      if (value === undefined || value === null || value === '') {
        missing.push(key);
      }
    }

    if (missing.length > 0) {
      throw new Error(
        `Missing required configuration values: ${missing.join(', ')}`
      );
    }
  }

  /**
   * Merge two config objects (deep merge)
   */
  static merge(
    target: Record<string, any>,
    source: Record<string, any>
  ): Record<string, any> {
    const result = { ...target };

    for (const key in source) {
      if (
        source[key] &&
        typeof source[key] === 'object' &&
        !Array.isArray(source[key])
      ) {
        result[key] = this.merge(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }

    return result;
  }
}

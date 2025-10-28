import { ConfigLoader } from './config-loader';

/**
 * Configuration factory that loads from YAML and applies env overrides
 */
export const configuration = () => {
  const config = ConfigLoader.load();
  return config;
};

/**
 * Create a configuration object for ConfigModule.registerAsync
 */
export const configurationFactory = {
  load: () => configuration(),

  // Helper methods for accessing config values
  app: () => configuration().app || {},
  database: () => configuration().database || {},
  jwt: () => configuration().jwt || {},
  oauth: () => configuration().oauth || {},
  audit: () => configuration().audit || {},
  storyMap: () => configuration().storyMap || {},
  team: () => configuration().team || {},
  security: () => configuration().security || {},
};

/**
 * Validation schema for configuration
 */
export const validationConfig = {
  validationOptions: {
    allowUnknown: true,
    stripUnknown: false,
  },
  validate: (config: Record<string, any>) => {
    // Validate critical config values
    const criticalFields = [
      'app.port',
      'database.uri',
      'jwt.secret',
    ];

    try {
      ConfigLoader.validateRequired(config, criticalFields);
    } catch (error) {
      console.warn(
        'Configuration validation warning:',
        (error as Error).message
      );
      // Don't throw in development, just warn
      if (config.app?.nodeEnv === 'production') {
        throw error;
      }
    }

    return config;
  },
};

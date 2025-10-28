import { registerAs } from '@nestjs/config';

export const databaseConfig = registerAs('database', () => ({
  uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/story-map',
  name: process.env.MONGODB_NAME || 'story-map',
  useNewUrlParser: true,
  useUnifiedTopology: true,
}));

import dotenv from 'dotenv';
import { connectDB } from './src/config/db.js';
import { connectRedis } from './src/config/redis.js';
import logger from './src/utils/logger.js';
import app from './src/app.js';

dotenv.config();

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();
    await connectRedis();

    const server = app.listen(PORT, () => {
      logger.info(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
    });

    process.on('unhandledRejection', (err) => {
      logger.error(`Unhandled Rejection: ${err.message}`);
      server.close(() => process.exit(1));
    });

  } catch (err) {
    logger.error(`Server startup failed: ${err.message}`);
  }
};

startServer();

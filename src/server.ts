import app from './app';
import dotenv from 'dotenv';
import { connectDatabase, disconnectDatabase } from './config/database';

dotenv.config();

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    // Database connection check
    await connectDatabase();

    const server = app.listen(PORT, () => {
      console.log(`🚀 Server is running on http://localhost:${PORT}`);
    });

    // Graceful Shutdown on server kill
    const exitHandler = async () => {
      if (server) {
        server.close(async () => {
          console.log('Server closed');
          await disconnectDatabase();
          process.exit(0);
        });
      } else {
        await disconnectDatabase();
        process.exit(0);
      }
    };

    process.on('SIGTERM', exitHandler);
    process.on('SIGINT', exitHandler);
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }

  getInfo() {
    return {
      name: 'Enterprise Performance Engine API',
      version: '1.0.0',
      description: 'AI-native corporate learning platform',
      documentation: '/api/docs',
    };
  }
}

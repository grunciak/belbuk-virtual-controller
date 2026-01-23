import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/lib/use/ws';
import express from 'express';
import { createServer } from 'http';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import { PubSub } from 'graphql-subscriptions';

import {
  configuration,
  zones,
  portals,
  GLOBAL_ID,
} from './testData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ==================== KONFIGURACJA ====================

const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'belbuk-virtual-controller-secret-key';
const TOKEN_TTL = 3600;

const pubsub = new PubSub();

// ==================== STAN SYSTEMU ====================

const state = {
  zones: new Map(zones.map(z => [z.id, { armed: false, alarm: false, blocked: false, testing: false }])),
  portals: new Map(portals.map(p => [p.id, { emergency: false, released: false }])),
  antipassback: { suspended: false },
  eventIdCounter: 1,
};

// ==================== FUNKCJE POMOCNICZE ====================

function createEvent(code, symbol, reasonPoint, userId, operatorId) {
  const event = {
    site: GLOBAL_ID,
    id: `EVT-${state.eventIdCounter++}`,
    dateTime: new Date().toISOString(),
    trigger: { type: code, template: symbol },
    reason: reasonPoint,
    points: [],
    extensions: [],
    user: userId ? { id: userId, name: 'User' } : null,
    operator: operatorId,
  };
  
  pubsub.publish('EVENTS', { events: event });
  console.log(`[EVENT] ${event.id}: ${symbol}`);
  return event;
}

// ==================== RESOLVERY ====================

const resolvers = {
  Query: {
    echo: () => 'Virtual Controller ' + GLOBAL_ID,
    configuration: () => configuration,
    login: (_, { user, password }) => {
      if (user === 'admin' && password === 'admin') {
        const token = jwt.sign(
          { sub: 'admin', role: 'admin', site: GLOBAL_ID },
          JWT_SECRET,
          { expiresIn: TOKEN_TTL }
        );
        return { token, ttl: TOKEN_TTL };
      }
      throw new Error('Invalid credentials');
    },
    tokenTTL: () => TOKEN_TTL,
  },

  Mutation: {
    controlZone: (_, { zoneId, override, operatorId }) => {
      const zoneState = state.zones.get(zoneId);
      if (!zoneState) return 'UNKNOWN';
      
      const zoneDef = zones.find(z => z.id === zoneId);
      
      if (zoneState.armed) {
        zoneState.armed = false;
        zoneState.alarm = false;
        createEvent(101, 'DISARM', zoneDef, null, operatorId);
        return 'ZONE_DISARMED';
      } else {
        if (zoneState.blocked && !override) {
          return 'BLOCKED_SENSOR';
        }
        zoneState.armed = true;
        createEvent(100, 'ARM', zoneDef, null, operatorId);
        return 'ZONE_ARMED';
      }
    },

    restoreZone: (_, { zoneId, operatorId }) => {
      const zoneState = state.zones.get(zoneId);
      if (!zoneState) return 'UNKNOWN';
      
      if (!zoneState.alarm) return 'ALARM_NOT_ACTIVE';
      
      zoneState.alarm = false;
      createEvent(201, 'ALARM_RESTORE', null, null, operatorId);
      return 'RESTORED';
    },

    testZone: (_, { zoneId, operatorId }) => {
      const zoneState = state.zones.get(zoneId);
      if (!zoneState) return 'UNKNOWN';
      
      if (zoneState.armed) return 'DISARM_REQUIRED';
      if (zoneState.testing) return 'ALREADY_STARTED';
      
      zoneState.testing = true;
      createEvent(110, 'TEST_START', null, null, operatorId);
      return 'STARTED';
    },

    blockZone: (_, { zoneId, operatorId }) => {
      const zoneState = state.zones.get(zoneId);
      if (!zoneState) return 'UNKNOWN';
      
      if (zoneState.armed) return 'DISARM_REQUIRED';
      if (zoneState.blocked) return 'ALREADY_BLOCKED';
      
      zoneState.blocked = true;
      createEvent(120, 'ZONE_BLOCKED', null, null, operatorId);
      return 'BLOCKED';
    },

    blockZoneSensor: (_, { sensorId, operatorId }) => {
      console.log(`[ZONE] Sensor ${sensorId} blocked by operator ${operatorId}`);
      return 'BLOCKED';
    },

    unblockZoneSensor: (_, { sensorId, operatorId }) => {
      console.log(`[ZONE] Sensor ${sensorId} unblocked by operator ${operatorId}`);
      return 'UNBLOCKED';
    },

    releasePortal: (_, { portalId, operatorId }) => {
      const portalState = state.portals.get(portalId);
      if (!portalState) return 'UNKNOWN';
      
      if (portalState.emergency) return 'EMERGENCY';
      
      portalState.released = true;
      createEvent(310, 'PORTAL_RELEASED', null, null, operatorId);
      
      setTimeout(() => { portalState.released = false; }, 5000);
      return 'RELEASED';
    },

    emergencyPortal: (_, { portalId, operatorId }) => {
      const portalState = state.portals.get(portalId);
      if (!portalState) return 'UNKNOWN';
      
      if (portalState.emergency) return 'ALREADY_EMERGENCY';
      
      portalState.emergency = true;
      createEvent(311, 'PORTAL_EMERGENCY', null, null, operatorId);
      return 'DONE';
    },

    restorePortal: (_, { portalId, operatorId }) => {
      const portalState = state.portals.get(portalId);
      if (!portalState) return 'UNKNOWN';
      
      if (!portalState.emergency) return 'NORMAL_OPERATION';
      
      portalState.emergency = false;
      createEvent(312, 'PORTAL_RESTORED', null, null, operatorId);
      return 'RESTORED';
    },

    suspendAntipassback: (_, { operatorId }) => {
      if (state.antipassback.suspended) return 'ALREADY_SUSPENDED';
      state.antipassback.suspended = true;
      return 'SUSPENDED';
    },

    resumeAntipassback: (_, { operatorId }) => {
      if (!state.antipassback.suspended) return 'ALREADY_RESUMED';
      state.antipassback.suspended = false;
      return 'RESUMED';
    },

    reactivateAntipassback: (_, { credential, operatorId }) => {
      console.log(`[APB] Reactivated credential ${credential} by operator ${operatorId}`);
      return 'REACTIVATED';
    },
  },

  Subscription: {
    events: {
      subscribe: () => pubsub.asyncIterator(['EVENTS']),
    },
    pointValueChange: {
      subscribe: () => pubsub.asyncIterator(['POINT_VALUE_CHANGE']),
    },
  },
};

// ==================== URUCHOMIENIE SERWERA ====================

async function startServer() {
  const app = express();
  const httpServer = createServer(app);

  const typeDefs = readFileSync(join(__dirname, 'schema.graphql'), 'utf-8');
  const schema = makeExecutableSchema({ typeDefs, resolvers });

  const wsServer = new WebSocketServer({
    server: httpServer,
    path: '/graphql',
  });

  const serverCleanup = useServer({ schema }, wsServer);

  const server = new ApolloServer({
    schema,
    plugins: [
      ApolloServerPluginDrainHttpServer({ httpServer }),
      {
        async serverWillStart() {
          return {
            async drainServer() {
              await serverCleanup.dispose();
            },
          };
        },
      },
      // Logowanie zapytań configuration
      {
        async requestDidStart(requestContext) {
          const query = requestContext.request.query || '';
          if (query.toLowerCase().includes('configuration')) {
            console.log('\n[BELBUK REQUEST]');
            console.log('Query:', query.substring(0, 500));
          }
          return {
            async willSendResponse(requestContext) {
              const query = requestContext.request.query || '';
              if (query.toLowerCase().includes('configuration')) {
                const response = JSON.stringify(requestContext.response.body);
                console.log('[BELBUK RESPONSE] Length:', response.length);
                console.log('Response preview:', response.substring(0, 500));
              }
            },
          };
        },
      },
    ],
  });

  await server.start();

  app.use(
    '/graphql',
    cors(),
    express.json(),
    expressMiddleware(server, {
      context: async ({ req }) => {
        const token = req.headers.authorization?.replace('Bearer ', '');
        return { token };
      },
    })
  );

  app.get('/health', (req, res) => {
    res.json({ status: 'ok', globalId: GLOBAL_ID });
  });

  const port = PORT;
  httpServer.listen(port, () => {
    console.log(`🚀 Virtual Controller running`);
    console.log(`   GraphQL: http://localhost:${port}/graphql`);
    console.log(`   WebSocket: ws://localhost:${port}/graphql`);
    console.log(`   Health: http://localhost:${port}/health`);
    console.log(`   Global ID: ${GLOBAL_ID}`);
  });
}

startServer().catch(console.error);

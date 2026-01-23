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
  authorization,
  resource,
  zones,
  portals,
  schedulers,
  derogations,
  accessLevels,
  users,
  points,
  groups,
  SITE_ID,
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
  unconfirmedEvents: [],
  tokenTTL: TOKEN_TTL,
};

// ==================== FUNKCJE POMOCNICZE ====================

function createEvent(code, symbol, reasonPoint, userId, operatorId) {
  const event = {
    site: SITE_ID,
    id: `EVT-${state.eventIdCounter++}`,
    dateTime: new Date().toISOString(),
    trigger: { type: code, template: symbol },
    reason: reasonPoint,
    points: [],
    extensions: [],
    user: userId ? { id: userId, name: 'User' } : null,
    operator: operatorId,
  };
  
  state.unconfirmedEvents.push(event.id);
  pubsub.publish('EVENTS', { events: event });
  console.log(`[EVENT] ${event.id}: ${symbol}`);
  return event;
}

// ==================== RESOLVERY ====================

const resolvers = {
  Query: {
    // Autoryzacja
    getAuthToken: (_, { login, password }) => {
      if (login === 'admin' && password === 'admin') {
        const mainToken = jwt.sign(
          { sub: 'admin', role: 'admin', site: SITE_ID },
          JWT_SECRET,
          { expiresIn: state.tokenTTL }
        );
        const refreshToken = jwt.sign(
          { sub: 'admin', type: 'refresh' },
          JWT_SECRET,
          { expiresIn: '7d' }
        );
        return { mainToken, refreshToken };
      }
      throw new Error('Invalid credentials');
    },
    
    refreshAuthToken: () => {
      const mainToken = jwt.sign(
        { sub: 'admin', role: 'admin', site: SITE_ID },
        JWT_SECRET,
        { expiresIn: state.tokenTTL }
      );
      const refreshToken = jwt.sign(
        { sub: 'admin', type: 'refresh' },
        JWT_SECRET,
        { expiresIn: '7d' }
      );
      return { mainToken, refreshToken };
    },
    
    // Konfiguracja
    configuration: () => configuration,
    authorization: () => authorization,
    resource: (_, { points: pointIds, groups: groupIds }) => {
      let resultPoints = points;
      let resultGroups = groups;
      
      if (pointIds && pointIds.length > 0) {
        resultPoints = points.filter(p => pointIds.includes(p.id));
      }
      
      if (groupIds && groupIds.length > 0) {
        resultGroups = groups.filter(g => groupIds.includes(g.id));
      }
      
      return { points: resultPoints, groups: resultGroups };
    },
    
    // Zdarzenia
    getUnconfirmedEvents: () => state.unconfirmedEvents,
    
    // Inne
    tokenTTL: () => state.tokenTTL,
  },

  Mutation: {
    // System
    echoEvent: () => {
      createEvent(0, 'ECHO', null, null, null);
      return 'Event published';
    },
    
    setSiteIdentifier: (_, { id }) => {
      console.log(`[CONFIG] Site identifier set to: ${id}`);
      return true;
    },
    
    setTokenTTL: (_, { ttl }) => {
      state.tokenTTL = ttl;
      console.log(`[CONFIG] Token TTL set to: ${ttl}s`);
      return true;
    },
    
    // Harmonogramy (stub)
    createScheduler: (_, { input }) => input.map((s, i) => ({ id: 100 + i, ...s })),
    deleteScheduler: () => true,
    modifyScheduler: (_, { input }) => input.map(s => schedulers.find(sc => sc.id === s.id) || s),
    
    // Dni specjalne (stub)
    createSpecialDay: (_, { input }) => input.map((s, i) => ({ id: 100 + i, ...s })),
    modifySpecialDay: (_, { input }) => input,
    deleteSpecialDay: () => true,
    
    // Poziomy dostępu (stub)
    createAccessLevel: (_, { input }) => input.map((a, i) => ({ id: 100 + i, ...a, zones: [], portals: [] })),
    modifyAccessLevel: (_, { input }) => input.map(a => accessLevels.find(al => al.id === a.id) || a),
    deleteAccessLevel: () => true,
    
    // Użytkownicy (stub)
    createUser: (_, { input }) => input.map((u, i) => ({ id: 100 + i, ...u, access: [] })),
    modifyUser: (_, { input }) => input.map(u => users.find(us => us.id === u.id) || u),
    deleteUser: () => true,
    
    // Autoryzacja zbiorcza
    updateAuthorization: () => authorization,
    
    // Zdarzenia
    confirmEvent: (_, { id }) => {
      state.unconfirmedEvents = state.unconfirmedEvents.filter(e => !id.includes(e));
      return id.map(i => ({ id: i, status: 'CONFIRMED' }));
    },
    
    // Sterowanie strefami
    controlZone: (_, { zone: zoneId, override, operator }) => {
      const zoneState = state.zones.get(zoneId);
      if (!zoneState) return 'UNKNOWN';
      
      const zoneDef = zones.find(z => z.id === zoneId);
      
      if (zoneState.armed) {
        zoneState.armed = false;
        zoneState.alarm = false;
        createEvent(101, 'DISARM', null, null, operator);
        return 'ZONE_DISARMED';
      } else {
        if (zoneState.blocked && !override) {
          return 'BLOCKED_SENSOR';
        }
        zoneState.armed = true;
        createEvent(100, 'ARM', null, null, operator);
        return 'ZONE_ARMED';
      }
    },

    restoreZone: (_, { zone: zoneId, operator }) => {
      const zoneState = state.zones.get(zoneId);
      if (!zoneState) return 'UNKNOWN';
      if (!zoneState.alarm) return 'ALARM_NOT_ACTIVE';
      
      zoneState.alarm = false;
      createEvent(201, 'ALARM_RESTORE', null, null, operator);
      return 'RESTORED';
    },

    testZone: (_, { zone: zoneId, operator }) => {
      const zoneState = state.zones.get(zoneId);
      if (!zoneState) return 'UNKNOWN';
      if (zoneState.armed) return 'DISARM_REQUIRED';
      if (zoneState.testing) return 'ALREADY_STARTED';
      
      zoneState.testing = true;
      createEvent(110, 'TEST_START', null, null, operator);
      return 'STARTED';
    },

    blockZone: (_, { zone: zoneId, operator }) => {
      const zoneState = state.zones.get(zoneId);
      if (!zoneState) return 'UNKNOWN';
      if (zoneState.armed) return 'DISARM_REQUIRED';
      if (zoneState.blocked) return 'ALREADY_BLOCKED';
      
      zoneState.blocked = true;
      createEvent(120, 'ZONE_BLOCKED', null, null, operator);
      return 'BLOCKED';
    },

    blockZoneSensor: (_, { sensor, operator }) => {
      console.log(`[ZONE] Sensor ${sensor} blocked by operator ${operator}`);
      return 'BLOCKED';
    },

    unblockZoneSensor: (_, { sensor, operator }) => {
      console.log(`[ZONE] Sensor ${sensor} unblocked by operator ${operator}`);
      return 'UNBLOCKED';
    },

    // Sterowanie przejściami
    releasePortal: (_, { portal: portalId, operator }) => {
      const portalState = state.portals.get(portalId);
      if (!portalState) return 'UNKNOWN';
      if (portalState.emergency) return 'EMERGENCY';
      
      portalState.released = true;
      createEvent(310, 'PORTAL_RELEASED', null, null, operator);
      
      setTimeout(() => { portalState.released = false; }, 5000);
      return 'RELEASED';
    },

    emergencyPortal: (_, { portal: portalId, operator }) => {
      const portalState = state.portals.get(portalId);
      if (!portalState) return 'UNKNOWN';
      if (portalState.emergency) return 'ALREADY_EMERGENCY';
      
      portalState.emergency = true;
      createEvent(311, 'PORTAL_EMERGENCY', null, null, operator);
      return 'DONE';
    },

    restorePortal: (_, { portal: portalId, operator }) => {
      const portalState = state.portals.get(portalId);
      if (!portalState) return 'UNKNOWN';
      if (!portalState.emergency) return 'NORMAL_OPERATION';
      
      portalState.emergency = false;
      createEvent(312, 'PORTAL_RESTORED', null, null, operator);
      return 'RESTORED';
    },

    // Antypassback
    suspendAntipassback: (_, { operator }) => {
      if (state.antipassback.suspended) return 'ALREADY_SUSPENDED';
      state.antipassback.suspended = true;
      return 'SUSPENDED';
    },

    resumeAntipassback: (_, { operator }) => {
      if (!state.antipassback.suspended) return 'ALREADY_RESUMED';
      state.antipassback.suspended = false;
      return 'RESUMED';
    },

    reactivateAntipassback: (_, { credential, operator }) => {
      console.log(`[APB] Reactivated credential ${credential} by operator ${operator}`);
      return 'REACTIVATED';
    },
  },

  Subscription: {
    events: {
      subscribe: () => pubsub.asyncIterator(['EVENTS']),
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
      // Logowanie zapytań
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
                const body = requestContext.response.body;
                if (body.kind === 'single' && body.singleResult?.errors) {
                  console.log('[BELBUK ERRORS]', JSON.stringify(body.singleResult.errors, null, 2));
                } else {
                  console.log('[BELBUK RESPONSE] OK');
                }
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
    res.json({ status: 'ok', site: SITE_ID });
  });

  const port = PORT;
  httpServer.listen(port, () => {
    console.log(`🚀 Virtual Controller running`);
    console.log(`   GraphQL: http://localhost:${port}/graphql`);
    console.log(`   WebSocket: ws://localhost:${port}/graphql`);
    console.log(`   Health: http://localhost:${port}/health`);
    console.log(`   Site: ${SITE_ID}`);
  });
}

startServer().catch(console.error);

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

import {
  configuration,
  authorization,
  pointGroups,
  zones,
  portals,
  users,
  schedulers,
  specialDays,
  accessLevels,
  SITE_ID,
  GLOBAL_ID,
} from './testData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ==================== KONFIGURACJA ====================

const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'belbuk-virtual-controller-secret-key';
const TOKEN_TTL = 3600; // 1 godzina

// ==================== STAN SYSTEMU ====================

const state = {
  zones: new Map(zones.map(z => [z.id, { armed: false, alarm: false, blocked: false, testing: false }])),
  portals: new Map(portals.map(p => [p.id, { emergency: false, released: false }])),
  antipassback: { suspended: false },
  points: new Map(),
  events: [],
  eventIdCounter: 1,
  tokenTTL: TOKEN_TTL,
};

// Inicjalizacja wartości punktów
function initializePoints() {
  const now = new Date().toISOString();
  
  // Punkty środowiskowe
  state.points.set('TEMP_HOL', { value: 21.5, type: 'DOUBLE' });
  state.points.set('TEMP_BIURO1', { value: 22.0, type: 'DOUBLE' });
  state.points.set('TEMP_SERW', { value: 18.5, type: 'DOUBLE' });
  state.points.set('HUM_HOL', { value: 45, type: 'DOUBLE' });
  state.points.set('CO2_BIURO1', { value: 450, type: 'DOUBLE' });
  
  // Zasilanie
  state.points.set('PWR_OK', { value: true, type: 'BOOLEAN' });
  state.points.set('MAINS', { value: true, type: 'BOOLEAN' });
  state.points.set('BATT_LEVEL', { value: 100, type: 'DOUBLE' });
  state.points.set('BATT_VOLT', { value: 13.8, type: 'DOUBLE' });
  state.points.set('BATT_CHARGING', { value: false, type: 'BOOLEAN' });
  
  // Strefy
  state.points.set('ALL_ZONES_OK', { value: true, type: 'BOOLEAN' });
  state.points.set('ZONE1_STATE', { value: 'DISARMED', type: 'MULTIVAL' });
  state.points.set('ZONE2_STATE', { value: 'DISARMED', type: 'MULTIVAL' });
  state.points.set('ZONE3_STATE', { value: 'ARMED', type: 'MULTIVAL' }); // 24h zawsze uzbrojona
  state.points.set('ZONE1_ALARM', { value: false, type: 'BOOLEAN' });
  state.points.set('ZONE2_ALARM', { value: false, type: 'BOOLEAN' });
  state.points.set('ZONE3_ALARM', { value: false, type: 'BOOLEAN' });
  
  // Przejścia
  state.points.set('PORTAL1_STATE', { value: 'NORMAL', type: 'MULTIVAL' });
  state.points.set('PORTAL2_STATE', { value: 'NORMAL', type: 'MULTIVAL' });
  state.points.set('PORTAL3_STATE', { value: 'NORMAL', type: 'MULTIVAL' });
  state.points.set('PORTAL1_OPEN', { value: false, type: 'BOOLEAN' });
  state.points.set('PORTAL2_OPEN', { value: false, type: 'BOOLEAN' });
  
  // Wejścia - wszystkie w stanie normalnym
  for (let i = 1; i <= 12; i++) {
    state.points.set(`IN_${i}`, { value: false, type: 'BOOLEAN' });
  }
}

initializePoints();

// ==================== SYMULACJA PUNKTÓW ====================

function simulatePoints() {
  const hour = new Date().getHours();
  const isWorkHour = hour >= 8 && hour <= 18;
  
  // Temperatura - trend dobowy
  const tempBase = 20 + Math.sin((hour - 6) * Math.PI / 12) * 3;
  state.points.set('TEMP_HOL', { 
    value: Math.round((tempBase + (Math.random() - 0.5) * 0.5) * 10) / 10, 
    type: 'DOUBLE' 
  });
  state.points.set('TEMP_BIURO1', { 
    value: Math.round((tempBase + 1 + (Math.random() - 0.5) * 0.5) * 10) / 10, 
    type: 'DOUBLE' 
  });
  state.points.set('TEMP_SERW', { 
    value: Math.round((18 + (Math.random() - 0.5) * 1) * 10) / 10, 
    type: 'DOUBLE' 
  });
  
  // Wilgotność
  state.points.set('HUM_HOL', { 
    value: Math.round(45 + (Math.random() - 0.5) * 10), 
    type: 'DOUBLE' 
  });
  
  // CO2 - wyższe w godzinach pracy
  const co2Base = isWorkHour ? 650 : 420;
  state.points.set('CO2_BIURO1', { 
    value: Math.round(co2Base + (Math.random() - 0.5) * 50), 
    type: 'DOUBLE' 
  });
  
  // Akumulator - powolny spadek gdy brak zasilania
  const mains = state.points.get('MAINS').value;
  let battLevel = state.points.get('BATT_LEVEL').value;
  if (!mains) {
    battLevel = Math.max(0, battLevel - 0.1);
  } else if (battLevel < 100) {
    battLevel = Math.min(100, battLevel + 0.5);
  }
  state.points.set('BATT_LEVEL', { value: Math.round(battLevel * 10) / 10, type: 'DOUBLE' });
  state.points.set('BATT_CHARGING', { value: mains && battLevel < 100, type: 'BOOLEAN' });
  
  // Napięcie akumulatora
  const battVolt = 11.5 + (battLevel / 100) * 2.5;
  state.points.set('BATT_VOLT', { value: Math.round(battVolt * 100) / 100, type: 'DOUBLE' });
  
  // Aktualizacja stanów stref
  for (const [zoneId, zoneState] of state.zones) {
    let stateValue = 'DISARMED';
    if (zoneState.alarm) stateValue = 'ALARM';
    else if (zoneState.testing) stateValue = 'TESTING';
    else if (zoneState.blocked) stateValue = 'BLOCKED';
    else if (zoneState.armed) stateValue = 'ARMED';
    
    state.points.set(`ZONE${zoneId}_STATE`, { value: stateValue, type: 'MULTIVAL' });
    state.points.set(`ZONE${zoneId}_ALARM`, { value: zoneState.alarm, type: 'BOOLEAN' });
  }
  
  // Aktualizacja stanów przejść
  for (const [portalId, portalState] of state.portals) {
    let stateValue = 'NORMAL';
    if (portalState.emergency) stateValue = 'EMERGENCY';
    else if (portalState.released) stateValue = 'RELEASED';
    
    state.points.set(`PORTAL${portalId}_STATE`, { value: stateValue, type: 'MULTIVAL' });
  }
}

// Uruchom symulację co 10 sekund
setInterval(simulatePoints, 10000);

// ==================== PUBLIKACJA ZDARZEŃ ====================

const subscribers = new Set();

function publishEvent(event) {
  state.events.push(event);
  for (const callback of subscribers) {
    callback(event);
  }
}

function createEvent(code, symbol, reasonPoint, userId = null, operatorId = null) {
  const eventDef = configuration.events.find(e => e.code === code);
  const event = {
    site: SITE_ID,
    id: `EVT-${state.eventIdCounter++}`,
    dateTime: new Date().toISOString(),
    trigger: {
      type: code,
      template: eventDef?.desc || symbol,
    },
    reason: reasonPoint ? {
      id: reasonPoint.id,
      name: reasonPoint.name,
      type: reasonPoint.type || 'EVENT',
      family: reasonPoint.family || 'SYSTEM',
      created: new Date().toISOString(),
      value: { type: 'MULTIVAL', value: symbol },
    } : null,
    points: [],
    extensions: [],
    user: userId ? { id: userId, name: users.find(u => u.id === userId)?.name || 'Unknown' } : null,
    operator: operatorId,
  };
  
  publishEvent(event);
  console.log(`[EVENT] ${event.id}: ${symbol} - ${eventDef?.desc || ''}`);
  return event;
}

// ==================== FUNKCJE POMOCNICZE ====================

function getPointValue(pointId) {
  const point = state.points.get(pointId);
  if (!point) return null;
  return {
    type: point.type,
    value: JSON.stringify(point.value),
  };
}

function buildPointWithValue(pointDef) {
  return {
    ...pointDef,
    created: new Date().toISOString(),
    value: getPointValue(pointDef.id),
  };
}

function buildGroupWithValues(groupDef) {
  return {
    ...groupDef,
    leader: groupDef.leader ? buildPointWithValue(groupDef.leader) : null,
    points: groupDef.points?.map(buildPointWithValue) || [],
    groups: groupDef.groups?.map(buildGroupWithValues) || [],
  };
}

// ==================== RESOLVERY ====================

const resolvers = {
  Query: {
    configuration: () => configuration,
    
    resource: (_, { points: pointIds, groups: groupIds }) => {
      let resultPoints = [];
      let resultGroups = [];
      
      if (pointIds && pointIds.length > 0) {
        // Znajdź punkty po ID
        for (const group of pointGroups) {
          const found = group.points?.filter(p => pointIds.includes(p.id)) || [];
          resultPoints.push(...found.map(buildPointWithValue));
        }
      }
      
      if (groupIds && groupIds.length > 0) {
        resultGroups = pointGroups
          .filter(g => groupIds.includes(g.id))
          .map(buildGroupWithValues);
      } else if (!pointIds || pointIds.length === 0) {
        // Zwróć wszystkie grupy jeśli nie podano filtrów
        resultGroups = pointGroups.map(buildGroupWithValues);
      }
      
      return { points: resultPoints, groups: resultGroups };
    },
    
    authorization: () => authorization,
    
    getAuthToken: (_, { login, password }) => {
      // Prosta walidacja - w produkcji użyć prawdziwej autentykacji
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
    
    refreshAuthToken: (_, __, context) => {
      // W produkcji zweryfikować refresh token
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
    
    getUnconfirmedEvents: () => state.events.filter(e => !e.confirmed),
    
    getControllerInfo: () => ({
      globalControllerIdentifier: GLOBAL_ID,
      apiUrl: `http://localhost:${PORT}/graphql`,
      subscriptionUrl: `ws://localhost:${PORT}/graphql`,
      apiUser: 'admin',
      apiPassword: null,
      token: null,
      activeSubscription: true,
    }),
  },
  
  Mutation: {
    echoEvent: () => {
      createEvent(0, 'ECHO', { id: 'SYS', name: 'System', type: 'SYSTEM', family: 'SYSTEM' });
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
    
    // ===== STEROWANIE STREFAMI =====
    
    controlZone: (_, { zone: zoneId, override, operator }) => {
      const zoneState = state.zones.get(zoneId);
      if (!zoneState) return 'UNKNOWN';
      
      const zoneDef = zones.find(z => z.id === zoneId);
      
      if (zoneState.armed) {
        // Rozbrojenie
        zoneState.armed = false;
        zoneState.alarm = false;
        createEvent(101, 'DISARM', zoneDef, null, operator);
        return 'ZONE_DISARMED';
      } else {
        // Sprawdź warunki blokady (symulacja)
        if (zoneState.blocked && !override) {
          return 'BLOCKED_SENSOR';
        }
        
        // Uzbrojenie
        zoneState.armed = true;
        createEvent(100, 'ARM', zoneDef, null, operator);
        return 'ZONE_ARMED';
      }
    },
    
    restoreZone: (_, { zone: zoneId, operator }) => {
      const zoneState = state.zones.get(zoneId);
      if (!zoneState) return 'UNKNOWN';
      
      const zoneDef = zones.find(z => z.id === zoneId);
      
      if (!zoneState.alarm) {
        return 'ALARM_NOT_ACTIVE';
      }
      
      zoneState.alarm = false;
      createEvent(201, 'ALARM_RESTORE', zoneDef, null, operator);
      return 'RESTORED';
    },
    
    testZone: (_, { zone: zoneId, operator }) => {
      const zoneState = state.zones.get(zoneId);
      if (!zoneState) return 'UNKNOWN';
      
      const zoneDef = zones.find(z => z.id === zoneId);
      
      if (zoneState.armed) {
        return 'DISARM_REQUIRED';
      }
      
      if (zoneState.testing) {
        zoneState.testing = false;
        createEvent(111, 'TEST_END', zoneDef, null, operator);
        return 'ZONE_TEST_ENDED';
      }
      
      zoneState.testing = true;
      createEvent(110, 'TEST_START', zoneDef, null, operator);
      return 'STARTED';
    },
    
    blockZone: (_, { zone: zoneId, operator }) => {
      const zoneState = state.zones.get(zoneId);
      if (!zoneState) return 'UNKNOWN';
      
      const zoneDef = zones.find(z => z.id === zoneId);
      
      if (zoneState.armed) {
        return 'DISARM_REQUIRED';
      }
      
      if (zoneState.blocked) {
        return 'ALREADY_BLOCKED';
      }
      
      zoneState.blocked = true;
      createEvent(120, 'ZONE_BLOCKED', zoneDef, null, operator);
      return 'BLOCKED';
    },
    
    blockZoneSensor: (_, { sensor: sensorId, operator }) => {
      console.log(`[ZONE] Sensor ${sensorId} blocked by operator ${operator}`);
      return 'BLOCKED';
    },
    
    unblockZoneSensor: (_, { sensor: sensorId, operator }) => {
      console.log(`[ZONE] Sensor ${sensorId} unblocked by operator ${operator}`);
      return 'UNBLOCKED';
    },
    
    // ===== STEROWANIE PRZEJŚCIAMI =====
    
    releasePortal: (_, { portal: portalId, operator }) => {
      const portalState = state.portals.get(portalId);
      if (!portalState) return 'UNKNOWN';
      
      const portalDef = portals.find(p => p.id === portalId);
      
      if (portalState.emergency) {
        return 'EMERGENCY';
      }
      
      portalState.released = true;
      createEvent(310, 'PORTAL_RELEASED', portalDef, null, operator);
      
      // Auto-reset po czasie release
      const releaseTime = portalDef?.release || 5;
      setTimeout(() => {
        portalState.released = false;
        simulatePoints();
      }, releaseTime * 1000);
      
      return 'RELEASED';
    },
    
    emergencyPortal: (_, { portal: portalId, operator }) => {
      const portalState = state.portals.get(portalId);
      if (!portalState) return 'UNKNOWN';
      
      const portalDef = portals.find(p => p.id === portalId);
      
      if (portalState.emergency) {
        return 'ALREADY_EMERGENCY';
      }
      
      portalState.emergency = true;
      portalState.released = true;
      createEvent(311, 'PORTAL_EMERGENCY', portalDef, null, operator);
      return 'DONE';
    },
    
    restorePortal: (_, { portal: portalId, operator }) => {
      const portalState = state.portals.get(portalId);
      if (!portalState) return 'UNKNOWN';
      
      const portalDef = portals.find(p => p.id === portalId);
      
      if (!portalState.emergency) {
        return 'NORMAL_OPERATION';
      }
      
      portalState.emergency = false;
      portalState.released = false;
      createEvent(312, 'PORTAL_RESTORED', portalDef, null, operator);
      return 'RESTORED';
    },
    
    // ===== ANTYPASSBACK =====
    
    suspendAntipassback: (_, { operator }) => {
      if (state.antipassback.suspended) {
        return 'ALREADY_SUSPENDED';
      }
      state.antipassback.suspended = true;
      console.log(`[APB] Antipassback suspended by operator ${operator}`);
      return 'SUSPENDED';
    },
    
    resumeAntipassback: (_, { operator }) => {
      if (!state.antipassback.suspended) {
        return 'ALREADY_RESUMED';
      }
      state.antipassback.suspended = false;
      console.log(`[APB] Antipassback resumed by operator ${operator}`);
      return 'RESUMED';
    },
    
    reactivateAntipassback: (_, { credential, operator }) => {
      console.log(`[APB] Credential ${credential} reactivated by operator ${operator}`);
      return 'REACTIVATED';
    },
    
    // ===== ZDARZENIA =====
    
    confirmEvent: (_, { id: eventIds }) => {
      return eventIds.map(eventId => {
        const event = state.events.find(e => e.id === eventId);
        if (event) {
          event.confirmed = true;
        }
        return { id: eventId, status: event ? 'CONFIRMED' : 'NOT_FOUND' };
      });
    },
    
    // ===== CRUD - HARMONOGRAMY =====
    
    createScheduler: (_, { input }) => {
      return input.map(s => {
        const newId = Math.max(...schedulers.map(x => x.id)) + 1;
        const scheduler = { id: newId, ...s };
        schedulers.push(scheduler);
        return scheduler;
      });
    },
    
    modifyScheduler: (_, { input }) => {
      return input.map(s => {
        const existing = schedulers.find(x => x.id === s.id);
        if (existing) {
          Object.assign(existing, s);
        }
        return existing;
      }).filter(Boolean);
    },
    
    deleteScheduler: (_, { id: ids }) => {
      ids.forEach(id => {
        const idx = schedulers.findIndex(s => s.id === id);
        if (idx >= 0) schedulers.splice(idx, 1);
      });
      return true;
    },
    
    // ===== CRUD - DNI SPECJALNE =====
    
    createSpecialDay: (_, { input }) => {
      return input.map(s => {
        const newId = Math.max(...specialDays.map(x => x.id), 0) + 1;
        const day = { id: newId, ...s };
        specialDays.push(day);
        return day;
      });
    },
    
    modifySpecialDay: (_, { input }) => {
      return input.map(s => {
        const existing = specialDays.find(x => x.id === s.id);
        if (existing) {
          Object.assign(existing, s);
        }
        return existing;
      }).filter(Boolean);
    },
    
    deleteSpecialDay: (_, { id: ids }) => {
      ids.forEach(id => {
        const idx = specialDays.findIndex(s => s.id === id);
        if (idx >= 0) specialDays.splice(idx, 1);
      });
      return true;
    },
    
    // ===== CRUD - POZIOMY DOSTĘPU =====
    
    createAccessLevel: (_, { input }) => {
      return input.map(a => {
        const newId = Math.max(...accessLevels.map(x => x.id), 0) + 1;
        const level = {
          id: newId,
          name: a.name,
          zones: a.zones?.map(za => ({
            zone: zones.find(z => z.id === za.zoneId),
            scheduler: schedulers.find(s => s.id === za.schedulerId),
            arm: za.arm,
            disarm: za.disarm,
            test: za.test,
          })) || [],
          portals: a.portals?.map(pa => ({
            portal: portals.find(p => p.id === pa.portalId),
            scheduler: schedulers.find(s => s.id === pa.schedulerId),
          })) || [],
        };
        accessLevels.push(level);
        return level;
      });
    },
    
    modifyAccessLevel: (_, { input }) => {
      return input.map(a => {
        const existing = accessLevels.find(x => x.id === a.id);
        if (existing && a.name) {
          existing.name = a.name;
        }
        return existing;
      }).filter(Boolean);
    },
    
    deleteAccessLevel: (_, { id: ids }) => {
      ids.forEach(id => {
        const idx = accessLevels.findIndex(a => a.id === id);
        if (idx >= 0) accessLevels.splice(idx, 1);
      });
      return true;
    },
    
    // ===== CRUD - UŻYTKOWNICY =====
    
    createUser: (_, { input }) => {
      return input.map(u => {
        const newId = Math.max(...users.map(x => x.id), 0) + 1;
        const user = {
          id: newId,
          name: u.name,
          credential: { card: u.card, pin: u.pin },
          expire: u.expire,
          restore: u.restore || false,
          override: u.override || false,
          access: u.accessLevelIds?.map(id => accessLevels.find(a => a.id === id)).filter(Boolean) || [],
        };
        users.push(user);
        return user;
      });
    },
    
    modifyUser: (_, { input }) => {
      return input.map(u => {
        const existing = users.find(x => x.id === u.id);
        if (existing) {
          if (u.name) existing.name = u.name;
          if (u.card !== undefined) existing.credential.card = u.card;
          if (u.pin !== undefined) existing.credential.pin = u.pin;
          if (u.expire !== undefined) existing.expire = u.expire;
          if (u.restore !== undefined) existing.restore = u.restore;
          if (u.override !== undefined) existing.override = u.override;
          if (u.accessLevelIds) {
            existing.access = u.accessLevelIds.map(id => accessLevels.find(a => a.id === id)).filter(Boolean);
          }
        }
        return existing;
      }).filter(Boolean);
    },
    
    deleteUser: (_, { id: ids }) => {
      ids.forEach(id => {
        const idx = users.findIndex(u => u.id === id);
        if (idx >= 0) users.splice(idx, 1);
      });
      return true;
    },
    
    updateAuthorization: (_, { input }) => {
      // Aktualizacja całej autoryzacji
      console.log('[AUTH] Full authorization update received');
      return authorization;
    },
  },
  
  Subscription: {
    events: {
      subscribe: () => ({
        [Symbol.asyncIterator]: () => {
          const queue = [];
          let resolve = null;
          
          const callback = (event) => {
            if (resolve) {
              resolve({ value: { events: event }, done: false });
              resolve = null;
            } else {
              queue.push(event);
            }
          };
          
          subscribers.add(callback);
          
          return {
            next: () => {
              if (queue.length > 0) {
                return Promise.resolve({ value: { events: queue.shift() }, done: false });
              }
              return new Promise(r => { resolve = r; });
            },
            return: () => {
              subscribers.delete(callback);
              return Promise.resolve({ value: undefined, done: true });
            },
            throw: (err) => {
              subscribers.delete(callback);
              return Promise.reject(err);
            },
          };
        },
      }),
    },
  },
};

// ==================== URUCHOMIENIE SERWERA ====================

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  
  // Wczytaj schemat
  const typeDefs = readFileSync(join(__dirname, 'schema.graphql'), 'utf-8');
  const schema = makeExecutableSchema({ typeDefs, resolvers });
  
  // WebSocket server dla subscriptions
  const wsServer = new WebSocketServer({
    server: httpServer,
    path: '/graphql',
  });
  
  const serverCleanup = useServer({ schema }, wsServer);
  
  // Apollo Server
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
    ],
  });
  
  await server.start();
  
  app.use(
    '/graphql',
    cors(),
    express.json(),
    expressMiddleware(server, {
      context: async ({ req }) => {
        // Ekstrakcja tokena z nagłówka (opcjonalne)
        const token = req.headers.authorization?.replace('Bearer ', '');
        return { token };
      },
    })
  );
  
  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', site: SITE_ID, globalId: GLOBAL_ID });
  });
  
  httpServer.listen(PORT, () => {
    console.log('');
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║       BELBUK VIRTUAL CONTROLLER - SYMULATOR STEROWNIKA    ║');
    console.log('╠═══════════════════════════════════════════════════════════╣');
    console.log(`║  Site ID:      ${SITE_ID.padEnd(42)}║`);
    console.log(`║  Global ID:    ${GLOBAL_ID.padEnd(42)}║`);
    console.log('╠═══════════════════════════════════════════════════════════╣');
    console.log(`║  GraphQL:      http://localhost:${PORT}/graphql`.padEnd(62) + '║');
    console.log(`║  WebSocket:    ws://localhost:${PORT}/graphql`.padEnd(62) + '║');
    console.log(`║  Health:       http://localhost:${PORT}/health`.padEnd(62) + '║');
    console.log('╠═══════════════════════════════════════════════════════════╣');
    console.log('║  Credentials:  admin / admin                              ║');
    console.log('╚═══════════════════════════════════════════════════════════╝');
    console.log('');
  });
  
  // Generuj losowe zdarzenia co 30-60 sekund (opcjonalne)
  setInterval(() => {
    if (Math.random() > 0.7) {
      const randomEvents = [
        () => {
          // Symulacja dostępu
          const user = users[Math.floor(Math.random() * users.length)];
          const portal = portals[Math.floor(Math.random() * portals.length)];
          createEvent(300, 'ACCESS_GRANTED', portal, user.id);
        },
        () => {
          // Symulacja usterki/powrotu
          const isFault = Math.random() > 0.5;
          createEvent(
            isFault ? 400 : 401,
            isFault ? 'FAULT' : 'FAULT_RESTORE',
            { id: 'SYS', name: 'System', type: 'SYSTEM', family: 'SYSTEM' }
          );
        },
      ];
      randomEvents[Math.floor(Math.random() * randomEvents.length)]();
    }
  }, 30000 + Math.random() * 30000);
}

startServer().catch(console.error);

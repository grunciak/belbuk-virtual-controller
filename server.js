const express = require('express');
const { ApolloServer } = require('@apollo/server');
const { expressMiddleware } = require('@apollo/server/express4');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const PORT = process.env.PORT || 4000;
const GLOBAL_ID = process.env.GLOBAL_ID || `VC-${uuidv4().substring(0, 8).toUpperCase()}`;

// ============================================================
// SCHEMA - zgodny z Belbuk controller-connector
// ============================================================

const typeDefs = `#graphql
  type Point {
    id: String!
    name: String!
    type: String!
    family: String!
    created: String
    value: String!
  }

  type PointGroup {
    id: String!
    name: String!
    leader: Point
    points: [Point!]!
    groups: [PointGroup!]
  }

  type Resource {
    points: [Point!]!
    groups: [PointGroup!]!
  }

  type Input {
    id: Int!
    name: String!
  }

  type Output {
    id: Int!
    name: String!
  }

  type Reader {
    id: Int!
    name: String!
  }

  type ZoneControl {
    id: Int!
    name: String!
  }

  type ZoneDetector {
    input: Input!
    entryTime: Int
    exitTime: Int
  }

  type ZoneAlarm {
    output: Output!
    time: Int
  }

  type Zone {
    id: Int!
    name: String!
    controls: [ZoneControl!]
    detectors: [ZoneDetector!]
    alarms: [ZoneAlarm!]
  }

  type Portal {
    id: Int!
    name: String!
    entry: Reader
    exit: Reader
    button: Input
    locking: Output
    sensor: Input
    release: Int
    emergencies: [Output!]
  }

  type FaultInput {
    id: Int!
    name: String!
  }

  type Fault {
    fault: String!
    inputs: [FaultInput!]!
  }

  type EventDef {
    code: Int!
    symbol: String!
    desc: String!
  }

  type Credential {
    card: String
    pin: String
  }

  type ZoneAuth {
    zone: Zone!
    scheduler: Schedule
    arm: Boolean
    disarm: Boolean
    test: Boolean
  }

  type PortalAuth {
    portal: Portal!
    scheduler: Schedule
  }

  type AccessLevel {
    id: Int!
    name: String!
    zones: [ZoneAuth!]
    portals: [PortalAuth!]
  }

  type User {
    id: Int!
    name: String!
    credential: Credential
    expire: String
    restore: String
    override: Boolean
    access: [AccessLevel!]
  }

  type SchedulePeriod {
    day: Int!
    start: String!
    end: String!
  }

  type Schedule {
    id: Int!
    name: String!
    periods: [SchedulePeriod!]
  }

  type SpecialDay {
    id: Int!
    date: String!
    day: Int!
  }

  type Authorization {
    users: [User!]!
    schedules: [Schedule!]!
    accessLevels: [AccessLevel!]!
    specialDays: [SpecialDay!]!
  }

  type Configuration {
    globalControllerIdentifier: String!
    site: String
    inputs: [Input!]!
    outputs: [Output!]!
    readers: [Reader!]!
    zones: [Zone!]!
    portals: [Portal!]!
    faults: [Fault!]!
    events: [EventDef!]!
    authorization: Authorization!
    resource: Resource!
  }

  type Query {
    echo: String!
    configuration: Configuration!
  }

  type Mutation {
    echoEvent: String!
    setTokenTTL(ttl: Int!): String!
    setSiteIdentifier(id: ID!): String!
  }
`;

// ============================================================
// SAMPLE DATA
// ============================================================

const inputs = [
  { id: 1, name: 'Wejście 1 - Czujnik drzwi' },
  { id: 2, name: 'Wejście 2 - Czujnik okna' },
  { id: 3, name: 'Wejście 3 - PIR korytarz' },
];

const outputs = [
  { id: 1, name: 'Wyjście 1 - Zamek drzwi główne' },
  { id: 2, name: 'Wyjście 2 - Zamek drzwi boczne' },
  { id: 3, name: 'Wyjście 3 - Syrena' },
];

const readers = [
  { id: 1, name: 'Czytnik - Wejście główne' },
  { id: 2, name: 'Czytnik - Wejście główne (wyjście)' },
  { id: 3, name: 'Czytnik - Drzwi boczne' },
];

const zones = [
  { 
    id: 1, 
    name: 'Strefa zewnętrzna',
    controls: [{ id: 1, name: 'Panel główny' }],
    detectors: [{ input: inputs[0], entryTime: 30, exitTime: 30 }],
    alarms: [{ output: outputs[2], time: 180 }]
  },
  { 
    id: 2, 
    name: 'Hol główny',
    controls: [{ id: 2, name: 'Panel hol' }],
    detectors: [{ input: inputs[2], entryTime: 15, exitTime: 15 }],
    alarms: [{ output: outputs[2], time: 180 }]
  },
  { id: 3, name: 'Biuro A', controls: [], detectors: [], alarms: [] },
  { id: 4, name: 'Biuro B', controls: [], detectors: [], alarms: [] },
  { id: 5, name: 'Serwerownia', controls: [], detectors: [], alarms: [] },
];

const portals = [
  { 
    id: 1, 
    name: 'Wejście główne',
    entry: readers[0],
    exit: readers[1],
    button: inputs[0],
    locking: outputs[0],
    sensor: inputs[0],
    release: 5,
    emergencies: [outputs[0]]
  },
  { 
    id: 2, 
    name: 'Drzwi boczne',
    entry: readers[2],
    exit: null,
    button: null,
    locking: outputs[1],
    sensor: inputs[1],
    release: 5,
    emergencies: []
  },
  { 
    id: 3, 
    name: 'Drzwi do serwerowni',
    entry: null,
    exit: null,
    button: null,
    locking: null,
    sensor: null,
    release: 3,
    emergencies: []
  },
];

const faults = [
  { fault: 'POWER', inputs: [{ id: 1, name: 'Zasilanie główne' }] },
  { fault: 'COMMUNICATION', inputs: [{ id: 2, name: 'Komunikacja' }] },
];

const events = [
  { code: 1, symbol: 'ACCESS_GRANTED', desc: 'Dostęp przyznany' },
  { code: 2, symbol: 'ACCESS_DENIED', desc: 'Dostęp odmówiony' },
  { code: 3, symbol: 'ALARM', desc: 'Alarm włamaniowy' },
  { code: 4, symbol: 'DOOR_HELD', desc: 'Drzwi otwarte zbyt długo' },
];

const schedules = [
  { id: 1, name: 'Godziny pracy', periods: [
    { day: 1, start: '08:00', end: '17:00' },
    { day: 2, start: '08:00', end: '17:00' },
    { day: 3, start: '08:00', end: '17:00' },
    { day: 4, start: '08:00', end: '17:00' },
    { day: 5, start: '08:00', end: '17:00' },
  ]},
  { id: 2, name: 'Całodobowy', periods: [
    { day: 0, start: '00:00', end: '23:59' },
    { day: 1, start: '00:00', end: '23:59' },
    { day: 2, start: '00:00', end: '23:59' },
    { day: 3, start: '00:00', end: '23:59' },
    { day: 4, start: '00:00', end: '23:59' },
    { day: 5, start: '00:00', end: '23:59' },
    { day: 6, start: '00:00', end: '23:59' },
  ]},
];

const accessLevels = [
  { 
    id: 1, 
    name: 'Pracownik',
    zones: [{ zone: zones[0], scheduler: schedules[0], arm: false, disarm: false, test: false }],
    portals: [{ portal: portals[0], scheduler: schedules[0] }]
  },
  { 
    id: 2, 
    name: 'Administrator',
    zones: zones.map(z => ({ zone: z, scheduler: schedules[1], arm: true, disarm: true, test: true })),
    portals: portals.map(p => ({ portal: p, scheduler: schedules[1] }))
  },
];

const users = [
  { 
    id: 1, 
    name: 'Jan Kowalski', 
    credential: { card: 'ABC123456', pin: '1234' },
    expire: '2025-12-31',
    restore: null,
    override: false,
    access: [accessLevels[0]]
  },
  { 
    id: 2, 
    name: 'Anna Nowak', 
    credential: { card: 'DEF789012', pin: '5678' },
    expire: '2025-12-31',
    restore: null,
    override: false,
    access: [accessLevels[1]]
  },
];

const points = [
  { id: 'PT001', name: 'Temperatura - Hol główny', type: 'TEMPERATURE', family: 'SENSOR', value: '21.5', created: new Date().toISOString() },
  { id: 'PT002', name: 'Wilgotność - Hol główny', type: 'HUMIDITY', family: 'SENSOR', value: '45.2', created: new Date().toISOString() },
  { id: 'PT003', name: 'Czujnik ruchu - Wejście', type: 'MOTION', family: 'SENSOR', value: 'false', created: new Date().toISOString() },
  { id: 'PT004', name: 'Oświetlenie - Korytarz A', type: 'LIGHT', family: 'ACTUATOR', value: 'true', created: new Date().toISOString() },
  { id: 'PT005', name: 'Wentylacja - Sala 101', type: 'HVAC', family: 'ACTUATOR', value: '2', created: new Date().toISOString() },
];

const groups = [
  { id: 'GRP001', name: 'Czujniki środowiskowe', leader: points[0], points: [points[0], points[1]], groups: [] },
  { id: 'GRP002', name: 'Oświetlenie', leader: points[3], points: [points[3]], groups: [] },
];

// ============================================================
// RESOLVERS
// ============================================================

const ts = () => new Date().toISOString();

const resolvers = {
  Query: {
    echo: () => {
      console.log(`[${ts()}] Query: echo`);
      return `Virtual Controller OK - ${GLOBAL_ID} - ${ts()}`;
    },
    
    configuration: () => {
      console.log(`[${ts()}] Query: configuration`);
      return {
        globalControllerIdentifier: GLOBAL_ID,
        site: 'Virtual Site',
        inputs,
        outputs,
        readers,
        zones,
        portals,
        faults,
        events,
        authorization: {
          users,
          schedules,
          accessLevels,
          specialDays: [],
        },
        resource: {
          points,
          groups,
        },
      };
    },
  },
  
  Mutation: {
    echoEvent: () => {
      console.log(`[${ts()}] Mutation: echoEvent`);
      return `Event echo - ${ts()}`;
    },
    
    setTokenTTL: (_, { ttl }) => {
      console.log(`[${ts()}] Mutation: setTokenTTL (ttl: ${ttl})`);
      return `Token TTL set to ${ttl}`;
    },
    
    setSiteIdentifier: (_, { id }) => {
      console.log(`[${ts()}] Mutation: setSiteIdentifier (id: ${id})`);
      return `Site identifier set to ${id}`;
    },
  },
};

// ============================================================
// START SERVER
// ============================================================

async function start() {
  const app = express();
  const server = new ApolloServer({ 
    typeDefs, 
    resolvers,
    introspection: true,
  });
  
  await server.start();
  
  app.use(cors());
  app.use(express.json());
  
  // GraphQL endpoints
  app.use('/graphql', expressMiddleware(server));
  app.use('/api/graphql.php', expressMiddleware(server));
  
  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', globalControllerIdentifier: GLOBAL_ID, timestamp: ts() });
  });
  
  // Info endpoint
  app.get('/', (req, res) => {
    res.json({
      name: 'Belbuk Virtual Controller',
      version: '2.1.0',
      globalControllerIdentifier: GLOBAL_ID,
      endpoints: {
        graphql: '/graphql',
        health: '/health'
      }
    });
  });
  
  app.listen(PORT, () => {
    console.log(`[${ts()}] Virtual Controller started`);
    console.log(`[${ts()}] Global ID: ${GLOBAL_ID}`);
    console.log(`[${ts()}] Port: ${PORT}`);
    console.log(`[${ts()}] GraphQL: http://localhost:${PORT}/graphql`);
  });
}

start();

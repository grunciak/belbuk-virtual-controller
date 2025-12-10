// server.js
const express = require('express');
const cors = require('cors');
const { ApolloServer } = require('@apollo/server');
const { expressMiddleware } = require('@apollo/server/express4');
const bodyParser = require('body-parser');
const { GraphQLScalarType, Kind } = require('graphql');
const { v4: uuidv4 } = require('uuid');

// ─────────────────────────────────────────────
// Pomocnicze
// ─────────────────────────────────────────────
const ts = () => new Date().toISOString();

let SITE_ID = process.env.SITE_ID || `VC-${uuidv4().substring(0, 8)}`;
let TOKEN_TTL = 3600;
let LAST_MAIN_TOKEN = null;
let LAST_REFRESH_TOKEN = null;

// Bufor zdarzeń
let EVENTS_BUFFER = [];

// Prosta konfiguracja – ważne, żeby typy były spójne z opisem w schema.json
const CONFIG = {
  inputs: [
    { id: 'IN1', name: 'Wejście drzwi głównych' },
    { id: 'IN2', name: 'Czujnik ruchu korytarz' },
  ],
  outputs: [
    { id: 'OUT1', name: 'Sygnalizator akustyczny' },
    { id: 'OUT2', name: 'Oświetlenie awaryjne' },
  ],
  readers: [
    { id: 'RD1', name: 'Czytnik wejściowy A' },
  ],
  zones: [
    { id: 'Z1', name: 'Strefa biuro' },
  ],
  portals: [
    { id: 'P1', name: 'Drzwi główne' },
  ],
  faults: [
    { id: 'F1', name: 'Sabotaż', type: 'TAMPER' },
  ],
  eventTypes: [
    { code: 1000, symbol: 'DOOR_OPEN', desc: 'Drzwi otwarte' },
  ],
};

const ACCESS_LEVELS = [
  { id: 1, name: 'Standard' },
];

const USERS = [
  {
    id: 1,
    name: 'operator',
    credential: { card: '123456', pin: '1111' },
    expire: null,
    restore: true,
    override: true,
    access: ACCESS_LEVELS,
  },
];

const SCHEDULES = [];
const SPECIAL_DAYS = [];

const POINTS = [
  { id: 'PT1', name: 'Stan drzwi głównych', valueType: 'BOOLEAN', value: 'false' },
];

const GROUPS = [
  { id: 'GRP1', name: 'Grupa czujników', leader: null, points: POINTS, groups: [] },
];

// ─────────────────────────────────────────────
// Scalary „przezroczyste” (DateTime, PeriodTime, SpecialDate)
// ─────────────────────────────────────────────
const passThroughScalar = (name) =>
  new GraphQLScalarType({
    name,
    serialize(value) {
      return value;
    },
    parseValue(value) {
      return value;
    },
    parseLiteral(ast) {
      if (ast.kind === Kind.STRING) return ast.value;
      return null;
    },
  });

// ─────────────────────────────────────────────
// Uproszczony SDL – TYLKO to, czego potrzebuje createController
// (dokładnie według schema.json, ale wycięte do niezbędnego minimum)
// ─────────────────────────────────────────────
const typeDefs = /* GraphQL */ `
  scalar DateTime
  scalar PeriodTime
  scalar SpecialDate

  enum ValueType {
    INTEGER
    DOUBLE
    BOOLEAN
    MULTIVAL
    USERID
  }

  enum FaultType {
    TAMPER
    PRIME_POWER_SUPPLY
    ALTERNATIVE_POWER_SUPPLY
    HARDWARE
  }

  enum EventConfirmResult {
    UNKNOWN
    CONFIRMED
    NOT_FOUND
    ERROR
  }

  type Token {
    mainToken: String!
    refreshToken: String!
  }

  type Input {
    id: ID!
    name: String!
  }

  type Output {
    id: ID!
    name: String!
  }

  type Reader {
    id: ID!
    name: String!
  }

  type Zone {
    id: ID!
    name: String!
  }

  type Portal {
    id: ID!
    name: String!
  }

  type FaultGroup {
    id: ID!
    name: String!
    type: FaultType!
  }

  type EventType {
    code: Int!
    symbol: String!
    desc: String!
  }

  type SchedulerPeriod {
    day: String
    start: PeriodTime
    end: PeriodTime
  }

  type Scheduler {
    id: ID!
    name: String!
    periods: [SchedulerPeriod!]
  }

  type SpecialDay {
    id: Int!
    name: String!
    date: SpecialDate!
  }

  type AccessLevel {
    id: Int!
    name: String!
  }

  type UserCredential {
    card: String
    pin: String
  }

  type User {
    id: ID!
    name: String!
    credential: UserCredential
    expire: DateTime
    restore: Boolean!
    override: Boolean!
    access: [AccessLevel!]!
  }

  type Authorization {
    schedulers: [Scheduler!]!
    derogations: [SpecialDay!]!
    access: [AccessLevel!]!
    users: [User!]!
  }

  type Point {
    id: ID!
    name: String!
    valueType: ValueType!
    value: String!
  }

  type Group {
    id: ID!
    name: String!
    leader: Point
    points: [Point!]!
    groups: [Group!]!
  }

  type Resource {
    points: [Point!]!
    groups: [Group!]!
  }

  type Trigger {
    type: Int!
    template: String!
  }

  type Extension {
    id: ID!
    type: Int!
    value: String!
  }

  type Event {
    site: ID!
    id: ID!
    dateTime: DateTime!
    trigger: Trigger!
    reason: Point
    points: [Point!]!
    extensions: [Extension!]!
    user: User
    operator: Int
  }

  type EventConfirm {
    id: ID!
    result: EventConfirmResult!
  }

  type Configuration {
    site: ID!
    inputs: [Input!]!
    outputs: [Output!]!
    readers: [Reader!]!
    zones: [Zone!]!
    portals: [Portal!]!
    faults: [FaultGroup!]!
    events: [EventType!]!
    tokenTTL: Int!
  }

  type Query {
    getAuthToken(login: String!, password: String!): Token!
    refreshAuthToken: Token!
    configuration: Configuration!
    authorization: Authorization!
    resource(points: [ID!], groups: [ID!]): Resource!
    getUnconfirmedEvents: Int!
  }

  type Mutation {
    echoEvent: Boolean!
    confirmEvent(id: [ID!]!): [EventConfirm!]!
    setSiteIdentifier(id: ID!): Boolean!
    setTokenTTL(ttl: Int!): Boolean!
  }

  type Subscription {
    events: [Event!]!
  }
`;

// ─────────────────────────────────────────────
// Pomocnicze – generowanie zdarzenia echo
// ─────────────────────────────────────────────
function createEchoEvent() {
  const id = uuidv4();
  const now = ts();
  const trigger = {
    type: 9999,
    template: 'Echo event from virtual controller',
  };
  const reason = POINTS[0] || null;

  return {
    site: SITE_ID,
    id,
    dateTime: now,
    trigger,
    reason,
    points: reason ? [reason] : [],
    extensions: [],
    user: USERS[0] || null,
    operator: 1,
  };
}

// ─────────────────────────────────────────────
// Resolvers
// ─────────────────────────────────────────────
const resolvers = {
  DateTime: passThroughScalar('DateTime'),
  PeriodTime: passThroughScalar('PeriodTime'),
  SpecialDate: passThroughScalar('SpecialDate'),

  Query: {
    getAuthToken: (_, { login }) => {
      console.log(`[${ts()}] getAuthToken(login=${login})`);
      LAST_MAIN_TOKEN = `MAIN-${uuidv4()}`;
      LAST_REFRESH_TOKEN = `REFRESH-${uuidv4()}`;
      return {
        mainToken: LAST_MAIN_TOKEN,
        refreshToken: LAST_REFRESH_TOKEN,
      };
    },
    refreshAuthToken: () => {
      console.log(`[${ts()}] refreshAuthToken`);
      LAST_MAIN_TOKEN = `MAIN-${uuidv4()}`;
      LAST_REFRESH_TOKEN = `REFRESH-${uuidv4()}`;
      return {
        mainToken: LAST_MAIN_TOKEN,
        refreshToken: LAST_REFRESH_TOKEN,
      };
    },
    configuration: () => {
      console.log(`[${ts()}] configuration`);
      return {
        site: SITE_ID,
        inputs: CONFIG.inputs,
        outputs: CONFIG.outputs,
        readers: CONFIG.readers,
        zones: CONFIG.zones,
        portals: CONFIG.portals,
        faults: CONFIG.faults,
        events: CONFIG.eventTypes,
        tokenTTL: TOKEN_TTL,
      };
    },
    authorization: () => {
      console.log(`[${ts()}] authorization`);
      return {
        schedulers: SCHEDULES,
        derogations: SPECIAL_DAYS,
        access: ACCESS_LEVELS,
        users: USERS,
      };
    },
    resource: (_, args) => {
      console.log(`[${ts()}] resource`, args);
      let pts = POINTS;
      let grps = GROUPS;
      if (args.points && args.points.length) {
        pts = pts.filter((p) => args.points.includes(p.id));
      }
      if (args.groups && args.groups.length) {
        grps = grps.filter((g) => args.groups.includes(g.id));
      }
      return { points: pts, groups: grps };
    },
    getUnconfirmedEvents: () => {
      console.log(
        `[${ts()}] getUnconfirmedEvents -> ${EVENTS_BUFFER.length}`,
      );
      return EVENTS_BUFFER.length;
    },
  },

  Mutation: {
    echoEvent: () => {
      console.log(`[${ts()}] echoEvent`);
      const ev = createEchoEvent();
      EVENTS_BUFFER.push(ev);
      return true;
    },
    confirmEvent: (_, { id }) => {
      console.log(`[${ts()}] confirmEvent`, id);
      const results = [];
      for (const evId of id) {
        const idx = EVENTS_BUFFER.findIndex((e) => e.id === evId);
        if (idx === -1) {
          results.push({ id: evId, result: 'NOT_FOUND' });
        } else {
          EVENTS_BUFFER.splice(idx, 1);
          results.push({ id: evId, result: 'CONFIRMED' });
        }
      }
      return results;
    },
    setSiteIdentifier: (_, { id }) => {
      console.log(`[${ts()}] setSiteIdentifier -> ${id}`);
      SITE_ID = id;
      return true;
    },
    setTokenTTL: (_, { ttl }) => {
      console.log(`[${ts()}] setTokenTTL -> ${ttl}`);
      TOKEN_TTL = ttl;
      return true;
    },
  },

  Subscription: {
    events: {
      subscribe: () => {
        throw new Error('Subscription.events not implemented in virtual controller');
      },
    },
  },
};

// ─────────────────────────────────────────────
// Start serwera na Railway
// ─────────────────────────────────────────────
async function start() {
  const app = express();
  app.use(cors());
  app.use(bodyParser.json());

  const server = new ApolloServer({
    typeDefs,
    resolvers,
    introspection: true,
  });

  await server.start();

  // obsługujemy kilka ścieżek – żeby trafić w to, co woła createController
  const gqlMiddleware = expressMiddleware(server);

  app.post('/graphql', gqlMiddleware);
  app.post('/api/graphql.php', gqlMiddleware);
  app.post('/', gqlMiddleware);

  // healthcheck
  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      site: SITE_ID,
      tokenTTL: TOKEN_TTL,
      eventsInBuffer: EVENTS_BUFFER.length,
      time: ts(),
    });
  });

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log('────────────────────────────────────────────');
    console.log('  VIRTUAL CONTROLLER – READY');
    console.log('────────────────────────────────────────────');
    console.log(`  Site ID:   ${SITE_ID}`);
    console.log(`  Port:      ${PORT}`);
    console.log('');
    console.log(`  POST   /graphql`);
    console.log(`  POST   /api/graphql.php`);
    console.log(`  POST   /`);
    console.log(`  GET    /health`);
    console.log('────────────────────────────────────────────');
  });
}

start().catch((err) => {
  console.error('❌ Error starting server:', err);
});

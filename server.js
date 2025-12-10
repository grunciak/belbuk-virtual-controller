const express = require('express');
const cors = require('cors');
const { ApolloServer, gql } = require('apollo-server-express');
const { GraphQLScalarType, Kind } = require('graphql');
const { v4: uuidv4 } = require('uuid');

// ─────────────────────────────────────────────
// Prosty timestamp
// ─────────────────────────────────────────────
const ts = () => new Date().toISOString();

// ─────────────────────────────────────────────
// PAMIĘĆ WIRTUALNEGO KONTROLERA
// ─────────────────────────────────────────────

let SITE_ID = process.env.SITE_ID || `VC-${uuidv4().substring(0, 8)}`;
let TOKEN_TTL = 3600; // sekundy

// tokeny (tu nie ma prawdziwego bezpieczeństwa – to atrapa)
let LAST_MAIN_TOKEN = null;
let LAST_REFRESH_TOKEN = null;

// konfiguracja
const CONFIG = {
  inputs: [
    { id: 'IN1', name: 'Wejście drzwi głównych' },
    { id: 'IN2', name: 'Czujnik ruchu korytarz' }
  ],
  outputs: [
    { id: 'OUT1', name: 'Sygnalizator akustyczny' },
    { id: 'OUT2', name: 'Oświetlenie awaryjne' }
  ],
  readers: [
    { id: 'RD1', name: 'Czytnik wejściowy A' },
    { id: 'RD2', name: 'Czytnik wyjściowy A' }
  ],
  zones: [
    { id: 'Z1', name: 'Biuro' },
    { id: 'Z2', name: 'Magazyn' }
  ],
  portals: [
    { id: 'P1', name: 'Drzwi główne' },
    { id: 'P2', name: 'Drzwi magazyn' }
  ],
  faults: [
    { id: 'F1', name: 'Sabotaż obudowy', type: 'TAMPER' },
    { id: 'F2', name: 'Zasilanie podstawowe', type: 'PRIME_POWER_SUPPLY' }
  ],
  eventTypes: [
    { code: 1000, symbol: 'DOOR_OPEN', desc: 'Drzwi otwarte' },
    { code: 1001, symbol: 'DOOR_CLOSED', desc: 'Drzwi zamknięte' },
    { code: 2000, symbol: 'ZONE_ARMED', desc: 'Strefa uzbrojona' },
    { code: 2001, symbol: 'ZONE_ALARM', desc: 'Alarm strefy' }
  ]
};

// zasoby (punkty)
const POINTS = [
  {
    id: 'PT_IN1',
    name: 'Stan drzwi głównych',
    valueType: 'BOOLEAN',
    value: 'false'
  },
  {
    id: 'PT_TEMP1',
    name: 'Temperatura – hol',
    valueType: 'DOUBLE',
    value: '21.5'
  },
  {
    id: 'PT_USER1',
    name: 'Użytkownik ostatniego przejścia',
    valueType: 'USERID',
    value: '1'
  }
];

const GROUPS = [
  {
    id: 'GRP_SENSORS',
    name: 'Czujniki',
    leader: null,
    points: [POINTS[0], POINTS[1]],
    groups: []
  }
];

// Authorization – prosto
const SCHEDULES = [
  {
    id: 'SCH1',
    name: 'Praca dzienna',
    periods: [] // zostawiamy puste, żeby nie dorabiać scalarów PeriodTime
  }
];

const SPECIAL_DAYS = [];
const ACCESS_LEVELS = [
  { id: 'AL1', name: 'Standard' },
  { id: 'AL2', name: 'Administrator' }
];

const USERS = [
  {
    id: 'U1',
    name: 'operator1',
    credential: { card: '123456', pin: '1111' },
    expire: null,
    restore: true,
    override: true,
    access: [ACCESS_LEVELS[0], ACCESS_LEVELS[1]]
  }
];

// Bufor zdarzeń – tak jak w opisie getUnconfirmedEvents / confirmEvent
let EVENTS_BUFFER = []; // tablica Event

// ─────────────────────────────────────────────
// DEFINICJA SCHEMY (wycinek Twojej specyfikacji)
// ─────────────────────────────────────────────

const typeDefs = gql`
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

  type Fault {
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
    periods: [SchedulerPeriod!]!
  }

  type SpecialDay {
    id: Int!
    name: String!
    date: SpecialDate!
  }

  type AccessLevel {
    id: ID!
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
    faults: [Fault!]!
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

  # SUBSCRIPTION jest w Twojej specyfikacji,
  # ale na razie nie podpinamy WebSocketów.
  type Subscription {
    events: [Event!]!
  }
`;

// ─────────────────────────────────────────────
// SCALARY – traktujemy wszystko jako string
// ─────────────────────────────────────────────

const PassThroughScalar = (name) =>
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
    }
  });

// ─────────────────────────────────────────────
// POMOCNICZE: generowanie eventów
// ─────────────────────────────────────────────

function createEchoEvent() {
  const id = uuidv4();
  const now = ts();
  const trigger = {
    type: 9999,
    template: 'Echo event from virtual controller'
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
    operator: 1
  };
}

// ─────────────────────────────────────────────
// RESOLVERY
// ─────────────────────────────────────────────

const resolvers = {
  DateTime: PassThroughScalar('DateTime'),
  PeriodTime: PassThroughScalar('PeriodTime'),
  SpecialDate: PassThroughScalar('SpecialDate'),

  Query: {
    getAuthToken: (_, { login, password }) => {
      // Tu możesz kiedyś dodać prawdziwą weryfikację.
      console.log(`[${ts()}] getAuthToken for login=${login}`);
      LAST_MAIN_TOKEN = `MAIN-${uuidv4()}`;
      LAST_REFRESH_TOKEN = `REFRESH-${uuidv4()}`;
      return {
        mainToken: LAST_MAIN_TOKEN,
        refreshToken: LAST_REFRESH_TOKEN
      };
    },

    refreshAuthToken: () => {
      console.log(`[${ts()}] refreshAuthToken`);
      LAST_MAIN_TOKEN = `MAIN-${uuidv4()}`;
      LAST_REFRESH_TOKEN = `REFRESH-${uuidv4()}`;
      return {
        mainToken: LAST_MAIN_TOKEN,
        refreshToken: LAST_REFRESH_TOKEN
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
        tokenTTL: TOKEN_TTL
      };
    },

    authorization: () => {
      console.log(`[${ts()}] authorization`);
      return {
        schedulers: SCHEDULES,
        derogations: SPECIAL_DAYS,
        access: ACCESS_LEVELS,
        users: USERS
      };
    },

    resource: (_, args) => {
      console.log(`[${ts()}] resource`, args);
      let pts = POINTS;
      let grps = GROUPS;

      if (args.points && args.points.length > 0) {
        pts = pts.filter((p) => args.points.includes(p.id));
      }
      if (args.groups && args.groups.length > 0) {
        grps = grps.filter((g) => args.groups.includes(g.id));
      }

      return {
        points: pts,
        groups: grps
      };
    },

    getUnconfirmedEvents: () => {
      console.log(
        `[${ts()}] getUnconfirmedEvents -> ${EVENTS_BUFFER.length}`,
      );
      return EVENTS_BUFFER.length;
    }
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
          results.push({
            id: evId,
            result: 'NOT_FOUND'
          });
        } else {
          EVENTS_BUFFER.splice(idx, 1);
          results.push({
            id: evId,
            result: 'CONFIRMED'
          });
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
    }
  },

  Subscription: {
    // tylko po to, żeby introspekcja widziała ten typ;
    // realny WebSocket do subskrypcji dorobimy osobno
    events: {
      subscribe: () => {
        throw new Error('Subscription events not implemented yet.');
      }
    }
  }
};

// ─────────────────────────────────────────────
// START SERWERA (Express + Apollo)
// ─────────────────────────────────────────────

async function start() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  const server = new ApolloServer({
    typeDefs,
    resolvers
  });

  await server.start();
  app.use('/graphql', server.getMiddleware());

  // prosty healthcheck dla Railway
  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      site: SITE_ID,
      eventsInBuffer: EVENTS_BUFFER.length,
      time: ts()
    });
  });

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log('────────────────────────────────────────────');
    console.log('  VIRTUAL CONTROLLER – GraphQL');
    console.log('────────────────────────────────────────────');
    console.log(`  Site ID:   ${SITE_ID}`);
    console.log(`  TokenTTL:  ${TOKEN_TTL} s`);
    console.log(`  Port:      ${PORT}`);
    console.log('');
    console.log(`  GraphQL:   http://localhost:${PORT}/graphql`);
    console.log(`  Health:    http://localhost:${PORT}/health`);
    console.log('────────────────────────────────────────────');
  });
}

start().catch((err) => {
  console.error('❌ Error starting server:', err);
});

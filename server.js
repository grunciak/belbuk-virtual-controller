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
  enum ValueType {
    STRING
    INTEGER
    FLOAT
    BOOLEAN
    BINARY
  }

  type Point {
    id: String!
    name: String!
    type: String!
    family: String!
    created: String
    valueType: ValueType!
    value: String!
  }

  type PointGroup {
    id: String!
    name: String!
    points: [Point!]!
  }

  type Resource {
    points: [Point!]!
    groups: [PointGroup!]!
  }

  type Input {
    id: Int!
    localId: Int!
    name: String!
    type: String!
  }

  type Output {
    id: Int!
    localId: Int!
    name: String!
    type: String!
  }

  type Reader {
    id: Int!
    localId: Int!
    name: String!
    type: String!
    direction: String
  }

  type Zone {
    id: Int!
    localId: Int!
    name: String!
  }

  type Portal {
    id: Int!
    localId: Int!
    name: String!
    entryZone: Zone
    exitZone: Zone
    readers: [Reader!]
  }

  type FaultGroup {
    id: Int!
    localId: Int!
    name: String!
  }

  type EventType {
    id: Int!
    localId: Int!
    name: String!
    category: String
  }

  type User {
    id: Int!
    localId: Int!
    name: String!
    firstName: String
    lastName: String
    cardNumber: String
    pin: String
    active: Boolean!
  }

  type Schedule {
    id: Int!
    localId: Int!
    name: String!
  }

  type AccessLevel {
    id: Int!
    localId: Int!
    name: String!
  }

  type Authorization {
    users: [User!]!
    schedules: [Schedule!]!
    accessLevels: [AccessLevel!]!
  }

  type Configuration {
    globalControllerIdentifier: String!
    inputs: [Input!]!
    outputs: [Output!]!
    readers: [Reader!]!
    zones: [Zone!]!
    portals: [Portal!]!
    faults: [FaultGroup!]!
    eventTypes: [EventType!]!
    authorization: Authorization!
    resource: Resource!
  }

  type ControlResult {
    result: Boolean!
    message: String
  }

  type Query {
    echo: String!
    configuration: Configuration!
  }

  type Mutation {
    controlZone(zoneId: Int!, action: String!): ControlResult!
    controlOutput(outputId: Int!, value: Boolean!): ControlResult!
    setPointValue(pointId: String!, value: String!, valueType: ValueType!): Point
  }
`;

// ============================================================
// SAMPLE DATA
// ============================================================

const data = {
  points: [
    { id: 'PT001', name: 'Temperatura - Hol główny', type: 'TEMPERATURE', family: 'SENSOR', valueType: 'FLOAT', value: '21.5', created: '2024-01-15T10:00:00Z' },
    { id: 'PT002', name: 'Wilgotność - Hol główny', type: 'HUMIDITY', family: 'SENSOR', valueType: 'FLOAT', value: '45.2', created: '2024-01-15T10:00:00Z' },
    { id: 'PT003', name: 'Czujnik ruchu - Wejście', type: 'MOTION', family: 'SENSOR', valueType: 'BOOLEAN', value: 'false', created: '2024-01-15T10:00:00Z' },
    { id: 'PT004', name: 'Oświetlenie - Korytarz A', type: 'LIGHT', family: 'ACTUATOR', valueType: 'BOOLEAN', value: 'true', created: '2024-01-15T10:00:00Z' },
    { id: 'PT005', name: 'Wentylacja - Sala 101', type: 'HVAC', family: 'ACTUATOR', valueType: 'INTEGER', value: '2', created: '2024-01-15T10:00:00Z' },
  ],
  
  groups: [
    { id: 'GRP001', name: 'Czujniki temperatury', points: [] },
    { id: 'GRP002', name: 'Oświetlenie', points: [] },
  ],
  
  inputs: [
    { id: 1, localId: 1, name: 'Wejście 1 - Czujnik drzwi', type: 'DIGITAL' },
    { id: 2, localId: 2, name: 'Wejście 2 - Czujnik okna', type: 'DIGITAL' },
    { id: 3, localId: 3, name: 'Wejście 3 - PIR korytarz', type: 'DIGITAL' },
  ],
  
  outputs: [
    { id: 1, localId: 1, name: 'Wyjście 1 - Zamek drzwi główne', type: 'RELAY' },
    { id: 2, localId: 2, name: 'Wyjście 2 - Zamek drzwi boczne', type: 'RELAY' },
    { id: 3, localId: 3, name: 'Wyjście 3 - Syrena', type: 'RELAY' },
  ],
  
  readers: [
    { id: 1, localId: 1, name: 'Czytnik - Wejście główne', type: 'RFID', direction: 'ENTRY' },
    { id: 2, localId: 2, name: 'Czytnik - Wejście główne (wyjście)', type: 'RFID', direction: 'EXIT' },
    { id: 3, localId: 3, name: 'Czytnik - Drzwi boczne', type: 'RFID', direction: 'BOTH' },
  ],
  
  zones: [
    { id: 1, localId: 1, name: 'Strefa zewnętrzna' },
    { id: 2, localId: 2, name: 'Hol główny' },
    { id: 3, localId: 3, name: 'Biuro A' },
    { id: 4, localId: 4, name: 'Biuro B' },
    { id: 5, localId: 5, name: 'Serwerownia' },
  ],
  
  portals: [
    { id: 1, localId: 1, name: 'Wejście główne', entryZone: null, exitZone: null, readers: [] },
    { id: 2, localId: 2, name: 'Drzwi boczne', entryZone: null, exitZone: null, readers: [] },
    { id: 3, localId: 3, name: 'Drzwi do serwerowni', entryZone: null, exitZone: null, readers: [] },
  ],
  
  faults: [
    { id: 1, localId: 1, name: 'Awarie sprzętowe' },
    { id: 2, localId: 2, name: 'Awarie komunikacji' },
  ],
  
  eventTypes: [
    { id: 1, localId: 1, name: 'Dostęp przyznany', category: 'ACCESS' },
    { id: 2, localId: 2, name: 'Dostęp odmówiony', category: 'ACCESS' },
    { id: 3, localId: 3, name: 'Alarm włamaniowy', category: 'ALARM' },
    { id: 4, localId: 4, name: 'Drzwi otwarte zbyt długo', category: 'WARNING' },
  ],
  
  users: [
    { id: 1, localId: 1, name: 'Jan Kowalski', firstName: 'Jan', lastName: 'Kowalski', cardNumber: 'ABC123456', pin: '1234', active: true },
    { id: 2, localId: 2, name: 'Anna Nowak', firstName: 'Anna', lastName: 'Nowak', cardNumber: 'DEF789012', pin: '5678', active: true },
    { id: 3, localId: 3, name: 'Piotr Wiśniewski', firstName: 'Piotr', lastName: 'Wiśniewski', cardNumber: 'GHI345678', pin: '9012', active: false },
  ],
  
  schedules: [
    { id: 1, localId: 1, name: 'Godziny pracy (8-17)' },
    { id: 2, localId: 2, name: 'Całodobowy' },
    { id: 3, localId: 3, name: 'Weekendy' },
  ],
  
  accessLevels: [
    { id: 1, localId: 1, name: 'Pracownik' },
    { id: 2, localId: 2, name: 'Kierownik' },
    { id: 3, localId: 3, name: 'Administrator' },
    { id: 4, localId: 4, name: 'Serwisant' },
  ],
};

// Link references
data.portals[0].entryZone = data.zones[0];
data.portals[0].exitZone = data.zones[1];
data.portals[0].readers = [data.readers[0], data.readers[1]];

data.portals[1].entryZone = data.zones[0];
data.portals[1].exitZone = data.zones[1];
data.portals[1].readers = [data.readers[2]];

data.portals[2].entryZone = data.zones[1];
data.portals[2].exitZone = data.zones[4];

data.groups[0].points = [data.points[0], data.points[1]];
data.groups[1].points = [data.points[3]];

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
        inputs: data.inputs,
        outputs: data.outputs,
        readers: data.readers,
        zones: data.zones,
        portals: data.portals,
        faults: data.faults,
        eventTypes: data.eventTypes,
        authorization: {
          users: data.users,
          schedules: data.schedules,
          accessLevels: data.accessLevels,
        },
        resource: {
          points: data.points,
          groups: data.groups,
        },
      };
    },
  },
  
  Mutation: {
    controlZone: (_, { zoneId, action }) => {
      console.log(`[${ts()}] Mutation: controlZone (zoneId: ${zoneId}, action: ${action})`);
      const zone = data.zones.find(z => z.id === zoneId);
      if (zone) {
        return { result: true, message: `Zone ${zone.name} - action ${action} executed` };
      }
      return { result: false, message: 'Zone not found' };
    },
    
    controlOutput: (_, { outputId, value }) => {
      console.log(`[${ts()}] Mutation: controlOutput (outputId: ${outputId}, value: ${value})`);
      const output = data.outputs.find(o => o.id === outputId);
      if (output) {
        return { result: true, message: `Output ${output.name} set to ${value}` };
      }
      return { result: false, message: 'Output not found' };
    },
    
    setPointValue: (_, { pointId, value, valueType }) => {
      console.log(`[${ts()}] Mutation: setPointValue (pointId: ${pointId}, value: ${value})`);
      const point = data.points.find(p => p.id === pointId);
      if (point) {
        point.value = value;
        point.valueType = valueType;
        return point;
      }
      return null;
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
    introspection: true,  // Enable for debugging
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
      version: '2.0.0',
      globalControllerIdentifier: GLOBAL_ID,
      endpoints: {
        graphql: '/graphql',
        graphqlPhp: '/api/graphql.php',
        health: '/health'
      },
      exampleQuery: `query { configuration { globalControllerIdentifier zones { id name } resource { points { id name value } } } }`
    });
  });
  
  app.listen(PORT, () => {
    console.log('');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('  BELBUK VIRTUAL CONTROLLER v2.0');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`  Global ID:    ${GLOBAL_ID}`);
    console.log(`  Port:         ${PORT}`);
    console.log('');
    console.log('  Endpoints:');
    console.log(`    GraphQL:    http://localhost:${PORT}/graphql`);
    console.log(`    PHP-style:  http://localhost:${PORT}/api/graphql.php`);
    console.log(`    Health:     http://localhost:${PORT}/health`);
    console.log('');
    console.log('  Test query:');
    console.log('    curl -X POST http://localhost:' + PORT + '/graphql \\');
    console.log('      -H "Content-Type: application/json" \\');
    console.log('      -d \'{"query": "{ configuration { globalControllerIdentifier zones { id name } } }"}\'');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('');
  });
}

start();

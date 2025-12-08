const { ApolloServer } = require('@apollo/server');
const { expressMiddleware } = require('@apollo/server/express4');
const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

// ============================================================
// CONFIGURATION
// ============================================================

const PORT = process.env.PORT || 4000;
const GLOBAL_ID = process.env.GLOBAL_ID || 'VC-' + uuidv4().substring(0, 8).toUpperCase();

// ============================================================
// DATA STORE
// ============================================================

const data = {
  globalControllerIdentifier: GLOBAL_ID,
  
  inputs: [],
  outputs: [],
  readers: [],
  zones: [],
  portals: [],
  faults: [],
  eventTypes: [],
  
  // Authorization
  derogations: [],
  schedulers: [],
  accessLevels: [],
  users: [],
  
  // Resources (points)
  points: [],
  groups: []
};

// ============================================================
// INITIALIZE SAMPLE DATA
// ============================================================

function init() {
  // Inputs (wejścia fizyczne)
  data.inputs = [
    { id: 1, name: 'Wejście 1 - Czujnik drzwi główne' },
    { id: 2, name: 'Wejście 2 - Czujnik drzwi boczne' },
    { id: 3, name: 'Wejście 3 - PIR korytarz' },
    { id: 4, name: 'Wejście 4 - PIR magazyn' },
    { id: 5, name: 'Wejście 5 - Czujnik dymu' },
    { id: 6, name: 'Wejście 6 - Przycisk napadowy' },
  ];
  
  // Outputs (wyjścia fizyczne)
  data.outputs = [
    { id: 1, name: 'Wyjście 1 - Elektrozaczep drzwi główne' },
    { id: 2, name: 'Wyjście 2 - Elektrozaczep drzwi boczne' },
    { id: 3, name: 'Wyjście 3 - Syrena wewnętrzna' },
    { id: 4, name: 'Wyjście 4 - Syrena zewnętrzna' },
  ];
  
  // Readers (czytniki)
  data.readers = [
    { id: 1, name: 'Czytnik 1 - Wejście główne' },
    { id: 2, name: 'Czytnik 2 - Wejście boczne' },
  ];
  
  // Zones (strefy)
  data.zones = [
    { id: 1, name: 'Strefa 1 - Hala główna', content: '{"armed":false,"alarm":false}' },
    { id: 2, name: 'Strefa 2 - Biura', content: '{"armed":false,"alarm":false}' },
    { id: 3, name: 'Strefa 3 - Magazyn', content: '{"armed":true,"alarm":false}' },
    { id: 4, name: 'Strefa 4 - Serwerownia', content: '{"armed":true,"alarm":false}' },
  ];
  
  // Portals (przejścia)
  data.portals = [
    { id: 1, name: 'Przejście 1 - Drzwi główne', content: '{"state":"normal"}' },
    { id: 2, name: 'Przejście 2 - Drzwi boczne', content: '{"state":"normal"}' },
    { id: 3, name: 'Przejście 3 - Brama magazynowa', content: '{"state":"normal"}' },
  ];
  
  // Faults (grupy problemowe)
  data.faults = [
    { faultType: 'TAMPER', inputs: [data.inputs[0], data.inputs[1]] },
    { faultType: 'PRIME_POWER_SUPPLY', inputs: [] },
    { faultType: 'ALTERNATIVE_POWER_SUPPLY', inputs: [] },
  ];
  
  // Event Types
  data.eventTypes = [
    { code: 1, symbol: 'ARM', desc: 'Uzbrojenie strefy' },
    { code: 2, symbol: 'DISARM', desc: 'Rozbrojenie strefy' },
    { code: 3, symbol: 'ALARM', desc: 'Alarm' },
    { code: 4, symbol: 'RESTORE', desc: 'Kasowanie alarmu' },
    { code: 5, symbol: 'TAMPER', desc: 'Sabotaż' },
    { code: 10, symbol: 'ACCESS_GRANTED', desc: 'Dostęp przyznany' },
    { code: 11, symbol: 'ACCESS_DENIED', desc: 'Dostęp odmówiony' },
    { code: 20, symbol: 'DOOR_OPEN', desc: 'Drzwi otwarte' },
    { code: 21, symbol: 'DOOR_CLOSE', desc: 'Drzwi zamknięte' },
  ];
  
  // Schedulers (harmonogramy)
  data.schedulers = [
    {
      id: '1',
      name: 'Harmonogram dzienny 8-16',
      periods: [
        { day: 'MONDAY', start: '08:00', end: '16:00' },
        { day: 'TUESDAY', start: '08:00', end: '16:00' },
        { day: 'WEDNESDAY', start: '08:00', end: '16:00' },
        { day: 'THURSDAY', start: '08:00', end: '16:00' },
        { day: 'FRIDAY', start: '08:00', end: '16:00' },
      ]
    },
    {
      id: '2',
      name: 'Harmonogram 24/7',
      periods: [
        { day: 'MONDAY', start: '00:00', end: '23:59' },
        { day: 'TUESDAY', start: '00:00', end: '23:59' },
        { day: 'WEDNESDAY', start: '00:00', end: '23:59' },
        { day: 'THURSDAY', start: '00:00', end: '23:59' },
        { day: 'FRIDAY', start: '00:00', end: '23:59' },
        { day: 'SATURDAY', start: '00:00', end: '23:59' },
        { day: 'SUNDAY', start: '00:00', end: '23:59' },
      ]
    },
  ];
  
  // Access Levels (poziomy dostępu)
  data.accessLevels = [
    {
      id: '1',
      name: 'Administrator',
      zoneAuths: data.zones.map(z => ({
        zone: z,
        scheduler: data.schedulers[1],
        arm: true, disarm: true, test: true
      })),
      portalAuths: data.portals.map(p => ({
        portal: p,
        scheduler: data.schedulers[1]
      }))
    },
    {
      id: '2',
      name: 'Pracownik',
      zoneAuths: [
        { zone: data.zones[0], scheduler: data.schedulers[0], arm: false, disarm: true, test: false },
        { zone: data.zones[1], scheduler: data.schedulers[0], arm: false, disarm: true, test: false },
      ],
      portalAuths: [
        { portal: data.portals[0], scheduler: data.schedulers[0] },
        { portal: data.portals[1], scheduler: data.schedulers[0] },
      ]
    },
  ];
  
  // Users (użytkownicy)
  data.users = [
    { id: '1', name: 'Administrator', credential: 'ADMIN001', expire: null, restore: true, override: true, accessLevelIds: [1] },
    { id: '2', name: 'Jan Kowalski', credential: 'CARD001', expire: '2025-12-31T23:59:59Z', restore: true, override: false, accessLevelIds: [2] },
    { id: '3', name: 'Anna Nowak', credential: 'CARD002', expire: '2025-12-31T23:59:59Z', restore: false, override: false, accessLevelIds: [2] },
    { id: '4', name: 'Piotr Wiśniewski', credential: 'CARD003', expire: null, restore: false, override: false, accessLevelIds: [2] },
  ];
  
  // Derogations (dni specjalne)
  data.derogations = [
    { id: '1', date: '2025-12-25', day: 'SUNDAY' },
    { id: '2', date: '2025-12-26', day: 'SUNDAY' },
    { id: '3', date: '2025-01-01', day: 'SUNDAY' },
  ];
  
  // Points (punkty pomiarowe)
  data.points = [
    { id: 'TEMP_001', name: 'Temperatura - Hala główna', type: 'TEMPERATURE', family: 'SENSOR', created: ts(), valueType: 'DOUBLE', value: '21.5' },
    { id: 'TEMP_002', name: 'Temperatura - Serwerownia', type: 'TEMPERATURE', family: 'SENSOR', created: ts(), valueType: 'DOUBLE', value: '19.2' },
    { id: 'TEMP_003', name: 'Temperatura - Magazyn', type: 'TEMPERATURE', family: 'SENSOR', created: ts(), valueType: 'DOUBLE', value: '18.0' },
    { id: 'HUM_001', name: 'Wilgotność - Hala główna', type: 'HUMIDITY', family: 'SENSOR', created: ts(), valueType: 'DOUBLE', value: '45.0' },
    { id: 'HUM_002', name: 'Wilgotność - Serwerownia', type: 'HUMIDITY', family: 'SENSOR', created: ts(), valueType: 'DOUBLE', value: '38.5' },
    { id: 'DOOR_001', name: 'Stan drzwi głównych', type: 'DOOR_STATE', family: 'BINARY', created: ts(), valueType: 'BOOLEAN', value: 'false' },
    { id: 'DOOR_002', name: 'Stan drzwi bocznych', type: 'DOOR_STATE', family: 'BINARY', created: ts(), valueType: 'BOOLEAN', value: 'false' },
    { id: 'PIR_001', name: 'Ruch - Korytarz', type: 'MOTION', family: 'BINARY', created: ts(), valueType: 'BOOLEAN', value: 'false' },
    { id: 'PIR_002', name: 'Ruch - Magazyn', type: 'MOTION', family: 'BINARY', created: ts(), valueType: 'BOOLEAN', value: 'false' },
    { id: 'POWER_001', name: 'Zasilanie główne', type: 'POWER_STATE', family: 'SYSTEM', created: ts(), valueType: 'BOOLEAN', value: 'true' },
    { id: 'BATT_001', name: 'Poziom akumulatora', type: 'BATTERY_LEVEL', family: 'SYSTEM', created: ts(), valueType: 'INTEGER', value: '95' },
    { id: 'ZONE_001', name: 'Stan strefy 1', type: 'ZONE_STATE', family: 'ALARM', created: ts(), valueType: 'INTEGER', value: '0' },
    { id: 'ZONE_002', name: 'Stan strefy 2', type: 'ZONE_STATE', family: 'ALARM', created: ts(), valueType: 'INTEGER', value: '0' },
  ];
  
  // Point Groups (grupy punktów)
  data.groups = [
    {
      id: 'GRP_TEMP',
      name: 'Czujniki temperatury',
      leader: data.points[0],
      points: data.points.filter(p => p.type === 'TEMPERATURE'),
      childGroups: []
    },
    {
      id: 'GRP_HUM',
      name: 'Czujniki wilgotności',
      leader: data.points[3],
      points: data.points.filter(p => p.type === 'HUMIDITY'),
      childGroups: []
    },
    {
      id: 'GRP_BINARY',
      name: 'Czujniki binarne',
      leader: data.points[5],
      points: data.points.filter(p => p.family === 'BINARY'),
      childGroups: []
    },
    {
      id: 'GRP_SYSTEM',
      name: 'Punkty systemowe',
      leader: data.points[9],
      points: data.points.filter(p => p.family === 'SYSTEM'),
      childGroups: []
    },
  ];
  
  console.log(`Initialized data:`);
  console.log(`  - ${data.inputs.length} inputs`);
  console.log(`  - ${data.outputs.length} outputs`);
  console.log(`  - ${data.readers.length} readers`);
  console.log(`  - ${data.zones.length} zones`);
  console.log(`  - ${data.portals.length} portals`);
  console.log(`  - ${data.points.length} points`);
  console.log(`  - ${data.groups.length} groups`);
  console.log(`  - ${data.users.length} users`);
}

function ts() {
  return new Date().toISOString();
}

// ============================================================
// GRAPHQL SCHEMA (exact match to Belbuk controller schema)
// ============================================================

const typeDefs = `#graphql

# ============ ENUMS ============

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

enum DayOfWeek {
  MONDAY
  TUESDAY
  WEDNESDAY
  THURSDAY
  FRIDAY
  SATURDAY
  SUNDAY
  CUSTOM_1
  CUSTOM_2
}

enum ControlZoneResult {
  BLOCKED_BACKUP
  BLOCKED_FAULT
  BLOCKED_MAINS
  BLOCKED_SENSOR
  BLOCKED_TAMPER
  UNKNOWN
  ZONE_ARMED
  ZONE_DISARMED
  ZONE_TEST_ENDED
  ZONE_UNBLOCKED
}

enum RestoreAlarmResult {
  UNKNOWN
  RESTORED
  STILL_ALARM_CONDITION
  ALARM_NOT_ACTIVE
}

enum TestZoneResult {
  UNKNOWN
  STARTED
  ALREADY_STARTED
  DISARM_REQUIRED
}

enum BlockZoneResult {
  UNKNOWN
  BLOCKED
  ALREADY_BLOCKED
  DISARM_REQUIRED
}

enum BlockZoneSensorResult {
  UNKNOWN
  BLOCKED
  ALREADY_BLOCKED
  NOT_SENSOR
}

enum UnblockZoneSensorResult {
  UNKNOWN
  UNBLOCKED
  ALREADY_UNBLOCKED
  NOT_SENSOR
}

enum ReleasePortalResult {
  UNKNOWN
  RELEASED
  EMERGENCY
}

enum EmergencyPortalResult {
  UNKNOWN
  DONE
  ALREADY_EMERGENCY
}

enum RestorePortalResult {
  UNKNOWN
  RESTORED
  STILL_EMERGENCY_CONDITION
  NORMAL_OPERATION
}

enum ManageAntipassbackResult {
  UNKNOWN
  ALREADY_SUSPENDED
  SUSPENDED
  ALREADY_RESUMED
  RESUMED
}

enum ReactivateAntipassbackResult {
  UNKNOWN
  REACTIVATED
}

# ============ TYPES ============

type Input {
  id: Int
  name: String
}

type Output {
  id: Int
  name: String
}

type Reader {
  id: Int
  name: String
}

type Zone {
  id: Int!
  name: String
  content: String
}

type Portal {
  id: Int
  name: String
  content: String
}

type Fault {
  faultType: FaultType
  inputs: [Input!]!
}

type EventType {
  code: Int!
  symbol: String!
  desc: String!
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
  leader: Point
  points: [Point!]
  childGroups: [PointGroup!]
}

type Resource {
  points: [Point!]!
  groups: [PointGroup!]!
}

type Period {
  day: DayOfWeek!
  start: String!
  end: String!
}

type Scheduler {
  id: ID!
  name: String!
  periods: [Period]!
}

type SpecialDay {
  id: ID!
  date: String!
  day: DayOfWeek!
}

type ZoneAuth {
  zone: Zone
  scheduler: Scheduler
  arm: Boolean
  disarm: Boolean
  test: Boolean
}

type PortalAuth {
  portal: Portal
  scheduler: Scheduler
}

type AccessLevel {
  id: ID!
  name: String!
  zoneAuths: [ZoneAuth!]
  portalAuths: [PortalAuth!]
}

type ControllerUser {
  id: ID!
  name: String!
  credential: String!
  expire: String
  restore: Boolean!
  override: Boolean!
  accessLevelIds: [Int!]!
}

type Authorization {
  derogations: [SpecialDay!]!
  schedulers: [Scheduler!]!
  accessLevels: [AccessLevel!]!
  users: [ControllerUser!]!
}

type Configuration {
  globalControllerIdentifier: String
  inputs: [Input!]!
  outputs: [Output!]!
  readers: [Reader!]!
  zones: [Zone!]!
  portals: [Portal!]!
  faults: [Fault!]!
  eventTypes: [EventType]!
  authorization: Authorization
  resource: Resource
}

# ============ INPUT TYPES ============

input ControllerInfo {
  globalControllerIdentifier: String!
  apiUrl: String!
  subscriptionUrl: String!
  apiUser: String
  apiPassword: String
  token: String
}

input InputSchedulerPeriod {
  day: DayOfWeek!
  start: String!
  end: String!
}

input InputUpdateScheduler {
  vid: ID!
  name: String!
  periods: [InputSchedulerPeriod!]!
}

input InputUpdateSpecialDay {
  date: String!
  day: DayOfWeek!
}

input InputPortalAuth {
  portalId: ID!
  schedulerId: ID
}

input InputZoneAuth {
  zoneId: ID!
  schedulerId: ID
  arm: Boolean!
  disarm: Boolean!
  test: Boolean!
}

input InputUpdateAccessLevel {
  id: ID!
  name: String!
  portalAuths: [InputPortalAuth!]!
  zoneAuths: [InputZoneAuth!]!
}

input InputUpdateUser {
  name: String!
  credential: String!
  expire: String
  restore: Boolean!
  override: Boolean!
  accesLevelIds: [ID!]
}

input InputUpdateAuthorization {
  globalControllerIdentifier: String
  targetControllerUrl: String
  schedulers: [InputUpdateScheduler!]!
  derogations: [InputUpdateSpecialDay!]!
  accessLevels: [InputUpdateAccessLevel!]!
  users: [InputUpdateUser!]!
}

# ============ CUSTOM INPUTS (for testing) ============

input PointInput {
  id: String!
  name: String!
  type: String!
  family: String!
  valueType: ValueType!
  value: String!
}

# ============ QUERY ============

type Query {
  echo: String!
  configuration(apiUrl: String): Configuration
  allControllers: [String]
}

# ============ MUTATION ============

type Mutation {
  # Authorization
  updateAuthorization(controllerInfo: ControllerInfo, input: InputUpdateAuthorization): Boolean
  setControllerGlobalIdentifier(controllerInfo: ControllerInfo!): Boolean
  
  # Zone control
  controlZone(controllerInfo: ControllerInfo!, zoneId: Int!, override: ControlZoneResult, operatorId: Int!): ControlZoneResult
  restoreZone(controllerInfo: ControllerInfo!, zoneId: Int!, operatorId: Int!): RestoreAlarmResult
  testZone(controllerInfo: ControllerInfo!, zoneId: Int!, operatorId: Int!): TestZoneResult
  blockZone(controllerInfo: ControllerInfo!, zoneId: Int!, operatorId: Int!): BlockZoneResult
  blockZoneSensor(controllerInfo: ControllerInfo!, sensorId: Int!, operatorId: Int!): BlockZoneSensorResult
  unblockZoneSensor(controllerInfo: ControllerInfo!, sensorId: Int!, operatorId: Int!): UnblockZoneSensorResult
  
  # Portal control
  releasePortal(controllerInfo: ControllerInfo!, portalId: Int!, operatorId: Int!): ReleasePortalResult
  emergencyPortal(controllerInfo: ControllerInfo!, portalId: Int!, operatorId: Int!): EmergencyPortalResult
  restorePortal(controllerInfo: ControllerInfo!, portalId: Int!, operatorId: Int!): RestorePortalResult
  
  # Antipassback
  suspendAntipassback(controllerInfo: ControllerInfo!, operatorId: Int!): ManageAntipassbackResult
  resumeAntipassback(controllerInfo: ControllerInfo!, operatorId: Int!): ManageAntipassbackResult
  reactivateAntipassback(controllerInfo: ControllerInfo!, credential: String, operatorId: Int!): ReactivateAntipassbackResult
  
  # Custom mutations for testing
  createPoint(input: PointInput!): Point!
  updatePointValue(id: String!, value: String!): Point
  deletePoint(id: String!): Boolean!
}
`;

// ============================================================
// RESOLVERS
// ============================================================

const resolvers = {
  Query: {
    echo: () => `Virtual Controller OK - ${GLOBAL_ID} - ${ts()}`,
    
    configuration: (_, { apiUrl }) => {
      console.log(`[${ts()}] Query: configuration (apiUrl: ${apiUrl || 'none'})`);
      return {
        globalControllerIdentifier: data.globalControllerIdentifier,
        inputs: data.inputs,
        outputs: data.outputs,
        readers: data.readers,
        zones: data.zones,
        portals: data.portals,
        faults: data.faults,
        eventTypes: data.eventTypes,
        authorization: {
          derogations: data.derogations,
          schedulers: data.schedulers,
          accessLevels: data.accessLevels,
          users: data.users
        },
        resource: {
          points: data.points,
          groups: data.groups
        }
      };
    },
    
    allControllers: () => [GLOBAL_ID]
  },
  
  Mutation: {
    updateAuthorization: (_, { controllerInfo, input }) => {
      console.log(`[${ts()}] Mutation: updateAuthorization`);
      // TODO: implement
      return true;
    },
    
    setControllerGlobalIdentifier: (_, { controllerInfo }) => {
      console.log(`[${ts()}] Mutation: setControllerGlobalIdentifier -> ${controllerInfo.globalControllerIdentifier}`);
      data.globalControllerIdentifier = controllerInfo.globalControllerIdentifier;
      return true;
    },
    
    // Zone control
    controlZone: (_, { controllerInfo, zoneId, override, operatorId }) => {
      console.log(`[${ts()}] Mutation: controlZone (zoneId: ${zoneId}, operator: ${operatorId})`);
      const zone = data.zones.find(z => z.id === zoneId);
      if (!zone) return 'UNKNOWN';
      
      const content = JSON.parse(zone.content || '{}');
      content.armed = !content.armed;
      zone.content = JSON.stringify(content);
      
      return content.armed ? 'ZONE_ARMED' : 'ZONE_DISARMED';
    },
    
    restoreZone: (_, { zoneId }) => {
      console.log(`[${ts()}] Mutation: restoreZone (zoneId: ${zoneId})`);
      return 'RESTORED';
    },
    
    testZone: (_, { zoneId }) => {
      console.log(`[${ts()}] Mutation: testZone (zoneId: ${zoneId})`);
      return 'STARTED';
    },
    
    blockZone: (_, { zoneId }) => {
      console.log(`[${ts()}] Mutation: blockZone (zoneId: ${zoneId})`);
      return 'BLOCKED';
    },
    
    blockZoneSensor: (_, { sensorId }) => {
      console.log(`[${ts()}] Mutation: blockZoneSensor (sensorId: ${sensorId})`);
      return 'BLOCKED';
    },
    
    unblockZoneSensor: (_, { sensorId }) => {
      console.log(`[${ts()}] Mutation: unblockZoneSensor (sensorId: ${sensorId})`);
      return 'UNBLOCKED';
    },
    
    // Portal control
    releasePortal: (_, { portalId }) => {
      console.log(`[${ts()}] Mutation: releasePortal (portalId: ${portalId})`);
      return 'RELEASED';
    },
    
    emergencyPortal: (_, { portalId }) => {
      console.log(`[${ts()}] Mutation: emergencyPortal (portalId: ${portalId})`);
      return 'DONE';
    },
    
    restorePortal: (_, { portalId }) => {
      console.log(`[${ts()}] Mutation: restorePortal (portalId: ${portalId})`);
      return 'RESTORED';
    },
    
    // Antipassback
    suspendAntipassback: () => {
      console.log(`[${ts()}] Mutation: suspendAntipassback`);
      return 'SUSPENDED';
    },
    
    resumeAntipassback: () => {
      console.log(`[${ts()}] Mutation: resumeAntipassback`);
      return 'RESUMED';
    },
    
    reactivateAntipassback: () => {
      console.log(`[${ts()}] Mutation: reactivateAntipassback`);
      return 'REACTIVATED';
    },
    
    // Custom - Points management
    createPoint: (_, { input }) => {
      console.log(`[${ts()}] Mutation: createPoint (id: ${input.id}, name: ${input.name})`);
      const point = { ...input, created: ts() };
      data.points.push(point);
      return point;
    },
    
    updatePointValue: (_, { id, value }) => {
      console.log(`[${ts()}] Mutation: updatePointValue (id: ${id}, value: ${value})`);
      const point = data.points.find(p => p.id === id);
      if (point) {
        point.value = value;
        point.created = ts();
      }
      return point;
    },
    
    deletePoint: (_, { id }) => {
      console.log(`[${ts()}] Mutation: deletePoint (id: ${id})`);
      const idx = data.points.findIndex(p => p.id === id);
      if (idx >= 0) {
        data.points.splice(idx, 1);
        return true;
      }
      return false;
    }
  }
};

// ============================================================
// START SERVER
// ============================================================

async function start() {
  init();
  
  const app = express();
  const server = new ApolloServer({ typeDefs, resolvers });
  
  await server.start();
  
  // Multiple endpoints for compatibility
  app.use(cors());
  app.use(express.json());
  
  // GraphQL endpoints
  app.use('/graphql', expressMiddleware(server));
  app.use('/api/graphql.php', expressMiddleware(server));  // PHP-style endpoint
  
  // Health check
  app.get('/health', (req, res) => res.json({ status: 'ok', id: GLOBAL_ID }));
  
  // Info endpoint
  app.get('/', (req, res) => res.json({
    name: 'Belbuk Virtual Controller',
    version: '1.0.0',
    globalControllerIdentifier: GLOBAL_ID,
    endpoints: {
      graphql: '/graphql',
      graphqlPhp: '/api/graphql.php',
      health: '/health'
    }
  }));
  
  app.listen(PORT, () => {
    console.log('');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('  BELBUK VIRTUAL CONTROLLER');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`  Global ID:    ${GLOBAL_ID}`);
    console.log(`  Port:         ${PORT}`);
    console.log('');
    console.log('  Endpoints:');
    console.log(`    GraphQL:    http://localhost:${PORT}/graphql`);
    console.log(`    PHP-style:  http://localhost:${PORT}/api/graphql.php`);
    console.log(`    Health:     http://localhost:${PORT}/health`);
    console.log('');
    console.log('  Example queries:');
    console.log('    query { configuration { resource { points { id name value } } } }');
    console.log('    query { configuration { zones { id name } } }');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('');
  });
}

start();

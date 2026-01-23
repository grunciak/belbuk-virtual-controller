// Dane testowe konfiguracji wirtualnego sterownika - zgodne z Belbuk API

export const GLOBAL_ID = 'VC-2024-BELBUK-001';

// ==================== KONFIGURACJA SPRZĘTOWA ====================

export const inputs = [
  { id: 1, name: 'PIR Hol główny' },
  { id: 2, name: 'PIR Korytarz parter' },
  { id: 3, name: 'PIR Biuro 1' },
  { id: 4, name: 'PIR Biuro 2' },
  { id: 5, name: 'Kontaktron drzwi główne' },
  { id: 6, name: 'Kontaktron drzwi techniczne' },
  { id: 7, name: 'Kontaktron okno biuro 1' },
  { id: 8, name: 'Kontaktron okno biuro 2' },
  { id: 9, name: 'Przycisk paniki recepcja' },
  { id: 10, name: 'Przycisk RTE wejście' },
  { id: 11, name: 'Czujnik dymu hol' },
  { id: 12, name: 'Czujnik dymu korytarz' },
];

export const outputs = [
  { id: 1, name: 'Sygnalizator zewnętrzny' },
  { id: 2, name: 'Sygnalizator wewnętrzny' },
  { id: 3, name: 'Elektrozamek drzwi główne' },
  { id: 4, name: 'Elektrozamek drzwi techniczne' },
  { id: 5, name: 'Oświetlenie alarmowe' },
  { id: 6, name: 'Przekaźnik powiadomienia' },
];

export const readers = [
  { id: 1, name: 'Czytnik wejście główne' },
  { id: 2, name: 'Czytnik wyjście główne' },
  { id: 3, name: 'Czytnik serwerownia' },
  { id: 4, name: 'Czytnik biuro kierownika' },
];

// Zone content jako JSON string
const zoneContent1 = JSON.stringify({
  controls: [{ id: 1, name: 'Panel główny' }],
  detectors: [
    { input: { id: 1, name: 'PIR Hol główny' }, entryTime: 30, exitTime: 60 },
    { input: { id: 5, name: 'Kontaktron drzwi główne' }, entryTime: 30, exitTime: 60 },
  ],
  alarms: [
    { output: { id: 1, name: 'Sygnalizator zewnętrzny' }, time: 180 },
    { output: { id: 2, name: 'Sygnalizator wewnętrzny' }, time: 30 },
  ],
});

const zoneContent2 = JSON.stringify({
  controls: [{ id: 1, name: 'Panel główny' }],
  detectors: [
    { input: { id: 2, name: 'PIR Korytarz parter' }, entryTime: 0, exitTime: 0 },
    { input: { id: 3, name: 'PIR Biuro 1' }, entryTime: 0, exitTime: 0 },
    { input: { id: 4, name: 'PIR Biuro 2' }, entryTime: 0, exitTime: 0 },
    { input: { id: 7, name: 'Kontaktron okno biuro 1' }, entryTime: 0, exitTime: 0 },
    { input: { id: 8, name: 'Kontaktron okno biuro 2' }, entryTime: 0, exitTime: 0 },
  ],
  alarms: [
    { output: { id: 1, name: 'Sygnalizator zewnętrzny' }, time: 300 },
    { output: { id: 5, name: 'Oświetlenie alarmowe' }, time: 600 },
  ],
});

const zoneContent3 = JSON.stringify({
  controls: [{ id: 1, name: 'Panel główny' }],
  detectors: [
    { input: { id: 9, name: 'Przycisk paniki recepcja' }, entryTime: 0, exitTime: 0 },
    { input: { id: 11, name: 'Czujnik dymu hol' }, entryTime: 0, exitTime: 0 },
    { input: { id: 12, name: 'Czujnik dymu korytarz' }, entryTime: 0, exitTime: 0 },
  ],
  alarms: [
    { output: { id: 1, name: 'Sygnalizator zewnętrzny' }, time: 0 },
    { output: { id: 6, name: 'Przekaźnik powiadomienia' }, time: 0 },
  ],
});

export const zones = [
  { id: 1, name: 'Strefa dzienna', content: zoneContent1 },
  { id: 2, name: 'Strefa nocna', content: zoneContent2 },
  { id: 3, name: 'Strefa 24h', content: zoneContent3 },
];

// Portal content jako JSON string
const portalContent1 = JSON.stringify({
  entry: { id: 1, name: 'Czytnik wejście główne' },
  exit: { id: 2, name: 'Czytnik wyjście główne' },
  button: { id: 10, name: 'Przycisk RTE wejście' },
  locking: { id: 3, name: 'Elektrozamek drzwi główne' },
  sensor: { id: 5, name: 'Kontaktron drzwi główne' },
  release: 5,
  emergencies: [],
});

const portalContent2 = JSON.stringify({
  entry: { id: 3, name: 'Czytnik serwerownia' },
  exit: { id: 3, name: 'Czytnik serwerownia' },
  button: { id: 10, name: 'Przycisk RTE wejście' },
  locking: { id: 4, name: 'Elektrozamek drzwi techniczne' },
  sensor: { id: 6, name: 'Kontaktron drzwi techniczne' },
  release: 3,
  emergencies: [],
});

const portalContent3 = JSON.stringify({
  entry: { id: 4, name: 'Czytnik biuro kierownika' },
  exit: { id: 4, name: 'Czytnik biuro kierownika' },
  button: { id: 9, name: 'Przycisk paniki recepcja' },
  locking: { id: 5, name: 'Oświetlenie alarmowe' },
  sensor: { id: 7, name: 'Kontaktron okno biuro 1' },
  release: 5,
  emergencies: [],
});

export const portals = [
  { id: 1, name: 'Wejście główne', content: portalContent1 },
  { id: 2, name: 'Drzwi techniczne', content: portalContent2 },
  { id: 3, name: 'Biuro kierownika', content: portalContent3 },
];

export const faults = [];

export const eventTypes = [
  { code: 100, symbol: 'ARM', desc: 'Uzbrojenie strefy' },
  { code: 101, symbol: 'DISARM', desc: 'Rozbrojenie strefy' },
  { code: 102, symbol: 'ARM_PARTIAL', desc: 'Częściowe uzbrojenie strefy' },
  { code: 110, symbol: 'TEST_START', desc: 'Rozpoczęcie testu strefy' },
  { code: 111, symbol: 'TEST_END', desc: 'Zakończenie testu strefy' },
  { code: 120, symbol: 'ZONE_BLOCKED', desc: 'Zablokowanie strefy' },
  { code: 121, symbol: 'ZONE_UNBLOCKED', desc: 'Odblokowanie strefy' },
  { code: 200, symbol: 'ALARM', desc: 'Alarm włamaniowy' },
  { code: 201, symbol: 'ALARM_RESTORE', desc: 'Koniec alarmu' },
  { code: 210, symbol: 'PANIC', desc: 'Alarm napadowy' },
  { code: 220, symbol: 'FIRE', desc: 'Alarm pożarowy' },
  { code: 300, symbol: 'ACCESS_GRANTED', desc: 'Dostęp przyznany' },
  { code: 301, symbol: 'ACCESS_DENIED', desc: 'Dostęp odmówiony' },
  { code: 302, symbol: 'DOOR_FORCED', desc: 'Wyważenie drzwi' },
  { code: 303, symbol: 'DOOR_HELD', desc: 'Drzwi zbyt długo otwarte' },
  { code: 310, symbol: 'PORTAL_RELEASED', desc: 'Przejście odblokowane' },
  { code: 311, symbol: 'PORTAL_EMERGENCY', desc: 'Tryb awaryjny przejścia' },
  { code: 312, symbol: 'PORTAL_RESTORED', desc: 'Przywrócenie przejścia' },
  { code: 400, symbol: 'FAULT', desc: 'Usterka' },
  { code: 401, symbol: 'FAULT_RESTORE', desc: 'Koniec usterki' },
  { code: 410, symbol: 'MAINS_FAIL', desc: 'Awaria zasilania' },
  { code: 411, symbol: 'MAINS_RESTORE', desc: 'Przywrócenie zasilania' },
  { code: 420, symbol: 'BATTERY_LOW', desc: 'Niski poziom akumulatora' },
  { code: 421, symbol: 'BATTERY_RESTORE', desc: 'Akumulator naładowany' },
  { code: 500, symbol: 'TAMPER', desc: 'Sabotaż' },
  { code: 501, symbol: 'TAMPER_RESTORE', desc: 'Koniec sabotażu' },
];

// ==================== AUTORYZACJA ====================

export const schedulers = [
  {
    id: '1',
    name: 'Godziny pracy',
    periods: [
      { day: 'MONDAY', start: '08:00', end: '18:00' },
      { day: 'TUESDAY', start: '08:00', end: '18:00' },
      { day: 'WEDNESDAY', start: '08:00', end: '18:00' },
      { day: 'THURSDAY', start: '08:00', end: '18:00' },
      { day: 'FRIDAY', start: '08:00', end: '16:00' },
    ],
  },
  {
    id: '2',
    name: 'Cała doba',
    periods: [
      { day: 'SUNDAY', start: '00:00', end: '23:59' },
      { day: 'MONDAY', start: '00:00', end: '23:59' },
      { day: 'TUESDAY', start: '00:00', end: '23:59' },
      { day: 'WEDNESDAY', start: '00:00', end: '23:59' },
      { day: 'THURSDAY', start: '00:00', end: '23:59' },
      { day: 'FRIDAY', start: '00:00', end: '23:59' },
      { day: 'SATURDAY', start: '00:00', end: '23:59' },
    ],
  },
  {
    id: '3',
    name: 'Dyżury nocne',
    periods: [
      { day: 'MONDAY', start: '18:00', end: '23:59' },
      { day: 'TUESDAY', start: '18:00', end: '23:59' },
      { day: 'WEDNESDAY', start: '18:00', end: '23:59' },
      { day: 'THURSDAY', start: '18:00', end: '23:59' },
    ],
  },
];

export const derogations = [
  { id: '1', date: '2025-01-01', day: 'SATURDAY' },
  { id: '2', date: '2025-01-06', day: 'SATURDAY' },
  { id: '3', date: '2025-05-01', day: 'SATURDAY' },
  { id: '4', date: '2025-05-03', day: 'SATURDAY' },
  { id: '5', date: '2025-12-25', day: 'SATURDAY' },
  { id: '6', date: '2025-12-26', day: 'SATURDAY' },
];

export const accessLevels = [
  {
    id: '1',
    name: 'Pełny dostęp',
    zoneAuths: zones.map(z => ({
      zone: z,
      scheduler: schedulers[1],
      arm: true,
      disarm: true,
      test: true,
    })),
    portalAuths: portals.map(p => ({
      portal: p,
      scheduler: schedulers[1],
    })),
  },
  {
    id: '2',
    name: 'Dostęp pracowniczy',
    zoneAuths: [
      {
        zone: zones[0],
        scheduler: schedulers[0],
        arm: true,
        disarm: true,
        test: false,
      },
    ],
    portalAuths: [
      { portal: portals[0], scheduler: schedulers[0] },
    ],
  },
  {
    id: '3',
    name: 'Dostęp techniczny',
    zoneAuths: [],
    portalAuths: [
      { portal: portals[1], scheduler: schedulers[1] },
    ],
  },
];

export const users = [
  {
    id: '1',
    name: 'Administrator',
    credential: '1234567890',
    expire: '2026-12-31',
    restore: true,
    override: true,
    accessLevelIds: ['1'],
  },
  {
    id: '2',
    name: 'Jan Kowalski',
    credential: '0987654321',
    expire: '2025-12-31',
    restore: false,
    override: false,
    accessLevelIds: ['2'],
  },
  {
    id: '3',
    name: 'Anna Nowak',
    credential: '1122334455',
    expire: '2025-12-31',
    restore: false,
    override: false,
    accessLevelIds: ['2'],
  },
  {
    id: '4',
    name: 'Serwisant',
    credential: '5566778899',
    expire: '2025-06-30',
    restore: false,
    override: false,
    accessLevelIds: ['3'],
  },
];

// ==================== RESOURCE ====================

export const points = [
  { id: 'TEMP_HOL', name: 'Temperatura hol', type: 'TEMP', family: 'ANALOG', valueType: 'FLOAT', value: '21.5' },
  { id: 'TEMP_BIURO1', name: 'Temperatura biuro 1', type: 'TEMP', family: 'ANALOG', valueType: 'FLOAT', value: '22.0' },
  { id: 'TEMP_SERW', name: 'Temperatura serwerownia', type: 'TEMP', family: 'ANALOG', valueType: 'FLOAT', value: '18.5' },
  { id: 'HUM_HOL', name: 'Wilgotność hol', type: 'HUM', family: 'ANALOG', valueType: 'FLOAT', value: '45.0' },
  { id: 'CO2_BIURO1', name: 'CO2 biuro 1', type: 'CO2', family: 'ANALOG', valueType: 'FLOAT', value: '420.0' },
  { id: 'PWR_OK', name: 'Zasilanie OK', type: 'STATUS', family: 'DIGITAL', valueType: 'BOOLEAN', value: 'true' },
  { id: 'MAINS', name: 'Zasilanie sieciowe', type: 'BINARY', family: 'DIGITAL', valueType: 'BOOLEAN', value: 'true' },
  { id: 'BATT_LEVEL', name: 'Poziom akumulatora', type: 'PERCENT', family: 'ANALOG', valueType: 'FLOAT', value: '98.0' },
  { id: 'BATT_VOLT', name: 'Napięcie akumulatora', type: 'VOLTAGE', family: 'ANALOG', valueType: 'FLOAT', value: '13.8' },
];

export const groups = [
  {
    id: 'ENV',
    name: 'Parametry środowiskowe',
    leader: null,
    points: points.filter(p => ['TEMP_HOL', 'TEMP_BIURO1', 'TEMP_SERW', 'HUM_HOL', 'CO2_BIURO1'].includes(p.id)),
    childGroups: [],
  },
  {
    id: 'POWER',
    name: 'Zasilanie',
    leader: points.find(p => p.id === 'PWR_OK'),
    points: points.filter(p => ['MAINS', 'BATT_LEVEL', 'BATT_VOLT'].includes(p.id)),
    childGroups: [],
  },
];

// ==================== EKSPORT KONFIGURACJI ====================

export const authorization = {
  derogations,
  schedulers,
  accessLevels,
  users,
};

export const resource = {
  points,
  groups,
};

export const configuration = {
  globalControllerIdentifier: GLOBAL_ID,
  inputs,
  outputs,
  readers,
  zones,
  portals,
  faults,
  eventTypes,
  authorization,
  resource,
};

// Aliasy dla kompatybilności z istniejącym kodem
export const SITE_ID = GLOBAL_ID;
export const specialDays = derogations;
export const pointGroups = groups;
export { eventTypes as events };

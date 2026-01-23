// Dane testowe konfiguracji wirtualnego sterownika Belbuk

export const SITE_ID = 'VC-2024-BELBUK-001';

// ==================== KONFIGURACJA SPRZĘTOWA ====================

export const inputs = [
  { id: '1', name: 'PIR Hol główny' },
  { id: '2', name: 'PIR Korytarz parter' },
  { id: '3', name: 'PIR Biuro 1' },
  { id: '4', name: 'PIR Biuro 2' },
  { id: '5', name: 'Kontaktron drzwi główne' },
  { id: '6', name: 'Kontaktron drzwi techniczne' },
  { id: '7', name: 'Kontaktron okno biuro 1' },
  { id: '8', name: 'Kontaktron okno biuro 2' },
  { id: '9', name: 'Przycisk paniki recepcja' },
  { id: '10', name: 'Przycisk RTE wejście' },
  { id: '11', name: 'Czujnik dymu hol' },
  { id: '12', name: 'Czujnik dymu korytarz' },
];

export const outputs = [
  { id: '1', name: 'Sygnalizator zewnętrzny' },
  { id: '2', name: 'Sygnalizator wewnętrzny' },
  { id: '3', name: 'Elektrozamek drzwi główne' },
  { id: '4', name: 'Elektrozamek drzwi techniczne' },
  { id: '5', name: 'Oświetlenie alarmowe' },
  { id: '6', name: 'Przekaźnik powiadomienia' },
];

export const readers = [
  { id: '1', name: 'Czytnik wejście główne' },
  { id: '2', name: 'Czytnik wyjście główne' },
  { id: '3', name: 'Czytnik serwerownia' },
  { id: '4', name: 'Czytnik biuro kierownika' },
];

export const zones = [
  {
    id: '1',
    name: 'Strefa dzienna',
    controls: [{ id: '1', name: 'Czytnik wejście główne' }],
    detectors: [
      { input: { id: '1', name: 'PIR Hol główny' }, entryTime: 30, exitTime: 60 },
      { input: { id: '5', name: 'Kontaktron drzwi główne' }, entryTime: 30, exitTime: 60 },
    ],
    alarms: [
      { output: { id: '1', name: 'Sygnalizator zewnętrzny' }, time: 180 },
      { output: { id: '2', name: 'Sygnalizator wewnętrzny' }, time: 30 },
    ],
  },
  {
    id: '2',
    name: 'Strefa nocna',
    controls: [{ id: '1', name: 'Czytnik wejście główne' }],
    detectors: [
      { input: { id: '2', name: 'PIR Korytarz parter' }, entryTime: 0, exitTime: 0 },
      { input: { id: '3', name: 'PIR Biuro 1' }, entryTime: 0, exitTime: 0 },
      { input: { id: '4', name: 'PIR Biuro 2' }, entryTime: 0, exitTime: 0 },
      { input: { id: '7', name: 'Kontaktron okno biuro 1' }, entryTime: 0, exitTime: 0 },
      { input: { id: '8', name: 'Kontaktron okno biuro 2' }, entryTime: 0, exitTime: 0 },
    ],
    alarms: [
      { output: { id: '1', name: 'Sygnalizator zewnętrzny' }, time: 300 },
      { output: { id: '5', name: 'Oświetlenie alarmowe' }, time: 600 },
    ],
  },
  {
    id: '3',
    name: 'Strefa 24h',
    controls: [{ id: '1', name: 'Czytnik wejście główne' }],
    detectors: [
      { input: { id: '9', name: 'Przycisk paniki recepcja' }, entryTime: 0, exitTime: 0 },
      { input: { id: '11', name: 'Czujnik dymu hol' }, entryTime: 0, exitTime: 0 },
      { input: { id: '12', name: 'Czujnik dymu korytarz' }, entryTime: 0, exitTime: 0 },
    ],
    alarms: [
      { output: { id: '1', name: 'Sygnalizator zewnętrzny' }, time: 0 },
      { output: { id: '6', name: 'Przekaźnik powiadomienia' }, time: 0 },
    ],
  },
];

export const portals = [
  {
    id: '1',
    name: 'Wejście główne',
    entry: { id: '1', name: 'Czytnik wejście główne' },
    exit: { id: '2', name: 'Czytnik wyjście główne' },
    button: { id: '10', name: 'Przycisk RTE wejście' },
    locking: { id: '3', name: 'Elektrozamek drzwi główne' },
    sensor: { id: '5', name: 'Kontaktron drzwi główne' },
    release: 5,
    emergencies: [],
  },
  {
    id: '2',
    name: 'Drzwi techniczne',
    entry: { id: '3', name: 'Czytnik serwerownia' },
    exit: { id: '3', name: 'Czytnik serwerownia' },
    button: { id: '10', name: 'Przycisk RTE wejście' },
    locking: { id: '4', name: 'Elektrozamek drzwi techniczne' },
    sensor: { id: '6', name: 'Kontaktron drzwi techniczne' },
    release: 3,
    emergencies: [],
  },
  {
    id: '3',
    name: 'Biuro kierownika',
    entry: { id: '4', name: 'Czytnik biuro kierownika' },
    exit: { id: '4', name: 'Czytnik biuro kierownika' },
    button: { id: '9', name: 'Przycisk paniki recepcja' },
    locking: { id: '5', name: 'Oświetlenie alarmowe' },
    sensor: { id: '7', name: 'Kontaktron okno biuro 1' },
    release: 5,
    emergencies: [],
  },
];

export const faults = [];

export const events = [
  { code: 100, symbol: 'ARM', desc: 'Uzbrojenie strefy' },
  { code: 101, symbol: 'DISARM', desc: 'Rozbrojenie strefy' },
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
  { code: 500, symbol: 'TAMPER', desc: 'Sabotaż' },
  { code: 501, symbol: 'TAMPER_RESTORE', desc: 'Koniec sabotażu' },
];

// ==================== AUTORYZACJA ====================

export const schedulers = [
  {
    id: 1,
    name: 'Godziny pracy',
    periods: [
      { day: 1, start: '08:00', end: '18:00' },
      { day: 2, start: '08:00', end: '18:00' },
      { day: 3, start: '08:00', end: '18:00' },
      { day: 4, start: '08:00', end: '18:00' },
      { day: 5, start: '08:00', end: '16:00' },
    ],
  },
  {
    id: 2,
    name: 'Cała doba',
    periods: [
      { day: 0, start: '00:00', end: '23:59' },
      { day: 1, start: '00:00', end: '23:59' },
      { day: 2, start: '00:00', end: '23:59' },
      { day: 3, start: '00:00', end: '23:59' },
      { day: 4, start: '00:00', end: '23:59' },
      { day: 5, start: '00:00', end: '23:59' },
      { day: 6, start: '00:00', end: '23:59' },
    ],
  },
];

export const derogations = [
  { id: 1, date: '2025-01-01', day: 6 },
  { id: 2, date: '2025-01-06', day: 6 },
  { id: 3, date: '2025-05-01', day: 6 },
  { id: 4, date: '2025-05-03', day: 6 },
  { id: 5, date: '2025-12-25', day: 6 },
  { id: 6, date: '2025-12-26', day: 6 },
];

export const accessLevels = [
  {
    id: 1,
    name: 'Pełny dostęp',
    zones: zones.map(z => ({
      zone: z,
      scheduler: schedulers[1],
      arm: true,
      disarm: true,
      test: true,
    })),
    portals: portals.map(p => ({
      portal: p,
      scheduler: schedulers[1],
    })),
  },
  {
    id: 2,
    name: 'Dostęp pracowniczy',
    zones: [
      {
        zone: zones[0],
        scheduler: schedulers[0],
        arm: true,
        disarm: true,
        test: false,
      },
    ],
    portals: [
      { portal: portals[0], scheduler: schedulers[0] },
    ],
  },
];

export const users = [
  {
    id: 1,
    name: 'Administrator',
    credential: { card: '1234567890', pin: '1234' },
    expire: '2026-12-31',
    restore: true,
    override: true,
    access: [accessLevels[0]],
  },
  {
    id: 2,
    name: 'Jan Kowalski',
    credential: { card: '0987654321', pin: '5678' },
    expire: '2025-12-31',
    restore: false,
    override: false,
    access: [accessLevels[1]],
  },
];

// ==================== RESOURCE ====================

export const points = [
  { id: 'TEMP_HOL', name: 'Temperatura hol', type: 'TEMP', family: 'ANALOG', created: new Date().toISOString(), value: { type: 'FLOAT', value: '21.5' } },
  { id: 'TEMP_BIURO1', name: 'Temperatura biuro 1', type: 'TEMP', family: 'ANALOG', created: new Date().toISOString(), value: { type: 'FLOAT', value: '22.0' } },
  { id: 'PWR_OK', name: 'Zasilanie OK', type: 'STATUS', family: 'DIGITAL', created: new Date().toISOString(), value: { type: 'BOOLEAN', value: 'true' } },
];

export const groups = [
  {
    id: 'ENV',
    name: 'Parametry środowiskowe',
    leader: null,
    points: points.filter(p => p.type === 'TEMP'),
    groups: [],
  },
  {
    id: 'POWER',
    name: 'Zasilanie',
    leader: points.find(p => p.id === 'PWR_OK'),
    points: [],
    groups: [],
  },
];

// ==================== EKSPORT KONFIGURACJI ====================

export const configuration = {
  site: SITE_ID,
  inputs,
  outputs,
  readers,
  zones,
  portals,
  faults,
  events,
};

export const authorization = {
  schedulers,
  derogations,
  access: accessLevels,
  users,
};

export const resource = {
  points,
  groups,
};

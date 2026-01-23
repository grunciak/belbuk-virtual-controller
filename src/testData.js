// Minimalna konfiguracja testowa

export const SITE_ID = 'VC-001';

export const inputs = [
  { id: '1', name: 'Wejście 1' },
];

export const outputs = [
  { id: '1', name: 'Wyjście 1' },
];

export const readers = [
  { id: '1', name: 'Czytnik 1' },
];

export const zones = [
  {
    id: '1',
    name: 'Strefa 1',
    controls: [],
    detectors: [],
    alarms: [],
  },
];

export const portals = [
  {
    id: '1',
    name: 'Przejście 1',
    entry: { id: '1', name: 'Czytnik 1' },
    exit: null,
    button: null,
    locking: { id: '1', name: 'Wyjście 1' },
    sensor: { id: '1', name: 'Wejście 1' },
    release: 5,
    emergencies: [],
  },
];

export const faults = [];

export const events = [
  { code: 100, symbol: 'ARM', desc: 'Uzbrojenie' },
];

// Puste
export const schedulers = [];
export const derogations = [];
export const accessLevels = [];
export const users = [];
export const points = [];
export const groups = [];

// Eksport
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

// Offline stop list. x/y place each stop on the pick-on-map dialog (percent).
export const STOPS = [
  { id: 'ayala-bw', name: 'Ayala', line: 'EDSA Busway', mode: 'Bus', km: 4.2, min: 12, x: 60, y: 66 },
  { id: 'ayala-mrt', name: 'Ayala', line: 'MRT-3', mode: 'MRT/LRT', km: 4.0, min: 10, x: 52, y: 74 },
  { id: 'guadalupe-mrt', name: 'Guadalupe', line: 'MRT-3', mode: 'MRT/LRT', km: 2.6, min: 7, x: 72, y: 48 },
  { id: 'buendia-bw', name: 'Buendia', line: 'EDSA Busway', mode: 'Bus', km: 5.1, min: 15, x: 40, y: 82 },
  { id: 'ortigas-mrt', name: 'Ortigas', line: 'MRT-3', mode: 'MRT/LRT', km: 6.3, min: 16, x: 80, y: 32 },
  { id: 'cubao-mrt', name: 'Araneta Center-Cubao', line: 'MRT-3', mode: 'MRT/LRT', km: 9.8, min: 24, x: 74, y: 14 },
  { id: 'quiapo-jeep', name: 'Quiapo', line: 'Jeepney · Cubao–Quiapo', mode: 'Jeepney', km: 7.4, min: 28, x: 30, y: 30 },
  { id: 'up-diliman', name: 'UP Diliman', line: 'Jeepney · Philcoa–UP', mode: 'Jeepney', km: 12.5, min: 40, x: 88, y: 6 },
  { id: 'monumento-bw', name: 'Monumento', line: 'EDSA Busway', mode: 'Bus', km: 18, min: 55, x: 16, y: 10 },
  { id: 'pitx', name: 'PITX', line: 'EDSA Busway', mode: 'Bus', km: 9.5, min: 30, x: 20, y: 90 },
  { id: 'lucena', name: 'Lucena Grand Terminal', line: 'Provincial bus · JAC Liner', mode: 'Provincial bus', km: 135, min: 210 }
];

export const MODES = ['Bus', 'Jeepney', 'MRT/LRT', 'Provincial bus'];
export const TAG_KINDS = ['Wallet', 'Bag', 'Keys', 'Other'];

const rapid = Array.from({ length: 39 }, (_, i) => (i % 2 ? 50 : 90));

export const PATTERNS = [
  { id: 'stop10', title: 'Stop alert, 10 min', desc: 'Two gentle buzzes', felt: 'two gentle buzzes', vib: [200, 150, 200] },
  { id: 'stop5', title: 'Stop alert, 5 min', desc: 'Three stronger buzzes', felt: 'three stronger buzzes', vib: [400, 150, 400, 150, 400] },
  { id: 'stop1', title: 'Stop alert, 1 min', desc: 'Continuous until you tap', felt: 'continuous buzzing', vib: [1400] },
  { id: 'theft', title: 'Possible theft', desc: 'Rapid buzzing for 3 seconds', felt: 'rapid buzzing', vib: rapid },
  { id: 'left', title: 'Left behind', desc: 'Three long buzzes', felt: 'three long buzzes', vib: [700, 250, 700, 250, 700] },
  { id: 'battery', title: 'Low battery', desc: 'Two short buzzes', felt: 'two short buzzes', vib: [150, 150, 150] },
  { id: 'lost', title: 'Lost connection', desc: 'One long buzz', felt: 'one long buzz', vib: [1000] }
];

export const DEFAULT_ROUTES = [
  { id: 'r1', name: 'Home → School', stopId: 'up-diliman', mode: 'Bus', via: 'Bus', minutes: 90 },
  { id: 'r2', name: 'Work → Home', stopId: 'monumento-bw', mode: 'Bus', via: 'EDSA Busway', minutes: 55 }
];

export function seedLog() {
  const at = (daysAgo, h, m) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    d.setHours(h, m, 0, 0);
    return d.getTime();
  };
  return [
    { id: 's1', type: 'trip', title: 'Arrived at Ayala', detail: 'EDSA Busway · you were awake', at: at(1, 7, 48) },
    { id: 's2', type: 'alert', title: 'Stop alert, stage 2 of 3', detail: 'You tapped I’m awake at 7:43 AM', at: at(1, 7, 43) },
    { id: 's3', type: 'trip', title: 'Trip started to Ayala', detail: 'Bus · alerts at 10, 5 and 1 min', at: at(1, 7, 6) },
    { id: 's4', type: 'trip', title: 'Arrived at Monumento', detail: 'EDSA Busway · you were awake', at: at(3, 18, 52) },
    { id: 's5', type: 'alert', title: 'Wallet left behind', detail: 'You went back for it · Jollibee Cubao', at: at(4, 12, 20) },
    { id: 's6', type: 'trip', title: 'Arrived at UP Diliman', detail: 'Jeepney · no tap on the last alert', at: at(6, 8, 35) },
    { id: 's7', type: 'alert', title: 'Wristband battery low', detail: '15% left · charged overnight', at: at(9, 21, 10) },
    { id: 's8', type: 'trip', title: 'Arrived at Guadalupe', detail: 'MRT-3 · you were awake', at: at(12, 9, 2) }
  ];
}

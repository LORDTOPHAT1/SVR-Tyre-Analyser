// ============================================================
// TRACK + WEATHER DATA — SVR Season 3 Calendar
// ============================================================
const DRY_WEATHER = [
  'S01 | Dry, Cloudless and Pleasant',
  'S02 | Dry and Pleasant with a Few Clouds',
  'S03 | Dry, Cloudy and Pleasant',
  'S04 | Dry, Cloudy and Sunny',
  'S05 | Misty, Cloudless and Sunny',
  'S06 | Humid, Cloudless and Pleasant',
  'S07 | Humid and Pleasant with a Few Clouds',
  'S08 | Humid, Sunny and Cloudy',
  'S09 | Humid and Sunny with Lots of Clouds',
  'S10 | Misty and Sunny with Lots of Clouds',
  'S11 | Sunny with Alpine Mist',
  'S12 | Sunny with Lots of Monsoon Clouds',
  'S13 | Sunny with a Few Monsoon Clouds',
  'S14 | Sunny with Lots of Monsoon Clouds II (More Cloudy)',
  'S15 | Hazy, Cloudless and Pleasant',
  'S16 | Hazy and Sunny with a Few Clouds',
  'S17 | Hazy, Cloudy and Sunny',
  'S18 | Hazy, Cloudy and Sunny II (More Cloudy)',
  'C01 | Cloudy and Bright',
  'C02 | Cloudy and Warm',
  'C03 | Cloudy and Dark',
  'C04 | Cloudy and Chilly',
  'C05 | Cloudy',
  'C06 | Thick Clouds'
];

const RAIN_WEATHER = [
  'R01 | Light Drizzle',
  'R02 | Cloudless with Warm Rain',
  'R03 | Light Rain',
  'R04 | Cloudy with Rain',
  'R05 | Cloudy with Rain II (Blanket Cloud, No Individual Clouds)',
  'R06 | Thick Cloud with Rain',
  'R07 | Cloudy with Torrential Rain',
  'R08 | Thick Cloud with Torrential Rain'
];

const TRACKS = [
  { name: 'Alsace - Village', rain: false },
  { name: 'Autodromo de Interlagos', rain: false },
  { name: 'Autodromo Nazionale Monza', rain: false },
  { name: 'Autopolis International Racing Course', rain: true },
  { name: 'Brands Hatch Grand Prix Circuit', rain: false },
  { name: 'Circuit de Barcelona-Catalunya GP Layout No Chicane', rain: false },
  { name: 'Circuit de Spa-Francorchamps', rain: true },
  { name: 'Circuit de Spa-Francorchamps 24h Layout', rain: true },
  { name: 'Circuit Gilles Villeneuve', rain: false },
  { name: 'Daytona Road Course', rain: false },
  { name: 'Fuji International Speedway', rain: true },
  { name: 'Michelin Raceway Road Atlanta', rain: false },
  { name: 'Mount Panorama Motor Racing Circuit', rain: false },
  { name: 'Nurburgring 24h', rain: true },
  { name: 'Nurburgring GP', rain: true },
  { name: 'Red Bull Ring', rain: true },
  { name: 'Sardegna - Road Track - B Reverse', rain: false },
  { name: 'Suzuka Circuit', rain: true },
  { name: 'Tokyo Expressway - South Counterclockwise', rain: true },
  { name: 'Watkins Glen Long Course', rain: false },
  { name: 'WeatherTech Raceway Laguna Seca', rain: false },
  { name: 'Yas Marina Circuit', rain: false }
];

// ============================================================
// PIXEL COORDINATES — calibrated from PS5 4K (3840x2160)
// ============================================================
const REGIONS_4K = {
  fl: { x: 692, y: 1920, w: 24, h: 72 },
  fr: { x: 860, y: 1920, w: 24, h: 72 },
  rl: { x: 692, y: 2028, w: 24, h: 72 },
  rr: { x: 860, y: 2028, w: 24, h: 72 }
};
const FULL_PIXELS = 1728;
const TYRE_KEYS = ['fl','fr','rl','rr'];
const TYRE_LABELS = { fl:'Front Left', fr:'Front Right', rl:'Rear Left', rr:'Rear Right' };
const TYRE_COLORS = { fl:'var(--fl)', fr:'var(--fr)', rl:'var(--rl)', rr:'var(--rr)' };

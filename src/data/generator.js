/**
 * NETLOAD: THE STATISTICAL OBSERVATORY
 * Data Generator, Presets & CSV Interface
 * 
 * Generates synthetic network load observations (timestamp, load_mbps).
 * Clearly marked as simulated scientific data for micro-project validation.
 */

export { CAMPUS_DATASETS } from './campusTrafficData.js';

// Box-Muller transform for generating standard normal random numbers
function generateStandardNormal(randomFunc = Math.random) {
  let u = 0, v = 0;
  while (u === 0) u = randomFunc();
  while (v === 0) v = randomFunc();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

// Pseudo-random seeded generator for reproducible demonstration data
function createSeededRandom(seed = 12345) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return function() {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/**
 * Format date string ISO to clean readable timestamp
 */
function formatTimestamp(baseDate, offsetMinutes) {
  const d = new Date(baseDate.getTime() + offsetMinutes * 60000);
  const pad = (n) => String(n).padStart(2, '0');
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const mins = pad(d.getMinutes());
  return `${d.getFullYear()}-${month}-${day} ${hours}:${mins}:00`;
}

/**
 * Presets - secondary synthetic presets removed to prioritize real campus datasets
 */
export const PRESETS = {};

/**
 * Parametric synthetic simulator
 * @param {number} n Sample size (24 to 100)
 * @param {number} targetMean Target mean in Mbps
 * @param {number} targetStd Target standard deviation
 * @param {number} seed Seed number
 */
export function generateCustomDataset(n = 48, targetMean = 50.0, targetStd = 8.0, seed = Date.now()) {
  const rng = createSeededRandom(seed);
  const baseDate = new Date('2026-10-20T00:00:00');
  const count = Math.max(24, Math.min(100, n));
  const observations = [];

  for (let i = 0; i < count; i++) {
    const raw = targetMean + generateStandardNormal(rng) * targetStd;
    const load = Math.max(1.0, raw);
    observations.push({
      index: i,
      timestamp: formatTimestamp(baseDate, i * 30),
      load_mbps: Number(load.toFixed(2)),
      isAnomaly: false
    });
  }

  return observations;
}

/**
 * Parses user CSV text:
 * Expected header: timestamp, load_mbps (or timestamp,load or load)
 */
export function parseCSVData(csvText) {
  if (!csvText || typeof csvText !== 'string') {
    return { error: 'Empty or invalid CSV file provided.', data: null };
  }

  const lines = csvText.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length < 5) {
    return { error: 'CSV must contain at least 5 rows of observations.', data: null };
  }

  // Header detection
  const header = lines[0].toLowerCase().split(',').map(s => s.trim().replace(/^["']|["']$/g, ''));
  let loadColIdx = header.findIndex(h => h.includes('load') || h.includes('mbps') || h.includes('traffic') || h.includes('bandwidth'));
  let timeColIdx = header.findIndex(h => h.includes('time') || h.includes('date') || h.includes('stamp'));

  if (loadColIdx === -1) {
    // If only 1 column, assume it's load
    if (header.length === 1 && !isNaN(Number(header[0]))) {
      // First line might be data directly
      loadColIdx = 0;
    } else if (header.length >= 2) {
      // Default to second column as load, first as timestamp
      loadColIdx = 1;
      timeColIdx = 0;
    } else {
      return { error: 'Could not identify a "load_mbps" or traffic column in CSV.', data: null };
    }
  }

  const startLine = (isNaN(Number(header[loadColIdx]))) ? 1 : 0;
  const observations = [];
  const baseDate = new Date('2026-10-20T00:00:00');

  for (let i = startLine; i < lines.length; i++) {
    const parts = lines[i].split(',').map(s => s.trim().replace(/^["']|["']$/g, ''));
    if (parts.length <= loadColIdx) continue;

    const rawVal = parts[loadColIdx];
    const num = parseFloat(rawVal);
    if (isNaN(num)) continue;

    let timestamp = '';
    if (timeColIdx !== -1 && parts[timeColIdx]) {
      timestamp = parts[timeColIdx];
    } else {
      timestamp = formatTimestamp(baseDate, observations.length * 30);
    }

    observations.push({
      index: observations.length,
      timestamp,
      load_mbps: Number(num.toFixed(2)),
      isAnomaly: false
    });
  }

  if (observations.length < 10) {
    return {
      error: `Only ${observations.length} valid numeric data points found. Minimum 10 observations required for statistical modeling.`,
      data: null
    };
  }

  // Cap at 150 for responsive micro-project rendering if oversized
  const capped = observations.slice(0, 150);
  return { error: null, data: capped };
}

/**
 * Serializes observation list to CSV format for download
 */
export function exportToCSV(observations) {
  const header = 'timestamp,load_mbps\n';
  const rows = observations.map(obs => `${obs.timestamp},${obs.load_mbps}`).join('\n');
  return header + rows;
}

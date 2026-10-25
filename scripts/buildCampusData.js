import fs from 'fs';
import path from 'path';

function processCsv(filePath, name, id, ifaceCount) {
  const lines = fs.readFileSync(filePath, 'utf8').trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  const rxCols = headers.filter(h => h === 'Rx' || h.startsWith('Rx_'));
  const txCols = headers.filter(h => h.startsWith('unlabeled_measurement_'));

  const timeIdx = headers.indexOf('time');
  const utcIdx = headers.indexOf('timestamp_utc');
  const istIdx = headers.indexOf('timestamp_ist');

  const observations = lines.slice(1).map((line, idx) => {
    const vals = line.split(',').map(v => v.trim());
    let rxSum = 0;
    rxCols.forEach(col => {
      rxSum += Math.abs(parseFloat(vals[headers.indexOf(col)]) || 0);
    });
    let txSum = 0;
    txCols.forEach(col => {
      txSum += Math.abs(parseFloat(vals[headers.indexOf(col)]) || 0);
    });
    const rxMbps = Number((rxSum / 1e6).toFixed(3));
    const txMbps = Number((txSum / 1e6).toFixed(3));
    const aggMbps = Number((rxMbps + txMbps).toFixed(3));
    const istStr = vals[istIdx];
    const dt = new Date(istStr.replace(' IST', ''));
    const dayOfWeek = dt.getDay();
    const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);
    const dayName = dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

    // Period assignment: 0..50 is Period 1 (Weekend/Off-Peak: Sun-Tue), 51..110 is Period 2 (Weekday/Peak: Wed-Sat)
    const period = idx <= 50 ? 1 : 2;

    return {
      index: idx,
      rawTime: vals[timeIdx],
      timestampUtc: vals[utcIdx],
      timestampIst: istStr,
      timestamp: istStr,
      dayName,
      isWeekend,
      period,
      rxMbps,
      txMbps,
      loadMbps: aggMbps,
      load_mbps: aggMbps
    };
  });

  return {
    id,
    name,
    interfaceCount: ifaceCount,
    rxColumnCount: rxCols.length,
    txColumnCount: txCols.length,
    observations
  };
}

const fw = processCsv('c:/Users/asus/Downloads/Cleaned_Firewall_Traffic.csv', 'Campus Perimeter Firewall (Actual)', 'perimeterFirewall', 25);
const cs = processCsv('c:/Users/asus/Downloads/Cleaned_Core_Switch_Traffic.csv', 'Campus Core Switch (Actual)', 'coreSwitch', 97);

const fileContent = `/**
 * NETLOAD: THE STATISTICAL OBSERVATORY
 * Real Campus Network Telemetry Datasets
 * Sourced from Cleaned_Firewall_Traffic.csv and Cleaned_Core_Switch_Traffic.csv
 * Time span: Oct 17, 2026 20:30 IST to Oct 24, 2026 17:30 IST (111 samples at 1.5-hr intervals)
 */

export const CAMPUS_DATASETS = {
  perimeterFirewall: ${JSON.stringify(fw, null, 2)},
  coreSwitch: ${JSON.stringify(cs, null, 2)}
};
`;

fs.writeFileSync('src/data/campusTrafficData.js', fileContent, 'utf8');
console.log('campusTrafficData.js created successfully!');

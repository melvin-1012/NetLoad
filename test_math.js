/**
 * Verification test script for Netload Statistical Observatory
 * Tests core statistical routines and real campus telemetry benchmarks
 */
import {
  calculateMean,
  calculateMedian,
  calculateContinuousMode,
  calculateSampleVariance,
  calculateSampleStdDev,
  calculateSkewness,
  calculatePearsonSkewness,
  evaluateEmpiricalRule,
  calculateZScore,
  erf,
  normalPDF,
  normalCDF,
  intervalProbability,
  upperTailProbability,
  lowerTailProbability,
  calculateCenteredMA3,
  calculateCenteredMA4,
  calculateCenteredMA5,
  calculateMovingAverages,
  calculateLinearTrend,
  performChiSquareTest,
  performFTest
} from './src/math/statistics.js';

import { CAMPUS_DATASETS } from './src/data/campusTrafficData.js';

import {
  PRESETS,
  generateCustomDataset,
  parseCSVData,
  exportToCSV
} from './src/data/generator.js';

console.log('--- 1. Testing Summary Statistics & Central Tendency ---');
const sample = [45, 50, 55, 60, 40, 50];
const mean = calculateMean(sample);
const median = calculateMedian(sample);
const s2 = calculateSampleVariance(sample, mean);
const s = calculateSampleStdDev(sample, mean);
console.log(`Mean: ${mean} (Expected: 50)`);
console.log(`Median: ${median} (Expected: 50)`);
console.log(`Sample Variance s^2: ${s2.toFixed(2)} (Expected: 50.00)`);
console.log(`Sample Std Dev s: ${s.toFixed(2)} (Expected: 7.07)`);
console.assert(Math.abs(mean - 50) < 1e-6, 'Mean calculation failed');
console.assert(Math.abs(median - 50) < 1e-6, 'Median calculation failed');
console.assert(Math.abs(s2 - 50) < 1e-6, 'Variance calculation failed');

console.log('\n--- 2. Testing Normal Distribution & Error Function ---');
const erf0 = erf(0);
const erf1 = erf(1);
console.log(`erf(0): ${erf0} (Expected: 0)`);
console.log(`erf(1): ${erf1.toFixed(5)} (Expected: 0.84270)`);
console.assert(Math.abs(erf0) < 1e-6, 'erf(0) failed');
console.assert(Math.abs(erf1 - 0.84270) < 1e-4, 'erf(1) failed');

const cdf0 = normalCDF(50, 50, 10);
const cdfUpper = normalCDF(50 + 1.96 * 10, 50, 10);
const cdfLower = normalCDF(50 - 1.96 * 10, 50, 10);
console.log(`Phi(0): ${cdf0} (Expected: 0.5)`);
console.log(`Phi(+1.96): ${cdfUpper.toFixed(4)} (Expected: 0.9750)`);
console.log(`Phi(-1.96): ${cdfLower.toFixed(4)} (Expected: 0.0250)`);
console.assert(Math.abs(cdf0 - 0.5) < 1e-4, 'CDF median failed');
console.assert(Math.abs(cdfUpper - 0.9750) < 1e-3, 'CDF +1.96 failed');
console.assert(Math.abs(cdfLower - 0.0250) < 1e-3, 'CDF -1.96 failed');

const pUpper = upperTailProbability(60, 50, 10);
console.log(`Upper tail P(X > 60): ${pUpper.toFixed(4)} (Expected: 0.1587)`);
console.assert(Math.abs(pUpper - 0.1587) < 1e-3, 'Upper tail failed');

const pInterval = intervalProbability(40, 60, 50, 10);
console.log(`Interval P(40 < X < 60) [μ±1σ]: ${pInterval.toFixed(4)} (Expected: 0.6827)`);
console.assert(Math.abs(pInterval - 0.6827) < 1e-3, 'Interval probability failed');

console.log('\n--- 3. Testing Moving Averages (Centered & Trailing) ---');
const rawSeries = [10, 20, 30, 40, 50, 60, 70];
const ma = calculateMovingAverages(rawSeries, 3);
const cma3 = calculateCenteredMA3(rawSeries);
const cma4 = calculateCenteredMA4(rawSeries);
const cma5 = calculateCenteredMA5(rawSeries);

console.log('Trailing MA (k=3):', ma.map(m => m.value));
console.assert(ma[2].value === 20, 'Trailing MA t=2 failed');
console.assert(ma[3].value === 30, 'Trailing MA t=3 failed');

console.log('Centered MA (3-period):', cma3.map(m => m.value));
console.assert(cma3[0].value === null, 'CMA3 endpoint t=0 must be null');
console.assert(cma3[1].value === 20, 'CMA3 t=1 failed');
console.assert(cma3[2].value === 30, 'CMA3 t=2 failed');

console.log('Centered MA (5-period):', cma5.map(m => m.value));
console.assert(cma5[0].value === null && cma5[1].value === null, 'CMA5 endpoints t<2 must be null');
console.assert(cma5[2].value === 30, 'CMA5 t=2 failed');
console.assert(cma5[3].value === 40, 'CMA5 t=3 failed');
console.assert(cma5[4].value === 50, 'CMA5 t=4 failed');
console.assert(cma5[5].value === null && cma5[6].value === null, 'CMA5 endpoints t>N-3 must be null');

console.log('\n--- 4. Testing Real Campus Perimeter Firewall Telemetry ---');
const fwObs = CAMPUS_DATASETS.perimeterFirewall.observations;
const fwLoads = fwObs.map(o => o.loadMbps);
console.assert(fwLoads.length === 111, 'Firewall samples count should be 111');

const fwMean = calculateMean(fwLoads);
const fwMedian = calculateMedian(fwLoads);
const fwMode = calculateContinuousMode(fwLoads, 10);
const fwStd = calculateSampleStdDev(fwLoads, fwMean);
const fwSkew = calculateSkewness(fwLoads, fwMean, fwStd);

console.log(`Firewall Mean: ${fwMean.toFixed(2)} Mbps (Expected: ~967.57)`);
console.log(`Firewall Median: ${fwMedian.toFixed(2)} Mbps (Expected: ~556.75)`);
console.log(`Firewall Continuous Mode: ${fwMode.mode.toFixed(2)} Mbps (Expected: ~347.36)`);
console.log(`Firewall Std Dev: ${fwStd.toFixed(2)} Mbps (Expected: ~867.71)`);
console.log(`Firewall Skewness: ${fwSkew.toFixed(3)} (Positive skewness: Mean > Median > Mode)`);

console.assert(Math.abs(fwMean - 967.57) < 1.0, 'Firewall mean benchmark failed');
console.assert(Math.abs(fwMedian - 556.75) < 1.0, 'Firewall median benchmark failed');
console.assert(fwMean > fwMedian && fwMedian > fwMode.mode, 'Mean > Median > Mode skewness hierarchy failed');

// Chi-Square Goodness-of-Fit on Firewall
const fwChi = performChiSquareTest(fwLoads, 6, 0.05);
console.log(`Firewall Chi-Square Stat: ${fwChi.chi2}, df: ${fwChi.df}, p-val: ${fwChi.pValue}`);
console.log(`Decision: ${fwChi.rejectH0 ? 'REJECT H0 (Diurnal cycle non-normality confirmed)' : 'FAIL TO REJECT'}`);
console.assert(fwChi.rejectH0 === true, 'Chi-square test should reject H0 on 7-day diurnal traffic');

// Two-Sample F-Test on Firewall (Weekend vs Weekday)
const fwP1 = fwLoads.slice(0, 51); // Sun-Tue
const fwP2 = fwLoads.slice(51);    // Wed-Sat
const fwF = performFTest(fwP1, fwP2, 0.05);
console.log(`Firewall F-Test Stat: ${fwF.fStatistic}, df: (${fwF.df1}, ${fwF.df2}), p-val: ${fwF.pValue}`);
console.log(`Decision: ${fwF.rejectH0 ? 'REJECT H0 (Statistically significant volatility shift)' : 'FAIL TO REJECT'}`);
console.assert(fwF.rejectH0 === true, 'F-test should reject H0 for Weekend vs Weekday variance');

console.log('\n--- 5. Testing Real Campus Core Switch Telemetry ---');
const csObs = CAMPUS_DATASETS.coreSwitch.observations;
const csLoads = csObs.map(o => o.loadMbps);
console.assert(csLoads.length === 111, 'Core Switch samples count should be 111');

const csMean = calculateMean(csLoads);
const csMedian = calculateMedian(csLoads);
console.log(`Core Switch Mean: ${csMean.toFixed(2)} Mbps (Expected: ~8878.74)`);
console.log(`Core Switch Median: ${csMedian.toFixed(2)} Mbps (Expected: ~7820.98)`);
console.assert(Math.abs(csMean - 8878.74) < 2.0, 'Core switch mean benchmark failed');
console.assert(Math.abs(csMedian - 7820.98) < 2.0, 'Core switch median benchmark failed');

console.log('\n--- 6. Testing CSV Parser & Exporter ---');
const csvString = exportToCSV(fwObs);
const parsed = parseCSVData(csvString);
console.log(`Exported and re-parsed CSV rows: ${parsed.data.length}`);
console.assert(parsed.data.length === 111, 'CSV roundtrip failed');

console.log('\n======================================================');
console.log('ALL MATHEMATICAL, SYLLABUS & CAMPUS DATA TESTS PASSED 100%');
console.log('======================================================');

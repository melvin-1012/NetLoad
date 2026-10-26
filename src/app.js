/**
 * NETLOAD: THE STATISTICAL OBSERVATORY
 * Central Application Controller & Reactive State Pipeline
 * Precision Network Traffic Analysis & Uncertainty Modeling
 */

import {
  calculateMean,
  calculateMedian,
  calculateContinuousMode,
  calculateSampleStdDev,
  calculateSampleVariance,
  calculateSkewness,
  calculatePearsonSkewness,
  evaluateEmpiricalRule,
  calculateZScore,
  normalCDF,
  normalPDF,
  intervalProbability,
  upperTailProbability,
  lowerTailProbability,
  calculateCenteredMA3,
  calculateCenteredMA4,
  calculateCenteredMA5,
  calculateMovingAverages,
  calculateLinearTrend,
  performChiSquareTest,
  performFTest,
  calculateBayesianDecision
} from './math/statistics.js';

import { CAMPUS_DATASETS } from './data/campusTrafficData.js';

import {
  PRESETS,
  generateCustomDataset,
  parseCSVData,
  exportToCSV
} from './data/generator.js';

import {
  renderTimeSeriesChart,
  renderNormalDistributionChart,
  renderChiSquareBarChart,
  renderFTestVarianceChart,
  createBrandBellIcon
} from './charts/scientificChart.js';

// Application Reactive State
const state = {
  activeSection: 'overview',
  scenario: 'perimeterFirewall', // Real Campus Perimeter Firewall by default
  observations: [],
  selectedIndex: 24,
  threshold: 1500, // Appropriate for Perimeter Firewall (mean ~967 Mbps)
  
  // Section 1: Distribution parameters
  distMode: 'tail_upper', // 'tail_upper', 'tail_lower', 'interval', 'empirical'
  distValX: 1500,
  distIntervalA: 500,
  distIntervalB: 1500,
  distEmpiricalLevel: 1,
  showEmpiricalHistogram: true, // Overlaid empirical campus histogram on Gaussian curve

  // Section 2: Time-Series parameters
  maMode: 'cma_3', // 'cma_3', 'cma_5'
  maWindow: 3,

  // Section 3: Validation parameters
  chiNumBins: 6,
  chiAlpha: 0.05,
  fAlpha: 0.05,

  // Section 4: Synthesizer parameters
  synthN: 48,
  synthMean: 50.0,
  synthStd: 8.0
};

/**
 * Initialize Application
 */
function initApp() {
  // Inject Brand Bell Icon
  const logoContainer = document.getElementById('brand-logo-container');
  if (logoContainer) {
    logoContainer.appendChild(createBrandBellIcon());
  }

  // Load default dataset (Real Campus Perimeter Firewall)
  loadScenario('perimeterFirewall');

  // Bind all event listeners
  bindNavigationEvents();
  bindGlobalControlEvents();
  bindDistributionEvents();
  bindTimeSeriesEvents();
  bindValidationEvents();
  bindMethodologyEvents();

  // Listen to hash changes for deep linking
  window.addEventListener('hashchange', handleHashChange);
  if (window.location.hash) {
    handleHashChange();
  }

  // Initial Full Render
  updateAllViews();
}

/**
 * Load Dataset Scenario (Campus Real or Pedagogical Sandbox)
 */
function loadScenario(scenarioKey) {
  state.scenario = scenarioKey;

  const threshInput = document.getElementById('global-threshold-input');
  const threshValLabel = document.getElementById('global-threshold-val');

  if (scenarioKey === 'perimeterFirewall') {
    state.observations = CAMPUS_DATASETS.perimeterFirewall.observations;
    state.threshold = 1500;
    state.distValX = 1500;
    state.distIntervalA = 500;
    state.distIntervalB = 1500;
    if (threshInput) {
      threshInput.min = '200';
      threshInput.max = '3600';
      threshInput.step = '50';
      threshInput.value = '1500';
    }
  } else if (scenarioKey === 'coreSwitch') {
    state.observations = CAMPUS_DATASETS.coreSwitch.observations;
    state.threshold = 10000;
    state.distValX = 10000;
    state.distIntervalA = 7000;
    state.distIntervalB = 11000;
    if (threshInput) {
      threshInput.min = '6000';
      threshInput.max = '15000';
      threshInput.step = '100';
      threshInput.value = '10000';
    }
  } else if (scenarioKey === 'custom') {
    state.observations = generateCustomDataset(state.synthN, state.synthMean, state.synthStd);
    state.threshold = Math.round(state.synthMean + state.synthStd * 1.5);
    state.distValX = state.threshold;
    state.distIntervalA = Math.round(state.synthMean - state.synthStd);
    state.distIntervalB = Math.round(state.synthMean + state.synthStd);
    if (threshInput) {
      threshInput.min = '10';
      threshInput.max = '150';
      threshInput.step = '1';
      threshInput.value = state.threshold.toString();
    }
  }

  if (threshValLabel) {
    threshValLabel.textContent = `${state.threshold} Mbps`;
  }

  // Update inputs in distribution section to match current range
  const inputX = document.getElementById('dist-input-x');
  const inputA = document.getElementById('dist-input-a');
  const inputB = document.getElementById('dist-input-b');
  if (inputX) inputX.value = state.distValX.toString();
  if (inputA) inputA.value = state.distIntervalA.toString();
  if (inputB) inputB.value = state.distIntervalB.toString();

  state.selectedIndex = Math.min(24, Math.floor(state.observations.length / 2));
}

// --------------------------------------------------------------------------
// REACTIVE VIEW UPDATERS
// --------------------------------------------------------------------------

/**
 * Master update pipeline
 */
function updateAllViews() {
  const data = state.observations;
  if (!data || data.length === 0) return;

  const loads = data.map(o => (o.loadMbps !== undefined ? o.loadMbps : o.load_mbps));
  const mean = calculateMean(loads);
  const median = calculateMedian(loads);
  const modeObj = calculateContinuousMode(loads, 10);
  const sigma = calculateSampleStdDev(loads, mean);
  const variance = calculateSampleVariance(loads, mean);
  const skewness = calculateSkewness(loads, mean, sigma);
  const pearsonSkew = calculatePearsonSkewness(mean, median, sigma);

  // Selected sample telemetry
  const selIndex = Math.max(0, Math.min(data.length - 1, state.selectedIndex));
  state.selectedIndex = selIndex;
  const currentObs = data[selIndex];
  const currentLoad = currentObs ? (currentObs.loadMbps !== undefined ? currentObs.loadMbps : currentObs.load_mbps) : 0;
  const currentZ = calculateZScore(currentLoad, mean, sigma);

  // 1. Top Telemetry Bar Update
  updateTopBar({ mean, sigma, currentLoad, currentZ });

  // 2. Section 0: Overview Update
  updateOverviewSection({ data, loads, mean, median, modeObj, sigma, variance, skewness, pearsonSkew, currentObs, currentLoad, currentZ });

  // 3. Section 1: Probability & Distribution Update
  updateDistributionSection({ data, loads, mean, sigma });

  // 4. Section 2: Time-Series Trends & Moving Averages Update
  updateTimeSeriesSection({ data, loads, mean });

  // 5. Section 3: Statistical Validation (Chi-Square & F-Test) Update
  updateValidationSection({ loads });

  // 6. Section 4: CSV Interface & Real Campus Datasets Update
  updateMethodologySection({ data, mean, sigma });
}

/**
 * Updates Top Bar Telemetry Counters
 */
function updateTopBar({ mean, sigma, currentLoad, currentZ }) {
  const elMean = document.getElementById('telemetry-mean');
  const elSigma = document.getElementById('telemetry-sigma');
  const elLoad = document.getElementById('telemetry-selected-load');
  const elZ = document.getElementById('telemetry-zscore');
  const elDataset = document.getElementById('telemetry-dataset-type');

  if (elMean) elMean.textContent = `${mean.toFixed(2)} Mbps`;
  if (elSigma) elSigma.textContent = `${sigma.toFixed(2)} Mbps`;
  if (elLoad) elLoad.textContent = `${currentLoad.toFixed(2)} Mbps`;
  if (elZ) elZ.textContent = (currentZ >= 0 ? `+${currentZ.toFixed(2)}` : currentZ.toFixed(2));
  if (elDataset) {
    if (state.scenario === 'perimeterFirewall') {
      elDataset.textContent = `Perimeter Firewall (Actual, N=111)`;
    } else if (state.scenario === 'coreSwitch') {
      elDataset.textContent = `Core Switch (Actual, N=111)`;
    } else if (state.scenario === 'upload') {
      elDataset.textContent = `User CSV (N=${state.observations.length})`;
    } else {
      elDataset.textContent = `Simulated Sandbox (N=${state.observations.length})`;
    }
  }
}

/**
 * Updates Section 0: Overview
 */
function updateOverviewSection({ data, loads, mean, median, modeObj, sigma, variance, skewness, pearsonSkew, currentObs, currentLoad, currentZ }) {
  // Stat tiles
  const elObsTag = document.getElementById('overview-obs-tag');
  const elValLoad = document.getElementById('overview-val-load');
  const elValMean = document.getElementById('overview-val-mean');
  const elValMedian = document.getElementById('overview-val-median');
  const elValMode = document.getElementById('overview-val-mode');
  const elValSkew = document.getElementById('overview-val-skewness');
  const elValSigma = document.getElementById('overview-val-sigma');
  const elValVariance = document.getElementById('overview-val-variance');
  const elValZ = document.getElementById('overview-val-z');
  const elValZSub = document.getElementById('overview-val-z-sub');
  const elValRisk = document.getElementById('overview-val-risk');
  const elObsCounter = document.getElementById('overview-obs-counter');
  const elNoticeText = document.getElementById('overview-notice-text');

  if (elObsTag) elObsTag.textContent = `t = ${state.selectedIndex}`;
  if (elValLoad) elValLoad.textContent = currentLoad.toFixed(1);
  if (elValMean) elValMean.textContent = mean.toFixed(1);
  if (elValMedian) elValMedian.textContent = median.toFixed(1);
  if (elValMode) elValMode.textContent = modeObj.mode.toFixed(1);
  if (elValSkew) elValSkew.textContent = skewness > 0 ? `+${skewness.toFixed(2)}` : skewness.toFixed(2);
  if (elValSigma) elValSigma.textContent = sigma.toFixed(1);
  if (elValVariance) elValVariance.textContent = variance.toFixed(1);
  const elValMax = document.getElementById('overview-val-max');
  if (elValMax && loads && loads.length > 0) {
    elValMax.textContent = Math.max(...loads).toFixed(1);
  }
  
  if (elValZ) {
    elValZ.textContent = (currentZ >= 0 ? `+${currentZ.toFixed(2)}` : currentZ.toFixed(2));
  }
  if (elValZSub) {
    const absZ = Math.abs(currentZ);
    if (absZ <= 1.0) elValZSub.textContent = 'Normal Range (|Z| ≤ 1.0)';
    else if (absZ <= 2.0) elValZSub.textContent = 'Moderate Variation (1 < |Z| ≤ 2.0)';
    else if (absZ <= 3.0) elValZSub.textContent = 'Unusual High Alert (2 < |Z| ≤ 3.0)';
    else elValZSub.textContent = 'Extreme Anomaly (|Z| > 3.0)';
  }

  // Risk of exceeding threshold
  const riskProb = upperTailProbability(state.threshold, mean, sigma);
  if (elValRisk) elValRisk.textContent = `${(riskProb * 100).toFixed(1)}%`;
  
  const isReal = (state.scenario === 'perimeterFirewall' || state.scenario === 'coreSwitch');
  if (elObsCounter) {
    elObsCounter.textContent = isReal 
      ? `N = ${data.length} Real Telemetry Samples (1.5-hr cadence)`
      : `N = ${data.length} Simulated Observations`;
  }

  if (elNoticeText) {
    if (state.scenario === 'perimeterFirewall') {
      elNoticeText.innerHTML = `<strong>Actual Campus Data Active:</strong> Perimeter Firewall gateway (Cleaned_Firewall_Traffic.csv) comprising 25 interfaces (Rx + Tx) across Oct 17 to Oct 24, 2026.`;
    } else if (state.scenario === 'coreSwitch') {
      elNoticeText.innerHTML = `<strong>Actual Campus Data Active:</strong> Core Switch aggregation fabric (Cleaned_Core_Switch_Traffic.csv) comprising 97 switch ports across Oct 17 to Oct 24, 2026.`;
    } else {
      elNoticeText.innerHTML = `<strong>Simulated Model Active:</strong> Pedagogical sandbox dataset for what-if statistical validation. Not empirical campus network captures.`;
    }
  }

  // Render Time-Series Chart in Overview
  const tsContainer = document.getElementById('overview-timeseries-container');
  if (tsContainer) {
    const ma = calculateMovingAverages(loads, state.maWindow);
    renderTimeSeriesChart(tsContainer, {
      observations: data,
      movingAverages: ma,
      mean,
      threshold: state.threshold,
      selectedIndex: state.selectedIndex,
      maWindow: state.maWindow,
      onSelectIndex: (newIdx) => {
        state.selectedIndex = newIdx;
        updateAllViews();
      }
    });
  }

  // Render Mini Bell Preview in Overview (with empirical histogram overlay)
  const bellContainer = document.getElementById('overview-bell-container');
  if (bellContainer) {
    renderNormalDistributionChart(bellContainer, {
      mean,
      sigma,
      mode: 'tail_upper',
      valX: state.threshold,
      showObservedHistogram: true,
      observedData: loads
    });
  }

  // Dynamic Interpretation Text
  const interpText = document.getElementById('overview-interpretation-text');
  const interpBox = document.getElementById('overview-interpretation');
  if (interpText && interpBox) {
    const diff = currentLoad - mean;
    const sign = diff >= 0 ? '+' : '';
    const isExceed = currentLoad > state.threshold;

    interpBox.className = 'interpretation-box' + (isExceed ? ' critical' : (Math.abs(currentZ) > 1.8 ? ' warning' : ''));

    const tsString = currentObs ? (currentObs.timestampIst || currentObs.timestamp || `t=${state.selectedIndex}`) : 'N/A';

    let skewExplanation = '';
    if (mean > median) {
      skewExplanation = `Notice positive skewness (Mean ${mean.toFixed(1)} Mbps > Median ${median.toFixed(1)} Mbps > Mode ${modeObj.mode.toFixed(1)} Mbps): heavy daytime academic traffic surges elevate the arithmetic mean, while the median reflects typical mid-day load.`;
    }

    interpText.textContent = `Sample t=${state.selectedIndex} records ${currentLoad.toFixed(1)} Mbps throughput at ${tsString}. It deviates by ${sign}${diff.toFixed(1)} Mbps from mean μ = ${mean.toFixed(1)} Mbps (z = ${sign}${currentZ.toFixed(2)}). ${skewExplanation} ` +
      (isExceed 
        ? `ALERT: Current load exceeds provisioned capacity boundary of ${state.threshold} Mbps. Dynamic autoscaling or QoS throttling required.`
        : `Normal operation: Bandwidth headroom remains adequate. The probability of any random sample exceeding ${state.threshold} Mbps is estimated at ${(riskProb * 100).toFixed(2)}%.`);
  }

  // Update Module 1 (CO1) Bayesian Decision Rule
  const bayes = calculateBayesianDecision(loads, state.threshold, 0.90, 0.08, 0.80);
  if (bayes) {
    const elThresh1 = document.getElementById('bayes-threshold-label');
    const elThresh2 = document.getElementById('bayes-threshold-label2');
    const elPrior = document.getElementById('bayes-prior-s1');
    const elPriorSub = document.getElementById('bayes-prior-sub');
    const elEvidence = document.getElementById('bayes-evidence-pa');
    const elPosterior = document.getElementById('bayes-posterior-val');
    const elBreakdown = document.getElementById('bayes-calc-breakdown');
    const elBadge = document.getElementById('bayes-decision-badge');

    if (elThresh1) elThresh1.textContent = state.threshold;
    if (elThresh2) elThresh2.textContent = state.threshold;
    if (elPrior) elPrior.textContent = `${(bayes.pCongestion * 100).toFixed(1)}%`;
    if (elPriorSub) elPriorSub.textContent = `${bayes.congestedCount} / ${bayes.n} samples`;
    if (elEvidence) elEvidence.textContent = `${(bayes.pAlert * 100).toFixed(1)}%`;
    if (elPosterior) elPosterior.textContent = `${(bayes.pCongestionGivenAlert * 100).toFixed(1)}%`;
    if (elBreakdown) {
      elBreakdown.textContent = `P(S₁|A) = [0.90 × ${bayes.pCongestion.toFixed(3)}] / ${bayes.pAlert.toFixed(3)} = ${(bayes.pCongestionGivenAlert * 100).toFixed(1)}%`;
    }
    if (elBadge) {
      if (bayes.isActionTriggered) {
        elBadge.textContent = `✓ Autoscale / Reroute Triggered (${(bayes.pCongestionGivenAlert * 100).toFixed(1)}% ≥ 80%)`;
        elBadge.style.color = '#176B61';
        elBadge.style.borderColor = 'rgba(23, 107, 97, 0.4)';
        elBadge.style.background = 'rgba(23, 107, 97, 0.08)';
      } else {
        elBadge.textContent = `✕ Alert Suppressed (False-Alarm Protection)`;
        elBadge.style.color = '#B96E2E';
        elBadge.style.borderColor = 'rgba(185, 110, 46, 0.4)';
        elBadge.style.background = 'rgba(185, 110, 46, 0.08)';
      }
    }
  }
}

/**
 * Updates Section 1: Continuous Probability & Normal Distribution
 */
function updateDistributionSection({ data, loads, mean, sigma }) {
  let computedProb = 0;
  let probLabel = '';
  let zScore = 0;

  if (state.distMode === 'tail_upper') {
    computedProb = upperTailProbability(state.distValX, mean, sigma);
    probLabel = `P(X > ${state.distValX.toFixed(1)})`;
    zScore = calculateZScore(state.distValX, mean, sigma);
  } else if (state.distMode === 'tail_lower') {
    computedProb = lowerTailProbability(state.distValX, mean, sigma);
    probLabel = `P(X ≤ ${state.distValX.toFixed(1)})`;
    zScore = calculateZScore(state.distValX, mean, sigma);
  } else if (state.distMode === 'interval') {
    computedProb = intervalProbability(state.distIntervalA, state.distIntervalB, mean, sigma);
    const minA = Math.min(state.distIntervalA, state.distIntervalB);
    const maxB = Math.max(state.distIntervalA, state.distIntervalB);
    probLabel = `P(${minA.toFixed(1)} < X < ${maxB.toFixed(1)})`;
    zScore = calculateZScore(maxB, mean, sigma);
  } else if (state.distMode === 'empirical') {
    if (state.distEmpiricalLevel === 1) computedProb = 0.682689;
    else if (state.distEmpiricalLevel === 2) computedProb = 0.954500;
    else computedProb = 0.997300;
    probLabel = `P(μ ± ${state.distEmpiricalLevel}σ)`;
    zScore = state.distEmpiricalLevel;
  }

  // Update DOM Results
  const elProbLabel = document.getElementById('dist-calc-prob-label');
  const elProbVal = document.getElementById('dist-calc-prob-val');
  const elProbPercent = document.getElementById('dist-calc-prob-percent');
  const elZVal = document.getElementById('dist-calc-z-val');
  const elInterpText = document.getElementById('dist-calc-interpretation-text');

  if (elProbLabel) elProbLabel.textContent = probLabel;
  if (elProbVal) elProbVal.textContent = computedProb.toFixed(4);
  if (elProbPercent) {
    const pct = (computedProb * 100).toFixed(2);
    const minsPerHour = (computedProb * 60).toFixed(1);
    elProbPercent.textContent = `${pct}% probability (${minsPerHour} minutes per hour)`;
  }
  if (elZVal) {
    elZVal.textContent = state.distMode === 'empirical' 
      ? `±${state.distEmpiricalLevel}.00` 
      : (zScore >= 0 ? `+${zScore.toFixed(2)}` : zScore.toFixed(2));
  }

  // 68-95-99.7 Empirical Rule Breakdown across actual dataset
  const empiricalStats = evaluateEmpiricalRule(loads, mean, sigma);
  const elErTier1 = document.getElementById('er-count-tier1');
  const elErTier2 = document.getElementById('er-count-tier2');
  const elErTier3 = document.getElementById('er-count-tier3');
  const elErTier4 = document.getElementById('er-count-tier4');

  if (elErTier1) elErTier1.textContent = `${empiricalStats.within1SD.pct}% (${empiricalStats.within1SD.count}/${empiricalStats.total})`;
  if (elErTier2) elErTier2.textContent = `${empiricalStats.within2SD.pct}% (${empiricalStats.within2SD.count}/${empiricalStats.total})`;
  if (elErTier3) elErTier3.textContent = `${empiricalStats.within3SD.pct}% (${empiricalStats.within3SD.count}/${empiricalStats.total})`;
  if (elErTier4) elErTier4.textContent = `${empiricalStats.outliers3SD.pct}% (${empiricalStats.outliers3SD.count}/${empiricalStats.total})`;

  if (elInterpText) {
    if (state.distMode === 'tail_upper') {
      elInterpText.innerHTML = `<strong>Intelligent Autoscaling Decision:</strong> For upper-tail threshold x = ${state.distValX.toFixed(1)} Mbps (z = ${zScore.toFixed(2)}), exceedance probability P(X > ${state.distValX.toFixed(1)}) is ${(computedProb * 100).toFixed(2)}%. In software-defined networks (SDN), when P(X > capacity) exceeds 5%, an automated scaling policy triggers dynamic rate-limiting or spins up redundant containerized proxy links before buffer overflow occurs.`;
    } else if (state.distMode === 'tail_lower') {
      elInterpText.innerHTML = `<strong>Energy-Efficient Consolidation:</strong> Lower-tail probability P(X ≤ ${state.distValX.toFixed(1)}) is ${(computedProb * 100).toFixed(2)}%. Low-throughput epochs allow data-center orchestration to migrate virtualized routers and power down idle line cards.`;
    } else if (state.distMode === 'interval') {
      elInterpText.innerHTML = `<strong>Predictive Bandwidth Corridor:</strong> The probability of traffic falling within [${Math.min(state.distIntervalA, state.distIntervalB).toFixed(1)}, ${Math.max(state.distIntervalA, state.distIntervalB).toFixed(1)}] Mbps is ${(computedProb * 100).toFixed(2)}%. This captures the nominal operational QoS envelope.`;
    } else {
      elInterpText.innerHTML = `<strong>68–95–99.7 Empirical Rule:</strong> Standardized range [μ ± ${state.distEmpiricalLevel}σ] spans [${(mean - state.distEmpiricalLevel * sigma).toFixed(1)}, ${(mean + state.distEmpiricalLevel * sigma).toFixed(1)}] Mbps. In our dataset, ${state.distEmpiricalLevel === 1 ? empiricalStats.within1SD.pct : (state.distEmpiricalLevel === 2 ? (empiricalStats.within1SD.pct + empiricalStats.within2SD.pct).toFixed(1) : (empiricalStats.within1SD.pct + empiricalStats.within2SD.pct + empiricalStats.within3SD.pct).toFixed(1))}% of observations fall within this zone.`;
    }
  }

  // Render Full Distribution Bell Chart (Overlaid with Empirical Campus Histogram!)
  const distBellContainer = document.getElementById('dist-bell-container');
  if (distBellContainer) {
    renderNormalDistributionChart(distBellContainer, {
      mean,
      sigma,
      mode: state.distMode,
      valX: state.distValX,
      intervalA: state.distIntervalA,
      intervalB: state.distIntervalB,
      empiricalLevel: state.distEmpiricalLevel,
      showObservedHistogram: state.showEmpiricalHistogram,
      observedData: loads
    });
  }
}

/**
 * Updates Section 2: Traffic Trends (Time-Series & Central Tendency)
 */
function updateTimeSeriesSection({ data, loads, mean }) {
  let maSeries = [];
  let maFormulaLabel = '';
  let maDesc = '';

  if (state.maMode === 'cma_5') {
    maSeries = calculateCenteredMA5(loads);
    maFormulaLabel = 'Centered Moving Average (5-Period)';
    maDesc = 'CMA₅(t) = [x_{t-2} + x_{t-1} + x_t + x_{t+1} + x_{t+2}] / 5. Symmetric 5-period smoothing eliminating high-frequency fluctuations without phase lag. Undefined at endpoints t < 2 and t > N-3.';
  } else {
    maSeries = calculateCenteredMA3(loads);
    maFormulaLabel = 'Centered Moving Average (3-Period)';
    maDesc = 'CMA₃(t) = [x_{t-1} + x_t + x_{t+1}] / 3. Retrospective 3-period smoothing eliminating phase distortion. Undefined at boundary endpoints t=0 and t=N-1.';
  }

  const trend = calculateLinearTrend(loads);

  // Update Trend Slope Callout
  const elSlopeVal = document.getElementById('trend-slope-val');
  const elDirBadge = document.getElementById('trend-direction-badge');
  const elR2Val = document.getElementById('trend-r2-val');
  const elMaLabel = document.getElementById('trend-ma-formula-label');
  const elMaDesc = document.getElementById('trend-ma-desc');

  if (elSlopeVal) {
    const sign = trend.slope >= 0 ? '+' : '';
    elSlopeVal.textContent = `${sign}${trend.slope.toFixed(3)} Mbps/step`;
  }
  if (elR2Val) {
    elR2Val.textContent = `R² = ${trend.r2.toFixed(3)}`;
  }
  if (elMaLabel) elMaLabel.textContent = maFormulaLabel;
  if (elMaDesc) elMaDesc.textContent = maDesc;

  if (elDirBadge) {
    elDirBadge.textContent = trend.direction.toUpperCase();
    if (trend.direction === 'increasing') {
      elDirBadge.style.color = '#B96E2E';
      elDirBadge.style.borderColor = 'rgba(185, 110, 46, 0.4)';
    } else if (trend.direction === 'decreasing') {
      elDirBadge.style.color = '#426BB2';
      elDirBadge.style.borderColor = 'rgba(66, 107, 178, 0.4)';
    } else {
      elDirBadge.style.color = '#176B61';
      elDirBadge.style.borderColor = 'rgba(23, 107, 97, 0.4)';
    }
  }

  // Render Full Time-Series Chart
  const fullChartContainer = document.getElementById('timeseries-full-chart-container');
  if (fullChartContainer) {
    renderTimeSeriesChart(fullChartContainer, {
      observations: data,
      movingAverages: maSeries,
      trendline: trend,
      mean,
      threshold: state.threshold,
      selectedIndex: state.selectedIndex,
      onSelectIndex: (newIdx) => {
        state.selectedIndex = newIdx;
        updateAllViews();
      }
    });
  }

  // Update Underlying Observations Data Table
  const tbody = document.getElementById('observations-table-body');
  const countBadge = document.getElementById('table-row-count-badge');
  if (tbody) {
    tbody.innerHTML = '';
    const sigma = calculateSampleStdDev(loads, mean);

    data.forEach((obs, idx) => {
      const tr = document.createElement('tr');
      if (idx === state.selectedIndex) tr.classList.add('selected-row');

      const val = obs.loadMbps !== undefined ? obs.loadMbps : obs.load_mbps;
      const diff = val - mean;
      const z = calculateZScore(val, mean, sigma);
      const maItem = maSeries[idx];
      const isExceed = val > state.threshold;

      let statusDot = 'normal';
      let statusLabel = 'Normal Range';
      const absZ = Math.abs(z);
      if (isExceed) {
        statusDot = 'critical';
        statusLabel = 'Exceeds T';
      } else if (absZ > 3.0) {
        statusDot = 'critical';
        statusLabel = 'Extreme Anomaly';
      } else if (absZ > 2.0) {
        statusDot = 'warning';
        statusLabel = 'High Alert';
      } else if (absZ > 1.0) {
        statusDot = 'warning';
        statusLabel = 'Moderate Var';
      }

      const rxVal = obs.rxMbps !== undefined ? obs.rxMbps.toFixed(1) : '--';
      const txVal = obs.txMbps !== undefined ? obs.txMbps.toFixed(1) : '--';
      const timeStr = obs.timestampIst || obs.timestamp || `#${idx}`;

      tr.innerHTML = `
        <td class="mono-num">${idx}</td>
        <td class="mono-num" style="font-size: 0.8rem;">${timeStr}</td>
        <td class="mono-num" style="font-weight: 600;">${val.toFixed(2)}</td>
        <td class="mono-num">${rxVal}</td>
        <td class="mono-num">${txVal}</td>
        <td class="mono-num">${diff >= 0 ? '+' : ''}${diff.toFixed(2)}</td>
        <td class="mono-num">${z >= 0 ? '+' : ''}${z.toFixed(2)}</td>
        <td class="mono-num">${maItem && maItem.value !== null ? maItem.value.toFixed(2) : '--'}</td>
        <td>
          <span class="status-indicator ${statusDot}"></span>
          <span>${statusLabel}</span>
        </td>
      `;

      tr.style.cursor = 'pointer';
      tr.addEventListener('click', () => {
        state.selectedIndex = idx;
        updateAllViews();
      });

      tbody.appendChild(tr);
    });

    if (countBadge) countBadge.textContent = `All ${data.length} Observations`;
  }
}

/**
 * Updates Section 3: Statistical Validation (Chi-Square & F-Test)
 */
function updateValidationSection({ loads }) {
  // 1. Chi-Square Goodness-of-Fit Test for Normality
  const chiResult = performChiSquareTest(loads, state.chiNumBins, state.chiAlpha);

  const elChiStat = document.getElementById('chi-stat-val');
  const elChiDf = document.getElementById('chi-df-val');
  const elChiP = document.getElementById('chi-p-val');
  const elChiDec = document.getElementById('chi-decision-val');
  const elChiDecSub = document.getElementById('chi-decision-sub');
  const elChiAlphaLabel = document.getElementById('chi-alpha-label');
  const elChiInterpText = document.getElementById('chi-interpretation-text');
  const elCochranAlert = document.getElementById('chi-cochran-alert');
  const elCochranText = document.getElementById('chi-cochran-text');

  if (elChiAlphaLabel) elChiAlphaLabel.textContent = state.chiAlpha.toString();

  if (chiResult.isValid) {
    if (elChiStat) elChiStat.textContent = chiResult.chi2.toFixed(3);
    if (elChiDf) elChiDf.textContent = `${chiResult.df}`;
    if (elChiP) elChiP.textContent = chiResult.pValue < 0.0001 ? '< 0.0001' : chiResult.pValue.toFixed(4);

    if (elChiDec) {
      if (chiResult.rejectH0) {
        elChiDec.textContent = 'REJECT H₀';
        elChiDec.style.color = 'var(--brick-red)';
      } else {
        elChiDec.textContent = 'FAIL TO REJECT H₀';
        elChiDec.style.color = 'var(--teal)';
      }
    }

    if (elChiDecSub) {
      elChiDecSub.textContent = chiResult.rejectH0 
        ? `p < ${state.chiAlpha} (Depart from Normal)` 
        : `p ≥ ${state.chiAlpha} (Normal assumption tenable)`;
    }

    if (elChiInterpText) elChiInterpText.textContent = chiResult.interpretation;

    // Cochran check warning
    if (elCochranAlert && elCochranText) {
      if (chiResult.cochranWarning) {
        elCochranAlert.style.display = 'block';
        elCochranText.textContent = `Warning: ${chiResult.percentBelowFive}% of bins have expected count Eᵢ < 5 (Cochran rule permits at most 20%). Consider pooling bins to preserve asymptotic χ² distribution assumptions.`;
      } else {
        elCochranAlert.style.display = 'none';
      }
    }

    // Render Chi-Square Chart
    const chiChartContainer = document.getElementById('chi-square-chart-container');
    if (chiChartContainer) {
      renderChiSquareBarChart(chiChartContainer, chiResult);
    }
  } else {
    if (elChiInterpText) elChiInterpText.textContent = chiResult.error || 'Chi-Square calculation failed.';
  }

  // 2. Two-Sample F-Test for Variance Comparison (Weekend vs. Weekday)
  let p1, p2, splitIdx, period1Label, period2Label;

  if (state.scenario === 'perimeterFirewall' || state.scenario === 'coreSwitch') {
    // 0..50 is Weekend/Off-Peak (Sun-Tue, N=51); 51..110 is Weekday/Peak (Wed-Sat, N=60)
    splitIdx = 51;
    p1 = loads.slice(0, splitIdx);
    p2 = loads.slice(splitIdx);
    period1Label = 'Weekend/Off-Peak (Sun–Tue, N₁=51)';
    period2Label = 'Weekday/Peak (Wed–Sat, N₂=60)';
  } else {
    splitIdx = Math.floor(loads.length / 2);
    p1 = loads.slice(0, splitIdx);
    p2 = loads.slice(splitIdx);
    period1Label = `Period 1: Interval 1 (t=0..${splitIdx})`;
    period2Label = `Period 2: Interval 2 (t=${splitIdx}..${loads.length - 1})`;
  }

  const fResult = performFTest(p1, p2, state.fAlpha);
  fResult.splitIdx = splitIdx;
  fResult.period1Label = period1Label;
  fResult.period2Label = period2Label;

  const elFStat = document.getElementById('f-stat-val');
  const elFDf = document.getElementById('f-df-val');
  const elFP = document.getElementById('f-p-val');
  const elFDec = document.getElementById('f-decision-val');
  const elFDecSub = document.getElementById('f-decision-sub');
  const elFInterpText = document.getElementById('f-interpretation-text');

  if (fResult.isValid) {
    if (elFStat) elFStat.textContent = fResult.fStatistic.toFixed(3);
    if (elFDf) elFDf.textContent = `(${fResult.df1}, ${fResult.df2})`;
    if (elFP) elFP.textContent = fResult.pValue < 0.0001 ? '< 0.0001' : fResult.pValue.toFixed(4);

    if (elFDec) {
      if (fResult.rejectH0) {
        elFDec.textContent = 'REJECT H₀';
        elFDec.style.color = 'var(--brick-red)';
      } else {
        elFDec.textContent = 'FAIL TO REJECT H₀';
        elFDec.style.color = 'var(--teal)';
      }
    }

    if (elFDecSub) {
      elFDecSub.textContent = fResult.rejectH0 
        ? `p < ${state.fAlpha} (Non-stationary volatility shift)` 
        : `p ≥ ${state.fAlpha} (Stationary link dispersion)`;
    }

    if (elFInterpText) {
      let specificContext = '';
      if (state.scenario === 'perimeterFirewall' || state.scenario === 'coreSwitch') {
        specificContext = ` Specifically comparing Weekend/Off-Peak (Period 1: s₁² = ${fResult.var1.toFixed(1)} Mbps²) against Weekday/Peak (Period 2: s₂² = ${fResult.var2.toFixed(1)} Mbps²), the massive variance ratio F = ${fResult.fStatistic.toFixed(3)} proves link dispersion shifts dramatically when academic operations commence.`;
      }
      elFInterpText.textContent = `${fResult.interpretation}${specificContext}`;
    }

    // Render Split Variance Plot
    const fChartContainer = document.getElementById('f-test-chart-container');
    if (fChartContainer) {
      renderFTestVarianceChart(fChartContainer, fResult, loads);
    }
  } else {
    if (elFInterpText) elFInterpText.textContent = fResult.error || 'F-Test calculation failed.';
  }
}

/**
 * Updates Section 4: Data & Methodology
 */
function updateMethodologySection({ data, mean, sigma }) {
  // Methodological details update if needed
}

// --------------------------------------------------------------------------
// EVENT BINDINGS
// --------------------------------------------------------------------------

function bindNavigationEvents() {
  const navLinks = document.querySelectorAll('.sidebar-nav .nav-link');
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const section = link.getAttribute('data-section');
      switchSection(section);
      window.location.hash = section;
    });
  });
}

function handleHashChange() {
  const hash = window.location.hash.replace('#', '');
  if (hash) {
    switchSection(hash);
  }
}

function switchSection(sectionId) {
  state.activeSection = sectionId;

  // Update nav classes
  document.querySelectorAll('.sidebar-nav .nav-link').forEach(link => {
    const isTarget = link.getAttribute('data-section') === sectionId;
    link.classList.toggle('active', isTarget);
    link.setAttribute('aria-selected', isTarget ? 'true' : 'false');
  });

  // Update section panes
  document.querySelectorAll('.section-pane').forEach(pane => {
    pane.classList.toggle('active', pane.id === `pane-${sectionId}`);
  });

  // Update breadcrumb
  const breadcrumb = document.getElementById('breadcrumb-active-section');
  if (breadcrumb) {
    const titles = {
      overview: '00 Overview',
      distribution: '01 Continuous Distribution',
      'time-series': '02 Traffic Trends & MA',
      validation: '03 Validation (χ² & F)',
      methodology: '04 CSV Interface & Sandbox'
    };
    breadcrumb.textContent = titles[sectionId] || sectionId;
  }

  // Scroll to top of content
  const mainWorkspace = document.getElementById('main-content');
  if (mainWorkspace) mainWorkspace.scrollTop = 0;
}

function bindGlobalControlEvents() {
  const scenarioSelect = document.getElementById('traffic-scenario-select');
  if (scenarioSelect) {
    scenarioSelect.addEventListener('change', (e) => {
      loadScenario(e.target.value);
      updateAllViews();
    });
  }

  const threshInput = document.getElementById('global-threshold-input');
  const threshVal = document.getElementById('global-threshold-val');
  if (threshInput) {
    threshInput.addEventListener('input', (e) => {
      state.threshold = Number(e.target.value);
      if (threshVal) threshVal.textContent = `${state.threshold} Mbps`;
      updateAllViews();
    });
  }

  const resetBtn = document.getElementById('btn-reset-demo');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (scenarioSelect) scenarioSelect.value = 'perimeterFirewall';
      loadScenario('perimeterFirewall');
      updateAllViews();
    });
  }
}

function bindDistributionEvents() {
  // Analytical Mode Tabs
  const modeTabs = document.querySelectorAll('#dist-mode-tabs .radio-tab-btn');
  modeTabs.forEach(btn => {
    btn.addEventListener('click', () => {
      modeTabs.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.distMode = btn.getAttribute('data-mode');

      // Toggle Parameter Controls
      const pSingle = document.getElementById('dist-param-single');
      const pInterval = document.getElementById('dist-param-interval');
      const pEmpirical = document.getElementById('dist-param-empirical');

      if (pSingle) pSingle.style.display = (state.distMode === 'tail_upper' || state.distMode === 'tail_lower') ? 'flex' : 'none';
      if (pInterval) pInterval.style.display = state.distMode === 'interval' ? 'flex' : 'none';
      if (pEmpirical) pEmpirical.style.display = state.distMode === 'empirical' ? 'flex' : 'none';

      updateAllViews();
    });
  });

  // Empirical Level Buttons
  const empBtns = document.querySelectorAll('#dist-empirical-tabs .radio-tab-btn');
  empBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      empBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.distEmpiricalLevel = Number(btn.getAttribute('data-level'));
      updateAllViews();
    });
  });

  // Value X input
  const inputX = document.getElementById('dist-input-x');
  if (inputX) {
    inputX.addEventListener('input', (e) => {
      state.distValX = Number(e.target.value);
      updateAllViews();
    });
  }

  // Interval A & B inputs
  const inputA = document.getElementById('dist-input-a');
  const inputB = document.getElementById('dist-input-b');
  if (inputA) {
    inputA.addEventListener('input', (e) => {
      state.distIntervalA = Number(e.target.value);
      updateAllViews();
    });
  }
  if (inputB) {
    inputB.addEventListener('input', (e) => {
      state.distIntervalB = Number(e.target.value);
      updateAllViews();
    });
  }

  // Histogram Overlay Toggle Button
  const toggleHistBtn = document.getElementById('btn-toggle-histogram');
  if (toggleHistBtn) {
    toggleHistBtn.addEventListener('click', () => {
      state.showEmpiricalHistogram = !state.showEmpiricalHistogram;
      toggleHistBtn.classList.toggle('btn-toggle-active', state.showEmpiricalHistogram);
      toggleHistBtn.textContent = state.showEmpiricalHistogram ? '✓ Empirical Histogram Overlay' : 'Overlay Empirical Histogram';
      updateAllViews();
    });
  }
}

function bindTimeSeriesEvents() {
  const maTabs = document.querySelectorAll('#ma-window-tabs .radio-tab-btn');
  maTabs.forEach(btn => {
    btn.addEventListener('click', () => {
      maTabs.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.maMode = btn.getAttribute('data-ma-mode');
      state.maWindow = state.maMode === 'cma_5' ? 5 : 3;
      updateAllViews();
    });
  });
}

function bindValidationEvents() {
  const binsSelect = document.getElementById('chi-bins-select');
  if (binsSelect) {
    binsSelect.addEventListener('change', (e) => {
      state.chiNumBins = Number(e.target.value);
      updateAllViews();
    });
  }

  const chiAlphaSelect = document.getElementById('chi-alpha-select');
  if (chiAlphaSelect) {
    chiAlphaSelect.addEventListener('change', (e) => {
      state.chiAlpha = Number(e.target.value);
      updateAllViews();
    });
  }

  const fAlphaSelect = document.getElementById('f-alpha-select');
  if (fAlphaSelect) {
    fAlphaSelect.addEventListener('change', (e) => {
      state.fAlpha = Number(e.target.value);
      updateAllViews();
    });
  }
}

function bindMethodologyEvents() {
  const synthN = document.getElementById('synth-n');
  const synthNVal = document.getElementById('synth-n-val');
  if (synthN) {
    synthN.addEventListener('input', (e) => {
      state.synthN = Number(e.target.value);
      if (synthNVal) synthNVal.textContent = state.synthN.toString();
    });
  }

  const synthMean = document.getElementById('synth-mean');
  const synthMeanVal = document.getElementById('synth-mean-val');
  if (synthMean) {
    synthMean.addEventListener('input', (e) => {
      state.synthMean = Number(e.target.value);
      if (synthMeanVal) synthMeanVal.textContent = state.synthMean.toFixed(1);
    });
  }

  const synthStd = document.getElementById('synth-std');
  const synthStdVal = document.getElementById('synth-std-val');
  if (synthStd) {
    synthStd.addEventListener('input', (e) => {
      state.synthStd = Number(e.target.value);
      if (synthStdVal) synthStdVal.textContent = state.synthStd.toFixed(1);
    });
  }

  const genBtn = document.getElementById('btn-generate-custom');
  if (genBtn) {
    genBtn.addEventListener('click', () => {
      const scenarioSelect = document.getElementById('traffic-scenario-select');
      if (scenarioSelect) scenarioSelect.value = 'custom';
      loadScenario('custom');
      updateAllViews();
    });
  }

  const exportBtn = document.getElementById('btn-download-csv');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      const csvStr = exportToCSV(state.observations);
      const blob = new Blob([csvStr], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `campus_traffic_${state.scenario}_export.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  }

  // CSV Drag and drop file ingestion
  const dropZone = document.getElementById('csv-drop-zone');
  const fileInput = document.getElementById('csv-file-input');
  const uploadStatus = document.getElementById('csv-upload-status');

  if (dropZone && fileInput) {
    dropZone.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('drag-active');
    });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-active'));
    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('drag-active');
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleUploadedFile(e.dataTransfer.files[0]);
      }
    });
    fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        handleUploadedFile(e.target.files[0]);
      }
    });
  }

  function handleUploadedFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;
      const res = parseCSVData(content);
      if (res.error) {
        if (uploadStatus) {
          uploadStatus.style.display = 'block';
          uploadStatus.className = 'interpretation-box critical';
          uploadStatus.textContent = `Upload Error: ${res.error}`;
        }
      } else {
        state.scenario = 'upload';
        state.observations = res.data;
        const loads = res.data.map(o => o.load_mbps);
        const mean = calculateMean(loads);
        state.threshold = Math.round(mean * 1.25);
        state.distValX = state.threshold;
        state.distIntervalA = Math.round(mean * 0.85);
        state.distIntervalB = Math.round(mean * 1.15);

        if (uploadStatus) {
          uploadStatus.style.display = 'block';
          uploadStatus.className = 'interpretation-box';
          uploadStatus.innerHTML = `<strong>Successfully loaded ${res.data.length} observations</strong> from file <code>${file.name}</code>. Observatory pipeline synchronized.`;
        }
        updateAllViews();
      }
    };
    reader.readAsText(file);
  }
}

// Bootstrap
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

/**
 * NETLOAD: THE STATISTICAL OBSERVATORY
 * Scientific SVG Visualization Engine
 * 
 * Renders precise, publication-grade mathematical charts:
 * 1. Time-Series Network Load with Moving Average & Thresholds
 * 2. Continuous Normal Distribution with Analytical Shading
 * 3. Chi-Square Observed vs. Expected Frequency Comparison
 * 4. F-Test Variance Split Inspection
 * 5. Mini Bell Curve Sparkline
 */

import { normalPDF, normalCDF } from '../math/statistics.js';

// Color Palette Constants
export const PALETTE = {
  bgIvory: '#F5F3EC',
  surface: '#FFFFFF',
  surfaceAlt: '#FAF8F2',
  ink: '#17231F',
  slate: '#68746D',
  slateLight: '#8C9B92',
  teal: '#176B61',
  tealLight: 'rgba(23, 107, 97, 0.18)',
  tealGlow: 'rgba(23, 107, 97, 0.35)',
  cobalt: '#426BB2',
  cobaltLight: 'rgba(66, 107, 178, 0.20)',
  amber: '#B96E2E',
  amberLight: 'rgba(185, 110, 46, 0.22)',
  brickRed: '#B94C45',
  grid: '#DCE1D8',
  border: '#D0D6CC'
};

/**
 * Helper to create an SVG element with attributes
 */
function createSVGElement(tag, attrs = {}) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [key, val] of Object.entries(attrs)) {
    el.setAttribute(key, val);
  }
  return el;
}

// --------------------------------------------------------------------------
// 1. TIME-SERIES NETWORK LOAD CHART
// --------------------------------------------------------------------------

/**
 * Renders Scientific Time-Series Chart
 * @param {HTMLElement} container 
 * @param {Object} options 
 */
export function renderTimeSeriesChart(container, options = {}) {
  const {
    observations = [],
    movingAverages = [],
    mean = 0,
    threshold = 60,
    selectedIndex = -1,
    onSelectIndex = null,
    maWindow = 5
  } = options;

  container.innerHTML = '';
  const width = 860;
  const height = 340;
  const margin = { top: 32, right: 36, bottom: 48, left: 60 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  if (observations.length === 0) {
    container.innerHTML = '<div class="chart-empty-state">No time-series observations available.</div>';
    return;
  }

  // Calculate scales
  const loads = observations.map(o => (o.loadMbps !== undefined ? o.loadMbps : (o.load_mbps !== undefined ? o.load_mbps : 0)));
  const minLoad = Math.max(0, Math.min(...loads, mean - 5) - 4);
  const maxLoad = Math.max(...loads, threshold + 6, mean + 15) + 4;

  const xScale = (idx) => margin.left + (idx / (observations.length - 1)) * innerW;
  const yScale = (val) => margin.top + innerH - ((val - minLoad) / (maxLoad - minLoad)) * innerH;

  const svg = createSVGElement('svg', {
    viewBox: `0 0 ${width} ${height}`,
    class: 'scientific-svg time-series-svg',
    role: 'img',
    'aria-label': 'Network Load Time-Series Chart'
  });

  // Background rect with fine coordinate paper pattern
  svg.appendChild(createSVGElement('rect', {
    x: margin.left,
    y: margin.top,
    width: innerW,
    height: innerH,
    fill: '#FAF9F5',
    stroke: PALETTE.border,
    'stroke-width': '1'
  }));

  // Horizontal Grid Lines & Ticks (5 steps)
  const yTicksCount = 6;
  const yStep = (maxLoad - minLoad) / yTicksCount;
  for (let i = 0; i <= yTicksCount; i++) {
    const val = minLoad + i * yStep;
    const y = yScale(val);

    // Grid line
    svg.appendChild(createSVGElement('line', {
      x1: margin.left,
      y1: y,
      x2: margin.left + innerW,
      y2: y,
      stroke: PALETTE.grid,
      'stroke-width': '1',
      'stroke-dasharray': '2,3'
    }));

    // Y Axis measurement tick
    svg.appendChild(createSVGElement('line', {
      x1: margin.left - 5,
      y1: y,
      x2: margin.left,
      y2: y,
      stroke: PALETTE.slate,
      'stroke-width': '1'
    }));

    // Y Axis label
    const text = createSVGElement('text', {
      x: margin.left - 10,
      y: y + 4,
      'text-anchor': 'end',
      class: 'chart-tick-label'
    });
    text.textContent = `${val.toFixed(0)}`;
    svg.appendChild(text);
  }

  // Y-axis title
  const yTitle = createSVGElement('text', {
    x: margin.left - 42,
    y: margin.top - 12,
    'text-anchor': 'start',
    class: 'chart-axis-title'
  });
  yTitle.textContent = 'Load (Mbps)';
  svg.appendChild(yTitle);

  // X Axis Ticks & Time labels (approx 6-8 ticks)
  const xStep = Math.max(1, Math.floor(observations.length / 7));
  for (let i = 0; i < observations.length; i += xStep) {
    const x = xScale(i);
    const obs = observations[i];

    // Grid vertical line
    svg.appendChild(createSVGElement('line', {
      x1: x,
      y1: margin.top,
      x2: x,
      y2: margin.top + innerH,
      stroke: PALETTE.grid,
      'stroke-width': '0.75',
      'stroke-dasharray': '2,4'
    }));

    // Tick
    svg.appendChild(createSVGElement('line', {
      x1: x,
      y1: margin.top + innerH,
      x2: x,
      y2: margin.top + innerH + 5,
      stroke: PALETTE.slate,
      'stroke-width': '1'
    }));

    // Time label (extract day or HH:MM)
    let timeStr = `#${i}`;
    if (obs.dayName) {
      timeStr = obs.dayName.split(',')[0];
    } else if (obs.timestampIst) {
      const match = obs.timestampIst.match(/\d{2}:\d{2}/);
      timeStr = match ? match[0] : `#${i}`;
    } else if (obs.timestamp) {
      const match = obs.timestamp.match(/\d{2}:\d{2}/);
      timeStr = match ? match[0] : `#${i}`;
    }

    const text = createSVGElement('text', {
      x: x,
      y: margin.top + innerH + 20,
      'text-anchor': 'middle',
      class: 'chart-tick-label'
    });
    text.textContent = timeStr;
    svg.appendChild(text);
  }

  // X-axis title
  const xTitle = createSVGElement('text', {
    x: margin.left + innerW / 2,
    y: margin.top + innerH + 38,
    'text-anchor': 'middle',
    class: 'chart-axis-title'
  });
  xTitle.textContent = 'Observation Timeline (t: Oct 17 – Oct 24, 2026)';
  svg.appendChild(xTitle);

  // Reference Line: Mean (mu)
  const meanY = yScale(mean);
  if (meanY >= margin.top && meanY <= margin.top + innerH) {
    svg.appendChild(createSVGElement('line', {
      x1: margin.left,
      y1: meanY,
      x2: margin.left + innerW,
      y2: meanY,
      stroke: PALETTE.teal,
      'stroke-width': '1.5',
      'stroke-dasharray': '5,4'
    }));

    const meanBadge = createSVGElement('text', {
      x: margin.left + innerW - 8,
      y: meanY - 5,
      'text-anchor': 'end',
      fill: PALETTE.teal,
      class: 'chart-reference-text'
    });
    meanBadge.textContent = `Mean μ = ${mean.toFixed(1)} Mbps`;
    svg.appendChild(meanBadge);
  }

  // Reference Line: Capacity Threshold (Burnt Amber)
  const threshY = yScale(threshold);
  if (threshY >= margin.top && threshY <= margin.top + innerH) {
    svg.appendChild(createSVGElement('line', {
      x1: margin.left,
      y1: threshY,
      x2: margin.left + innerW,
      y2: threshY,
      stroke: PALETTE.amber,
      'stroke-width': '1.5',
      'stroke-dasharray': '6,3'
    }));

    const threshBadge = createSVGElement('text', {
      x: margin.left + innerW - 8,
      y: threshY - 5,
      'text-anchor': 'end',
      fill: PALETTE.amber,
      class: 'chart-reference-text'
    });
    threshBadge.textContent = `Capacity Threshold = ${threshold.toFixed(0)} Mbps`;
    svg.appendChild(threshBadge);
  }

  // Raw Series Line (Deep Teal)
  let rawPathD = '';
  observations.forEach((obs, idx) => {
    const val = obs.loadMbps !== undefined ? obs.loadMbps : (obs.load_mbps !== undefined ? obs.load_mbps : 0);
    const x = xScale(idx);
    const y = yScale(val);
    rawPathD += (idx === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`);
  });

  svg.appendChild(createSVGElement('path', {
    d: rawPathD,
    fill: 'none',
    stroke: PALETTE.teal,
    'stroke-width': '1.75',
    'stroke-linejoin': 'round',
    'stroke-linecap': 'round'
  }));

  // Moving Average Series Line (Muted Cobalt, handles both trailing and centered MA gaps)
  if (movingAverages.length > 0) {
    let maPathD = '';
    let inSegment = false;
    movingAverages.forEach((ma, idx) => {
      if (ma && ma.value !== null && ma.value !== undefined) {
        const x = xScale(idx);
        const y = yScale(ma.value);
        if (!inSegment) {
          maPathD += ` M ${x} ${y}`;
          inSegment = true;
        } else {
          maPathD += ` L ${x} ${y}`;
        }
      } else {
        inSegment = false;
      }
    });

    if (maPathD) {
      svg.appendChild(createSVGElement('path', {
        d: maPathD,
        fill: 'none',
        stroke: PALETTE.cobalt,
        'stroke-width': '2.25',
        'stroke-linejoin': 'round',
        'stroke-linecap': 'round'
      }));
    }
  }

  // Optional Linear Trendline (y = beta * t + alpha)
  const { trendline = null } = options;
  if (trendline && trendline.slope !== undefined) {
    const x0 = xScale(0);
    const y0 = yScale(trendline.intercept);
    const xEnd = xScale(observations.length - 1);
    const yEnd = yScale(trendline.intercept + trendline.slope * (observations.length - 1));
    svg.appendChild(createSVGElement('line', {
      x1: x0,
      y1: y0,
      x2: xEnd,
      y2: yEnd,
      stroke: PALETTE.brickRed,
      'stroke-width': '2',
      'stroke-dasharray': '5,3'
    }));
  }

  // Raw Data Points (Subtle dots)
  observations.forEach((obs, idx) => {
    const val = obs.loadMbps !== undefined ? obs.loadMbps : (obs.load_mbps !== undefined ? obs.load_mbps : 0);
    const x = xScale(idx);
    const y = yScale(val);
    const isExceed = val > threshold;

    const circle = createSVGElement('circle', {
      cx: x,
      cy: y,
      r: isExceed ? 3.5 : 2.5,
      fill: isExceed ? PALETTE.brickRed : PALETTE.surface,
      stroke: isExceed ? PALETTE.brickRed : PALETTE.teal,
      'stroke-width': '1.5',
      class: 'chart-data-point'
    });
    svg.appendChild(circle);
  });

  // Selected Observation Highlight
  if (selectedIndex >= 0 && selectedIndex < observations.length) {
    const selObs = observations[selectedIndex];
    const selVal = selObs.loadMbps !== undefined ? selObs.loadMbps : (selObs.load_mbps !== undefined ? selObs.load_mbps : 0);
    const selX = xScale(selectedIndex);
    const selY = yScale(selVal);

    // Vertical measurement line
    svg.appendChild(createSVGElement('line', {
      x1: selX,
      y1: margin.top,
      x2: selX,
      y2: margin.top + innerH,
      stroke: PALETTE.ink,
      'stroke-width': '1',
      'stroke-dasharray': '3,3'
    }));

    // Concentric target rings
    svg.appendChild(createSVGElement('circle', {
      cx: selX,
      cy: selY,
      r: 8,
      fill: 'none',
      stroke: PALETTE.ink,
      'stroke-width': '1.5'
    }));

    svg.appendChild(createSVGElement('circle', {
      cx: selX,
      cy: selY,
      r: 3.5,
      fill: PALETTE.ink
    }));

    // Callout tooltip flag
    const flagY = Math.max(margin.top + 16, Math.min(margin.top + innerH - 16, selY - 14));
    const flagText = createSVGElement('text', {
      x: selX > margin.left + innerW / 2 ? selX - 10 : selX + 10,
      y: flagY,
      'text-anchor': selX > margin.left + innerW / 2 ? 'end' : 'start',
      class: 'chart-selected-callout'
    });
    flagText.textContent = `t=${selectedIndex} • ${selVal.toFixed(1)} Mbps`;
    svg.appendChild(flagText);
  }

  // Interactive Invisible Hit Areas for scrubber / clicks
  const hitOverlay = createSVGElement('rect', {
    x: margin.left,
    y: margin.top,
    width: innerW,
    height: innerH,
    fill: 'transparent',
    style: 'cursor: crosshair;'
  });

  hitOverlay.addEventListener('mousemove', (e) => {
    const rect = container.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const boundedX = Math.max(margin.left, Math.min(margin.left + innerW, (mouseX / rect.width) * width));
    const ratio = (boundedX - margin.left) / innerW;
    const targetIdx = Math.round(ratio * (observations.length - 1));
    if (onSelectIndex && targetIdx !== selectedIndex) {
      onSelectIndex(targetIdx);
    }
  });

  hitOverlay.addEventListener('click', (e) => {
    const rect = container.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const boundedX = Math.max(margin.left, Math.min(margin.left + innerW, (mouseX / rect.width) * width));
    const ratio = (boundedX - margin.left) / innerW;
    const targetIdx = Math.round(ratio * (observations.length - 1));
    if (onSelectIndex) {
      onSelectIndex(targetIdx);
    }
  });

  svg.appendChild(hitOverlay);
  container.appendChild(svg);
}

// --------------------------------------------------------------------------
// 2. CONTINUOUS NORMAL DISTRIBUTION CHART (PDF & CDF SHADING)
// --------------------------------------------------------------------------

/**
 * Renders Normal Distribution Bell Curve with Interactive Area Shading
 * @param {HTMLElement} container 
 * @param {Object} options 
 */
export function renderNormalDistributionChart(container, options = {}) {
  const {
    mean = 50,
    sigma = 8,
    mode = 'tail_upper', // 'tail_upper', 'tail_lower', 'interval', 'empirical'
    valX = 58,
    intervalA = 42,
    intervalB = 58,
    empiricalLevel = 1, // 1 for 1*sigma, 2 for 2*sigma, 3 for 3*sigma
    showObservedHistogram = false,
    observedData = []
  } = options;

  container.innerHTML = '';
  const width = 860;
  const height = 360;
  const margin = { top: 36, right: 40, bottom: 58, left: 64 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  if (sigma <= 0) {
    container.innerHTML = '<div class="chart-empty-state">Invalid standard deviation (σ must be > 0).</div>';
    return;
  }

  // Display span: [mu - 3.8*sigma, mu + 3.8*sigma]
  const minX = mean - 3.8 * sigma;
  const maxX = mean + 3.8 * sigma;
  const peakPDF = normalPDF(mean, mean, sigma);
  const maxY = peakPDF * 1.15; // 15% headroom for annotations

  const xScale = (x) => margin.left + ((x - minX) / (maxX - minX)) * innerW;
  const yScale = (y) => margin.top + innerH - (y / maxY) * innerH;

  const svg = createSVGElement('svg', {
    viewBox: `0 0 ${width} ${height}`,
    class: 'scientific-svg normal-dist-svg',
    role: 'img',
    'aria-label': 'Normal Distribution Bell Curve'
  });

  // Chart Background
  svg.appendChild(createSVGElement('rect', {
    x: margin.left,
    y: margin.top,
    width: innerW,
    height: innerH,
    fill: '#FAF9F5',
    stroke: PALETTE.border,
    'stroke-width': '1'
  }));

  // Horizontal Grid Lines
  for (let i = 1; i <= 4; i++) {
    const valY = (maxY / 5) * i;
    const y = yScale(valY);

    svg.appendChild(createSVGElement('line', {
      x1: margin.left,
      y1: y,
      x2: margin.left + innerW,
      y2: y,
      stroke: PALETTE.grid,
      'stroke-width': '1',
      'stroke-dasharray': '2,3'
    }));

    const text = createSVGElement('text', {
      x: margin.left - 8,
      y: y + 4,
      'text-anchor': 'end',
      class: 'chart-tick-label'
    });
    if (maxY < 0.005) {
      text.textContent = valY.toExponential(1);
    } else if (maxY < 0.05) {
      text.textContent = valY.toFixed(4);
    } else {
      text.textContent = valY.toFixed(3);
    }
    svg.appendChild(text);
  }

  // Y-axis label
  const yAxisLabel = createSVGElement('text', {
    x: margin.left - 48,
    y: margin.top - 12,
    class: 'chart-axis-title'
  });
  yAxisLabel.textContent = 'Probability Density f(x)';
  svg.appendChild(yAxisLabel);

  // Sigma Step Vertical Markers (-3σ, -2σ, -1σ, μ, +1σ, +2σ, +3σ)
  const sigmaSteps = [-3, -2, -1, 0, 1, 2, 3];
  sigmaSteps.forEach(k => {
    const xVal = mean + k * sigma;
    const x = xScale(xVal);

    // Subtle vertical line
    svg.appendChild(createSVGElement('line', {
      x1: x,
      y1: margin.top,
      x2: x,
      y2: margin.top + innerH,
      stroke: k === 0 ? PALETTE.teal : PALETTE.grid,
      'stroke-width': k === 0 ? '1.5' : '1',
      'stroke-dasharray': k === 0 ? '4,3' : '2,4'
    }));

    // Measurement tick
    svg.appendChild(createSVGElement('line', {
      x1: x,
      y1: margin.top + innerH,
      x2: x,
      y2: margin.top + innerH + 5,
      stroke: PALETTE.slate,
      'stroke-width': '1'
    }));

    // X-axis value label
    const valText = createSVGElement('text', {
      x: x,
      y: margin.top + innerH + 18,
      'text-anchor': 'middle',
      class: 'chart-tick-label'
    });
    valText.textContent = `${xVal.toFixed(1)}`;
    svg.appendChild(valText);

    // Sigma notation label
    const sigmaLabel = createSVGElement('text', {
      x: x,
      y: margin.top + innerH + 32,
      'text-anchor': 'middle',
      class: 'chart-sigma-label',
      fill: k === 0 ? PALETTE.teal : PALETTE.slate
    });
    sigmaLabel.textContent = k === 0 ? 'μ' : (k > 0 ? `+${k}σ` : `${k}σ`);
    svg.appendChild(sigmaLabel);
  });

  // X-axis main title
  const xAxisLabel = createSVGElement('text', {
    x: margin.left + innerW / 2,
    y: margin.top + innerH + 48,
    'text-anchor': 'middle',
    class: 'chart-axis-title'
  });
  xAxisLabel.textContent = 'Network Load X (Mbps)';
  svg.appendChild(xAxisLabel);

  // Empirical Histogram Bars Overlay (Campus Telemetry)
  if (showObservedHistogram && observedData && observedData.length > 0) {
    const validObs = observedData.filter(v => v !== null && !isNaN(v) && v >= minX && v <= maxX);
    const numHistBins = 14;
    const hMin = Math.max(minX, Math.min(...validObs));
    const hMax = Math.min(maxX, Math.max(...validObs));
    const hWidth = (hMax - hMin) / numHistBins;
    
    if (hWidth > 0 && validObs.length > 0) {
      const counts = new Array(numHistBins).fill(0);
      validObs.forEach(v => {
        let b = Math.floor((v - hMin) / hWidth);
        if (b >= numHistBins) b = numHistBins - 1;
        if (b >= 0) counts[b]++;
      });

      const totalN = observedData.length;
      counts.forEach((cnt, idx) => {
        if (cnt > 0) {
          const bLeft = hMin + idx * hWidth;
          const bRight = bLeft + hWidth;
          // Empirical probability density = count / (N * binWidth)
          const density = cnt / (totalN * hWidth);
          const x1 = xScale(bLeft);
          const x2 = xScale(bRight);
          const yTop = Math.max(margin.top, yScale(density));
          const yBot = yScale(0);
          const barW = Math.max(1, x2 - x1 - 1.5);
          const barH = Math.max(0, yBot - yTop);

          svg.appendChild(createSVGElement('rect', {
            x: x1 + 0.75,
            y: yTop,
            width: barW,
            height: barH,
            fill: 'rgba(66, 107, 178, 0.16)',
            stroke: PALETTE.cobalt,
            'stroke-width': '1',
            class: 'empirical-hist-bar'
          }));
        }
      });
    }
  }

  // Sample Curve Generator (200 points)
  const steps = 240;
  const curvePoints = [];
  const dx = (maxX - minX) / steps;
  for (let i = 0; i <= steps; i++) {
    const curX = minX + i * dx;
    const curY = normalPDF(curX, mean, sigma);
    curvePoints.push({ x: curX, y: curY, px: xScale(curX), py: yScale(curY) });
  }

  // Determine Shading Region Boundaries
  let shadeStart = minX;
  let shadeEnd = maxX;

  if (mode === 'tail_upper') {
    shadeStart = Math.max(minX, valX);
    shadeEnd = maxX;
  } else if (mode === 'tail_lower') {
    shadeStart = minX;
    shadeEnd = Math.min(maxX, valX);
  } else if (mode === 'interval') {
    shadeStart = Math.max(minX, Math.min(intervalA, intervalB));
    shadeEnd = Math.min(maxX, Math.max(intervalA, intervalB));
  } else if (mode === 'empirical') {
    shadeStart = Math.max(minX, mean - empiricalLevel * sigma);
    shadeEnd = Math.min(maxX, mean + empiricalLevel * sigma);
  }

  // Construct Shaded Polygon Path
  const shadedPoints = curvePoints.filter(p => p.x >= shadeStart && p.x <= shadeEnd);
  if (shadedPoints.length >= 2) {
    const startX = xScale(shadeStart);
    const endX = xScale(shadeEnd);
    const baselineY = yScale(0);

    let shadePathD = `M ${startX} ${baselineY}`;
    shadePathD += ` L ${shadedPoints[0].px} ${shadedPoints[0].py}`;
    shadedPoints.forEach(p => {
      shadePathD += ` L ${p.px} ${p.py}`;
    });
    shadePathD += ` L ${endX} ${baselineY} Z`;

    const shadeEl = createSVGElement('path', {
      d: shadePathD,
      fill: mode === 'tail_upper' ? PALETTE.amberLight : PALETTE.tealLight,
      stroke: mode === 'tail_upper' ? PALETTE.amber : PALETTE.teal,
      'stroke-width': '1',
      'stroke-opacity': '0.6'
    });
    svg.appendChild(shadeEl);
  }

  // Continuous Bell Curve Stroke (Deep Teal)
  let bellCurveD = '';
  curvePoints.forEach((p, idx) => {
    bellCurveD += (idx === 0 ? `M ${p.px} ${p.py}` : ` L ${p.px} ${p.py}`);
  });

  svg.appendChild(createSVGElement('path', {
    d: bellCurveD,
    fill: 'none',
    stroke: PALETTE.teal,
    'stroke-width': '2.25',
    'stroke-linejoin': 'round',
    'stroke-linecap': 'round'
  }));

  // Selected Threshold Vertical Line (if in tail mode)
  if (mode === 'tail_upper' || mode === 'tail_lower') {
    const xPos = xScale(valX);
    if (xPos >= margin.left && xPos <= margin.left + innerW) {
      svg.appendChild(createSVGElement('line', {
        x1: xPos,
        y1: margin.top,
        x2: xPos,
        y2: margin.top + innerH,
        stroke: mode === 'tail_upper' ? PALETTE.amber : PALETTE.cobalt,
        'stroke-width': '2',
        'stroke-dasharray': '5,3'
      }));

      // Top flag badge
      const markerText = createSVGElement('text', {
        x: xPos,
        y: margin.top - 8,
        'text-anchor': 'middle',
        fill: mode === 'tail_upper' ? PALETTE.amber : PALETTE.cobalt,
        class: 'chart-marker-label'
      });
      markerText.textContent = `x = ${valX.toFixed(1)} Mbps`;
      svg.appendChild(markerText);
    }
  } else if (mode === 'interval') {
    // Interval A & B Markers
    [intervalA, intervalB].forEach((val, idx) => {
      const xPos = xScale(val);
      if (xPos >= margin.left && xPos <= margin.left + innerW) {
        svg.appendChild(createSVGElement('line', {
          x1: xPos,
          y1: margin.top,
          x2: xPos,
          y2: margin.top + innerH,
          stroke: PALETTE.cobalt,
          'stroke-width': '1.75',
          'stroke-dasharray': '4,3'
        }));

        const labelText = createSVGElement('text', {
          x: xPos,
          y: margin.top - 8,
          'text-anchor': 'middle',
          fill: PALETTE.cobalt,
          class: 'chart-marker-label'
        });
        labelText.textContent = `${idx === 0 ? 'a' : 'b'} = ${val.toFixed(1)}`;
        svg.appendChild(labelText);
      }
    });
  }

  // Mean Peak Annotation
  const meanX = xScale(mean);
  const meanY = yScale(peakPDF);
  svg.appendChild(createSVGElement('circle', {
    cx: meanX,
    cy: meanY,
    r: 3.5,
    fill: PALETTE.teal
  }));

  container.appendChild(svg);
}

// -------------------------------------------------------------
// 3. CHI-SQUARE OBSERVED VS EXPECTED BAR CHART
// -------------------------------------------------------------

/**
 * Renders Chi-Square Goodness-of-Fit Comparison Bar Chart
 * @param {HTMLElement} container 
 * @param {Object} chiData 
 */
export function renderChiSquareBarChart(container, chiData = {}) {
  const { binDetails = [], df = 3, chi2 = 0, pValue = 0.5, alpha = 0.05 } = chiData;

  container.innerHTML = '';
  const width = 860;
  const height = 320;
  const margin = { top: 32, right: 36, bottom: 64, left: 56 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  if (binDetails.length === 0) {
    container.innerHTML = '<div class="chart-empty-state">No frequency bin details available.</div>';
    return;
  }

  const maxFreq = Math.max(
    ...binDetails.map(b => Math.max(b.observed, b.expected)),
    8
  ) * 1.2;

  const yScale = (f) => margin.top + innerH - (f / maxFreq) * innerH;

  const svg = createSVGElement('svg', {
    viewBox: `0 0 ${width} ${height}`,
    class: 'scientific-svg chi-square-svg',
    role: 'img',
    'aria-label': 'Chi-Square Observed vs Expected Frequencies'
  });

  // Background
  svg.appendChild(createSVGElement('rect', {
    x: margin.left,
    y: margin.top,
    width: innerW,
    height: innerH,
    fill: '#FAF9F5',
    stroke: PALETTE.border,
    'stroke-width': '1'
  }));

  // Horizontal Grid
  const yTicks = 5;
  for (let i = 0; i <= yTicks; i++) {
    const val = (maxFreq / yTicks) * i;
    const y = yScale(val);

    svg.appendChild(createSVGElement('line', {
      x1: margin.left,
      y1: y,
      x2: margin.left + innerW,
      y2: y,
      stroke: PALETTE.grid,
      'stroke-width': '1',
      'stroke-dasharray': '2,3'
    }));

    const text = createSVGElement('text', {
      x: margin.left - 8,
      y: y + 4,
      'text-anchor': 'end',
      class: 'chart-tick-label'
    });
    text.textContent = val.toFixed(0);
    svg.appendChild(text);
  }

  // Y-axis label
  const yTitle = createSVGElement('text', {
    x: margin.left - 40,
    y: margin.top - 10,
    class: 'chart-axis-title'
  });
  yTitle.textContent = 'Frequency Count';
  svg.appendChild(yTitle);

  // Grouped Bars for Each Bin
  const binCount = binDetails.length;
  const groupW = innerW / binCount;
  const barW = Math.min(28, groupW * 0.35);

  binDetails.forEach((bin, idx) => {
    const groupCenter = margin.left + idx * groupW + groupW / 2;
    const obsX = groupCenter - barW - 2;
    const expX = groupCenter + 2;

    const obsY = yScale(bin.observed);
    const expY = yScale(bin.expected);
    const baselineY = yScale(0);

    // Observed Bar (Teal)
    svg.appendChild(createSVGElement('rect', {
      x: obsX,
      y: obsY,
      width: barW,
      height: Math.max(0, baselineY - obsY),
      fill: PALETTE.teal,
      stroke: PALETTE.ink,
      'stroke-width': '1'
    }));

    // Observed count label
    const obsLabel = createSVGElement('text', {
      x: obsX + barW / 2,
      y: obsY - 4,
      'text-anchor': 'middle',
      class: 'chart-bar-num',
      fill: PALETTE.teal
    });
    obsLabel.textContent = `${bin.observed}`;
    svg.appendChild(obsLabel);

    // Expected Bar (Muted Cobalt Pattern/Fill)
    svg.appendChild(createSVGElement('rect', {
      x: expX,
      y: expY,
      width: barW,
      height: Math.max(0, baselineY - expY),
      fill: PALETTE.cobaltLight,
      stroke: PALETTE.cobalt,
      'stroke-width': '1.5',
      'stroke-dasharray': '3,2'
    }));

    // Expected count label
    const expLabel = createSVGElement('text', {
      x: expX + barW / 2,
      y: expY - 4,
      'text-anchor': 'middle',
      class: 'chart-bar-num',
      fill: PALETTE.cobalt
    });
    expLabel.textContent = `${bin.expected.toFixed(1)}`;
    svg.appendChild(expLabel);

    // Bin interval label on X-axis
    const xLabel = createSVGElement('text', {
      x: groupCenter,
      y: baselineY + 18,
      'text-anchor': 'middle',
      class: 'chart-tick-label'
    });
    xLabel.textContent = bin.label;
    svg.appendChild(xLabel);

    // Residual contribution: (O - E)^2 / E
    const contribLabel = createSVGElement('text', {
      x: groupCenter,
      y: baselineY + 34,
      'text-anchor': 'middle',
      class: 'chart-diff-label'
    });
    contribLabel.textContent = `χ²ᵢ = ${bin.contribution.toFixed(2)}`;
    svg.appendChild(contribLabel);
  });

  // Cochran Warning Line: E < 5 (Dashed Amber)
  const fiveY = yScale(5);
  if (fiveY >= margin.top && fiveY <= margin.top + innerH) {
    svg.appendChild(createSVGElement('line', {
      x1: margin.left,
      y1: fiveY,
      x2: margin.left + innerW,
      y2: fiveY,
      stroke: PALETTE.amber,
      'stroke-width': '1',
      'stroke-dasharray': '4,4'
    }));

    const text = createSVGElement('text', {
      x: margin.left + innerW - 8,
      y: fiveY - 4,
      'text-anchor': 'end',
      fill: PALETTE.amber,
      class: 'chart-reference-text'
    });
    text.textContent = 'Cochran guideline threshold (E = 5)';
    svg.appendChild(text);
  }

  // Legend at top-right
  const legendG = createSVGElement('g', {
    transform: `translate(${margin.left + 16}, ${margin.top + 16})`
  });

  // Observed Legend Item
  legendG.appendChild(createSVGElement('rect', {
    x: 0, y: 0, width: 14, height: 10, fill: PALETTE.teal, stroke: PALETTE.ink, 'stroke-width': '1'
  }));
  const lObsText = createSVGElement('text', { x: 20, y: 9, class: 'chart-legend-text' });
  lObsText.textContent = 'Observed Frequencies Oᵢ';
  legendG.appendChild(lObsText);

  // Expected Legend Item
  legendG.appendChild(createSVGElement('rect', {
    x: 180, y: 0, width: 14, height: 10, fill: PALETTE.cobaltLight, stroke: PALETTE.cobalt, 'stroke-width': '1.5', 'stroke-dasharray': '3,2'
  }));
  const lExpText = createSVGElement('text', { x: 200, y: 9, class: 'chart-legend-text' });
  lExpText.textContent = 'Expected Frequencies Eᵢ (from fitted Normal)';
  legendG.appendChild(lExpText);

  svg.appendChild(legendG);
  container.appendChild(svg);
}

// -------------------------------------------------------------
// 4. F-TEST VARIANCE SPLIT COMPARISON CHART
// -------------------------------------------------------------

/**
 * Renders Split Variance Inspection for Two Observation Intervals
 * @param {HTMLElement} container 
 * @param {Object} fTestData 
 * @param {number[]} fullSeries 
 */
export function renderFTestVarianceChart(container, fTestData = {}, fullSeries = []) {
  const {
    mean1 = 0,
    mean2 = 0,
    s1 = 1,
    s2 = 1,
    var1 = 1,
    var2 = 1,
    fStatistic = 1,
    pValue = 0.5,
    alpha = 0.05
  } = fTestData;

  container.innerHTML = '';
  const width = 860;
  const height = 300;
  const margin = { top: 32, right: 36, bottom: 44, left: 56 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  if (fullSeries.length < 6) {
    container.innerHTML = '<div class="chart-empty-state">Insufficient data for split variance chart.</div>';
    return;
  }

  const splitIdx = fTestData.splitIdx !== undefined ? fTestData.splitIdx : Math.floor(fullSeries.length / 2);
  const minVal = Math.max(0, Math.min(...fullSeries) - 4);
  const maxVal = Math.max(...fullSeries) + 6;

  const xScale = (idx) => margin.left + (idx / (fullSeries.length - 1)) * innerW;
  const yScale = (v) => margin.top + innerH - ((v - minVal) / (maxVal - minVal)) * innerH;

  const svg = createSVGElement('svg', {
    viewBox: `0 0 ${width} ${height}`,
    class: 'scientific-svg f-test-svg',
    role: 'img',
    'aria-label': 'F-Test Variance Split Inspection Chart'
  });

  // Background
  svg.appendChild(createSVGElement('rect', {
    x: margin.left,
    y: margin.top,
    width: innerW,
    height: innerH,
    fill: '#FAF9F5',
    stroke: PALETTE.border,
    'stroke-width': '1'
  }));

  // Period 1 Variance Band (mean1 +/- s1)
  const p1StartX = xScale(0);
  const p1EndX = xScale(splitIdx);
  const p1TopY = yScale(mean1 + s1);
  const p1BotY = yScale(mean1 - s1);

  svg.appendChild(createSVGElement('rect', {
    x: p1StartX,
    y: p1TopY,
    width: p1EndX - p1StartX,
    height: Math.max(0, p1BotY - p1TopY),
    fill: 'rgba(23, 107, 97, 0.12)',
    stroke: PALETTE.teal,
    'stroke-width': '0.75',
    'stroke-dasharray': '2,2'
  }));

  // Period 2 Variance Band (mean2 +/- s2)
  const p2StartX = xScale(splitIdx);
  const p2EndX = xScale(fullSeries.length - 1);
  const p2TopY = yScale(mean2 + s2);
  const p2BotY = yScale(mean2 - s2);

  svg.appendChild(createSVGElement('rect', {
    x: p2StartX,
    y: p2TopY,
    width: p2EndX - p2StartX,
    height: Math.max(0, p2BotY - p2TopY),
    fill: 'rgba(66, 107, 178, 0.12)',
    stroke: PALETTE.cobalt,
    'stroke-width': '0.75',
    'stroke-dasharray': '2,2'
  }));

  // Midpoint Partition Line
  const midX = xScale(splitIdx);
  svg.appendChild(createSVGElement('line', {
    x1: midX,
    y1: margin.top,
    x2: midX,
    y2: margin.top + innerH,
    stroke: PALETTE.ink,
    'stroke-width': '1.5',
    'stroke-dasharray': '4,4'
  }));

  // Label: Period 1
  const p1Label = createSVGElement('text', {
    x: p1StartX + 6,
    y: margin.top - 10,
    'text-anchor': 'start',
    fill: PALETTE.teal,
    class: 'chart-partition-title',
    'font-size': '11px',
    'font-weight': '600'
  });
  p1Label.textContent = fTestData.period1Label ? `${fTestData.period1Label} • s₁ = ${s1.toFixed(1)} Mbps` : `Period 1 • s₁ = ${s1.toFixed(1)} Mbps`;
  svg.appendChild(p1Label);

  // Label: Period 2
  const p2Label = createSVGElement('text', {
    x: midX + 6,
    y: margin.top - 10,
    'text-anchor': 'start',
    fill: PALETTE.cobalt,
    class: 'chart-partition-title',
    'font-size': '11px',
    'font-weight': '600'
  });
  p2Label.textContent = fTestData.period2Label ? `${fTestData.period2Label} • s₂ = ${s2.toFixed(1)} Mbps` : `Period 2 • s₂ = ${s2.toFixed(1)} Mbps`;
  svg.appendChild(p2Label);

  // Draw full data line
  let pathD = '';
  fullSeries.forEach((v, idx) => {
    const x = xScale(idx);
    const y = yScale(v);
    pathD += (idx === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`);
  });

  svg.appendChild(createSVGElement('path', {
    d: pathD,
    fill: 'none',
    stroke: PALETTE.ink,
    'stroke-width': '1.5'
  }));

  // Points with period coloring
  fullSeries.forEach((v, idx) => {
    const isP1 = idx <= splitIdx;
    svg.appendChild(createSVGElement('circle', {
      cx: xScale(idx),
      cy: yScale(v),
      r: 2.5,
      fill: isP1 ? PALETTE.teal : PALETTE.cobalt,
      stroke: PALETTE.ink,
      'stroke-width': '0.75'
    }));
  });

  container.appendChild(svg);
}

// --------------------------------------------------------------------------
// 5. MINI SPARKLINES & LOGO BELL CURVE
// --------------------------------------------------------------------------

/**
 * Renders small logo icon SVG bell curve
 */
export function createBrandBellIcon() {
  const svg = createSVGElement('svg', {
    width: '28',
    height: '24',
    viewBox: '0 0 32 28',
    class: 'brand-bell-icon',
    fill: 'none'
  });

  // Base coordinate axis
  svg.appendChild(createSVGElement('line', {
    x1: '2', y1: '25', x2: '30', y2: '25', stroke: PALETTE.ink, 'stroke-width': '1.5'
  }));

  // Normal distribution curve path
  const curve = createSVGElement('path', {
    d: 'M 2 25 C 9 25, 12 5, 16 5 C 20 5, 23 25, 30 25',
    stroke: PALETTE.teal,
    'stroke-width': '2.2',
    fill: 'rgba(23, 107, 97, 0.15)'
  });
  svg.appendChild(curve);

  // Mean vertical tick
  svg.appendChild(createSVGElement('line', {
    x1: '16', y1: '5', x2: '16', y2: '25', stroke: PALETTE.ink, 'stroke-width': '1', 'stroke-dasharray': '2,2'
  }));

  return svg;
}

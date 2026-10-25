/**
 * NETLOAD: THE STATISTICAL OBSERVATORY
 * Mathematical Statistics & Numerical Analysis Engine
 * 
 * Implements rigorous statistical calculations:
 * - Summary statistics (Mean, Sample Variance, Std Dev, Skewness, Kurtosis)
 * - Normal Distribution (PDF, CDF via high-precision error function, Quantile function)
 * - Trailing Moving Averages & Variance Reduction
 * - Regularized Incomplete Gamma Function & Chi-Square Goodness-of-Fit Test
 * - Regularized Incomplete Beta Function & Two-Sample F-Test for Variance Equality
 */

// Constant definitions
export const SQRT_2PI = Math.sqrt(2 * Math.PI);
export const SQRT_2 = Math.sqrt(2);

/**
 * Calculates arithmetic sample mean (mu)
 * @param {number[]} data 
 * @returns {number}
 */
export function calculateMean(data) {
  if (!data || data.length === 0) return 0;
  const sum = data.reduce((acc, v) => acc + v, 0);
  return sum / data.length;
}

/**
 * Calculates sample median (50th percentile)
 * Typical load, resistant to extreme traffic spikes
 * @param {number[]} data 
 * @returns {number}
 */
export function calculateMedian(data) {
  if (!data || data.length === 0) return 0;
  const sorted = [...data].sort((a, b) => a - b);
  const n = sorted.length;
  if (n % 2 === 0) {
    return (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
  }
  return sorted[Math.floor(n / 2)];
}

/**
 * Calculates continuous grouped data mode using modal class interpolation:
 * Mode = L + [ (f1 - f0) / (2*f1 - f0 - f2) ] * h
 * Where:
 *  L = Lower limit of modal class
 *  f1 = Frequency of modal class
 *  f0 = Frequency of pre-modal class
 *  f2 = Frequency of post-modal class
 *  h = Class interval width
 * 
 * @param {number[]} data 
 * @param {number} [numBins=10]
 * @returns {{ mode: number, modalClass: [number, number], f1: number, f0: number, f2: number, width: number }}
 */
export function calculateContinuousMode(data, numBins = 10) {
  if (!data || data.length === 0) return { mode: 0, modalClass: [0, 0], f1: 0, f0: 0, f2: 0, width: 0 };
  const sorted = [...data].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  if (min === max) return { mode: min, modalClass: [min, max], f1: data.length, f0: 0, f2: 0, width: 0 };

  const k = Math.max(5, numBins);
  const width = (max - min) / k;
  const bins = Array.from({ length: k }, (_, i) => ({
    min: min + i * width,
    max: min + (i + 1) * width,
    count: 0
  }));

  data.forEach(v => {
    let idx = Math.floor((v - min) / width);
    if (idx >= k) idx = k - 1;
    bins[idx].count++;
  });

  let maxIdx = 0;
  bins.forEach((b, i) => {
    if (b.count > bins[maxIdx].count) maxIdx = i;
  });

  const modalClass = bins[maxIdx];
  const f1 = modalClass.count;
  const f0 = maxIdx > 0 ? bins[maxIdx - 1].count : 0;
  const f2 = maxIdx < k - 1 ? bins[maxIdx + 1].count : 0;
  const L = modalClass.min;
  const denom = 2 * f1 - f0 - f2;

  let modeVal;
  if (denom !== 0) {
    modeVal = L + ((f1 - f0) / denom) * width;
  } else {
    modeVal = (modalClass.min + modalClass.max) / 2;
  }

  return {
    mode: Number(modeVal.toFixed(2)),
    modalClass: [Number(modalClass.min.toFixed(2)), Number(modalClass.max.toFixed(2))],
    f1,
    f0,
    f2,
    width: Number(width.toFixed(2))
  };
}

/**
 * Calculates Fisher-Pearson sample skewness coefficient:
 * g1 = [ N / ((N-1)(N-2)) ] * sum( ((x_i - mean) / s)^3 )
 */
export function calculateSkewness(data, mean, stdDev) {
  const n = data.length;
  if (n < 3) return 0;
  const m = mean !== undefined ? mean : calculateMean(data);
  const s = stdDev !== undefined ? stdDev : calculateSampleStdDev(data, m);
  if (s === 0) return 0;

  const sumCubed = data.reduce((acc, v) => acc + Math.pow((v - m) / s, 3), 0);
  return (n / ((n - 1) * (n - 2))) * sumCubed;
}

/**
 * Calculates Pearson's second skewness coefficient:
 * Skew = 3 * (Mean - Median) / StdDev
 */
export function calculatePearsonSkewness(mean, median, stdDev) {
  if (stdDev === 0) return 0;
  return (3 * (mean - median)) / stdDev;
}

/**
 * Evaluates the 68–95–99.7 Empirical Rule distribution:
 * - Normal Range: |Z| <= 1 (Within 1 SD)
 * - Moderate Variation: 1 < |Z| <= 2
 * - Unusual Observation: 2 < |Z| <= 3 (High Alert)
 * - Extreme Outlier: |Z| > 3 (Flagged for DDoS, exfiltration, link failure)
 */
export function evaluateEmpiricalRule(data, mu, sigma) {
  if (!data || data.length === 0 || sigma <= 0) {
    return {
      total: 0,
      within1SD: { count: 0, pct: 0 },
      within2SD: { count: 0, pct: 0 },
      within3SD: { count: 0, pct: 0 },
      outliers3SD: { count: 0, pct: 0 },
      anomalies: []
    };
  }

  const n = data.length;
  let count1 = 0, count2 = 0, count3 = 0, count4 = 0;
  const anomalies = [];

  data.forEach((val, idx) => {
    const z = (val - mu) / sigma;
    const absZ = Math.abs(z);
    if (absZ <= 1) {
      count1++;
    } else if (absZ <= 2) {
      count2++;
    } else if (absZ <= 3) {
      count3++;
    } else {
      count4++;
      anomalies.push({ index: idx, value: val, z: Number(z.toFixed(2)) });
    }
  });

  return {
    total: n,
    within1SD: { count: count1, pct: Number(((count1 / n) * 100).toFixed(1)) },
    within2SD: { count: count2, pct: Number(((count2 / n) * 100).toFixed(1)) },
    within3SD: { count: count3, pct: Number(((count3 / n) * 100).toFixed(1)) },
    outliers3SD: { count: count4, pct: Number(((count4 / n) * 100).toFixed(1)) },
    anomalies
  };
}

/**
 * Calculates sample variance s^2 with Bessel's correction (N - 1)
 * @param {number[]} data 
 * @param {number} [mean] Optional precalculated mean
 * @returns {number}
 */
export function calculateSampleVariance(data, mean) {
  if (!data || data.length < 2) return 0;
  const m = mean !== undefined ? mean : calculateMean(data);
  const sumSqDiff = data.reduce((acc, v) => acc + Math.pow(v - m, 2), 0);
  return sumSqDiff / (data.length - 1);
}

/**
 * Calculates population variance sigma^2 (N)
 * @param {number[]} data 
 * @param {number} [mean] Optional precalculated mean
 * @returns {number}
 */
export function calculatePopulationVariance(data, mean) {
  if (!data || data.length === 0) return 0;
  const m = mean !== undefined ? mean : calculateMean(data);
  const sumSqDiff = data.reduce((acc, v) => acc + Math.pow(v - m, 2), 0);
  return sumSqDiff / data.length;
}

/**
 * Calculates sample standard deviation s = sqrt(sample variance)
 * @param {number[]} data 
 * @param {number} [mean]
 * @returns {number}
 */
export function calculateSampleStdDev(data, mean) {
  return Math.sqrt(calculateSampleVariance(data, mean));
}

/**
 * Standard Error of the Mean: SE = s / sqrt(N)
 */
export function calculateStandardError(data) {
  if (!data || data.length === 0) return 0;
  return calculateSampleStdDev(data) / Math.sqrt(data.length);
}

/**
 * Standardized score: z = (x - mu) / sigma
 */
export function calculateZScore(x, mu, sigma) {
  if (sigma === 0) return 0;
  return (x - mu) / sigma;
}

/**
 * High-precision error function erf(x)
 * Abramowitz and Stegun approximation 7.1.26 (max error < 1.5e-7)
 */
export function erf(x) {
  const sign = x >= 0 ? 1 : -1;
  const absX = Math.abs(x);

  const p = 0.3275911;
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;

  const t = 1.0 / (1.0 + p * absX);
  const poly = ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t;
  const y = 1.0 - poly * Math.exp(-absX * absX);

  return sign * y;
}

/**
 * Complementary error function erfc(x) = 1 - erf(x)
 */
export function erfc(x) {
  return 1.0 - erf(x);
}

/**
 * Normal Probability Density Function (PDF)
 * f(x) = [1 / (sigma * sqrt(2*pi))] * exp( - (x - mu)^2 / (2 * sigma^2) )
 */
export function normalPDF(x, mu, sigma) {
  if (sigma <= 0) return 0;
  const z = (x - mu) / sigma;
  return (1.0 / (sigma * SQRT_2PI)) * Math.exp(-0.5 * z * z);
}

/**
 * Standard Normal Cumulative Distribution Function (CDF) Phi(z)
 * Phi(z) = 0.5 * [1 + erf(z / sqrt(2))]
 */
export function standardNormalCDF(z) {
  return 0.5 * (1.0 + erf(z / SQRT_2));
}

/**
 * General Normal Cumulative Distribution Function (CDF)
 * F(x) = P(X <= x)
 */
export function normalCDF(x, mu, sigma) {
  if (sigma <= 0) return x >= mu ? 1.0 : 0.0;
  const z = calculateZScore(x, mu, sigma);
  return standardNormalCDF(z);
}

/**
 * Probability of network load lying within interval [a, b]
 * P(a < X < b) = F(b) - F(a)
 */
export function intervalProbability(a, b, mu, sigma) {
  const min = Math.min(a, b);
  const max = Math.max(a, b);
  return Math.max(0, normalCDF(max, mu, sigma) - normalCDF(min, mu, sigma));
}

/**
 * Upper tail probability: P(X > threshold) = 1 - F(threshold)
 */
export function upperTailProbability(threshold, mu, sigma) {
  return Math.max(0, 1.0 - normalCDF(threshold, mu, sigma));
}

/**
 * Lower tail probability: P(X <= threshold) = F(threshold)
 */
export function lowerTailProbability(threshold, mu, sigma) {
  return normalCDF(threshold, mu, sigma);
}

/**
 * Inverse Normal Cumulative Distribution (Quantile Function)
 * Rational approximation (Peter J. Acklam)
 */
export function normalQuantile(p, mu = 0, sigma = 1) {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;

  const a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02, 1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
  const b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02, 6.680131188771972e+01, -1.328068155288572e+01];
  const c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00, -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
  const d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00, 3.754408661907416e+00];

  const p_low = 0.02425;
  const p_high = 1 - p_low;
  let q, r, z;

  if (p < p_low) {
    q = Math.sqrt(-2 * Math.log(p));
    z = (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  } else if (p <= p_high) {
    q = p - 0.5;
    r = q * q;
    z = (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
      (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  } else {
    q = Math.sqrt(-2 * Math.log(1 - p));
    z = -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }

  return mu + sigma * z;
}

/**
 * Trailing Moving Average series
 * MA_t = (x_t + x_{t-1} + ... + x_{t-k+1}) / k
 * For observations t < k, calculates available trailing partial average with flag
 */
export function calculateMovingAverages(series, k = 5) {
  if (!series || series.length === 0) return [];
  const result = [];

  for (let t = 0; t < series.length; t++) {
    const windowStart = Math.max(0, t - k + 1);
    const window = series.slice(windowStart, t + 1);
    const sum = window.reduce((acc, v) => acc + v, 0);
    const avg = sum / window.length;
    result.push({
      index: t,
      value: avg,
      isFullWindow: (t >= k - 1),
      windowCount: window.length
    });
  }

  return result;
}

/**
 * 3-Period Centered Moving Average (CMA_3) for retrospective smoothing:
 * CMA_3(t) = (x_{t-1} + x_t + x_{t+1}) / 3
 * For boundary points t = 0 and t = N-1, returns null as taught in Module 4
 */
export function calculateCenteredMA3(series) {
  if (!series || series.length < 3) return [];
  const n = series.length;
  return series.map((val, t) => {
    if (t < 1 || t > n - 2) {
      return { index: t, value: null, isDefined: false };
    }
    const avg = (series[t - 1] + series[t] + series[t + 1]) / 3;
    return { index: t, value: avg, isDefined: true };
  });
}

/**
 * 4-Period Centered Moving Average (CMA_4) using classical two-step centering:
 * Matching Karunya Module 4 Time Series:
 * Step 1: 4-period moving total at midpoints t + 0.5
 * Step 2: 2-period moving average of the moving totals to center on integer time t:
 * CMA_4(t) = (x_{t-2} + 2*x_{t-1} + 2*x_t + 2*x_{t+1} + x_{t+2}) / 8
 * Defined for t = 2 to t = N - 3
 */
export function calculateCenteredMA4(series) {
  if (!series || series.length < 5) return [];
  const n = series.length;
  return series.map((val, t) => {
    if (t < 2 || t > n - 3) {
      return { index: t, value: null, isDefined: false };
    }
    const avg = (series[t - 2] + 2 * series[t - 1] + 2 * series[t] + 2 * series[t + 1] + series[t + 2]) / 8;
    return { index: t, value: avg, isDefined: true };
  });
}

/**
 * 5-Period Centered Moving Average (CMA_5) for retrospective smoothing:
 * CMA_5(t) = (x_{t-2} + x_{t-1} + x_t + x_{t+1} + x_{t+2}) / 5
 * Defined for t = 2 to t = N - 3
 */
export function calculateCenteredMA5(series) {
  if (!series || series.length < 5) return [];
  const n = series.length;
  return series.map((val, t) => {
    if (t < 2 || t > n - 3) {
      return { index: t, value: null, isDefined: false };
    }
    const avg = (series[t - 2] + series[t - 1] + series[t] + series[t + 1] + series[t + 2]) / 5;
    return { index: t, value: avg, isDefined: true };
  });
}

/**
 * Calculates linear regression trend for time-series: y = beta * t + alpha
 */
export function calculateLinearTrend(data) {
  const n = data.length;
  if (n < 2) return { slope: 0, intercept: data[0] || 0, r2: 0, direction: 'stable' };

  let sumT = 0, sumY = 0, sumTY = 0, sumT2 = 0, sumY2 = 0;
  for (let t = 0; t < n; t++) {
    const y = data[t];
    sumT += t;
    sumY += y;
    sumTY += t * y;
    sumT2 += t * t;
    sumY2 += y * y;
  }

  const denominator = n * sumT2 - sumT * sumT;
  if (denominator === 0) return { slope: 0, intercept: sumY / n, r2: 0, direction: 'stable' };

  const slope = (n * sumTY - sumT * sumY) / denominator;
  const intercept = (sumY - slope * sumT) / n;

  // Correlation coefficient squared (r^2)
  const ssTot = sumY2 - (sumY * sumY) / n;
  const ssRes = sumY2 - intercept * sumY - slope * sumTY;
  const r2 = ssTot > 0 ? Math.max(0, 1 - ssRes / ssTot) : 0;

  let direction = 'stable';
  if (slope > 0.08) direction = 'increasing';
  else if (slope < -0.08) direction = 'decreasing';

  return { slope, intercept, r2, direction };
}

// -------------------------------------------------------------
// ADVANCED SPECIAL FUNCTIONS FOR HYPOTHESIS TESTING (CHI-SQUARE & F-TEST)
// -------------------------------------------------------------

/**
 * Lanczos approximation for log-gamma ln(Gamma(z))
 */
export function logGamma(z) {
  if (z <= 0) return 0;
  const c = [
    76.18009172947146,
    -86.50532032941677,
    24.01409824083091,
    -1.231739572450155,
    0.1208650973866179e-2,
    -0.5395239384953e-5
  ];
  let x = z;
  let y = z;
  let tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;
  for (let j = 0; j < 6; j++) {
    y += 1;
    ser += c[j] / y;
  }
  return -tmp + Math.log(2.5066282746310005 * ser / x);
}

/**
 * Lower incomplete regularized gamma P(s, x) via series expansion
 */
function gammpSeries(s, x) {
  const ITMAX = 100;
  const EPS = 3.0e-7;
  let sum, del, ap;
  let gln = logGamma(s);
  ap = s;
  del = sum = 1.0 / s;
  for (let n = 1; n <= ITMAX; n++) {
    ap += 1.0;
    del *= x / ap;
    sum += del;
    if (Math.abs(del) < Math.abs(sum) * EPS) {
      return sum * Math.exp(-x + s * Math.log(x) - gln);
    }
  }
  return sum * Math.exp(-x + s * Math.log(x) - gln);
}

/**
 * Upper incomplete regularized gamma Q(s, x) via continued fraction
 */
function gammqContFraction(s, x) {
  const ITMAX = 100;
  const EPS = 3.0e-7;
  const FPMIN = 1.0e-30;
  let gln = logGamma(s);
  let b = x + 1.0 - s;
  let c = 1.0 / FPMIN;
  let d = 1.0 / b;
  let h = d;
  for (let i = 1; i <= ITMAX; i++) {
    let an = -i * (i - s);
    b += 2.0;
    d = an * d + b;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = b + an / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1.0 / d;
    let del = d * c;
    h *= del;
    if (Math.abs(del - 1.0) < EPS) break;
  }
  return Math.exp(-x + s * Math.log(x) - gln) * h;
}

/**
 * Regularized upper incomplete gamma function Q(s, x) = 1 - P(s, x)
 * Used to calculate Chi-Square p-value: p = Q(df / 2, chi2 / 2)
 */
export function regularizedGammaQ(s, x) {
  if (x < 0.0 || s <= 0.0) return 0.0;
  if (x === 0.0) return 1.0;
  if (x < s + 1.0) {
    return 1.0 - gammpSeries(s, x);
  } else {
    return gammqContFraction(s, x);
  }
}

/**
 * Regularized Incomplete Beta Function I_x(a, b) via continued fraction
 * Used for Student's t and Snedecor's F distributions
 */
export function regularizedIncompleteBeta(x, a, b) {
  if (x <= 0) return 0.0;
  if (x >= 1.0) return 1.0;

  // Symmetry transformation
  if (x > (a + 1.0) / (a + b + 2.0)) {
    return 1.0 - regularizedIncompleteBeta(1.0 - x, b, a);
  }

  const factor = Math.exp(logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log(1.0 - x)) / a;

  // Continued fraction (Lentz's method)
  const MAXIT = 100;
  const EPS = 3.0e-7;
  const FPMIN = 1.0e-30;

  let c = 1.0;
  let d = 1.0 - (a + b) * x / (a + 1.0);
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1.0 / d;
  let h = d;

  for (let m = 1; m <= MAXIT; m++) {
    const m2 = 2 * m;
    // Even step
    let aa = m * (b - m) * x / ((a + m2 - 1.0) * (a + m2));
    d = 1.0 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1.0 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1.0 / d;
    h *= d * c;

    // Odd step
    aa = -(a + m) * (a + b + m) * x / ((a + m2) * (a + m2 + 1.0));
    d = 1.0 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1.0 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1.0 / d;
    const del = d * c;
    h *= del;

    if (Math.abs(del - 1.0) < EPS) break;
  }

  return factor * h;
}

/**
 * F-Distribution Cumulative Distribution Function CDF(F, df1, df2)
 */
export function fDistributionCDF(f, df1, df2) {
  if (f <= 0) return 0.0;
  const x = (df1 * f) / (df1 * f + df2);
  return regularizedIncompleteBeta(x, df1 / 2.0, df2 / 2.0);
}

// -------------------------------------------------------------
// CHI-SQUARE GOODNESS-OF-FIT TEST FOR NORMALITY
// -------------------------------------------------------------

/**
 * Conducts Chi-Square Goodness-of-Fit Test for Normal Distribution
 * 
 * Account for estimated parameters:
 * df = k - 1 - p
 * With p = 2 (mu and sigma estimated from the sample data), df = k - 3
 * 
 * @param {number[]} data Sample observations
 * @param {number} [numBins=6] Number of intervals
 * @param {number} [alpha=0.05] Significance level
 */
export function performChiSquareTest(data, numBins = 6, alpha = 0.05) {
  const n = data.length;
  if (n < 10) {
    return {
      error: 'Sample size too small for reliable Chi-Square test (minimum N >= 10 recommended).',
      isValid: false
    };
  }

  const mu = calculateMean(data);
  const sigma = calculateSampleStdDev(data, mu);

  if (sigma <= 0) {
    return {
      error: 'Sample standard deviation is zero; cannot fit a continuous Normal curve.',
      isValid: false
    };
  }

  // Construct k bins covering (-Infinity, +Infinity) using equal-width intervals in [mu - 2.5*sigma, mu + 2.5*sigma]
  const k = Math.max(5, Math.min(10, numBins));
  const minRange = mu - 2.5 * sigma;
  const maxRange = mu + 2.5 * sigma;
  const binWidth = (maxRange - minRange) / (k - 2);

  const binEdges = [];
  binEdges.push(-Infinity);
  for (let i = 0; i < k - 1; i++) {
    binEdges.push(minRange + i * binWidth);
  }
  binEdges.push(Infinity);

  const observed = new Array(k).fill(0);
  const expected = new Array(k).fill(0);
  const binProbabilities = new Array(k).fill(0);
  const binLabels = [];

  // Count observed frequencies
  for (let val of data) {
    let placed = false;
    for (let i = 0; i < k; i++) {
      const lower = binEdges[i];
      const upper = binEdges[i + 1];
      if (val >= lower && (i === k - 1 ? val <= upper : val < upper)) {
        observed[i]++;
        placed = true;
        break;
      }
    }
    if (!placed) observed[k - 1]++;
  }

  // Calculate expected frequencies from fitted Normal CDF
  for (let i = 0; i < k; i++) {
    const lower = binEdges[i];
    const upper = binEdges[i + 1];

    const pLower = lower === -Infinity ? 0.0 : normalCDF(lower, mu, sigma);
    const pUpper = upper === Infinity ? 1.0 : normalCDF(upper, mu, sigma);
    const prob = Math.max(0.0001, pUpper - pLower);

    binProbabilities[i] = prob;
    expected[i] = n * prob;

    let label = '';
    if (lower === -Infinity) label = `< ${upper.toFixed(1)}`;
    else if (upper === Infinity) label = `≥ ${lower.toFixed(1)}`;
    else label = `${lower.toFixed(1)}–${upper.toFixed(1)}`;
    binLabels.push(label);
  }

  // Calculate Chi-Square statistic: chi2 = sum ( (O_i - E_i)^2 / E_i )
  let chi2 = 0;
  const binDetails = [];
  let lowExpectedCount = 0;

  for (let i = 0; i < k; i++) {
    const o = observed[i];
    const e = expected[i];
    const diff = o - e;
    const term = (diff * diff) / e;
    chi2 += term;

    if (e < 5) lowExpectedCount++;

    binDetails.push({
      binIndex: i,
      label: binLabels[i],
      lowerEdge: binEdges[i],
      upperEdge: binEdges[i + 1],
      observed: o,
      expected: Number(e.toFixed(2)),
      probability: Number(binProbabilities[i].toFixed(4)),
      residual: Number(diff.toFixed(2)),
      contribution: Number(term.toFixed(3))
    });
  }

  // Degrees of freedom: k - 1 - 2 = k - 3
  const df = Math.max(1, k - 3);

  // Compute p-value = Q(df / 2, chi2 / 2)
  const pValue = regularizedGammaQ(df / 2.0, chi2 / 2.0);

  // Cochran's condition check: No expected count < 1, and no more than 20% < 5
  const hasExpectedBelowOne = expected.some(e => e < 1.0);
  const percentBelowFive = (lowExpectedCount / k) * 100;
  const cochranWarning = hasExpectedBelowOne || percentBelowFive > 20;

  // Decision rule: If p-value < alpha, reject H0; else fail to reject H0
  const rejectH0 = pValue < alpha;

  let interpretation = '';
  if (rejectH0) {
    interpretation = `At the α = ${alpha} significance level, we reject the null hypothesis H₀ (χ² = ${chi2.toFixed(3)}, df = ${df}, p = ${pValue < 0.0001 ? '< 0.0001' : pValue.toFixed(4)} < ${alpha}). There is statistically significant evidence that the observed campus traffic deviates from a single stationary Normal distribution. As documented in classical network literature (Schmidt et al. [4], Antoniou et al. [3]), aggregated 7-day campus traffic exhibits strong diurnal oscillation between active daytime academic hours and quiet nocturnal troughs. This diurnal cycle creates a multi-modal, right-skewed composite distribution (Mean > Median) that departs from a single static Gaussian curve.`;
  } else {
    interpretation = `At the α = ${alpha} significance level, we fail to reject the null hypothesis H₀ (χ² = ${chi2.toFixed(3)}, df = ${df}, p = ${pValue.toFixed(4)} ≥ ${alpha}). There is insufficient evidence to conclude the network load departs from a Normal distribution. The Gaussian approximation N(${mu.toFixed(1)}, ${sigma.toFixed(1)}²) remains an operationally tenable model for this observation window. Note: In hypothesis testing, failing to reject H₀ does not prove absolute normality; it indicates the empirical data is statistically consistent with Gaussian assumptions within this window.`;
  }

  return {
    isValid: true,
    n,
    k,
    mu,
    sigma,
    chi2: Number(chi2.toFixed(3)),
    df,
    alpha,
    pValue: Number(pValue.toFixed(4)),
    rejectH0,
    cochranWarning,
    lowExpectedCount,
    percentBelowFive: Number(percentBelowFive.toFixed(1)),
    interpretation,
    binDetails
  };
}

// -------------------------------------------------------------
// F-TEST FOR VARIANCE EQUALITY
// -------------------------------------------------------------

/**
 * Conducts Two-Sample F-Test for Equality of Variances
 * 
 * Compares variance between Period 1 (e.g. first half of series) and Period 2 (second half)
 * 
 * H0: sigma_1^2 = sigma_2^2
 * H1: sigma_1^2 != sigma_2^2
 * 
 * @param {number[]} period1Data Observations in Period 1
 * @param {number[]} period2Data Observations in Period 2
 * @param {number} [alpha=0.05]
 */
export function performFTest(period1Data, period2Data, alpha = 0.05) {
  const n1 = period1Data.length;
  const n2 = period2Data.length;

  if (n1 < 3 || n2 < 3) {
    return {
      error: 'Both comparison periods must contain at least 3 observations.',
      isValid: false
    };
  }

  const mean1 = calculateMean(period1Data);
  const mean2 = calculateMean(period2Data);
  const var1 = calculateSampleVariance(period1Data, mean1);
  const var2 = calculateSampleVariance(period2Data, mean2);
  const s1 = Math.sqrt(var1);
  const s2 = Math.sqrt(var2);

  if (var1 === 0 || var2 === 0) {
    return {
      error: 'Sample variance in one period is zero; F-ratio is undefined.',
      isValid: false
    };
  }

  const df1 = n1 - 1;
  const df2 = n2 - 1;
  const rawF = var1 / var2;

  // For two-tailed F-test p-value
  const cdfValue = fDistributionCDF(rawF, df1, df2);
  const pValue = Math.min(1.0, 2.0 * Math.min(cdfValue, 1.0 - cdfValue));

  const rejectH0 = pValue < alpha;

  let interpretation = '';
  if (rejectH0) {
    interpretation = `At the α = ${alpha} level, we reject H₀ (F = ${rawF.toFixed(3)}, p = ${pValue.toFixed(4)} < ${alpha}). There is a statistically significant change in network load variance between Period 1 (s₁² = ${var1.toFixed(2)}) and Period 2 (s₂² = ${var2.toFixed(2)}). Traffic volatility or link dispersion has shifted across the two observation intervals.`;
  } else {
    interpretation = `At the α = ${alpha} level, we fail to reject H₀ (F = ${rawF.toFixed(3)}, p = ${pValue.toFixed(4)} ≥ ${alpha}). There is no statistically significant evidence that the variance differs between Period 1 (s₁ = ${s1.toFixed(1)} Mbps) and Period 2 (s₂ = ${s2.toFixed(1)} Mbps). Network volatility may be treated as relatively stationary across this comparison split.`;
  }

  return {
    isValid: true,
    n1,
    n2,
    mean1: Number(mean1.toFixed(2)),
    mean2: Number(mean2.toFixed(2)),
    var1: Number(var1.toFixed(3)),
    var2: Number(var2.toFixed(3)),
    s1: Number(s1.toFixed(2)),
    s2: Number(s2.toFixed(2)),
    df1,
    df2,
    fStatistic: Number(rawF.toFixed(3)),
    pValue: Number(pValue.toFixed(4)),
    alpha,
    rejectH0,
    interpretation,
    assumptionsWarning: 'Assumption: Both sample intervals are assumed to be approximately normally distributed and independent. In real-world telemetry, adjacent packets or polling intervals may exhibit serial autocorrelation, which inflates Type I error rates.'
  };
}

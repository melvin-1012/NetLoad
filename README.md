# NETLOAD: The Statistical Observatory
### Network Load Analysis Using Normal Distribution
**Probability and Statistics for Computer Science — Micro-Project (CO1–CO5)**

---

## 1. Project Overview & Creative Identity

**NETLOAD: The Statistical Observatory** is a precision mathematical research instrument and editorial data workstation designed to evaluate uncertain network traffic through classical continuous probability theory and hypothesis testing.

Unlike generic corporate dashboards, this system is styled as an academic research instrument with:
- **Warm ivory paper palette** (`#F5F3EC`), deep ink typography (`#17231F`), coordinate graph-paper gridlines (`#DCE1D8`), and technical accents in deep teal (`#176B61`), muted cobalt (`#426BB2`), and burnt amber (`#B96E2E`).
- **Mathematical typography** with editorial headings (*Newsreader*), clean interface text (*Inter*), and monospaced numerical formatting (*JetBrains Mono*).
- **Publication-grade pure SVG visualization** with measurement ticks, empirical histogram overlays, continuous probability density curve shading, observed vs. expected frequency bars, and split-period variance bands.
- **Strict mathematical decoupling** across numerical statistics, real campus telemetry data pipelines, SVG rendering, and reactive view controllers.

---

## 2. Primary Campus Telemetry Datasets

The workstation is bound by default to real university campus network captures:

1. **Campus Perimeter Firewall Gateway (`Cleaned_Firewall_Traffic.csv`):**
   - **Sample Count:** 111 sequential observations at 1.5-hour intervals, spanning Oct 17 to Oct 24, 2026.
   - **Ingress Traffic ($Total\_Rx\_Mbps$):** Sum of 25 Rx interface columns (`Rx`, `Rx_1`, ..., `Rx_24`) converted from bps to Mbps ($\sum \text{Rx} / 10^6$).
   - **Egress Traffic ($Total\_Tx\_Mbps$):** Sum of absolute values of negative measurements (`unlabeled_measurement_001` to `025`) in bps / $10^6$.
   - **Total Aggregated Traffic ($Total\_Agg\_Mbps$):** $Total\_Rx\_Mbps + Total\_Tx\_Mbps$.
   - **Benchmark Metrics:** Mean $\mu = 967.57$ Mbps, Median $M = 556.75$ Mbps, Mode $Mo = 347.36$ Mbps, Std Dev $\sigma = 867.71$ Mbps, Variance $s^2 = 752,924.12$ Mbps$^2$, Skewness $g_1 = +1.131$ (Positive skewness: $\text{Mean} > \text{Median} > \text{Mode}$).

2. **Campus Core Switch Aggregation Fabric (`Cleaned_Core_Switch_Traffic.csv`):**
   - **Sample Count:** 111 sequential observations across 97 switch ports.
   - **Benchmark Metrics:** Mean $\mu = 8878.74$ Mbps, Median $M = 7820.98$ Mbps, Std Dev $\sigma = 2159.70$ Mbps, Variance $s^2 = 4,664,303.22$ Mbps$^2$.

3. **Pedagogical Sandboxes (Secondary):**
   - Standard Normal Baseline, High Congestion Surge, Dual Workload Bimodal, Quiet Off-Peak, and Custom Box-Muller Synthesizer.

---

## 3. Course Outcomes Alignment (CO1–CO5)

| Course Outcome | Focus Area | Implementation in Observatory | Lecture Slide Reference |
| :--- | :--- | :--- | :--- |
| **CO1** | *Evaluate decisions of intelligent systems using probability* | **Section 00 (Overview):** Evaluates intelligent load balancer decisions using **Conditional Probability & Bayes' Theorem** ($P(\text{Congestion} \mid \text{Alert}) = \frac{P(\text{Alert} \mid \text{Congestion})P(\text{Congestion})}{P(\text{Alert})}$) with Total Probability evidence to prevent false-alarm autoscaling overhead. | `Probability_M1_2`, `Probability_M1_3` |
| **CO2** | *Model data that has uncertainties* | **Section 00 & 01 (Overview & Distribution):** Continuous network throughput is modeled as a continuous random variable $X \sim \mathcal{N}(\mu, \sigma^2)$ with analytical PDF, CDF, and interval integrals $P(a < X < b) = F(b) - F(a)$. | `M2_1`, `M2_2` |
| **CO3** | *Predict network traffic having uncertainties* | **Section 01 (Distribution):** Evaluates standardized Z-scores $Z = (X - \mu)/\sigma$ and the 68–95–99.7 Empirical Rule (|Z| ≤ 1, 1 &lt; |Z| ≤ 2, 2 &lt; |Z| ≤ 3, |Z| &gt; 3) to isolate anomalies. Overlays continuous bell curve on empirical campus histogram. | `M3_3` |
| **CO4** | *Justify Artificial Intelligence decisions statistically* | **Section 02 (Traffic Trends):** Computes Central Tendency ($\text{Mean} > \text{Median} > \text{Mode}$) explaining diurnal positive skewness, Centered Moving Average (CMA₃, CMA₄), and Trailing Moving Average ($k=3, 5, 8$) with variance reduction $\text{Var}(MA) = \sigma^2/k$. | `Module 4_1`, `Module 4_2` |
| **CO5** | *Validate data-driven models using statistical tests* | **Section 03 (Validation):** Implements **Chi-Square Goodness-of-Fit test** ($\chi^2, df = k - 3$) to validate the Gaussian assumption, and **Two-Sample F-Test** ($F = s_1^2/s_2^2$) to verify variance stationarity across Weekend vs. Weekday operational intervals. | `CO5 Validation` |

---

## 4. Product Architecture & Modules

```
c:\Users\asus\Downloads\Net\
├── index.html                  # Semantic editorial layout with all 6 research panels
├── package.json                # Modern ES Modules & Vite scripts
├── test_math.js                # Mathematical statistics verification test suite
├── src/
│   ├── math/
│   │   └── statistics.js       # High-precision numerical engine (erf, PDF, CDF, CMA, TMA, χ², F-test)
│   ├── data/
│   │   ├── campusTrafficData.js# Real Campus Perimeter Firewall & Core Switch structured telemetry
│   │   └── generator.js        # Synthetic scenarios & CSV parser/exporter
│   ├── charts/
│   │   └── scientificChart.js  # Pure SVG charting engine with coordinate grids & histogram overlays
│   ├── styles/
│   │   └── observatory.css     # The Statistical Observatory design system (Vanilla CSS)
│   └── app.js                  # Central reactive controller & event pipelines
```

---

## 5. Mathematical Formulations

### Continuous Normal Distribution (Learning Units I, II & III)
- **Continuous Random Variable Definition:** $X \in [0, \infty)$ representing traffic throughput in Mbps.
- **Probability Density Function (PDF):**
  $$f(x) = \frac{1}{\sigma \sqrt{2\pi}} \exp\left(-\frac{(x - \mu)^2}{2\sigma^2}\right)$$
- **Cumulative Distribution Function (CDF):**
  $$F(x) = P(X \le x) = \frac{1}{2} \left[1 + \text{erf}\left(\frac{x - \mu}{\sigma\sqrt{2}}\right)\right]$$
  *(Evaluated using Abramowitz & Stegun high-precision polynomial approximation with error $< 1.5 \times 10^{-7}$)*.
- **Interval Probability:**
  $$P(a < X < b) = \int_a^b f(x)\,dx = F(b) - F(a)$$
- **Upper-Tail Exceedance Risk (Autoscaling Trigger — CO1):**
  $$P(X > \text{Threshold}) = 1 - F(\text{Threshold})$$

### Central Tendency & Skewness (Learning Unit IV)
- **Arithmetic Sample Mean ($\bar{x}$):** $\frac{1}{N} \sum_{i=1}^N x_i$
- **Sample Median ($M$):** 50th percentile of sorted observations (resistant to peak surges).
- **Modal Class Continuous Mode ($Mo$):**
  $$\text{Mode} = L + \left[ \frac{f_1 - f_0}{2f_1 - f_0 - f_2} \right] \times h$$
- **Diurnal Skewness Hallmark:** $\text{Mean} (967.57 \text{ Mbps}) > \text{Median} (556.75 \text{ Mbps}) > \text{Mode} (347.36 \text{ Mbps})$ due to heavy daytime academic network demand.

### Moving Average Smoothing (Learning Unit IV)
- **Centered Moving Average (CMA) for Retrospective Analysis:**
  - 3-Period: $CMA_3(t) = \frac{x_{t-1} + x_t + x_{t+1}}{3}$
  - 4-Period Even Window (Two-Step Centering):
    $$CMA_4(t) = \frac{x_{t-2} + 2x_{t-1} + 2x_t + 2x_{t+1} + x_{t+2}}{8}$$
- **Trailing Moving Average for Real-Time Streaming Detection:**
  $$MA_t = \frac{1}{k} \sum_{i=0}^{k-1} x_{t-i}$$
- **Variance Suppression:**
  $$\text{Var}(MA_t) = \frac{\sigma^2}{k} \quad \text{(for independent samples)}$$

### Chi-Square Goodness-of-Fit Test (CO5)
- **Hypotheses:**
  - $H_0$: Observed campus traffic follows $\mathcal{N}(\mu, \sigma^2)$
  - $H_1$: Observed campus traffic departs from Normal
- **Test Statistic:**
  $$\chi^2 = \sum_{i=1}^k \frac{(O_i - E_i)^2}{E_i}$$
- **Degrees of Freedom Correction:**
  $$df = k - 1 - p = k - 3$$
  *(1 df lost due to $\sum E_i = N$; 2 df lost because $\hat{\mu}$ and $\hat{\sigma}$ are estimated from data)*.
- **Honest Empirical Finding:** On the 7-day campus dataset, $H_0$ is rejected ($p < 0.05, \chi^2 = 37.499$) due to strong diurnal day/night cycles (Schmidt et al. [4], Antoniou et al. [3]).

### Two-Sample F-Test for Traffic Variance (CO5)
- **Hypotheses:**
  - $H_0: \sigma_1^2 = \sigma_2^2$ (Stationary link volatility)
  - $H_1: \sigma_1^2 \ne \sigma_2^2$ (Volatility shift)
- **Test Statistic:**
  $$F = \frac{s_1^2}{s_2^2}, \quad df_1 = n_1 - 1, \; df_2 = n_2 - 1$$
- **Empirical Finding:** Comparing Period 1 (Weekend / Off-Peak: Sunday to Tuesday, $s_1^2 = 83,628$ Mbps$^2$) vs. Period 2 (Weekday / Peak: Wednesday to Saturday, $s_2^2 = 972,744$ Mbps$^2$) yields $F \approx 11.63$ ($p \ll 0.0001$), decisively proving non-stationary link volatility.

---

## 6. Running the Application Locally

```bash
# 1. Install dependencies
npm install

# 2. Run local development server
npm run dev

# 3. Build production bundle (tested with 0 warnings)
npm run build

# 4. Run mathematical unit test suite
node test_math.js
```

Once running, navigate to:
```
http://localhost:5173/
```

---

## 7. Viva Q&A Cheat Sheet (Part-B Defense)

- **Why Normal distribution for aggregated network traffic?**  
  *By the Central Limit Theorem, the summation of thousands of independent packet flows multiplexed at an aggregation router converges toward a Gaussian distribution.*
- **Why are degrees of freedom $k - 3$ for the Chi-Square test?**  
  *With $k$ bins, 1 degree of freedom is lost because expected counts sum to sample size $N$ ($\sum E_i = N$), and 2 additional degrees of freedom are lost because mean $\mu$ and standard deviation $\sigma$ are estimated directly from the sample data.*
- **Why is $H_0$ rejected on the 7-day dataset?**  
  *Over a 7-day span, traffic alternates between daytime active states and nocturnal troughs. This diurnal cycle creates a multi-modal, right-skewed composite distribution that formally rejects stationary unimodal Gaussianity.*
- **Why does Mean exceed Median in campus traffic?**  
  *Extreme positive daytime surges pull the arithmetic mean upward, while the median remains resistant, reflecting typical mid-level activity.*
- **Why use Centered vs. Trailing Moving Averages?**  
  *Centered moving averages eliminate phase lag and are mathematically optimal for retrospective historical reporting; trailing moving averages are causal and deployable for online streaming detection.*

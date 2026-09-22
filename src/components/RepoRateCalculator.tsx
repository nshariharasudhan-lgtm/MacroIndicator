import React, { useState, useMemo } from 'react';
import {
  Calculator,
  TrendingDown,
  TrendingUp,
  Percent,
  Copy,
  Check,
  Share2,
  HelpCircle,
  PiggyBank,
  Home,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Sliders,
  Sparkles,
} from 'lucide-react';
import { MacroMetric } from '../types.ts';

interface RepoRateCalculatorProps {
  metrics?: MacroMetric[];
  onNavigateHome?: () => void;
}

export const RepoRateCalculator: React.FC<RepoRateCalculatorProps> = ({
  metrics = [],
  onNavigateHome,
}) => {
  // Extract live repo rate from metrics if available, fallback to 6.50
  const liveRepoMetric = metrics.find(
    (m) =>
      m.id?.toLowerCase().includes('repo') ||
      m.title?.toLowerCase().includes('repo rate') ||
      m.slug?.toLowerCase().includes('repo')
  );
  const liveRepoValue = liveRepoMetric ? parseFloat(liveRepoMetric.value) || 6.5 : 6.5;

  // Active perspective tab
  const [calculatorMode, setCalculatorMode] = useState<'loan' | 'savings'>('loan');

  // === LOAN EMI STATE ===
  const [loanType, setLoanType] = useState<'home' | 'auto' | 'personal'>('home');
  const [loanAmount, setLoanAmount] = useState<number>(5000000); // ₹50 Lakhs
  const [tenureYears, setTenureYears] = useState<number>(20); // 20 years
  const [currentInterestRate, setCurrentInterestRate] = useState<number>(8.5); // 8.50%
  const [rateChangeBps, setRateChangeBps] = useState<number>(-25); // -25 bps default scenario
  const [loanAdjustmentMode, setLoanAdjustmentMode] = useState<'reduce_emi' | 'reduce_tenure'>('reduce_emi');
  const [copiedLoan, setCopiedLoan] = useState<boolean>(false);

  // === SAVINGS / FD STATE ===
  const [depositAmount, setDepositAmount] = useState<number>(500000); // ₹5 Lakhs
  const [fdTenureYears, setFdTenureYears] = useState<number>(3); // 3 years
  const [currentFdRate, setCurrentFdRate] = useState<number>(7.1); // 7.10%
  const [isSeniorCitizen, setIsSeniorCitizen] = useState<boolean>(false);
  const [fdRateChangeBps, setFdRateChangeBps] = useState<number>(-25); // -25 bps scenario
  const [copiedSavings, setCopiedSavings] = useState<boolean>(false);

  // Accordion state for FAQs
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // Format currency in Indian standard (Lakhs / Crores)
  const formatINR = (val: number, includeDecimals = false): string => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: includeDecimals ? 2 : 0,
    }).format(Math.round(val));
  };

  // Format compact numbers (₹50 Lakh, ₹1.2 Cr)
  const formatCompactINR = (val: number): string => {
    if (val >= 10000000) {
      return `₹${(val / 10000000).toFixed(2).replace(/\.00$/, '')} Cr`;
    }
    if (val >= 100000) {
      return `₹${(val / 100000).toFixed(2).replace(/\.00$/, '')} Lakh`;
    }
    return formatINR(val);
  };

  // === LOAN EMI MATH ===
  const loanCalculations = useMemo(() => {
    const P = loanAmount;
    const N = tenureYears * 12; // total months
    const rCurrent = currentInterestRate / 12 / 100;

    // Current EMI formula
    const currentEmi =
      rCurrent > 0
        ? (P * rCurrent * Math.pow(1 + rCurrent, N)) / (Math.pow(1 + rCurrent, N) - 1)
        : P / N;
    const currentTotalPayment = currentEmi * N;
    const currentTotalInterest = currentTotalPayment - P;

    // New Interest Rate with Scenario
    const newRate = Math.max(0.5, currentInterestRate + rateChangeBps / 100);
    const rNew = newRate / 12 / 100;

    // Scenario 1: Adjust EMI (Tenure stays constant)
    const newEmi =
      rNew > 0
        ? (P * rNew * Math.pow(1 + rNew, N)) / (Math.pow(1 + rNew, N) - 1)
        : P / N;
    const newTotalPayment = newEmi * N;
    const newTotalInterest = newTotalPayment - P;
    const emiDifference = newEmi - currentEmi;
    const totalInterestDifference = newTotalInterest - currentTotalInterest;

    // Scenario 2: Keep EMI constant (Tenure adjusts)
    // Formula: N_new = -ln(1 - (P * rNew) / currentEmi) / ln(1 + rNew)
    let newTenureMonths = N;
    let tenureFeasible = true;

    if (P * rNew >= currentEmi) {
      tenureFeasible = false;
    } else {
      const top = Math.log(1 - (P * rNew) / currentEmi);
      const bottom = Math.log(1 + rNew);
      newTenureMonths = -top / bottom;
    }

    const monthsSaved = N - Math.round(newTenureMonths);
    const constantEmiTotalPayment = currentEmi * newTenureMonths;
    const constantEmiTotalInterest = constantEmiTotalPayment - P;
    const constantEmiInterestSaved = currentTotalInterest - constantEmiTotalInterest;

    return {
      currentEmi,
      currentTotalPayment,
      currentTotalInterest,
      newRate,
      newEmi,
      newTotalPayment,
      newTotalInterest,
      emiDifference,
      totalInterestDifference,
      newTenureMonths: Math.round(newTenureMonths),
      monthsSaved,
      tenureFeasible,
      constantEmiInterestSaved,
    };
  }, [loanAmount, tenureYears, currentInterestRate, rateChangeBps]);

  // === SAVINGS / FD MATH ===
  const savingsCalculations = useMemo(() => {
    const P = depositAmount;
    const T = fdTenureYears;
    const seniorBonus = isSeniorCitizen ? 0.5 : 0;

    // Current FD: Compounded Quarterly (standard Indian commercial banks)
    const effectiveCurrentRate = currentFdRate + seniorBonus;
    const rCurrent = effectiveCurrentRate / 100;
    const nCompounds = 4; // Quarterly
    const currentMaturity = P * Math.pow(1 + rCurrent / nCompounds, nCompounds * T);
    const currentTotalInterest = currentMaturity - P;

    // New FD Rate scenario
    const effectiveNewRate = Math.max(0.5, effectiveCurrentRate + fdRateChangeBps / 100);
    const rNew = effectiveNewRate / 100;
    const newMaturity = P * Math.pow(1 + rNew / nCompounds, nCompounds * T);
    const newTotalInterest = newMaturity - P;
    const maturityDifference = newMaturity - currentMaturity;
    const interestDifference = newTotalInterest - currentTotalInterest;

    // Headline CPI Inflation benchmark (~3.65%)
    const inflationBenchmark = 3.65;
    const realReturnCurrent = effectiveCurrentRate - inflationBenchmark;
    const realReturnNew = effectiveNewRate - inflationBenchmark;

    return {
      effectiveCurrentRate,
      effectiveNewRate,
      currentMaturity,
      currentTotalInterest,
      newMaturity,
      newTotalInterest,
      maturityDifference,
      interestDifference,
      realReturnCurrent,
      realReturnNew,
      inflationBenchmark,
    };
  }, [depositAmount, fdTenureYears, currentFdRate, isSeniorCitizen, fdRateChangeBps]);

  // Copy shareable summary for Loan
  const handleCopyLoanSummary = () => {
    const isCut = rateChangeBps < 0;
    const changeAbs = Math.abs(rateChangeBps);
    const directionWord = isCut ? 'cut' : 'hike';
    const impactWord = isCut ? 'saves' : 'increases by';

    let summary = `📊 *RBI Repo Rate Impact on Home Loan* via MacroNest.online\n\n`;
    summary += `• Loan Amount: ${formatCompactINR(loanAmount)} (${tenureYears} yrs @ ${currentInterestRate}%)\n`;
    summary += `• Current EMI: ${formatINR(loanCalculations.currentEmi)}/month\n`;
    summary += `• Repo Rate Scenario: ${rateChangeBps > 0 ? '+' : ''}${rateChangeBps} bps (${directionWord})\n\n`;

    if (loanAdjustmentMode === 'reduce_emi') {
      summary += `✅ *New Monthly EMI*: ${formatINR(loanCalculations.newEmi)}/month\n`;
      summary += `💰 *Monthly Impact*: ${formatINR(Math.abs(loanCalculations.emiDifference))}/month (${impactWord})\n`;
      summary += `📉 *Total Lifetime Interest Impact*: ${formatINR(Math.abs(loanCalculations.totalInterestDifference))}\n`;
    } else {
      summary += `✅ *Tenure Adjusted*: ${Math.abs(loanCalculations.monthsSaved)} months ${loanCalculations.monthsSaved >= 0 ? 'reduced' : 'extended'}\n`;
      summary += `💰 *Total Interest Saved*: ${formatINR(Math.abs(loanCalculations.constantEmiInterestSaved))}\n`;
    }

    summary += `\nCalculate your loan impact at https://macronest.online/calculator`;

    navigator.clipboard.writeText(summary);
    setCopiedLoan(true);
    setTimeout(() => setCopiedLoan(false), 2500);
  };

  // Copy shareable summary for FD
  const handleCopySavingsSummary = () => {
    const isHike = fdRateChangeBps > 0;
    let summary = `🏦 *RBI Repo Rate Impact on Fixed Deposit (FD)* via MacroNest.online\n\n`;
    summary += `• Deposit Amount: ${formatCompactINR(depositAmount)} for ${fdTenureYears} Years\n`;
    summary += `• Current Rate: ${savingsCalculations.effectiveCurrentRate.toFixed(2)}%${isSeniorCitizen ? ' (Senior Citizen)' : ''}\n`;
    summary += `• Scenario: ${fdRateChangeBps > 0 ? '+' : ''}${fdRateChangeBps} bps adjustment\n\n`;
    summary += `📈 *Current Maturity*: ${formatINR(savingsCalculations.currentMaturity)}\n`;
    summary += `🎯 *New Projected Maturity*: ${formatINR(savingsCalculations.newMaturity)}\n`;
    summary += `💰 *Net Return Impact*: ${savingsCalculations.interestDifference >= 0 ? '+' : ''}${formatINR(savingsCalculations.interestDifference)}\n`;
    summary += `🔍 *Real Return above CPI*: ${savingsCalculations.realReturnNew.toFixed(2)}% p.a.\n\n`;
    summary += `Calculate your savings yield at https://macronest.online/calculator`;

    navigator.clipboard.writeText(summary);
    setCopiedSavings(true);
    setTimeout(() => setCopiedSavings(false), 2500);
  };

  const faqs = [
    {
      q: 'How does an RBI Repo Rate change affect my Home Loan EMI?',
      a: 'Since October 1, 2019, the Reserve Bank of India mandated that all floating-rate retail loans (home, auto, MSME) must be linked to an External Benchmark Lending Rate (EBLR). Most commercial banks use the RBI Policy Repo Rate as their benchmark. When the Monetary Policy Committee (MPC) alters the repo rate, banks are required to reset borrower interest rates within 3 calendar months.',
    },
    {
      q: 'Why did my bank increase my loan tenure instead of reducing my EMI?',
      a: 'Most Indian public and private sector banks (including SBI, HDFC, and ICICI) configure floating loans to automatically maintain a fixed monthly EMI and adjust the remaining loan tenure when interest rates change. However, as a borrower, you have the right to request your lender to keep the tenure constant and decrease your monthly EMI payment instead.',
    },
    {
      q: 'What is a "basis point" (bps)?',
      a: 'One basis point equals one-hundredth of a percentage point (0.01%). Therefore, a 25 bps rate cut equals a 0.25% reduction in the annual interest rate, and a 50 bps hike equals a 0.50% increase.',
    },
    {
      q: 'Are Fixed Deposit (FD) rates immediately affected by repo rate cuts?',
      a: 'Unlike retail floating loans which are contractually bound to external benchmarks within 90 days, bank deposit interest rates are determined by asset-liability committees (ALCO) based on systemic banking liquidity. When the repo rate falls and liquidity is in surplus, banks typically trim fresh fixed deposit interest rates across 1 to 5-year buckets.',
    },
    {
      q: 'How does inflation affect my Fixed Deposit real returns?',
      a: 'The real return on a Fixed Deposit is calculated by subtracting headline CPI inflation from the nominal FD interest rate after accounting for taxes. When CPI inflation is 3.65% and an FD offers 7.00%, the pre-tax real rate of return is approximately 3.35%.',
    },
  ];

  return (
    <div id="repo-rate-calculator-page" className="space-y-8 animate-fadeIn">
      {/* Top Breadcrumb & Benchmark Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-1.5">
            <button
              onClick={onNavigateHome}
              className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
            >
              MacroNest
            </button>
            <span>/</span>
            <span className="text-slate-800 dark:text-slate-200 font-semibold">
              Repo Rate Impact Calculator
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            RBI Repo Rate EMI &amp; Savings Calculator
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-2xl">
            Simulate how Reserve Bank of India (RBI) Monetary Policy decisions impact your monthly loan EMIs, total interest expense, and bank Fixed Deposit returns.
          </p>
        </div>

        {/* Current RBI Anchor Card */}
        <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
            <Percent className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Current RBI Repo Rate
            </div>
            <div className="text-lg font-black text-slate-900 dark:text-white font-mono">
              {liveRepoValue.toFixed(2)}%
              <span className="text-xs font-normal text-emerald-600 dark:text-emerald-400 ml-1.5 font-sans">
                Statutory Benchmark
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Mode Switcher Tabs */}
      <div className="flex justify-center">
        <div className="inline-flex p-1.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
          <button
            id="tab-calc-loan"
            onClick={() => setCalculatorMode('loan')}
            className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
              calculatorMode === 'loan'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Home className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Home &amp; Auto Loan EMI</span>
          </button>

          <button
            id="tab-calc-savings"
            onClick={() => setCalculatorMode('savings')}
            className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
              calculatorMode === 'savings'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <PiggyBank className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Fixed Deposits &amp; Savings Yield</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODE 1: LOAN EMI CALCULATOR */}
      {/* ========================================================================= */}
      {calculatorMode === 'loan' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Controls Column */}
          <div className="lg:col-span-7 space-y-6 bg-white dark:bg-slate-900 p-6 sm:p-7 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
            {/* Loan Type Presets */}
            <div>
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2">
                Loan Category
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'home', label: 'Home Loan', defaultRate: 8.5 },
                  { id: 'auto', label: 'Auto Loan', defaultRate: 9.0 },
                  { id: 'personal', label: 'Personal Loan', defaultRate: 11.5 },
                ].map((type) => (
                  <button
                    key={type.id}
                    onClick={() => {
                      setLoanType(type.id as any);
                      setCurrentInterestRate(type.defaultRate);
                    }}
                    className={`py-2 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer border ${
                      loanType === type.id
                        ? 'border-blue-600 bg-blue-50/70 text-blue-700 dark:border-blue-500 dark:bg-blue-950/40 dark:text-blue-300'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Principal Loan Amount */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Principal Loan Amount
                </label>
                <span className="text-base font-extrabold text-slate-900 dark:text-white font-mono">
                  {formatCompactINR(loanAmount)} ({formatINR(loanAmount)})
                </span>
              </div>
              <input
                type="range"
                min={500000}
                max={20000000}
                step={100000}
                value={loanAmount}
                onChange={(e) => setLoanAmount(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                {[2500000, 5000000, 7500000, 10000000, 15000000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setLoanAmount(amt)}
                    className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                      loanAmount === amt
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {formatCompactINR(amt)}
                  </button>
                ))}
              </div>
            </div>

            {/* Loan Tenure */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Loan Tenure
                </label>
                <span className="text-base font-extrabold text-slate-900 dark:text-white font-mono">
                  {tenureYears} Years ({tenureYears * 12} Months)
                </span>
              </div>
              <input
                type="range"
                min={3}
                max={30}
                step={1}
                value={tenureYears}
                onChange={(e) => setTenureYears(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <div className="flex gap-2 mt-2.5">
                {[5, 10, 15, 20, 25, 30].map((yr) => (
                  <button
                    key={yr}
                    type="button"
                    onClick={() => setTenureYears(yr)}
                    className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                      tenureYears === yr
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {yr} Yrs
                  </button>
                ))}
              </div>
            </div>

            {/* Current Interest Rate */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Current Loan Interest Rate (% p.a.)
                </label>
                <span className="text-base font-extrabold text-slate-900 dark:text-white font-mono">
                  {currentInterestRate.toFixed(2)}%
                </span>
              </div>
              <input
                type="range"
                min={6.0}
                max={15.0}
                step={0.05}
                value={currentInterestRate}
                onChange={(e) => setCurrentInterestRate(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
            </div>

            {/* RBI Rate Change Scenario Selector */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
              <label className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider block mb-2 flex items-center justify-between">
                <span>RBI Repo Rate Policy Scenario</span>
                <span
                  className={`text-xs font-extrabold px-2 py-0.5 rounded-md ${
                    rateChangeBps < 0
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : rateChangeBps > 0
                      ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                      : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  {rateChangeBps > 0 ? `+${rateChangeBps}` : rateChangeBps} bps (
                  {rateChangeBps < 0 ? 'Rate Cut' : rateChangeBps > 0 ? 'Rate Hike' : 'Status Quo'})
                </span>
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                {[
                  { bps: -50, label: '-50 bps Cut', color: 'emerald' },
                  { bps: -25, label: '-25 bps Cut', color: 'emerald' },
                  { bps: 25, label: '+25 bps Hike', color: 'rose' },
                  { bps: 50, label: '+50 bps Hike', color: 'rose' },
                ].map((item) => (
                  <button
                    key={item.bps}
                    onClick={() => setRateChangeBps(item.bps)}
                    className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                      rateChangeBps === item.bps
                        ? item.color === 'emerald'
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-rose-600 text-white border-rose-600'
                        : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Slider for custom adjustment */}
              <input
                type="range"
                min={-150}
                max={150}
                step={5}
                value={rateChangeBps}
                onChange={(e) => setRateChangeBps(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <div className="flex justify-between text-[11px] text-slate-400 mt-1 font-mono">
                <span>-150 bps (-1.5%)</span>
                <span>0 bps (Current)</span>
                <span>+150 bps (+1.5%)</span>
              </div>
            </div>

            {/* Borrower Choice: Adjust EMI vs Adjust Tenure */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2">
                Borrower Preference Strategy
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setLoanAdjustmentMode('reduce_emi')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    loanAdjustmentMode === 'reduce_emi'
                      ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/30'
                      : 'border-slate-200 dark:border-slate-800 opacity-70 hover:opacity-100'
                  }`}
                >
                  <div className="text-xs font-bold text-slate-900 dark:text-white">
                    Reduce Monthly EMI
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Keeps loan tenure at {tenureYears} yrs &amp; lowers monthly cash outflow
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setLoanAdjustmentMode('reduce_tenure')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    loanAdjustmentMode === 'reduce_tenure'
                      ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/30'
                      : 'border-slate-200 dark:border-slate-800 opacity-70 hover:opacity-100'
                  }`}
                >
                  <div className="text-xs font-bold text-slate-900 dark:text-white">
                    Keep EMI Constant &amp; Shorten Tenure
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Maximizes lifetime interest savings by closing loan sooner
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Results Summary Column */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-gradient-to-br from-slate-900 to-slate-950 text-white p-6 sm:p-7 rounded-3xl shadow-xl border border-slate-800 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-6 opacity-10">
                <Calculator className="w-32 h-32" />
              </div>

              <div className="relative z-10 space-y-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Projected Loan Impact
                  </span>
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-white/10 text-slate-200 border border-white/10">
                    New Rate: {loanCalculations.newRate.toFixed(2)}%
                  </span>
                </div>

                {/* Primary Metric Highlight */}
                {loanAdjustmentMode === 'reduce_emi' ? (
                  <div>
                    <div className="text-xs text-slate-400">New Monthly EMI</div>
                    <div className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-white mt-1">
                      {formatINR(loanCalculations.newEmi)}
                      <span className="text-sm font-normal text-slate-400 ml-1">/mo</span>
                    </div>

                    <div className="mt-3 flex items-center gap-2">
                      {loanCalculations.emiDifference < 0 ? (
                        <div className="flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                          <TrendingDown className="w-3.5 h-3.5" />
                          <span>You Save {formatINR(Math.abs(loanCalculations.emiDifference))}/month</span>
                        </div>
                      ) : loanCalculations.emiDifference > 0 ? (
                        <div className="flex items-center gap-1 text-xs font-bold text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-lg border border-rose-500/20">
                          <TrendingUp className="w-3.5 h-3.5" />
                          <span>EMI Increases by {formatINR(loanCalculations.emiDifference)}/month</span>
                        </div>
                      ) : (
                        <div className="text-xs text-slate-400">No change in monthly EMI</div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="text-xs text-slate-400">Tenure Impact (Same EMI)</div>
                    <div className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-white mt-1">
                      {loanCalculations.monthsSaved > 0
                        ? `${Math.floor(loanCalculations.monthsSaved / 12)} Yrs ${loanCalculations.monthsSaved % 12} Mos Earlier`
                        : loanCalculations.monthsSaved < 0
                        ? `${Math.abs(loanCalculations.monthsSaved)} Months Added`
                        : 'No tenure change'}
                    </div>

                    <div className="mt-3">
                      <div className="flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20 inline-flex">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>
                          Total Interest Saved: {formatINR(Math.abs(loanCalculations.constantEmiInterestSaved))}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Comparison Breakdown Table */}
                <div className="pt-4 border-t border-slate-800 space-y-2.5 text-xs">
                  <div className="flex justify-between items-center text-slate-300">
                    <span>Current Baseline EMI:</span>
                    <span className="font-mono font-bold">{formatINR(loanCalculations.currentEmi)}/mo</span>
                  </div>

                  <div className="flex justify-between items-center text-slate-300">
                    <span>Principal Loan Amount:</span>
                    <span className="font-mono">{formatINR(loanAmount)}</span>
                  </div>

                  <div className="flex justify-between items-center text-slate-300">
                    <span>Current Total Interest:</span>
                    <span className="font-mono">{formatINR(loanCalculations.currentTotalInterest)}</span>
                  </div>

                  <div className="flex justify-between items-center text-slate-300">
                    <span>New Total Interest:</span>
                    <span className="font-mono font-bold text-white">
                      {formatINR(loanCalculations.newTotalInterest)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t border-slate-800 font-bold text-sm">
                    <span className="text-slate-200">Lifetime Difference:</span>
                    <span
                      className={`font-mono ${
                        loanCalculations.totalInterestDifference < 0
                          ? 'text-emerald-400'
                          : loanCalculations.totalInterestDifference > 0
                          ? 'text-rose-400'
                          : 'text-slate-400'
                      }`}
                    >
                      {loanCalculations.totalInterestDifference < 0 ? 'Save ' : 'Pay Extra '}
                      {formatINR(Math.abs(loanCalculations.totalInterestDifference))}
                    </span>
                  </div>
                </div>

                {/* Share / Copy Action */}
                <div className="pt-4 border-t border-slate-800">
                  <button
                    onClick={handleCopyLoanSummary}
                    className="w-full py-2.5 px-4 bg-white/10 hover:bg-white/20 active:bg-white/30 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer border border-white/10"
                  >
                    {copiedLoan ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-400" />
                        <span>Summary Copied to Clipboard!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Copy Summary for WhatsApp / Social Media</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* RBI Statutory Note */}
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/50 text-xs text-amber-900 dark:text-amber-200 flex gap-3">
              <ShieldCheck className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold">EBLR Mandate Notice:</strong> Since October 2019, all floating-rate retail loans are mandated by the Reserve Bank of India to reset whenever the repo rate benchmark changes. Your bank must communicate the revised EMI or tenure within 3 months.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 2: FIXED DEPOSITS & SAVINGS CALCULATOR */}
      {/* ========================================================================= */}
      {calculatorMode === 'savings' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Controls Column */}
          <div className="lg:col-span-7 space-y-6 bg-white dark:bg-slate-900 p-6 sm:p-7 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
            {/* Deposit Principal */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Deposit Principal Amount
                </label>
                <span className="text-base font-extrabold text-slate-900 dark:text-white font-mono">
                  {formatCompactINR(depositAmount)} ({formatINR(depositAmount)})
                </span>
              </div>
              <input
                type="range"
                min={50000}
                max={5000000}
                step={50000}
                value={depositAmount}
                onChange={(e) => setDepositAmount(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-600"
              />
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                {[100000, 200000, 500000, 1000000, 2500000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setDepositAmount(amt)}
                    className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                      depositAmount === amt
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {formatCompactINR(amt)}
                  </button>
                ))}
              </div>
            </div>

            {/* Deposit Tenure */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Deposit Tenure
                </label>
                <span className="text-base font-extrabold text-slate-900 dark:text-white font-mono">
                  {fdTenureYears} Years ({fdTenureYears * 12} Months)
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={10}
                step={1}
                value={fdTenureYears}
                onChange={(e) => setFdTenureYears(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-600"
              />
              <div className="flex gap-2 mt-2.5">
                {[1, 2, 3, 5, 10].map((yr) => (
                  <button
                    key={yr}
                    type="button"
                    onClick={() => setFdTenureYears(yr)}
                    className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                      fdTenureYears === yr
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {yr} {yr === 1 ? 'Year' : 'Years'}
                  </button>
                ))}
              </div>
            </div>

            {/* Current Bank FD Base Rate */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Current Bank Fixed Deposit Rate (% p.a.)
                </label>
                <span className="text-base font-extrabold text-slate-900 dark:text-white font-mono">
                  {currentFdRate.toFixed(2)}%
                </span>
              </div>
              <input
                type="range"
                min={4.0}
                max={9.0}
                step={0.05}
                value={currentFdRate}
                onChange={(e) => setCurrentFdRate(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-600"
              />
            </div>

            {/* Senior Citizen Toggle */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-white">
                  Senior Citizen Additional Yield (+0.50%)
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  Most banks offer +50 bps additional interest for individuals age 60+
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSeniorCitizen((prev) => !prev)}
                className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                  isSeniorCitizen ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    isSeniorCitizen ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Expected Repo Rate Shift on Deposits */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
              <label className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider block mb-2 flex items-center justify-between">
                <span>Expected Policy Rate Impact on FD Yields</span>
                <span
                  className={`text-xs font-extrabold px-2 py-0.5 rounded-md ${
                    fdRateChangeBps > 0
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : fdRateChangeBps < 0
                      ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                      : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  {fdRateChangeBps > 0 ? `+${fdRateChangeBps}` : fdRateChangeBps} bps
                </span>
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                {[
                  { bps: -50, label: '-50 bps Cut' },
                  { bps: -25, label: '-25 bps Cut' },
                  { bps: 25, label: '+25 bps Hike' },
                  { bps: 50, label: '+50 bps Hike' },
                ].map((item) => (
                  <button
                    key={item.bps}
                    onClick={() => setFdRateChangeBps(item.bps)}
                    className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                      fdRateChangeBps === item.bps
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <input
                type="range"
                min={-100}
                max={100}
                step={5}
                value={fdRateChangeBps}
                onChange={(e) => setFdRateChangeBps(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-600"
              />
            </div>
          </div>

          {/* Results Summary Column */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-950 text-white p-6 sm:p-7 rounded-3xl shadow-xl border border-emerald-900/40 relative overflow-hidden">
              <div className="relative z-10 space-y-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-300/80">
                    Deposit Maturity &amp; Real Yield
                  </span>
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-white/10 text-slate-200 border border-white/10">
                    Effective: {savingsCalculations.effectiveNewRate.toFixed(2)}%
                  </span>
                </div>

                {/* Primary Metric Highlight */}
                <div>
                  <div className="text-xs text-slate-400">Projected Maturity Value (Quarterly Compounding)</div>
                  <div className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-white mt-1">
                    {formatINR(savingsCalculations.newMaturity)}
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    {savingsCalculations.interestDifference > 0 ? (
                      <div className="flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                        <TrendingUp className="w-3.5 h-3.5" />
                        <span>Extra {formatINR(savingsCalculations.interestDifference)} Earned</span>
                      </div>
                    ) : savingsCalculations.interestDifference < 0 ? (
                      <div className="flex items-center gap-1 text-xs font-bold text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-lg border border-rose-500/20">
                        <TrendingDown className="w-3.5 h-3.5" />
                        <span>Returns drop by {formatINR(Math.abs(savingsCalculations.interestDifference))}</span>
                      </div>
                    ) : (
                      <div className="text-xs text-slate-400">No shift in interest payout</div>
                    )}
                  </div>
                </div>

                {/* Real Return Benchmark vs Inflation */}
                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-300">Real Inflation-Adjusted Return:</span>
                    <span
                      className={`font-mono font-bold ${
                        savingsCalculations.realReturnNew >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {savingsCalculations.realReturnNew >= 0 ? '+' : ''}
                      {savingsCalculations.realReturnNew.toFixed(2)}% p.a.
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Calculated against MoSPI Headline CPI Inflation (~{savingsCalculations.inflationBenchmark.toFixed(2)}%). A positive real return means your money beats inflation.
                  </div>
                </div>

                {/* Comparison Breakdown Table */}
                <div className="pt-4 border-t border-slate-800 space-y-2.5 text-xs">
                  <div className="flex justify-between items-center text-slate-300">
                    <span>Principal Invested:</span>
                    <span className="font-mono">{formatINR(depositAmount)}</span>
                  </div>

                  <div className="flex justify-between items-center text-slate-300">
                    <span>Baseline Maturity:</span>
                    <span className="font-mono">{formatINR(savingsCalculations.currentMaturity)}</span>
                  </div>

                  <div className="flex justify-between items-center text-slate-300">
                    <span>Total Interest Under New Rate:</span>
                    <span className="font-mono font-bold text-white">
                      {formatINR(savingsCalculations.newTotalInterest)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t border-slate-800 font-bold text-sm">
                    <span className="text-slate-200">Total Gain Difference:</span>
                    <span
                      className={`font-mono ${
                        savingsCalculations.interestDifference >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {savingsCalculations.interestDifference >= 0 ? '+' : ''}
                      {formatINR(savingsCalculations.interestDifference)}
                    </span>
                  </div>
                </div>

                {/* Share / Copy Action */}
                <div className="pt-4 border-t border-slate-800">
                  <button
                    onClick={handleCopySavingsSummary}
                    className="w-full py-2.5 px-4 bg-white/10 hover:bg-white/20 active:bg-white/30 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer border border-white/10"
                  >
                    {copiedSavings ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-400" />
                        <span>Summary Copied to Clipboard!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Copy Summary for WhatsApp / Social Media</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Compounding Information */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 space-y-1.5">
              <div className="font-bold text-slate-900 dark:text-white">Quarterly Compounding Standard</div>
              <p>
                As per Indian commercial banking norms (SBI, HDFC Bank, ICICI Bank), fixed deposit interest is calculated and compounded on a quarterly basis. Senior citizens typically receive 50 bps above the card rate.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* FREQUENTLY ASKED QUESTIONS (SEARCH INTENT / SEO OPTIMIZED) */}
      {/* ========================================================================= */}
      <section className="pt-8 border-t border-slate-200 dark:border-slate-800">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <span>Frequently Asked Questions on Repo Rate &amp; EMIs</span>
        </h2>

        <div className="space-y-3">
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 transition-colors"
            >
              <button
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                className="w-full text-left p-4 font-bold text-sm text-slate-900 dark:text-white flex justify-between items-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50"
              >
                <span>{faq.q}</span>
                {openFaq === idx ? (
                  <ChevronUp className="w-4 h-4 text-slate-500 shrink-0 ml-2" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-500 shrink-0 ml-2" />
                )}
              </button>

              {openFaq === idx && (
                <div className="px-4 pb-4 pt-1 text-xs text-slate-600 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-slate-800/80">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

'use client';

import { useState, useId } from 'react';
import { Calculator, Percent, Calendar, DollarSign, PieChart } from 'lucide-react';

export function EMICalculator({ propertyPrice }: { propertyPrice: number }) {
  const priceInputId = useId();
  const downPaymentInputId = useId();
  const interestInputId = useId();

  const [loanAmount, setLoanAmount] = useState<number>(Math.round(propertyPrice * 0.8));
  const [downPaymentPercent, setDownPaymentPercent] = useState<number>(20);
  const [interestRate, setInterestRate] = useState<number>(8.5);
  const [tenureYears, setTenureYears] = useState<number>(20);

  // EMI Formula: P * r * (1 + r)^n / ((1 + r)^n - 1)
  const principal = loanAmount;
  const monthlyRate = interestRate / 12 / 100;
  const totalMonths = tenureYears * 12;

  const emi = monthlyRate > 0
    ? Math.round(
        (principal * monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) /
        (Math.pow(1 + monthlyRate, totalMonths) - 1)
      )
    : Math.round(principal / totalMonths);

  const totalPayable = emi * totalMonths;
  const totalInterest = Math.max(0, totalPayable - principal);
  const principalPercent = Math.round((principal / totalPayable) * 100) || 0;
  const interestPercent = 100 - principalPercent;

  const handleDownPaymentChange = (percent: number) => {
    setDownPaymentPercent(percent);
    setLoanAmount(Math.round(propertyPrice * (1 - percent / 100)));
  };

  function formatRupees(num: number) {
    if (!num) return '₹0';
    if (num >= 10000000) return `₹${(num / 10000000).toFixed(2)} Cr`;
    if (num >= 100000) return `₹${(num / 100000).toFixed(1)} L`;
    return `₹${num.toLocaleString('en-IN')}`;
  }

  return (
    <div className="bg-white dark:bg-navy-900 rounded-2xl border border-gray-100/60 dark:border-gray-800/60 p-5 md:p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-5">
        <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-950/40 flex items-center justify-center text-primary">
          <Calculator className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-base font-bold text-navy dark:text-white">Home Loan EMI Calculator</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">Estimate your monthly home loan installment</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Left Controls */}
        <div className="space-y-4">
          {/* Property Price & Loan Amount */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label htmlFor={priceInputId} className="text-xs font-semibold text-gray-600 dark:text-gray-300">Loan Amount</label>
              <span className="text-sm font-bold text-navy dark:text-white">{formatRupees(loanAmount)}</span>
            </div>
            <input
              id={priceInputId}
              type="range"
              min={1000000}
              max={propertyPrice * 1.2}
              step={100000}
              value={loanAmount}
              onChange={(e) => setLoanAmount(Number(e.target.value))}
              className="w-full h-2 bg-gray-100 dark:bg-navy-800 rounded-lg appearance-none cursor-pointer accent-primary"
            />
          </div>

          {/* Down Payment % */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label htmlFor={downPaymentInputId} className="text-xs font-semibold text-gray-600 dark:text-gray-300">Down Payment ({downPaymentPercent}%)</label>
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                {formatRupees(Math.round(propertyPrice * (downPaymentPercent / 100)))}
              </span>
            </div>
            <div className="flex gap-2">
              {[10, 20, 30, 40].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => handleDownPaymentChange(pct)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    downPaymentPercent === pct
                      ? 'bg-primary text-white border-primary shadow-xs'
                      : 'bg-gray-50 dark:bg-navy-800 text-gray-600 dark:text-gray-300 border-gray-200/60 dark:border-gray-800/60 hover:bg-gray-100'
                  }`}
                >
                  {pct}%
                </button>
              ))}
            </div>
          </div>

          {/* Interest Rate */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label htmlFor={interestInputId} className="text-xs font-semibold text-gray-600 dark:text-gray-300">Interest Rate (% p.a.)</label>
              <span className="text-sm font-bold text-navy dark:text-white">{interestRate}%</span>
            </div>
            <input
              id={interestInputId}
              type="range"
              min={6.5}
              max={14.0}
              step={0.1}
              value={interestRate}
              onChange={(e) => setInterestRate(Number(e.target.value))}
              className="w-full h-2 bg-gray-100 dark:bg-navy-800 rounded-lg appearance-none cursor-pointer accent-primary"
            />
          </div>

          {/* Loan Tenure */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">Loan Tenure</span>
              <span className="text-sm font-bold text-navy dark:text-white">{tenureYears} Years</span>
            </div>
            <div className="flex gap-2">
              {[10, 15, 20, 25, 30].map((yrs) => (
                <button
                  key={yrs}
                  type="button"
                  onClick={() => setTenureYears(yrs)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    tenureYears === yrs
                      ? 'bg-primary text-white border-primary shadow-xs'
                      : 'bg-gray-50 dark:bg-navy-800 text-gray-600 dark:text-gray-300 border-gray-200/60 dark:border-gray-800/60 hover:bg-gray-100'
                  }`}
                >
                  {yrs}Y
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Output Box */}
        <div className="bg-gray-50/80 dark:bg-navy-800 rounded-xl p-5 border border-gray-100/60 dark:border-gray-800/60 flex flex-col justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Estimated Monthly EMI</p>
            <p className="text-3xl font-extrabold text-primary mt-1">
              ₹{emi.toLocaleString('en-IN')}
              <span className="text-xs text-gray-400 dark:text-gray-500 font-normal"> / month</span>
            </p>
          </div>

          {/* Breakdown Bar */}
          <div className="my-4">
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1 font-medium">
              <span>Principal ({principalPercent}%)</span>
              <span>Interest ({interestPercent}%)</span>
            </div>
            <div className="h-3 rounded-full bg-amber-200 overflow-hidden flex">
              <div className="bg-primary h-full transition-all duration-300" style={{ width: `${principalPercent}%` }} />
              <div className="bg-amber-400 h-full transition-all duration-300" style={{ width: `${interestPercent}%` }} />
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-gray-200/60 dark:border-gray-800/60 text-xs">
            <div className="flex justify-between text-gray-600 dark:text-gray-300">
              <span>Principal Amount</span>
              <span className="font-semibold text-navy dark:text-white">{formatRupees(principal)}</span>
            </div>
            <div className="flex justify-between text-gray-600 dark:text-gray-300">
              <span>Total Interest Payable</span>
              <span className="font-semibold text-amber-600">{formatRupees(totalInterest)}</span>
            </div>
            <div className="flex justify-between text-navy dark:text-white font-bold pt-1 border-t border-gray-200/60 dark:border-gray-800/60">
              <span>Total Amount Payable</span>
              <span>{formatRupees(totalPayable)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

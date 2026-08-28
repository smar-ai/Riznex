import React from 'react'

export function ExcelStyleReport({ 
  title,
  dateRange,
  totals,
  platformData,
  supplierData,
  profitSummary
}: any) {
  const gbp = (val: number) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(val || 0)

  return (
    <div className="w-full bg-white text-black font-sans">
      {/* Header */}
      <div className="mb-8 border-b-2 border-black pb-4">
        <h1 className="text-2xl font-bold uppercase">{title}</h1>
        <p className="text-gray-600 font-medium mt-1">{dateRange}</p>
      </div>

      {/* 1. Totals */}
      <div className="mb-8">
        <h2 className="text-lg font-bold border-b border-gray-400 mb-2 uppercase">1. Financial Overview</h2>
        <table className="w-full text-sm border-collapse">
          <tbody>
            <tr className="border-b border-gray-200">
              <td className="py-2 font-medium w-1/2">Total Orders</td>
              <td className="py-2 text-right">{totals.orders}</td>
            </tr>
            <tr className="border-b border-gray-200">
              <td className="py-2 font-medium">Gross Sales</td>
              <td className="py-2 text-right">{gbp(totals.grossSales)}</td>
            </tr>
            <tr className="border-b border-gray-200">
              <td className="py-2 font-medium">Net Sales (After Platform Fees)</td>
              <td className="py-2 text-right">{gbp(totals.netSales)}</td>
            </tr>
            <tr className="border-b border-gray-200">
              <td className="py-2 font-medium">Total Expenses</td>
              <td className="py-2 text-right text-red-600">-{gbp(totals.totalExpenses)}</td>
            </tr>
            <tr className="bg-gray-100 font-bold">
              <td className="py-3 px-2">Net Profit</td>
              <td className="py-3 px-2 text-right">{gbp(totals.netProfit)}</td>
            </tr>
          </tbody>
        </table>

        {/* Expense Breakdown */}
        <h3 className="text-sm font-bold text-gray-700 mt-6 mb-2 uppercase">Expense Breakdown</h3>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-100 border-b border-gray-400">
              <th className="py-2 px-2 text-left font-bold">Category</th>
              <th className="py-2 px-2 text-right font-bold">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-gray-200">
              <td className="py-2 px-2 text-gray-700">3rd Party Deductions</td>
              <td className="py-2 px-2 text-right font-semibold text-red-600">{gbp(profitSummary.totalCommission)}</td>
            </tr>
            {profitSummary.adSpends > 0 && (
              <tr className="border-b border-gray-200">
                <td className="py-2 px-2 text-gray-700">3rd Party Ad Spend</td>
                <td className="py-2 px-2 text-right font-semibold text-red-600">{gbp(profitSummary.adSpends)}</td>
              </tr>
            )}
            <tr className="border-b border-gray-200">
              <td className="py-2 px-2 text-gray-700">Franchise & POS Fees</td>
              <td className="py-2 px-2 text-right font-semibold text-red-600">{gbp(profitSummary.franchiseFees)}</td>
            </tr>
            <tr className="border-b border-gray-200">
              <td className="py-2 px-2 text-gray-700">Utilities</td>
              <td className="py-2 px-2 text-right font-semibold text-red-600">{gbp(profitSummary.utilities)}</td>
            </tr>
            <tr className="border-b border-gray-200">
              <td className="py-2 px-2 text-gray-700">Wages</td>
              <td className="py-2 px-2 text-right font-semibold text-red-600">{gbp(profitSummary.staffWages)}</td>
            </tr>
            <tr className="border-b border-gray-200">
              <td className="py-2 px-2 text-gray-700">Supplier Purchases</td>
              <td className="py-2 px-2 text-right font-semibold text-red-600">{gbp(profitSummary.totalSuppliers)}</td>
            </tr>
            {profitSummary.marketing > 0 && (
              <tr className="border-b border-gray-200">
                <td className="py-2 px-2 text-gray-700">Marketing</td>
                <td className="py-2 px-2 text-right font-semibold text-red-600">{gbp(profitSummary.marketing)}</td>
              </tr>
            )}
            <tr className="border-b border-gray-200">
              <td className="py-2 px-2 text-gray-700">Others</td>
              <td className="py-2 px-2 text-right font-semibold text-red-600">{gbp(profitSummary.otherExpenses)}</td>
            </tr>
            <tr className="bg-gray-50 border-b border-black font-bold">
              <td className="py-2 px-2 text-right text-gray-700 uppercase">Total Expenses</td>
              <td className="py-2 px-2 text-right text-red-600">{gbp(totals.totalExpenses)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 2. Platform Performance */}
      <div className="mb-8">
        <h2 className="text-lg font-bold border-b border-gray-400 mb-2 uppercase">2. Platform Performance</h2>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-100 border-b-2 border-gray-400">
              <th className="py-2 px-2 text-left font-bold w-1/5">Platform</th>
              <th className="py-2 px-2 text-right font-bold w-1/6">Orders</th>
              <th className="py-2 px-2 text-right font-bold w-1/6">Gross Sales</th>
              <th className="py-2 px-2 text-right font-bold w-1/6">Deductions</th>
              <th className="py-2 px-2 text-right font-bold w-1/6">Ded. %</th>
              <th className="py-2 px-2 text-right font-bold w-1/6">Net Received</th>
            </tr>
          </thead>
          <tbody>
            {platformData.length === 0 ? (
              <tr><td colSpan={6} className="py-2 text-center text-gray-500">No data</td></tr>
            ) : (
              platformData.map((p: any, i: number) => (
                <tr key={i} className="border-b border-gray-200">
                  <td className="py-2 px-2">{p.name}</td>
                  <td className="py-2 px-2 text-right">{p.orders}</td>
                  <td className="py-2 px-2 text-right">{gbp(p.sales)}</td>
                  <td className="py-2 px-2 text-right">{gbp(p.deductions)}</td>
                  <td className="py-2 px-2 text-right">{p.sales > 0 ? ((p.deductions / p.sales) * 100).toFixed(1) + '%' : '0.0%'}</td>
                  <td className="py-2 px-2 text-right font-semibold">{gbp(p.net)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 3. Supplier Purchases */}
      <div className="mb-8">
        <h2 className="text-lg font-bold border-b border-gray-400 mb-2 uppercase">3. Supplier Purchases</h2>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-100 border-b-2 border-gray-400">
              <th className="py-2 px-2 text-left font-bold w-1/2">Supplier</th>
              <th className="py-2 px-2 text-left font-bold w-1/4">Category</th>
              <th className="py-2 px-2 text-right font-bold w-1/4">Amount</th>
            </tr>
          </thead>
          <tbody>
            {supplierData.length === 0 ? (
              <tr><td colSpan={3} className="py-2 text-center text-gray-500">No data</td></tr>
            ) : (
              supplierData.map((s: any, i: number) => (
                <tr key={i} className="border-b border-gray-200">
                  <td className="py-2 px-2">{s.name}</td>
                  <td className="py-2 px-2 capitalize">{s.category}</td>
                  <td className="py-2 px-2 text-right text-red-600">-{gbp(s.amount)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 4. Condensed Profit Summary */}
      <div className="mb-8 break-inside-avoid">
        <h2 className="text-lg font-bold border-b border-gray-400 mb-2 uppercase">4. Profit Summary</h2>
        <table className="w-full text-sm border-collapse">
          <tbody>
            <tr className="border-b border-gray-300 bg-gray-50 font-bold">
              <td className="py-2 px-2 w-3/4">Gross Sales</td>
              <td className="py-2 px-2 text-right">{gbp(totals.grossSales)}</td>
            </tr>
            
            {/* Deductions */}
            <tr className="border-b border-gray-200">
              <td className="py-2 px-4 italic text-gray-700">Commissions & 3rd Party Deductions</td>
              <td className="py-2 px-2 text-right text-red-600">-{gbp(profitSummary.totalCommission)}</td>
            </tr>
            {profitSummary.adSpends > 0 && (
              <tr className="border-b border-gray-200">
                <td className="py-2 px-4 italic text-gray-700">3rd Party Ad Spends</td>
                <td className="py-2 px-2 text-right text-red-600">-{gbp(profitSummary.adSpends)}</td>
              </tr>
            )}
            <tr className="border-b border-gray-200">
              <td className="py-2 px-4 italic text-gray-700">Franchise & POS Fees</td>
              <td className="py-2 px-2 text-right text-red-600">-{gbp(profitSummary.franchiseFees)}</td>
            </tr>
            {profitSummary.marketing > 0 && (
              <tr className="border-b border-gray-200">
                <td className="py-2 px-4 italic text-gray-700">Marketing</td>
                <td className="py-2 px-2 text-right text-red-600">-{gbp(profitSummary.marketing)}</td>
              </tr>
            )}
            <tr className="border-b border-gray-200">
              <td className="py-2 px-4 italic text-gray-700">Utilities</td>
              <td className="py-2 px-2 text-right text-red-600">-{gbp(profitSummary.utilities)}</td>
            </tr>
            <tr className="border-b border-gray-200">
              <td className="py-2 px-4 italic text-gray-700">Staff Wages</td>
              <td className="py-2 px-2 text-right text-red-600">-{gbp(profitSummary.staffWages)}</td>
            </tr>
            <tr className="border-b border-gray-200">
              <td className="py-2 px-4 italic text-gray-700">Supplier Purchases</td>
              <td className="py-2 px-2 text-right text-red-600">-{gbp(profitSummary.totalSuppliers)}</td>
            </tr>
            <tr className="border-b border-gray-200">
              <td className="py-2 px-4 italic text-gray-700">Other Expenses</td>
              <td className="py-2 px-2 text-right text-red-600">-{gbp(profitSummary.otherExpenses)}</td>
            </tr>

            {/* Total Expenses Row */}
            <tr className="border-b border-black font-semibold">
              <td className="py-2 px-2 text-right text-gray-600 uppercase text-xs">Total Deductions</td>
              <td className="py-2 px-2 text-right text-red-600">-{gbp(totals.totalExpenses)}</td>
            </tr>

            {/* Final Net Profit */}
            <tr className="bg-gray-100 font-bold text-base">
              <td className="py-3 px-2 uppercase">Net Profit</td>
              <td className="py-3 px-2 text-right">{gbp(totals.netProfit)}</td>
            </tr>
          </tbody>
        </table>
      </div>

    </div>
  )
}

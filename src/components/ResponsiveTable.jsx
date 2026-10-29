import React from 'react';

/**
 * ResponsiveTable - A table that transforms into card views on mobile
 * 
 * @param {Array} columns - Array of column objects { key, label, render?, className? }
 * @param {Array} data - Array of data objects
 * @param {Function} renderRow - Optional custom row renderer
 * @param {string} emptyMessage - Message to show when no data
 * @param {ReactNode} emptyIcon - Icon to show when no data
 */
export default function ResponsiveTable({
  columns = [],
  data = [],
  renderRow,
  emptyMessage = 'No data available',
  emptyIcon = '📭',
  className = '',
}) {
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-12 px-4">
        <div className="text-5xl mb-4">{emptyIcon}</div>
        <p className="text-sm text-slate-500">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <>
      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className={`w-full text-sm ${className}`}>
          <thead className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-6 py-4 text-left ${col.className || ''}`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map((item, index) => (
              <tr
                key={item.id || index}
                className="hover:bg-slate-50/50 transition-colors"
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-6 py-4 ${col.className || ''}`}
                  >
                    {col.render ? col.render(item, index) : item[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {data.map((item, index) => (
          <div
            key={item.id || index}
            className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 hover:shadow-md transition-shadow"
          >
            {renderRow ? renderRow(item, index) : (
              <div className="space-y-2">
                {columns.map((col) => (
                  <div key={col.key} className="flex justify-between items-start">
                    <span className="text-xs text-slate-500 font-medium uppercase tracking-wide">
                      {col.label}
                    </span>
                    <div className="text-right ml-4">
                      {col.render ? col.render(item, index) : (
                        <span className="text-sm text-slate-700">{item[col.key]}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

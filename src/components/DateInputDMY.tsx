import React, { useRef, useState, useEffect } from 'react';
import { Calendar } from 'lucide-react';
import { formatDateDMY } from '../types/billing';

interface DateInputDMYProps {
  value: string;
  onChange: (newIsoDate: string) => void;
  className?: string;
}

/**
 * Displays date strictly in Day/Month/Year (DD/MM/YYYY) format regardless of browser locale,
 * while supporting both direct DD/MM/YYYY typing and native calendar popup selection.
 */
export const DateInputDMY: React.FC<DateInputDMYProps> = ({
  value,
  onChange,
  className = '',
}) => {
  const hiddenDateRef = useRef<HTMLInputElement | null>(null);
  const [displayValue, setDisplayValue] = useState<string>(() =>
    value ? formatDateDMY(value) : ''
  );

  useEffect(() => {
    setDisplayValue(value ? formatDateDMY(value) : '');
  }, [value]);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setDisplayValue(raw);

    // Parse DD/MM/YYYY or DD-MM-YYYY
    const match = raw.trim().match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (match) {
      const day = match[1].padStart(2, '0');
      const month = match[2].padStart(2, '0');
      const year = match[3];
      const dNum = parseInt(day, 10);
      const mNum = parseInt(month, 10);
      if (mNum >= 1 && mNum <= 12 && dNum >= 1 && dNum <= 31) {
        onChange(`${year}-${month}-${day}`);
      }
    }
  };

  const handleBlur = () => {
    setDisplayValue(value ? formatDateDMY(value) : '');
  };

  const openNativePicker = () => {
    const el = hiddenDateRef.current;
    if (!el) return;
    if (typeof el.showPicker === 'function') {
      try {
        el.showPicker();
      } catch {
        el.focus();
      }
    } else {
      el.focus();
      }
  };

  return (
    <div className={`relative flex items-center ${className}`}>
      <input
        type="text"
        value={displayValue}
        onChange={handleTextChange}
        onBlur={handleBlur}
        placeholder="วว/ดด/ปปปป (เช่น 03/11/2026)"
        className="w-full pl-3 pr-9 py-1.5 bg-slate-50 border border-slate-300 rounded-md font-mono-tabular text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
      />
      <button
        type="button"
        onClick={openNativePicker}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-slate-900 rounded cursor-pointer"
        title="เลือกวันที่จากปฏิทิน (วัน/เดือน/ปี)"
      >
        <Calendar className="w-3.5 h-3.5" />
      </button>
      <input
        ref={hiddenDateRef}
        type="date"
        value={value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : ''}
        onChange={(e) => {
          if (e.target.value) {
            onChange(e.target.value);
          }
        }}
        tabIndex={-1}
        aria-hidden="true"
        className="sr-only pointer-events-none"
      />
    </div>
  );
};

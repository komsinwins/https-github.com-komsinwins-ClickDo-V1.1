import React, { useState } from 'react';
import { Save, Check } from 'lucide-react';
import { useAppStore } from '../store';

interface SaveButtonProps {
  onSave?: () => void;
  label?: string;
  className?: string;
  successMessage?: string;
  variant?: 'primary' | 'secondary' | 'outline';
}

export function SaveButton({ onSave, label, className = '', successMessage, variant = 'primary' }: SaveButtonProps) {
  const { data, updateData } = useAppStore();
  const lang = data.language || 'th';
  const [saved, setSaved] = useState(false);

  const handleClick = () => {
    // Re-trigger store update to ensure sync and fire persistence
    updateData({});
    if (onSave) {
      onSave();
    }
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
    }, 2500);
  };

  const defaultLabel = label || (lang === 'th' ? 'บันทึกข้อมูล' : 'Save Data');
  const message = successMessage || (lang === 'th' ? 'บันทึกข้อมูลเรียบร้อยแล้ว' : 'Data saved successfully');

  let bgClasses = 'bg-[#0061FF] hover:bg-blue-700 text-white';
  if (variant === 'secondary') {
    bgClasses = 'bg-emerald-600 hover:bg-emerald-700 text-white';
  } else if (variant === 'outline') {
    bgClasses = 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-300';
  }

  return (
    <div className="relative inline-flex items-center">
      <button
        type="button"
        onClick={handleClick}
        className={`px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition-all shadow-sm active:scale-95 text-xs sm:text-sm ${
          saved
            ? 'bg-emerald-600 text-white ring-2 ring-emerald-300'
            : bgClasses
        } ${className}`}
      >
        {saved ? <Check className="w-4 h-4 text-white" /> : <Save className="w-4 h-4" />}
        <span>{saved ? (lang === 'th' ? 'บันทึกสำเร็จ' : 'Saved!') : defaultLabel}</span>
      </button>

      {saved && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-5 duration-200 border border-slate-700">
          <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-sm">
            ✓
          </div>
          <span className="text-sm font-medium">{message}</span>
        </div>
      )}
    </div>
  );
}

'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSubscriptionAccess } from '@/hooks/useSubscriptionAccess';
import { useUserPreferences } from '@/hooks/useUserPreferences';

type GenderType = 'any' | 'male' | 'female' | 'couple' | 'lgbt';

interface GenderToggleProps {
  value?: GenderType;
  onChange?: (value: GenderType) => void;
  compact?: boolean;
}

const OPTIONS: { value: GenderType; label: string; paidOnly?: boolean }[] = [
  { value: 'any', label: 'أي أحد' },
  { value: 'male', label: 'ذكور', paidOnly: true },
  { value: 'female', label: 'إناث', paidOnly: true },
  { value: 'couple', label: 'زوجين', paidOnly: true },
  { value: 'lgbt', label: 'LGBT', paidOnly: true },
];

export default function GenderToggle(props: GenderToggleProps) {
  const { value, onChange, compact } = props;

  const { isLoading, hasAccess, subscriptionStatus } = useSubscriptionAccess();
  const { genderPreference, updateGenderPreference } = useUserPreferences();

  const [selected, setSelected] = useState<GenderType>(value ?? genderPreference ?? 'any');

  // مزامنة القيمة من الـ prop إذا تغيرت
  useEffect(() => {
    if (value && value !== selected) setSelected(value);
  }, [value]);

  // منع خيارات المدفوعة إذا لم يكن لديه اشتراك
  useEffect(() => {
    if (!isLoading && !hasAccess && selected !== 'any') {
      setSelected('any');
      onChange?.('any');
      updateGenderPreference('any');
    }
  }, [isLoading, hasAccess]);

  // التلميح النصي أسفل الاختيار
  const hint = useMemo(() => {
    if (isLoading) return '...';
    if (hasAccess) return `اشتراكك: ${subscriptionStatus}`;
    return 'الميزة متاحة فقط للمشتركين — اختر "أي أحد" أو قم بالترقية.';
  }, [isLoading, hasAccess, subscriptionStatus]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextVal = e.target.value as GenderType;

    const isPaidOption = OPTIONS.find(o => o.value === nextVal)?.paidOnly;
    if (!hasAccess && isPaidOption) {
      alert('هذه الميزة متاحة فقط للمشتركين. الرجاء الترقية.');
      setSelected('any');
      onChange?.('any');
      updateGenderPreference('any');
      return;
    }

    setSelected(nextVal);
    onChange?.(nextVal);
    updateGenderPreference(nextVal);
  };

  return (
    <div style={{ display: 'grid', gap: 8, fontFamily: 'system-ui' }}>
      <label style={{ fontSize: compact ? 12 : 14, fontWeight: 600 }}>
        تفضيل المطابقة
      </label>

      <select
        value={selected}
        onChange={handleChange}
        disabled={isLoading}
        title={hint}
        style={{
          padding: compact ? '6px 8px' : '10px 12px',
          borderRadius: 8,
          border: '1px solid #cfcfcf',
          background: '#fff',
          cursor: isLoading ? 'not-allowed' : 'pointer',
          fontSize: compact ? 13 : 15,
        }}
      >
        {OPTIONS.map(opt => {
          const disabled = !hasAccess && opt.paidOnly;
          const label = disabled ? `${opt.label} (للمشتركين)` : opt.label;
          return (
            <option key={opt.value} value={opt.value} disabled={disabled}>
              {label}
            </option>
          );
        })}
      </select>

      {!hasAccess && !isLoading && (
        <div
          style={{
            fontSize: 12,
            color: '#8a2be2',
            background: '#f7f0ff',
            padding: '8px 10px',
            borderRadius: 8,
            border: '1px dashed #d9c8ff',
          }}
        >
          ميزة اختيار الجنس متاحة فقط للمشتركين. يمكنك المتابعة بخيار "أي أحد".
        </div>
      )}
    </div>
  );
}

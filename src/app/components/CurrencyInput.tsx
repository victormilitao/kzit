'use client';

import { useCallback } from 'react';

interface CurrencyInputProps {
  /** Value in cents (integer). e.g. 12345 = R$ 123,45 */
  value: number;
  onChange: (cents: number) => void;
  placeholder?: string;
  className?: string;
  id?: string;
}

/**
 * Formats a cents value to Brazilian currency display (without R$ prefix).
 * e.g. 12345 → "123,45", 0 → "0,00"
 */
function formatCentsToDisplay(cents: number): string {
  const abs = Math.abs(cents);
  const intPart = Math.floor(abs / 100);
  const decPart = abs % 100;

  const intStr = intPart.toLocaleString('pt-BR');
  const decStr = String(decPart).padStart(2, '0');

  return `${intStr},${decStr}`;
}

/**
 * Currency input with Brazilian Real formatting.
 * Digits are entered right-to-left (like a calculator).
 * Typing "12345" produces "123,45".
 */
export function CurrencyInput({ value, onChange, placeholder = '0,00', className, id }: CurrencyInputProps) {
  const displayValue = value === 0 ? '' : formatCentsToDisplay(value);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      // Strip everything that's not a digit
      const raw = e.target.value.replace(/\D/g, '');

      // Parse as integer cents
      const cents = parseInt(raw, 10) || 0;

      onChange(cents);
    },
    [onChange],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Allow navigation keys
      if (['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
        return;
      }
      // Allow Ctrl/Cmd combos (copy, paste, select all)
      if (e.ctrlKey || e.metaKey) {
        return;
      }
      // Only allow digits
      if (!/^\d$/.test(e.key)) {
        e.preventDefault();
      }
    },
    [],
  );

  return (
    <input
      id={id}
      type="text"
      inputMode="numeric"
      className={className}
      placeholder={placeholder}
      value={displayValue}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
    />
  );
}

/**
 * Converts a float value (e.g. 123.45) to cents (12345).
 */
export function floatToCents(val: number | null | undefined): number {
  if (val == null) return 0;
  return Math.round(val * 100);
}

/**
 * Converts cents (12345) to float (123.45).
 */
export function centsToFloat(cents: number): number | null {
  if (cents === 0) return null;
  return cents / 100;
}

'use client';

import { ReactNode, SelectHTMLAttributes, InputHTMLAttributes, TextareaHTMLAttributes } from 'react';

interface FormFieldBaseProps {
  label?: string;
  className?: string;
  style?: React.CSSProperties;
}

interface FormFieldSelectProps extends FormFieldBaseProps {
  as: 'select';
  children: ReactNode;
  selectProps: SelectHTMLAttributes<HTMLSelectElement>;
}

interface FormFieldInputProps extends FormFieldBaseProps {
  as?: 'input';
  inputProps: InputHTMLAttributes<HTMLInputElement>;
}

interface FormFieldTextareaProps extends FormFieldBaseProps {
  as: 'textarea';
  textareaProps: TextareaHTMLAttributes<HTMLTextAreaElement>;
}

type FormFieldProps = FormFieldSelectProps | FormFieldInputProps | FormFieldTextareaProps;

export function FormField(props: FormFieldProps) {
  const { label, className = '', style } = props;

  return (
    <div className={`form-group ${className}`} style={style}>
      {label && <label>{label}</label>}
      {props.as === 'select' ? (
        <select {...props.selectProps}>{props.children}</select>
      ) : props.as === 'textarea' ? (
        <textarea {...props.textareaProps} />
      ) : (
        <input {...(props as FormFieldInputProps).inputProps} />
      )}
    </div>
  );
}

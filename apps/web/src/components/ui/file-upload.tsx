'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface FileUploadProps {
  label?: string;
  helperText?: string;
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  error?: string | boolean;
  value?: File | null;
  onChange?: (file: File | null) => void;
  className?: string;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  label = 'Upload prescription or clinical document',
  helperText = 'PDF, PNG, JPG up to 10MB',
  accept = 'image/*,.pdf',
  disabled = false,
  error,
  value,
  onChange,
  className,
}) => {
  const [dragActive, setDragActive] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onChange?.(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onChange?.(e.target.files[0]);
    }
  };

  const hasError = Boolean(error);
  const errorMessage = typeof error === 'string' ? error : undefined;

  return (
    <div className={cn('w-full space-y-[6px]', className)}>
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
        className={cn(
          'flex flex-col items-center justify-center p-[24px] rounded-[12px] border-2 border-dashed transition-all cursor-pointer text-center bg-white',
          'border-[#CBD5E1] hover:border-[#0D5C5A] hover:bg-[#F0FDFA]',
          dragActive && 'border-[#0D5C5A] bg-[#F0FDFA]',
          hasError && 'border-[#DC2626] bg-[#FEF2F2]/40',
          disabled && 'opacity-50 cursor-not-allowed bg-[#EFF4FF] hover:border-[#CBD5E1]',
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          disabled={disabled}
          onChange={handleChange}
          className="hidden"
        />

        {value ? (
          <div className="flex items-center gap-3">
            <div className="text-left">
              <p className="text-[14px] font-semibold text-[#0F172A]">{value.name}</p>
              <p className="text-[12px] text-[#64748B]">
                {(value.size / (1024 * 1024)).toFixed(2)} MB
              </p>
            </div>
            {!disabled && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange?.(null);
                }}
                className="ml-2 px-2 py-0.5 text-xs font-semibold rounded bg-slate-100 text-[#64748B] hover:text-[#DC2626] transition-colors cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1.5">
            <p className="text-[14px] font-bold text-[#0D5C5A] font-display">{label}</p>
            <p className="text-[12px] text-[#64748B]">{helperText}</p>
          </div>
        )}
      </div>

      {hasError && errorMessage && (
        <p className="text-[12px] leading-[16px] text-[#DC2626] font-medium">{errorMessage}</p>
      )}
    </div>
  );
};
FileUpload.displayName = 'FileUpload';

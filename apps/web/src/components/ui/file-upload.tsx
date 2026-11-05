'use client';

import * as React from 'react';
import { UploadCloud, FileText, X } from 'lucide-react';
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
          'flex flex-col items-center justify-center p-[20px] rounded-[8px] border-2 border-dashed transition-colors cursor-pointer text-center bg-white',
          'border-[#CED4DA] hover:border-[#6240E8] hover:bg-[#F7F5FD]',
          dragActive && 'border-[#6240E8] bg-[#F7F5FD]',
          hasError && 'border-[#DC3545] bg-[#FDF2F2]/40',
          disabled && 'opacity-50 cursor-not-allowed bg-[#EFF2F7] hover:border-[#CED4DA]'
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
            <FileText className="h-6 w-6 text-[#6240E8]" />
            <div className="text-left">
              <p className="text-[14px] font-medium text-[#14161A]">{value.name}</p>
              <p className="text-[12px] text-[#78879A]">
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
                className="ml-2 p-1 text-[#78879A] hover:text-[#DC3545]"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1.5">
            <UploadCloud className="h-8 w-8 text-[#6240E8]" />
            <p className="text-[14px] font-medium text-[#351F65]">{label}</p>
            <p className="text-[12px] text-[#78879A]">{helperText}</p>
          </div>
        )}
      </div>

      {hasError && errorMessage && (
        <p className="text-[12px] leading-[16px] text-[#DC3545] font-normal">{errorMessage}</p>
      )}
    </div>
  );
};
FileUpload.displayName = 'FileUpload';

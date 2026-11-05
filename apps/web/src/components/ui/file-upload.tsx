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
  label = 'Upload prescription or document',
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
          'border-[#D3DBD5] hover:border-[#176B52] hover:bg-[#F7F9F7]',
          dragActive && 'border-[#176B52] bg-[#E9F3EE]',
          hasError && 'border-[#C44747] bg-[#FCECEC]/30',
          disabled && 'opacity-50 cursor-not-allowed bg-[#F0F3F1] hover:border-[#D3DBD5]'
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
            <FileText className="h-6 w-6 text-[#176B52]" />
            <div className="text-left">
              <p className="text-[14px] font-medium text-[#24332E]">{value.name}</p>
              <p className="text-[12px] text-[#64736C]">
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
                className="ml-2 p-1 text-[#64736C] hover:text-[#C44747]"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1.5">
            <UploadCloud className="h-8 w-8 text-[#176B52]" />
            <p className="text-[14px] font-medium text-[#24332E]">{label}</p>
            <p className="text-[12px] text-[#64736C]">{helperText}</p>
          </div>
        )}
      </div>

      {hasError && errorMessage && (
        <p className="text-[12px] leading-[16px] text-[#C44747] font-normal">{errorMessage}</p>
      )}
    </div>
  );
};
FileUpload.displayName = 'FileUpload';

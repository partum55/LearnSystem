import React, { useState } from 'react';

interface FileUploadQuestionProps {
  question: {
    id: string;
    text: string;
    metadata: {
      allowed_extensions?: string[];
      max_file_size_mb?: number;
      max_files?: number;
    };
  };
  value?: File[];
  onChange: (files: File[]) => void;
  disabled?: boolean;
}

const FileUploadQuestion: React.FC<FileUploadQuestionProps> = ({
  question,
  value = [],
  onChange,
  disabled = false
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allowedExtensions = question.metadata?.allowed_extensions || ['.pdf', '.docx'];
  const maxFileSizeMB = question.metadata?.max_file_size_mb || 10;
  const maxFiles = question.metadata?.max_files || 3;

  const validateFile = (file: File): boolean => {
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    
    if (!allowedExtensions.includes(extension)) {
      setError(`Invalid file type. Allowed: ${allowedExtensions.join(', ')}`);
      return false;
    }
    
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > maxFileSizeMB) {
      setError(`File size exceeds ${maxFileSizeMB}MB limit`);
      return false;
    }
    
    return true;
  };

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    
    setError(null);
    const newFiles = Array.from(files);
    
    if (value.length + newFiles.length > maxFiles) {
      setError(`Maximum ${maxFiles} files allowed`);
      return;
    }
    
    for (const file of newFiles) {
      if (!validateFile(file)) {
        return;
      }
    }
    
    onChange([...value, ...newFiles]);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (disabled) return;
    handleFiles(e.dataTransfer.files);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (disabled) return;
    handleFiles(e.target.files);
  };

  const removeFile = (index: number) => {
    const newFiles = value.filter((_, i) => i !== index);
    onChange(newFiles);
    setError(null);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="file-upload-question">
      <div className="mb-4">
        <p className="text-lg font-medium text-gray-900 mb-2">{question.text}</p>
        <p className="text-sm text-gray-600">
          Allowed: {allowedExtensions.join(', ')} • Max size: {maxFileSizeMB}MB • Max files: {maxFiles}
        </p>
      </div>

      <div
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
        } ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'hover:border-gray-400'}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          id={`file-upload-${question.id}`}
          onChange={handleChange}
          disabled={disabled}
          multiple={maxFiles > 1}
          accept={allowedExtensions.join(',')}
          className="hidden"
        />
        
        <div className="space-y-2">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            stroke="currentColor"
            fill="none"
            viewBox="0 0 48 48"
            aria-hidden="true"
          >
            <path
              d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          
          <div className="text-sm text-gray-600">
            <label
              htmlFor={`file-upload-${question.id}`}
              className="relative cursor-pointer rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none"
            >
              <span>Upload files</span>
            </label>
            <p className="pl-1">or drag and drop</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-2 text-sm text-red-600 flex items-center">
          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          {error}
        </div>
      )}

      {value.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-sm font-medium text-gray-700">Uploaded files ({value.length}/{maxFiles}):</p>
          {value.map((file, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 112 0v4a7 7 0 11-14 0V7a5 5 0 0110 0v4a3 3 0 11-6 0V7a1 1 0 012 0v4a1 1 0 102 0V7a3 3 0 00-3-3z" clipRule="evenodd" />
                </svg>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                  <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                </div>
              </div>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  className="ml-3 text-red-600 hover:text-red-800 flex-shrink-0"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FileUploadQuestion;


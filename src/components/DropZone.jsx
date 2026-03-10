import { useState, useRef, useCallback } from 'react';
import { Upload, FileText, Image, Plus } from 'lucide-react';
import { getAcceptString } from '../utils/fileHelpers';
import './DropZone.css';

/**
 * DropZone 컴포넌트
 * 파일을 드래그 앤 드롭하거나 클릭하여 업로드하는 영역
 */
export default function DropZone({ onFilesSelected, isCompact = false, disabled = false }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragCount, setDragCount] = useState(0);
  const fileInputRef = useRef(null);
  const dragCounter = useRef(0);

  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    setIsDragOver(true);
    if (e.dataTransfer?.items) {
      setDragCount(e.dataTransfer.items.length);
    }
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragOver(false);
    }
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      dragCounter.current = 0;

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        onFilesSelected(files);
      }
    },
    [onFilesSelected]
  );

  const handleClick = useCallback(() => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  }, [disabled]);

  const handleFileChange = useCallback(
    (e) => {
      const files = Array.from(e.target.files);
      if (files.length > 0) {
        onFilesSelected(files);
      }
      e.target.value = '';
    },
    [onFilesSelected]
  );

  if (isCompact) {
    return (
      <div
        className={`dropzone-compact-area ${isDragOver ? 'dropzone-compact-area--active' : ''} ${disabled ? 'dropzone--disabled' : ''}`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleClick}
        role="button"
        tabIndex={0}
      >
        <div className="dropzone-compact__content">
          <div className="dropzone-compact__icon">
            {isDragOver ? <Upload size={24} strokeWidth={2} /> : <Plus size={24} strokeWidth={2} />}
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept={getAcceptString()}
          multiple
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
      </div>
    );
  }

  return (
    <div
      className={`dropzone ${isDragOver ? 'dropzone--active' : ''} ${disabled ? 'dropzone--disabled' : ''}`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && handleClick()}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={getAcceptString()}
        multiple
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />

      <div className="dropzone__content">
        <div className="dropzone__icon-group">
          <div className="dropzone__icon dropzone__icon--main">
            <Upload size={36} strokeWidth={1.5} />
          </div>
          <div className="dropzone__icon-badges">
            <span className="dropzone__badge"><FileText size={14} /> PDF</span>
            <span className="dropzone__badge"><Image size={14} /> JPG</span>
            <span className="dropzone__badge"><Image size={14} /> PNG</span>
          </div>
        </div>

        <div className="dropzone__text">
          <h2 className="dropzone__title">
            파일을 여기에 끌어 놓으세요
          </h2>
          <p className="dropzone__subtitle">
            또는 클릭하여 파일을 선택하세요
          </p>
          <p className="dropzone__hint">
            PDF, JPG, PNG 형식 · 여러 파일 동시 업로드 가능
          </p>
        </div>
      </div>

      {isDragOver && (
        <div className="dropzone__overlay">
          <Upload size={48} strokeWidth={1.5} />
          {dragCount > 1 && <span className="dropzone__count">{dragCount}</span>}
          <span>파일을 놓으세요</span>
        </div>
      )}
    </div>
  );
}

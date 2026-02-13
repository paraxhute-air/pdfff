/**
 * fileHelpers.js
 * 파일 읽기 및 유효성 검사 유틸리티
 */

const SUPPORTED_TYPES = {
  'application/pdf': 'pdf',
  'image/jpeg': 'image',
  'image/jpg': 'image',
  'image/png': 'image',
};

const ACCEPT_STRING = '.pdf,.jpg,.jpeg,.png';

/**
 * File 객체를 ArrayBuffer로 읽습니다.
 * @param {File} file
 * @returns {Promise<ArrayBuffer>}
 */
export function readFileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error(`파일 읽기 실패: ${file.name}`));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * 파일이 지원되는 포맷인지 확인합니다.
 * @param {File} file
 * @returns {{ valid: boolean, type: string }}
 */
export function validateFile(file) {
  const type = SUPPORTED_TYPES[file.type];
  return {
    valid: !!type,
    type: type || 'unknown',
    mimeType: file.type,
  };
}

/**
 * 파일 목록에서 유효한 파일만 필터링합니다.
 * @param {FileList|File[]} files
 * @returns {File[]}
 */
export function filterValidFiles(files) {
  return Array.from(files).filter((f) => validateFile(f).valid);
}

/**
 * 지원되는 파일 포맷의 accept 문자열을 반환합니다.
 * @returns {string}
 */
export function getAcceptString() {
  return ACCEPT_STRING;
}

/**
 * 파일 크기를 읽기 쉬운 문자열로 변환합니다.
 * @param {number} bytes
 * @returns {string}
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

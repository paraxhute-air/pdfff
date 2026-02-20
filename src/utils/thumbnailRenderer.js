/**
 * thumbnailRenderer.js
 * pdfjs-dist를 사용하여 PDF 페이지의 썸네일 이미지를 생성합니다.
 */

import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// PDF.js 워커 설정 - Vite의 ?url import로 안정적 로드
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;

/**
 * 단일 PDF 페이지 바이트에서 썸네일 Data URL을 생성합니다.
 * @param {Uint8Array} pdfBytes - 단일 페이지 PDF 바이트
 * @param {number} scale - 렌더링 스케일 (기본 0.5)
 * @returns {Promise<string>} 썸네일 이미지 Data URL
 */
export async function renderThumbnail(pdfBytes, scale = 0.5, rotation = 0) {
  try {
    const loadingTask = pdfjsLib.getDocument({ data: pdfBytes.slice(0) });
    const pdf = await loadingTask.promise;
    const page = await pdf.getPage(1);

    const viewport = page.getViewport({ scale, rotation });
    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);

    const ctx = canvas.getContext('2d');
    await page.render({ canvasContext: ctx, viewport }).promise;

    const dataUrl = canvas.toDataURL('image/webp', 0.8);

    // 리소스 해제
    page.cleanup();
    pdf.destroy();

    return dataUrl;
  } catch (err) {
    console.error('썸네일 렌더링 오류:', err);
    return null;
  }
}

/**
 * 여러 페이지의 썸네일을 일괄 생성합니다.
 * @param {Array<{id, pageBytes}>} pages - 페이지 배열
 * @param {number} scale - 렌더링 스케일
 * @param {Function} onProgress - 진행 콜백 (완료 개수, 전체 개수)
 * @returns {Promise<Map<string, string>>} id → dataUrl 맵
 */
export async function renderThumbnails(pages, scale = 0.5, onProgress) {
  const thumbnails = new Map();

  // 순차적으로 하나씩 처리 (pdfjs 동시 처리 시 워커 충돌 방지)
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    try {
      const dataUrl = await renderThumbnail(page.pageBytes, scale);
      if (dataUrl) {
        thumbnails.set(page.id, dataUrl);
      }
    } catch (err) {
      console.error(`썸네일 생성 실패 (${page.id}):`, err);
    }

    if (onProgress) {
      onProgress(i + 1, pages.length);
    }
  }

  return thumbnails;
}

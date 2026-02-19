import { useState, useCallback, useRef, useEffect } from 'react';
import { FileText, Trash2, LayoutGrid, Columns, ChevronLeft, ChevronRight, AlertTriangle, Loader, ZoomIn, ZoomOut } from 'lucide-react';
import DropZone from './components/DropZone';
import PageGrid from './components/PageGrid';
import OverlaySettings from './components/OverlaySettings';
import OverlayPreviewLayer from './components/OverlayPreviewLayer';
import ActionPanel from './components/ActionPanel';
import ThemeToggle from './components/ThemeToggle';
import { splitPdfPages, imageToPdfPage, mergePagesWithOverlay, createBlobUrl, sharePdf, isShareSupported } from './utils/pdfHelpers';
import { readFileAsArrayBuffer, validateFile } from './utils/fileHelpers';
import { renderThumbnail, renderThumbnails } from './utils/thumbnailRenderer';
import './App.css';

const DEFAULT_OVERLAY = {
  text: '',
  enabledModes: [],
  position: 'middle-center',
  fontSize: 60,
  opacity: 0.4,
  rotation: 45,
  color: { r: 0.5, g: 0.5, b: 0.5 },
  border: false,
  fontFamily: 'malgun', // Default font
  headerText: '',
  footerText: '',
  stampText: '',
  stampPosition: 'bottom-right',
  stampFontSize: 30,
  stampOpacity: 0.4,
  stampRotation: 0,
  stampColor: { r: 0.5, g: 0.5, b: 0.5 },
  stampBorder: false,
  headfootFontSize: 10,
  headfootColor: { r: 0.5, g: 0.5, b: 0.5 },
  headfootAlign: 'center',
  // 텍스트 스타일
  textStyle: { bold: false, italic: false, underline: false },
  // 이미지 오버레이
  imageDataUrl: null,
  imageOpacity: 1.0,
  imageScale: 0.5,
  imageRotation: 0,
  imagePosition: 'middle-center',
};

export default function App() {
  // 상태 관리 (Global)
  const [pages, setPages] = useState([]);
  const [thumbnails, setThumbnails] = useState(new Map());
  const [overlay, setOverlay] = useState(DEFAULT_OVERLAY); // Global Settings (Watermark, Stamp)
  
  // Page-Specific Overlays (Text, Image)
  // Map<pageId, OverlayObject>
  const [pageOverlays, setPageOverlays] = useState({});

  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isActionPanelVisible, setIsActionPanelVisible] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState(null);
  const [generatedBytes, setGeneratedBytes] = useState(null);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState(null);

  // 변경 감지: 마지막으로 생성했을 때의 오버레이 상태 저장 (Global + Local checksum?)
  const [lastGeneratedConfig, setLastGeneratedConfig] = useState(null);
  // Compare current state (global + local) with last generated
  const currentConfigSignature = JSON.stringify({ global: overlay, local: pageOverlays });
  const hasChanges = lastGeneratedConfig && currentConfigSignature !== lastGeneratedConfig;

  // 뷰 모드: 'preview' (A모드) | 'grid' (B모드)
  const [viewMode, setViewMode] = useState('preview');
  const [selectedPageId, setSelectedPageId] = useState(null);
  const [deleteTargetId, setDeleteTargetId] = useState(null); 
  const [dividers, setDividers] = useState(new Set()); 
  const [previewImage, setPreviewImage] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewZoom, setPreviewZoom] = useState(1.0);

  const blobUrlRef = useRef(null);

  // Helper to get local overlay for a page (or default)
  const getLocalOverlay = useCallback((pageId) => {
    return pageOverlays[pageId] || {
       text: '',
       textStyle: { bold: false, italic: false, underline: false },
       fontFamily: 'malgun',
       fontSize: 60,
       opacity: 1,
       color: { r: 0, g: 0, b: 0 },
       position: 'middle-center',
       customX: null, customY: null,
       rotation: 0,
       
       imageDataUrl: null,
       imageOpacity: 1.0,
       imageScale: 0.5,
       imageRotation: 0,
       imageCustomX: null, imageCustomY: null,
       imagePosition: 'middle-center',
    };
  }, [pageOverlays]);

  // Global Overlay Change Handler (Merges updates)
  const handleGlobalOverlayChange = useCallback((updates) => {
    setOverlay((prev) => ({ ...prev, ...updates }));
  }, []);

  const handleLocalOverlayChange = useCallback((updates) => {
    if (!selectedPageId) return;
    setPageOverlays(prev => ({
      ...prev,
      [selectedPageId]: { 
        ...getLocalOverlay(selectedPageId), 
        ...updates 
      }
    }));
  }, [selectedPageId, getLocalOverlay]);

  // Blob URL 정리
  useEffect(() => {
    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
      }
    };
  }, []);

  // ... (useEffect hooks for initial page selection, preview rendering - no changes)
  // 첫 페이지 선택
  useEffect(() => {
    if (pages.length > 0 && !selectedPageId) {
      setSelectedPageId(pages[0].id);
    }
    if (pages.length === 0) {
      setSelectedPageId(null);
    }
  }, [pages, selectedPageId]);

  // 선택 페이지 변경 시 고해상도 프리뷰 렌더링
  useEffect(() => {
    if (!selectedPageId || viewMode !== 'preview') {
      setPreviewImage(null);
      setPreviewZoom(1.0);
      return;
    }
    const page = pages.find((p) => p.id === selectedPageId);
    if (!page) return;

    let cancelled = false;
    setPreviewLoading(true);
    renderThumbnail(page.pageBytes, 2.0).then((dataUrl) => {
      if (!cancelled && dataUrl) {
        setPreviewImage(dataUrl);
      }
      setPreviewLoading(false);
    });

    return () => { cancelled = true; };
  }, [selectedPageId, viewMode, pages]);

  // ... (handleFiles, generateThumbnails, handleReorder, delete handlers - KEEP AS IS)
  /**
   * 파일 업로드 처리
   */
  const handleFiles = useCallback(async (files) => {
    setIsLoading(true);
    setError(null);
    setLoadingMessage('파일을 분석하고 있습니다...');

    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
    setGeneratedUrl(null);
    setGeneratedBytes(null);

    try {
      console.log('Starting file processing...', files);
      const newPages = [];
      const unsupportedFiles = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const { valid, type, mimeType } = validateFile(file);
        if (!valid) {
          unsupportedFiles.push(file.name);
          continue;
        }

        setLoadingMessage(`처리 중: ${file.name} (${i + 1}/${files.length})`);
        const buffer = await readFileAsArrayBuffer(file);

        if (type === 'pdf') {
          const pdfPages = await splitPdfPages(buffer, file.name);
          newPages.push(...pdfPages);
        } else if (type === 'image') {
          const imgPage = await imageToPdfPage(buffer, file.name, mimeType);
          newPages.push(imgPage);
        }
      }

      if (unsupportedFiles.length > 0) {
        setError(`지원하지 않는 파일 형식: ${unsupportedFiles.join(', ')}\n(PDF, JPG, PNG만 지원합니다)`);
      }

      if (newPages.length > 0) {
        generateThumbnails(newPages);
      }

      setPages((prev) => {
        const combined = [...prev, ...newPages];
        return combined;
      });
    } catch (err) {
      console.error('파일 처리 오류:', err);
      setError(`파일 처리 중 오류가 발생했습니다: ${err.message}`);
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, []);

  const generateThumbnails = useCallback(async (newPages) => {
    try {
      const thumbMap = await renderThumbnails(newPages, 0.5);
      setThumbnails((prev) => {
        const next = new Map(prev);
        thumbMap.forEach((dataUrl, id) => next.set(id, dataUrl));
        return next;
      });
    } catch (err) {
      console.error('썸네일 생성 오류:', err);
    }
  }, []);

  const handleReorder = useCallback((newOrder) => {
    setPages(newOrder);
    setGeneratedUrl(null);
    setGeneratedBytes(null);
  }, []);

  const handleDeleteRequest = useCallback((pageId) => {
    setDeleteTargetId(pageId);
  }, []);

  const confirmDeleteAction = useCallback(() => {
    if (!deleteTargetId) return;
    const pageId = deleteTargetId;

    setPages((prev) => prev.filter((p) => p.id !== pageId));
    setThumbnails((prev) => {
      const next = new Map(prev);
      next.delete(pageId);
      return next;
    });
    // Also remove from local overlays
    setPageOverlays(prev => {
        const next = { ...prev };
        delete next[pageId];
        return next;
    });

    setGeneratedUrl(null);
    setGeneratedBytes(null);
    if (selectedPageId === pageId) {
      setSelectedPageId(null);
      setPreviewImage(null);
    }
    setDeleteTargetId(null);
  }, [deleteTargetId, selectedPageId]);

  const cancelDeleteAction = useCallback(() => {
    setDeleteTargetId(null);
  }, []);

  const handlePreviewDelete = () => {
    if (!selectedPageId) return;
    setDeleteTargetId(selectedPageId);
  };

  const handleToggleDivider = (index) => {
    setDividers(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const handleClearAll = useCallback(() => {
    setPages([]);
    setThumbnails(new Map());
    setOverlay(DEFAULT_OVERLAY);
    setPageOverlays({});
    setGeneratedUrl(null);
    setGeneratedBytes(null);
    setError(null);
    setSelectedPageId(null);
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
    setPreviewZoom(1.0);
  }, []);

  const handleGenerate = useCallback(async () => {
    if (pages.length === 0) return;
    setIsGenerating(true);
    setError(null);

    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }

    try {
      // Pass both global overlay and pageOverlays
      const pdfBytes = await mergePagesWithOverlay(pages, overlay, pageOverlays);
      const url = createBlobUrl(pdfBytes);
      blobUrlRef.current = url;
      setGeneratedUrl(url);
      setGeneratedBytes(pdfBytes);
      setLastGeneratedConfig(JSON.stringify({ global: overlay, local: pageOverlays }));
      setIsActionPanelVisible(true); 
    } catch (err) {
      console.error(err);
      alert(`PDF 생성 중 오류가 발생했습니다.\n${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  }, [pages, overlay, pageOverlays]);

  // ... (handleReset, handleDownload, handleShare, handleSelectPage, Nav) - KEEP
  const handleReset = useCallback(() => {
    setIsActionPanelVisible(false);
    setTimeout(() => {
      setGeneratedUrl(null);
    }, 300);
  }, []);

  const handleDownload = useCallback(() => {
    if (!generatedUrl) return;
    const a = document.createElement('a');
    a.href = generatedUrl;
    a.download = `PDFFF-output-${Date.now()}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [generatedUrl]);

  const handleShare = useCallback(async () => {
    if (!generatedBytes) return;
    await sharePdf(generatedBytes, `PDFFF-${Date.now()}.pdf`);
  }, [generatedBytes]);

  const handleSelectPage = useCallback((pageId) => {
    setSelectedPageId(pageId);
    setPreviewZoom(1.0);
  }, []);

  const handlePrevPage = useCallback(() => {
    if (!selectedPageId) return;
    const idx = pages.findIndex((p) => p.id === selectedPageId);
    if (idx > 0) setSelectedPageId(pages[idx - 1].id);
  }, [selectedPageId, pages]);

  const handleNextPage = useCallback(() => {
    if (!selectedPageId) return;
    const idx = pages.findIndex((p) => p.id === selectedPageId);
    if (idx < pages.length - 1) setSelectedPageId(pages[idx + 1].id);
  }, [selectedPageId, pages]);

  const handleZoomIn = () => setPreviewZoom(prev => Math.min(prev + 0.1, 3.0));
  const handleZoomOut = () => setPreviewZoom(prev => Math.max(prev - 0.1, 0.5));

  const hasPages = pages.length > 0;
  const selectedThumbnail = selectedPageId ? thumbnails.get(selectedPageId) : null;
  const selectedIndex = selectedPageId ? pages.findIndex((p) => p.id === selectedPageId) : -1;
  const selectedPage = selectedIndex >= 0 ? pages[selectedIndex] : null;
  const uniqueFileNames = [...new Set(pages.map((p) => p.sourceFile))];

  // Current Local Overlay for the selected page
  const currentLocalOverlay = selectedPageId ? getLocalOverlay(selectedPageId) : null;

  return (
    <div className="app">
      {/* 헤더 */}
      <header className="app-header">
        <div className="app-header__brand">
          <div className="app-header__logo">
            <span className="app-header__logo-text">P</span>
          </div>
          <div>
            <h1 className="app-header__title">PDFFF.</h1>
            <p className="app-header__tagline">브라우저에서 안전하게 PDF를 편집하세요</p>
          </div>
        </div>
        <div className="app-header__actions">
          {hasPages && (
            <div className="view-mode-toggle">
              <button
                className={`view-mode-btn ${viewMode === 'preview' ? 'view-mode-btn--active' : ''}`}
                onClick={() => setViewMode('preview')}
                data-tooltip-bottom="프리뷰 모드"
              >
                <Columns size={16} />
              </button>
              <button
                className={`view-mode-btn ${viewMode === 'grid' ? 'view-mode-btn--active' : ''}`}
                onClick={() => setViewMode('grid')}
                data-tooltip-bottom="그리드 모드"
              >
                <LayoutGrid size={16} />
              </button>
            </div>
          )}
          <ThemeToggle />
          {hasPages && (
            <button className="btn btn-danger" onClick={handleClearAll}>
              <Trash2 size={16} />
              새로 시작
            </button>
          )}
        </div>
      </header>

      {/* 로딩 오버레이 */}
      {isLoading && (
        <div className="app-loading">
          <div className="app-loading__content glass">
            <div className="spinner" />
            <span>{loadingMessage || '처리 중...'}</span>
          </div>
        </div>
      )}

      {/* 에러 메시지 - 화면 중앙 모달 */}
      {error && (
        <div className="app-error-modal-backdrop animate-fade-in" onClick={() => setError(null)}>
          <div className="app-error-modal glass" onClick={(e) => e.stopPropagation()}>
            <div className="app-error-modal__icon">⚠️</div>
            <p className="app-error-modal__text">{error}</p>
            <button className="btn btn-secondary" onClick={() => setError(null)}>확인</button>
          </div>
        </div>
      )}

      {/* 삭제 확인 모달 */}
      {deleteTargetId && (
        <div className="app-error-modal-backdrop animate-fade-in" style={{ animationDuration: '0.1s' }} onClick={cancelDeleteAction}>
          <div className="app-confirm-modal glass" onClick={(e) => e.stopPropagation()}>
            <div className="app-confirm-modal__title">페이지 삭제</div>
            <p className="app-confirm-modal__text">정말로 이 페이지를 삭제하시겠습니까?</p>
            <div className="app-confirm-modal__actions">
              <button className="btn btn-secondary" onClick={cancelDeleteAction}>취소</button>
              <button className="btn btn-danger" onClick={confirmDeleteAction}>삭제</button>
            </div>
          </div>
        </div>
      )}

      {/* 메인 컨텐츠 */}
      {!hasPages ? (
        <main className="app-main app-main--center">
          <DropZone onFilesSelected={handleFiles} disabled={isLoading} />
        </main>
      ) : (
        <main className="app-main app-main--editor">
          {viewMode === 'preview' ? (
            /* ========= A모드: 좌측 리스트 + 우측 프리뷰 ========= */
            <div className="editor-layout editor-layout--preview">
              {/* 좌측 사이드바: 세로 썸네일 리스트 */}
              <div className="editor-sidebar-left">
                 <div className="editor-sidebar-left__header">
                   <span className="editor-sidebar-left__count" style={{ color: '#4f46e5' }}>
                     총 <strong>{pages.length}</strong>페이지
                   </span>
                 </div>
                 <div className="editor-sidebar-left__list">
                   <PageGrid
                     pages={pages}
                     thumbnails={thumbnails}
                     dividers={dividers}
                     onToggleDivider={handleToggleDivider}
                     onReorder={handleReorder}
                     onDelete={handleDeleteRequest}
                     viewMode="list"
                     selectedPageId={selectedPageId}
                     onSelectPage={handleSelectPage}
                   />
                 </div>
              </div>

              {/* 우측: 큰 프리뷰 */}
              <div className="editor-preview-area">
                <div className="editor-preview__content">
                  {previewImage ? (
                    <>
                      <div className="editor-preview__scroll-container">
                        <div 
                          className="editor-preview__image-wrapper"
                          style={{ 
                             zoom: previewZoom,
                             transformOrigin: 'top left',
                          }}
                        >
                          <img
                            src={previewImage}
                            alt={`페이지 ${selectedIndex + 1}`}
                            className="editor-preview__image"
                          />
                          <OverlayPreviewLayer 
                            globalOverlay={overlay} 
                            localOverlay={currentLocalOverlay}
                            onGlobalUpdate={(u) => setOverlay(prev => ({ ...prev, ...u }))} 
                            onLocalUpdate={handleLocalOverlayChange}
                          />
                        </div>
                      </div>
                      {selectedPage && (
                        <div className="editor-preview__filename-overlay">
                          {selectedPage.pageLabel}
                        </div>
                      )}
                    </>
                  ) : previewLoading || selectedThumbnail ? (
                     <div className="editor-preview__loading-wrap">
                       {selectedThumbnail && (
                         <img
                           src={selectedThumbnail}
                           alt={`페이지 ${selectedIndex + 1}`}
                           className="editor-preview__image editor-preview__image--blurred"
                         />
                       )}
                       <div className="editor-preview__loading-overlay">
                         <div className="spinner" />
                         <p>고해상도 렌더링 중...</p>
                       </div>
                     </div>
                  ) : (
                     <div className="editor-preview__placeholder">
                       <div className="spinner" />
                       <p>페이지를 렌더링하고 있습니다...</p>
                     </div>
                  )}
                </div>

                {/* 페이지 네비게이션 + 삭제 */}
                <div className="editor-preview__nav">
                  <button className="btn btn-secondary btn-icon" onClick={handlePrevPage} disabled={selectedIndex <= 0}>
                    <ChevronLeft size={18} />
                  </button>
                  <span className="editor-preview__page-info">
                    {selectedIndex + 1} / {pages.length}
                  </span>
                  <button className="btn btn-secondary btn-icon" onClick={handleNextPage} disabled={selectedIndex >= pages.length - 1}>
                    <ChevronRight size={18} />
                  </button>
                  <div className="editor-preview__nav-divider" />
                  
                  <button className="btn btn-secondary btn-icon" onClick={handleZoomOut} title="축소">
                    <ZoomOut size={16} />
                  </button>
                  <span style={{ fontSize: '12px', minWidth: '40px', textAlign: 'center' }}>
                    {Math.round(previewZoom * 100)}%
                  </span>
                  <button className="btn btn-secondary btn-icon" onClick={handleZoomIn} title="확대">
                    <ZoomIn size={16} />
                  </button>
                  
                  <div className="editor-preview__nav-divider" />
                  <button className="btn btn-secondary editor-preview__delete-btn" onClick={handlePreviewDelete} disabled={!selectedPageId}>
                    <Trash2 size={14} /> 페이지 삭제
                  </button>
                </div>
              </div>

              {/* 우측 사이드바: 파일 추가 + 오버레이 설정 */}
              <aside className="editor-sidebar">
                <div className="editor-sidebar__add">
                  <DropZone onFilesSelected={handleFiles} isCompact disabled={isLoading} />
                  <button
                    className="btn btn-primary"
                    onClick={handleGenerate}
                    disabled={isGenerating || pages.length === 0}
                    style={{ width: '100%', marginTop: '12px', justifyContent: 'center' }}
                  >
                    {isGenerating ? <><Loader size={18} className="action-spinner" />생성 중...</> : <><FileText size={18} />PDF 생성</>}
                  </button>
                </div>
                <OverlaySettings 
                  globalOverlay={overlay} 
                  onGlobalChange={handleGlobalOverlayChange}
                  localOverlay={currentLocalOverlay}
                  onLocalChange={handleLocalOverlayChange}
                  isPageSelected={!!selectedPageId}
                />
              </aside>
            </div>
          ) : (
            /* ========= B모드: 기존 그리드 레이아웃 ========= */
            <div className="editor-layout editor-layout--grid">
              <div className="editor-grid-area">
                {/* ... grid toolbar ... */}
                <div className="editor-grid-toolbar">
                  <div className="editor-grid-toolbar__info">
                    <FileText size={16} /> <span>총 <strong>{pages.length}</strong>페이지</span>
                  </div>
                  {uniqueFileNames.length > 0 && (
                    <div className="editor-grid-toolbar__files">
                      {uniqueFileNames.map((name) => (
                        <span key={name} className="editor-grid-toolbar__file-tag">{name}</span>
                      ))}
                    </div>
                  )}
                </div>
                <PageGrid
                  pages={pages}
                  thumbnails={thumbnails}
                  dividers={dividers}
                  onToggleDivider={handleToggleDivider}
                  onReorder={handleReorder}
                  onDelete={handleDeleteRequest}
                  viewMode="grid"
                  selectedPageId={selectedPageId}
                  onSelectPage={handleSelectPage}
                />
              </div>
              <aside className="editor-sidebar">
                {/* Sidebar in Grid Mode also needs Settings? Yes. */}
                <div className="editor-sidebar__add">
                  <DropZone onFilesSelected={handleFiles} isCompact disabled={isLoading} />
                  <button
                    className="btn btn-primary"
                    onClick={handleGenerate}
                    disabled={isGenerating || pages.length === 0}
                    style={{ width: '100%', marginTop: '12px', justifyContent: 'center' }}
                  >
                    {isGenerating ? <><Loader size={18} className="action-spinner" />생성 중...</> : <><FileText size={18} />PDF 생성</>}
                  </button>
                </div>
                <OverlaySettings 
                  globalOverlay={overlay} 
                  onGlobalChange={handleGlobalOverlayChange}
                  localOverlay={currentLocalOverlay}
                  onLocalChange={handleLocalOverlayChange}
                  isPageSelected={!!selectedPageId}
                />
              </aside>
            </div>
          )}

          {/* 하단: 액션 패널 */}
          <ActionPanel
            isVisible={isActionPanelVisible}
            onGenerate={handleGenerate}
            onReset={handleReset}
            onDownload={handleDownload}
            onShare={handleShare}
            canShare={isShareSupported()}
            isGenerating={isGenerating}
            hasChanges={hasChanges}
          />
        </main>
      )}

      <footer className="app-footer">
        <p>모든 작업 및 처리는 브라우저 내에서 이루어집니다. 파일이 서버로 전송되거나 저장되지 않습니다.</p>
      </footer>
    </div>
  );
}

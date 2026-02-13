import { Download, Share2, RotateCcw } from 'lucide-react';
import './ActionPanel.css';

/**
 * ActionPanel 컴포넌트
 * PDF 생성 완료 시 하단에서 올라오는 액션 바
 * 다운로드, 공유, 다시 생성(초기화) 버튼 포함
 */
export default function ActionPanel({
  isVisible,
  onGenerate,
  onReset,
  onDownload,
  onShare,
  canShare,
  isGenerating,
  hasChanges,
}) {
  return (
    <div className={`action-panel ${isVisible ? 'action-panel--visible' : ''}`}>
      <div className="action-panel__content">
        <button className="btn btn-secondary action-btn action-btn--secondary" onClick={onDownload}>
          <Download size={20} />
          다운로드
        </button>

        {canShare && (
          <button className="btn btn-secondary action-btn action-btn--secondary" onClick={onShare}>
            <Share2 size={20} />
            공유하기
          </button>
        )}

        {/* 변경사항이 있으면 '다시 생성' 버튼을 강조 */}
        <button 
          className={`btn action-btn ${hasChanges ? 'btn-primary' : 'btn-secondary'} ${isGenerating ? 'loading' : ''}`} 
          onClick={onGenerate}
          disabled={isGenerating}
        >
          <RotateCcw size={20} className={isGenerating ? 'spin' : ''} />
          {isGenerating ? '생성 중...' : (hasChanges ? '변경사항 적용 (다시 생성)' : '다시 생성')}
        </button>
        
        {/* '초기화' 버튼은 별도로 두거나, 위 버튼을 통합해서 사용 */}
      </div>
    </div>
  );
}

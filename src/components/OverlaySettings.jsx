import { useState } from 'react';
import { Type, RotateCcw, Droplets, Stamp, BookOpen, Minus, ChevronDown, ChevronRight, Image as ImageIcon, Bold, Italic, Underline, Layers, Square } from 'lucide-react';
import './OverlaySettings.css';

/* 색상 프리셋 */
const COLOR_PRESETS = [
  { label: '검정', value: { r: 0, g: 0, b: 0 } },
  { label: '진회색', value: { r: 0.3, g: 0.3, b: 0.3 } },
  { label: '회색', value: { r: 0.5, g: 0.5, b: 0.5 } },
  { label: '흰색', value: { r: 1, g: 1, b: 1 } },
  { label: '빨강', value: { r: 0.85, g: 0.1, b: 0.15 } },
  { label: '주황', value: { r: 0.95, g: 0.5, b: 0.1 } },
  { label: '노랑', value: { r: 0.9, g: 0.8, b: 0.0 } },
  { label: '초록', value: { r: 0.15, g: 0.65, b: 0.25 } },
  { label: '파랑', value: { r: 0.1, g: 0.3, b: 0.85 } },
  { label: '남색', value: { r: 0.15, g: 0.15, b: 0.5 } },
  { label: '보라', value: { r: 0.55, g: 0.2, b: 0.8 } },
];

const FONT_SIZES = [10, 20, 30, 40, 50, 60, 80, 100, 120, 150, 200];

// Define Sections with Scope
const SECTIONS = [
  { id: 'local-text', label: '텍스트 삽입 (현재 페이지)', icon: Type, scope: 'local', storageKey: 'text' },
  { id: 'local-image', label: '이미지 삽입 (현재 페이지)', icon: ImageIcon, scope: 'local', storageKey: 'image' },
  { id: 'global-watermark', label: '워터마크 (전체)', icon: Layers, scope: 'global', storageKey: 'watermark' },
  { id: 'global-stamp', label: '스탬프 (전체)', icon: Stamp, scope: 'global', storageKey: 'stamp' },
];

const FONT_OPTIONS = [
  { id: 'malgun', label: '맑은 고딕 (한글)' },
  { id: 'nanum', label: '나눔 고딕 (한글)' }, 
  { id: 'helvetica', label: 'Helvetica (Sans)' },
  { id: 'courier', label: 'Courier (Mono)' },
  { id: 'times', label: 'Times New Roman (Serif)' },
  { id: 'symbol', label: 'Symbol' },
  { id: 'zapfdingbats', label: 'Zapf Dingbats' },
  { id: 'classic', label: 'Classic Serif' }, 
  { id: 'modern', label: 'Modern Sans' },
  { id: 'code', label: 'Code Style' },
];

export default function OverlaySettings({ 
  globalOverlay, onGlobalChange, 
  localOverlay, onLocalChange, 
  isPageSelected 
}) {
  const [expandedSections, setExpandedSections] = useState(new Set()); 

  const getOverlay = (scope) => scope === 'local' ? (localOverlay || {}) : globalOverlay;
  const getOnChange = (scope) => scope === 'local' ? onLocalChange : onGlobalChange;
  
  const getModeKey = (sectionId) => {
    if (sectionId === 'local-text') return 'text';
    if (sectionId === 'local-image') return 'image';
    if (sectionId === 'global-watermark') return 'watermark';
    if (sectionId === 'global-stamp') return 'stamp';
    return sectionId;
  };

  const isEnabled = (section) => {
    const overlay = getOverlay(section.scope);
    if (!overlay) return false;
    const mode = getModeKey(section.id);
    return overlay.enabledModes?.includes(mode);
  };

  const toggleEnabled = (section) => {
    const scope = section.scope;
    if (scope === 'local' && !isPageSelected) return;

    const overlay = getOverlay(scope);
    const onChange = getOnChange(scope);
    const mode = getModeKey(section.id);
    
    const currentModes = new Set(overlay.enabledModes || []);
    if (currentModes.has(mode)) {
      currentModes.delete(mode);
    } else {
      currentModes.add(mode);
      setExpandedSections(prev => new Set(prev).add(section.id));
    }
    onChange({ enabledModes: Array.from(currentModes) });
  };

  const toggleExpanded = (sectionId) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  };

  const update = (scope, updates) => {
    const handler = getOnChange(scope);
    if (handler) handler(updates);
  };

  const handleReset = () => {
     onGlobalChange && onGlobalChange({
        enabledModes: [],
        text: '', stampText: '',
        opacity: 0.4, fontSize: 60, rotation: 0,
        color: { r: 0.5, g: 0.5, b: 0.5 }
     });
     if (isPageSelected && onLocalChange) {
        onLocalChange({
           enabledModes: [],
           text: '', imageDataUrl: null,
           fontSize: 60, opacity: 1, rotation: 0,
           color: { r: 0, g: 0, b: 0 }
        });
     }
  };

  return (
    <div className="overlay-settings glass">
      <div className="overlay-settings__header">
        <h3 className="overlay-settings__title">
          <Type size={16} />
          오버레이 설정
        </h3>
        <button className="btn btn-icon btn-secondary" onClick={handleReset} data-tooltip="초기화">
          <RotateCcw size={14} />
        </button>
      </div>

      {/* 1. 텍스트 삽입 (Local) */}
      <SectionWrapper section={SECTIONS[0]} isEnabled={isEnabled(SECTIONS[0])} isExpanded={expandedSections.has(SECTIONS[0].id)}
         onToggleEnabled={() => toggleEnabled(SECTIONS[0])} onToggleExpanded={() => toggleExpanded(SECTIONS[0].id)}
         disabled={!isPageSelected}
         warning={!isPageSelected ? "페이지를 선택해야 사용할 수 있습니다." : null}
      >
        <TextControlGroup 
           overlay={getOverlay('local')} 
           onChange={(u) => update('local', u)} 
           prefix="" 
        />
      </SectionWrapper>

      {/* 2. 이미지 삽입 (Local) */}
      <SectionWrapper section={SECTIONS[1]} isEnabled={isEnabled(SECTIONS[1])} isExpanded={expandedSections.has(SECTIONS[1].id)}
         onToggleEnabled={() => toggleEnabled(SECTIONS[1])} onToggleExpanded={() => toggleExpanded(SECTIONS[1].id)}
         disabled={!isPageSelected}
      >
        <ImageControlGroup 
          overlay={getOverlay('local')} 
          onChange={(u) => update('local', u)} 
        />
      </SectionWrapper>

       {/* 3. 워터마크 (Global) */}
       <SectionWrapper section={SECTIONS[2]} isEnabled={isEnabled(SECTIONS[2])} isExpanded={expandedSections.has(SECTIONS[2].id)}
         onToggleEnabled={() => toggleEnabled(SECTIONS[2])} onToggleExpanded={() => toggleExpanded(SECTIONS[2].id)}
      >
        <TextControlGroup 
           overlay={getOverlay('global')} 
           onChange={(u) => update('global', u)} 
           prefix=""
        />
      </SectionWrapper>

      {/* 4. 스탬프 (Global) */}
      <SectionWrapper section={SECTIONS[3]} isEnabled={isEnabled(SECTIONS[3])} isExpanded={expandedSections.has(SECTIONS[3].id)}
         onToggleEnabled={() => toggleEnabled(SECTIONS[3])} onToggleExpanded={() => toggleExpanded(SECTIONS[3].id)}
      >
         <div className="overlay-field">
            <label className="overlay-label">스탬프 텍스트</label>
            <input type="text" className="overlay-input" placeholder="CONFIDENTIAL"
               value={globalOverlay?.stampText || ''} onChange={(e) => update('global', { stampText: e.target.value })} maxLength={20} />
         </div>
         {/* Stamp specific controls */}
         <TransparencySlider value={globalOverlay?.stampOpacity ?? 0.4} onChange={(v) => update('global', { stampOpacity: v })} />
         <ColorPicker current={globalOverlay?.stampColor} onChange={(c) => update('global', { stampColor: c })} />
         <div className="overlay-field">
             <div className="overlay-style-row" style={{ marginTop: '8px' }}>
                 <button 
                    className={`overlay-style-btn ${globalOverlay?.stampBorder ? 'active' : ''}`} 
                    onClick={() => update('global', { stampBorder: !globalOverlay?.stampBorder })}
                    title="테두리 토글"
                    style={{ width: '100%', justifyContent: 'center' }}
                 >
                    <Square size={16} style={{marginRight: '6px'}}/> 테두리 표시
                 </button>
             </div>
         </div>
      </SectionWrapper>

    </div>
  );
}

function TextControlGroup({ overlay, onChange, prefix = '' }) {
  const getVal = (key) => overlay?.[prefix + key];
  const update = (key, val) => onChange({ [prefix + key]: val });

  const toggleTextStyle = (style) => {
    const current = getVal('textStyle') || {};
    update('textStyle', { ...current, [style]: !current[style] });
  };

  return (
    <>
      <div className="overlay-field">
        <label className="overlay-label">내용</label>
        <input type="text" className="overlay-input" placeholder="텍스트 입력"
          value={getVal('text') || ''} onChange={(e) => update('text', e.target.value)} maxLength={50} />
      </div>
      <div className="overlay-field">
          <label className="overlay-label">폰트 (10종)</label>
          <select className="overlay-input" value={getVal('fontFamily') || 'malgun'} onChange={(e) => update('fontFamily', e.target.value)}>
            {FONT_OPTIONS.map(opt => <option key={opt.id} value={opt.id}>{opt.label}</option>)}
          </select>
      </div>
      <div className="overlay-field">
          <label className="overlay-label">스타일</label>
          <div className="overlay-style-row">
            <button className={`overlay-style-btn ${getVal('textStyle')?.bold ? 'active' : ''}`} onClick={() => toggleTextStyle('bold')} title="굵게"><Bold size={16} /></button>
            <button className={`overlay-style-btn ${getVal('textStyle')?.italic ? 'active' : ''}`} onClick={() => toggleTextStyle('italic')} title="기울임"><Italic size={16} /></button>
            <button className={`overlay-style-btn ${getVal('textStyle')?.underline ? 'active' : ''}`} onClick={() => toggleTextStyle('underline')} title="밑줄"><Underline size={16} /></button>
            <div style={{width:'1px', height:'20px', background:'var(--border)', margin:'0 6px'}}></div>
            <button className={`overlay-style-btn ${getVal('border') ? 'active' : ''}`} onClick={() => update('border', !getVal('border'))} title="테두리">
               <Square size={16} />
            </button>
          </div>
       </div>
       <AngleControl value={getVal('rotation') ?? 0} onChange={(v) => update('rotation', v)} />
       <TransparencySlider value={getVal('opacity') ?? 1} onChange={(v) => update('opacity', v)} />
       <FontSizeControl value={getVal('fontSize') || 60} onChange={(v) => update('fontSize', v)} />
       <ColorPicker current={getVal('color')} onChange={(c) => update('color', c)} />
    </>
  );
}

function ImageControlGroup({ overlay, onChange }) {
  const handleUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => onChange({ imageDataUrl: evt.target.result });
    reader.readAsDataURL(file);
  };

  return (
    <>
      <div className="overlay-field">
        <label className="overlay-label">이미지 파일</label>
        <div className="overlay-file-upload">
          <input type="file" accept="image/png, image/jpeg, image/jpg" onChange={handleUpload} />
          {overlay?.imageDataUrl ? (
              <div className="overlay-image-preview">
                <img src={overlay.imageDataUrl} alt="Preview" />
                <button className="btn-text-xs warning" onClick={() => onChange({ imageDataUrl: null })}>제거</button>
              </div>
          ) : <p className="overlay-hint">이미지 선택</p>}
        </div>
      </div>
      <div className="overlay-field">
         <label className="overlay-label">배율: {overlay?.imageScale ?? 0.5}x</label>
         <input type="range" className="overlay-range" min="0.1" max="2.0" step="0.1" 
             value={overlay?.imageScale ?? 0.5} onChange={(e) => onChange({ imageScale: parseFloat(e.target.value) })} />
      </div>
      <AngleControl value={overlay?.imageRotation ?? 0} onChange={(v) => onChange({ imageRotation: v })} />
      <TransparencySlider value={overlay?.imageOpacity ?? 1.0} onChange={(v) => onChange({ imageOpacity: v })} />
    </>
  );
}

function SectionWrapper({ section, isEnabled, isExpanded, onToggleEnabled, onToggleExpanded, children, disabled, warning }) {
  const Icon = section.icon;
  return (
    <div className={`overlay-section ${isEnabled ? 'overlay-section--enabled' : ''} ${isExpanded ? 'overlay-section--open' : ''} ${disabled ? 'disabled' : ''}`}>
      <div className="overlay-section__header">
        <button className="overlay-section__checkbox-btn" onClick={onToggleEnabled} disabled={disabled}>
          <div className={`overlay-section__checkbox ${isEnabled ? 'overlay-section__checkbox--checked' : ''}`}>
            {isEnabled && <span>✓</span>}
          </div>
        </button>
        <button className="overlay-section__label-btn" onClick={onToggleExpanded} disabled={disabled}>
          <Icon size={14} />
          <span>{section.label}</span>
          {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </button>
      </div>
      {isExpanded && !disabled && <div className="overlay-section__body">{children}</div>}
      {isExpanded && disabled && warning && <div className="overlay-section__warning">{warning}</div>}
    </div>
  );
}

/* Common UI Components */

// 투명도 슬라이더 (0% ~ 100%)
function TransparencySlider({ value, onChange }) {
  const transparency = Math.round((1 - (value ?? 1)) * 100);
  
  const handleChange = (e) => {
    const t = parseInt(e.target.value);
    const opacity = 1 - (t / 100);
    onChange(Math.round(opacity * 100) / 100);
  };

  return (
    <div className="overlay-field">
      <div className="overlay-label-row">
        <label className="overlay-label">투명도</label>
        <span className="overlay-value-display">{transparency}%</span>
      </div>
      <input type="range" className="overlay-range" min="0" max="100" step="10" 
         value={transparency} onChange={handleChange} />
    </div>
  );
}

function FontSizeControl({ value, onChange }) {
  const sliderIndex = FONT_SIZES.indexOf(value);
  const nearestIndex = sliderIndex >= 0 ? sliderIndex : 0;
  return (
    <div className="overlay-field">
      <label className="overlay-label">폰트 크기: {value}pt</label>
      <div className="overlay-fontsize-slider-wrap">
        <input type="range" className="overlay-range overlay-range--font" min="0" max={FONT_SIZES.length - 1}
          value={nearestIndex} onChange={(e) => onChange(FONT_SIZES[parseInt(e.target.value)])} />
        <div className="overlay-range-labels">{FONT_SIZES.map((s, i) => i%2===0 ? <span key={s}>{s}</span> : null)}</div>
      </div>
    </div>
  );
}

function AngleControl({ value, onChange }) {
  return (
    <div className="overlay-field">
      <div className="overlay-label-row"><label className="overlay-label">회전</label><span className="overlay-value-display">{parseFloat(value).toFixed(1)}°</span></div>
      <div className="overlay-angle-row">
        <input type="range" className="overlay-range" min="-180" max="180" step="1" value={value} onChange={(e) => onChange(parseInt(e.target.value))} />
        <button className="btn-text-xs" onClick={() => onChange(0)}>0°</button>
      </div>
    </div>
  );
}

function ColorPicker({ current, onChange }) {
  return (
    <div className="overlay-field">
      <label className="overlay-label">색상</label>
      <div className="overlay-color-row">
        {COLOR_PRESETS.map((preset) => (
          <button key={preset.label} className={`overlay-color-btn ${JSON.stringify(current) === JSON.stringify(preset.value) ? 'active' : ''}`}
            style={{ backgroundColor: `rgb(${preset.value.r * 255}, ${preset.value.g * 255}, ${preset.value.b * 255})` }}
            onClick={() => onChange(preset.value)} title={preset.label} />
        ))}
      </div>
    </div>
  );
}

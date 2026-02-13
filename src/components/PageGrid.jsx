import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext,
  rectSortingStrategy,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { useState, useCallback } from 'react';
import PageThumbnail from './PageThumbnail';
import './PageGrid.css';

/**
 * PageGrid 컴포넌트
 * 듀얼 뷰 모드 지원: grid(B모드) / list(A모드 사이드바용)
 */
export default function PageGrid({
  pages,
  thumbnails,
  onReorder,
  onDelete,
  viewMode = 'grid',
  selectedPageId,
  onSelectPage,
  confirmDelete,
  dividers,
  onToggleDivider,
}) {
  const [activeId, setActiveId] = useState(null);
  const [overId, setOverId] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  const handleDragStart = useCallback((event) => {
    setActiveId(event.active.id);
  }, []);

  const handleDragOver = useCallback((event) => {
    setOverId(event.over ? event.over.id : null);
  }, []);

  const handleDragEnd = useCallback((event) => {
    const { active, over } = event;
    setActiveId(null);
    setOverId(null);
    if (over && active.id !== over.id) {
      const oldIndex = pages.findIndex((p) => p.id === active.id);
      const newIndex = pages.findIndex((p) => p.id === over.id);
      onReorder(arrayMove(pages, oldIndex, newIndex));
    }
  }, [pages, onReorder]);

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
    setOverId(null);
  }, []);

  const isListMode = viewMode === 'list';

  const getDropPosition = useCallback((pageId) => {
    if (!activeId || !overId || overId !== pageId) return null;
    const activeIndex = pages.findIndex((p) => p.id === activeId);
    const overIndex = pages.findIndex((p) => p.id === overId);
    if (activeIndex === -1 || overIndex === -1) return null;
    if (isListMode) {
      return activeIndex < overIndex ? 'bottom' : 'top';
    }
    return activeIndex < overIndex ? 'right' : 'left';
  }, [activeId, overId, pages, isListMode]);

  const activePage = activeId ? pages.find((p) => p.id === activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <SortableContext
        items={pages.map((p) => p.id)}
        strategy={isListMode ? verticalListSortingStrategy : rectSortingStrategy}
      >
        <div className={`page-grid ${isListMode ? 'page-grid--list' : 'page-grid--grid'}`}>
          {pages.map((page, index) => (
            <PageThumbnail
              key={page.id}
              page={page}
              thumbnail={thumbnails.get(page.id)}
              index={index}
              onDelete={onDelete}
              isOver={!!getDropPosition(page.id)}
              dropPosition={getDropPosition(page.id)}
              isSelected={selectedPageId === page.id}
              onSelect={onSelectPage}
              confirmDelete={confirmDelete}
              hasDivider={dividers?.has(index)}
              onToggleDivider={() => onToggleDivider && onToggleDivider(index)}
              viewMode={viewMode}
            />
          ))}
        </div>
      </SortableContext>

      <DragOverlay
        adjustScale={false}
        dropAnimation={{
          duration: 150,
          easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
        }}
      >
        {activePage ? (
          <div className={`page-thumb page-thumb--overlay ${isListMode ? 'page-thumb--overlay-list' : ''}`}>
            <div className="page-thumb__image-wrap">
              {thumbnails.get(activePage.id) ? (
                <img src={thumbnails.get(activePage.id)} alt="드래그 중" className="page-thumb__image" />
              ) : (
                <div className="page-thumb__placeholder"><div className="spinner" /></div>
              )}
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

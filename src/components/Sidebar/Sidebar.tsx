import React from 'react';
import { Plus, Copy, Trash2 } from 'lucide-react';
import { useEditorStore } from '../../stores/editorStore';

export const Sidebar: React.FC = () => {
  const {
    presentation,
    currentSlideId,
    addSlide,
    removeSlide,
    duplicateSlide,
    setCurrentSlide,
  } = useEditorStore();

  if (!presentation) return null;

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h3>Slides</h3>
        <button className="sidebar-btn" onClick={addSlide} title="Add Slide">
          <Plus size={20} />
        </button>
      </div>

      <div className="sidebar-slides">
        {presentation.slides.map((slide, index) => (
          <div
            key={slide.id}
            className={`slide-thumbnail ${currentSlideId === slide.id ? 'active' : ''}`}
            onClick={() => setCurrentSlide(slide.id)}
          >
            <div className="slide-number">{index + 1}</div>
            <div className="slide-preview" style={{ background: slide.background }}>
              {/* Future: Render slide preview */}
              <span className="slide-name">{slide.name}</span>
            </div>
            <div className="slide-actions">
              <button
                className="slide-action-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  duplicateSlide(slide.id);
                }}
                title="Duplicate"
              >
                <Copy size={14} />
              </button>
              <button
                className="slide-action-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  if (presentation.slides.length > 1) {
                    removeSlide(slide.id);
                  }
                }}
                disabled={presentation.slides.length === 1}
                title="Delete"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

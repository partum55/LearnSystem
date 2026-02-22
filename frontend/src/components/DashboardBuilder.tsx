import React, { useState, useEffect, useRef } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { useTranslation } from 'react-i18next';
import { Modal } from './Modal';
import { Button } from './Button';
import {
  Cog6ToothIcon,
  PlusIcon,
  XMarkIcon,
  ChartBarIcon,
  AcademicCapIcon,
  ClockIcon,
  BellIcon,
  CalendarIcon,
  TrophyIcon,
  BookOpenIcon,
  UserGroupIcon,
  ChartPieIcon,
  FireIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

export interface DashboardWidgetConfig {
  id: string;
  type: string;
  title: string;
  visible: boolean;
  order: number;
  size: 'small' | 'medium' | 'large' | 'full';
  settings?: Record<string, unknown>;
}

interface DashboardBuilderProps {
  widgets: DashboardWidgetConfig[];
  onSave: (widgets: DashboardWidgetConfig[]) => void;
  asModal?: boolean;
}

const AVAILABLE_WIDGET_TYPES = [
  { id: 'stats', name: 'Statistics Overview', icon: ChartBarIcon, description: 'Course and assignment statistics', defaultSize: 'large' as const },
  { id: 'courses', name: 'My Courses', icon: AcademicCapIcon, description: 'List of enrolled courses', defaultSize: 'medium' as const },
  { id: 'deadlines', name: 'Upcoming Deadlines', icon: ClockIcon, description: 'Assignments due soon', defaultSize: 'medium' as const },
  { id: 'notifications', name: 'Recent Activity', icon: BellIcon, description: 'Latest notifications', defaultSize: 'medium' as const },
  { id: 'calendar', name: 'Calendar', icon: CalendarIcon, description: 'Schedule and events', defaultSize: 'large' as const },
  { id: 'progress', name: 'Course Progress', icon: TrophyIcon, description: 'Your learning progress', defaultSize: 'medium' as const },
  { id: 'recent-assignments', name: 'Recent Assignments', icon: BookOpenIcon, description: 'Latest assignment submissions', defaultSize: 'medium' as const },
  { id: 'study-groups', name: 'Study Groups', icon: UserGroupIcon, description: 'Your study groups', defaultSize: 'small' as const },
  { id: 'grade-distribution', name: 'Grade Distribution', icon: ChartPieIcon, description: 'Your grades overview', defaultSize: 'medium' as const },
  { id: 'streak', name: 'Learning Streak', icon: FireIcon, description: 'Daily learning streak', defaultSize: 'small' as const },
  { id: 'completed-today', name: 'Completed Today', icon: CheckCircleIcon, description: 'Tasks completed today', defaultSize: 'small' as const },
  { id: 'quick-links', name: 'Quick Links', icon: BookOpenIcon, description: 'Frequently accessed resources', defaultSize: 'small' as const },
];

export const DashboardBuilder: React.FC<DashboardBuilderProps> = ({ widgets, onSave, asModal = true }) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [localWidgets, setLocalWidgets] = useState<DashboardWidgetConfig[]>(widgets);
  const [showAddWidget, setShowAddWidget] = useState(false);
  const widgetIdCounter = useRef(0);

  useEffect(() => {
    setLocalWidgets(widgets);
  }, [widgets]);

  const handleOpen = () => {
    setLocalWidgets([...widgets]);
    setIsOpen(true);
  };

  const handleSave = () => {
    onSave(localWidgets);
    if (asModal) setIsOpen(false);
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const items = Array.from(localWidgets);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    setLocalWidgets(items.map((item, index) => ({ ...item, order: index })));
  };

  const toggleWidget = (id: string) => {
    setLocalWidgets(prev => prev.map(w => w.id === id ? { ...w, visible: !w.visible } : w));
  };

  const changeWidgetSize = (id: string, size: 'small' | 'medium' | 'large' | 'full') => {
    setLocalWidgets(prev => prev.map(w => w.id === id ? { ...w, size } : w));
  };

  const removeWidget = (id: string) => {
    setLocalWidgets(prev => prev.filter(w => w.id !== id));
  };

  const addWidget = (typeId: string) => {
    const widgetType = AVAILABLE_WIDGET_TYPES.find(t => t.id === typeId);
    if (!widgetType) return;
    widgetIdCounter.current += 1;
    setLocalWidgets(prev => [...prev, {
      id: `${typeId}-${widgetIdCounter.current}`,
      type: typeId,
      title: widgetType.name,
      visible: true,
      order: prev.length,
      size: widgetType.defaultSize,
    }]);
    setShowAddWidget(false);
  };

  const getWidgetIcon = (type: string) => {
    return AVAILABLE_WIDGET_TYPES.find(t => t.id === type)?.icon || ChartBarIcon;
  };

  const builderContent = (
    <div className="space-y-5">
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
        {t('dashboard.builder.desc', 'Drag widgets to reorder them, toggle visibility, and customize their size')}
      </p>

      {/* Header */}
      <div className="flex justify-between items-center pb-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <h3 className="text-sm font-medium" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
          {t('dashboard.builder.yourWidgets', 'Your Widgets')}
        </h3>
        <Button onClick={() => setShowAddWidget(!showAddWidget)} size="sm">
          <PlusIcon className="h-4 w-4 mr-1.5" />
          {t('dashboard.builder.addWidget', 'Add Widget')}
        </Button>
      </div>

      {/* Add Widget Panel */}
      {showAddWidget && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-4 rounded-lg" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
          {AVAILABLE_WIDGET_TYPES.filter(type => !localWidgets.some(w => w.type === type.id)).map((type) => {
            const Icon = type.icon;
            return (
              <button
                key={type.id}
                onClick={() => addWidget(type.id)}
                className="flex flex-col items-center gap-2 p-3 rounded-md transition-colors"
                style={{ background: 'var(--bg-elevated)', border: '1px solid transparent' }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--border-strong)')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'transparent')}
              >
                <Icon className="h-6 w-6" style={{ color: 'var(--text-muted)' }} />
                <span className="text-xs font-medium text-center" style={{ color: 'var(--text-primary)' }}>{type.name}</span>
                <span className="text-xs text-center" style={{ color: 'var(--text-faint)' }}>{type.description}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Drag and Drop List */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="widgets">
          {(provided, snapshot) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="space-y-2 min-h-[200px] p-2 rounded-lg transition-colors"
              style={{ background: snapshot.isDraggingOver ? 'var(--bg-hover)' : 'transparent' }}
            >
              {localWidgets.length === 0 ? (
                <div className="text-center py-8 text-sm" style={{ color: 'var(--text-faint)' }}>
                  {t('dashboard.builder.noWidgets', 'No widgets yet. Click "Add Widget" to get started.')}
                </div>
              ) : (
                localWidgets.map((widget, index) => {
                  const Icon = getWidgetIcon(widget.type);
                  return (
                    <Draggable key={widget.id} draggableId={widget.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className="p-3 rounded-md"
                          style={{
                            ...provided.draggableProps.style,
                            background: 'var(--bg-surface)',
                            border: snapshot.isDragging ? '1px solid var(--border-strong)' : '1px solid var(--border-default)',
                            boxShadow: snapshot.isDragging ? '0 8px 32px rgba(0,0,0,0.4)' : 'none',
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 flex-1">
                              <div className="cursor-grab active:cursor-grabbing">
                                <svg className="h-4 w-4" style={{ color: 'var(--text-faint)' }} fill="none" viewBox="0 0 24 24">
                                  <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 6h.01M8 12h.01M8 18h.01M16 6h.01M16 12h.01M16 18h.01" />
                                </svg>
                              </div>
                              <Icon className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
                              <span className="text-sm font-medium flex-1" style={{ color: 'var(--text-primary)' }}>{widget.title}</span>

                              <label className="flex items-center gap-1.5 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={widget.visible}
                                  onChange={() => toggleWidget(widget.id)}
                                  className="h-3.5 w-3.5 rounded"
                                />
                                <span className="text-xs" style={{ color: 'var(--text-faint)' }}>{t('common.visible', 'Visible')}</span>
                              </label>

                              <select
                                value={widget.size}
                                onChange={(e) => changeWidgetSize(widget.id, e.target.value as 'small' | 'medium' | 'large' | 'full')}
                                className="input text-xs py-0.5 px-1.5"
                              >
                                <option value="small">{t('dashboard.builder.size.small', 'Small')}</option>
                                <option value="medium">{t('dashboard.builder.size.medium', 'Medium')}</option>
                                <option value="large">{t('dashboard.builder.size.large', 'Large')}</option>
                                <option value="full">{t('dashboard.builder.size.full', 'Full Width')}</option>
                              </select>

                              <button
                                onClick={() => removeWidget(widget.id)}
                                className="p-1 rounded transition-colors"
                                style={{ color: 'var(--text-faint)' }}
                                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--fn-error)')}
                                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-faint)')}
                              >
                                <XMarkIcon className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  );
                })
              )}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {!asModal && (
        <div className="flex justify-end gap-3 pt-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          <Button onClick={handleSave}>{t('common.save', 'Save Changes')}</Button>
        </div>
      )}
    </div>
  );

  if (!asModal) return builderContent;

  return (
    <>
      <Button onClick={handleOpen} variant="secondary" size="sm" className="flex items-center gap-2">
        <Cog6ToothIcon className="h-4 w-4" />
        {t('dashboard.customize', 'Customize Dashboard')}
      </Button>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title={t('dashboard.builder.title', 'Dashboard Builder')} size="large">
        {builderContent}
        <div className="flex justify-end gap-3 pt-4 mt-5" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          <Button variant="secondary" onClick={() => setIsOpen(false)}>{t('common.cancel', 'Cancel')}</Button>
          <Button onClick={handleSave}>{t('common.save', 'Save Layout')}</Button>
        </div>
      </Modal>
    </>
  );
};

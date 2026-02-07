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
  asModal?: boolean; // If false, render as standalone component
}

const AVAILABLE_WIDGET_TYPES = [
  {
    id: 'stats',
    name: 'Statistics Overview',
    icon: ChartBarIcon,
    description: 'Course and assignment statistics',
    defaultSize: 'large' as const
  },
  {
    id: 'courses',
    name: 'My Courses',
    icon: AcademicCapIcon,
    description: 'List of enrolled courses',
    defaultSize: 'medium' as const
  },
  {
    id: 'deadlines',
    name: 'Upcoming Deadlines',
    icon: ClockIcon,
    description: 'Assignments due soon',
    defaultSize: 'medium' as const
  },
  {
    id: 'notifications',
    name: 'Recent Activity',
    icon: BellIcon,
    description: 'Latest notifications',
    defaultSize: 'medium' as const
  },
  {
    id: 'calendar',
    name: 'Calendar',
    icon: CalendarIcon,
    description: 'Schedule and events',
    defaultSize: 'large' as const
  },
  {
    id: 'progress',
    name: 'Course Progress',
    icon: TrophyIcon,
    description: 'Your learning progress',
    defaultSize: 'medium' as const
  },
  {
    id: 'recent-assignments',
    name: 'Recent Assignments',
    icon: BookOpenIcon,
    description: 'Latest assignment submissions',
    defaultSize: 'medium' as const
  },
  {
    id: 'study-groups',
    name: 'Study Groups',
    icon: UserGroupIcon,
    description: 'Your study groups',
    defaultSize: 'small' as const
  },
  {
    id: 'grade-distribution',
    name: 'Grade Distribution',
    icon: ChartPieIcon,
    description: 'Your grades overview',
    defaultSize: 'medium' as const
  },
  {
    id: 'streak',
    name: 'Learning Streak',
    icon: FireIcon,
    description: 'Daily learning streak',
    defaultSize: 'small' as const
  },
  {
    id: 'completed-today',
    name: 'Completed Today',
    icon: CheckCircleIcon,
    description: 'Tasks completed today',
    defaultSize: 'small' as const
  },
  {
    id: 'quick-links',
    name: 'Quick Links',
    icon: BookOpenIcon,
    description: 'Frequently accessed resources',
    defaultSize: 'small' as const
  },
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
    if (asModal) {
      setIsOpen(false);
    }
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(localWidgets);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update order
    const updatedItems = items.map((item, index) => ({
      ...item,
      order: index,
    }));

    setLocalWidgets(updatedItems);
  };

  const toggleWidget = (id: string) => {
    setLocalWidgets(prev =>
      prev.map(w => w.id === id ? { ...w, visible: !w.visible } : w)
    );
  };

  const changeWidgetSize = (id: string, size: 'small' | 'medium' | 'large' | 'full') => {
    setLocalWidgets(prev =>
      prev.map(w => w.id === id ? { ...w, size } : w)
    );
  };

  const removeWidget = (id: string) => {
    setLocalWidgets(prev => prev.filter(w => w.id !== id));
  };

  const addWidget = (typeId: string) => {
    const widgetType = AVAILABLE_WIDGET_TYPES.find(t => t.id === typeId);
    if (!widgetType) return;

    widgetIdCounter.current += 1;
    const newWidget: DashboardWidgetConfig = {
      id: `${typeId}-${widgetIdCounter.current}`,
      type: typeId,
      title: widgetType.name,
      visible: true,
      order: localWidgets.length,
      size: widgetType.defaultSize,
    };

    setLocalWidgets(prev => [...prev, newWidget]);
    setShowAddWidget(false);
  };

  const getWidgetIcon = (type: string) => {
    const widgetType = AVAILABLE_WIDGET_TYPES.find(t => t.id === type);
    return widgetType?.icon || ChartBarIcon;
  };

  // If not modal mode, render directly
  const builderContent = (
    <div className="space-y-6">
      <p className="text-sm text-gray-600 dark:text-gray-400">
        {t('dashboard.builder.desc', 'Drag widgets to reorder them, toggle visibility, and customize their size')}
      </p>

      {/* Add Widget Button */}
      <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-700 pb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {t('dashboard.builder.yourWidgets', 'Your Widgets')}
        </h3>
        <Button onClick={() => setShowAddWidget(!showAddWidget)} size="sm">
          <PlusIcon className="h-4 w-4 mr-2" />
          {t('dashboard.builder.addWidget', 'Add Widget')}
        </Button>
      </div>

      {/* Add Widget Panel */}
      {showAddWidget && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          {AVAILABLE_WIDGET_TYPES.filter(type =>
            !localWidgets.some(w => w.type === type.id)
          ).map((type) => {
            const Icon = type.icon;
            return (
              <button
                key={type.id}
                onClick={() => addWidget(type.id)}
                className="flex flex-col items-center gap-2 p-3 bg-white dark:bg-gray-700 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 border-2 border-transparent hover:border-blue-500 transition-all"
              >
                <Icon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                <span className="text-xs font-medium text-gray-900 dark:text-white text-center">
                  {type.name}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400 text-center">
                  {type.description}
                </span>
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
              className={`space-y-2 min-h-[200px] p-2 rounded-lg ${snapshot.isDraggingOver ? 'bg-blue-50 dark:bg-blue-900/10' : ''
                }`}
            >
              {localWidgets.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
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
                          className={`p-4 bg-white dark:bg-gray-700 rounded-lg border-2 ${snapshot.isDragging
                              ? 'border-blue-500 shadow-lg'
                              : 'border-gray-200 dark:border-gray-600'
                            }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 flex-1">
                              {/* Drag Handle */}
                              <div className="cursor-grab active:cursor-grabbing">
                                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24">
                                  <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 6h.01M8 12h.01M8 18h.01M16 6h.01M16 12h.01M16 18h.01" />
                                </svg>
                              </div>

                              <Icon className="h-5 w-5 text-blue-600 dark:text-blue-400" />

                              <div className="flex-1">
                                <span className="text-sm font-medium text-gray-900 dark:text-white">
                                  {widget.title}
                                </span>
                              </div>

                              {/* Visibility Toggle */}
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={widget.visible}
                                  onChange={() => toggleWidget(widget.id)}
                                  className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                                />
                                <span className="text-xs text-gray-600 dark:text-gray-400">
                                  {t('common.visible', 'Visible')}
                                </span>
                              </label>

                              {/* Size Selector */}
                              <select
                                value={widget.size}
                                onChange={(e) => changeWidgetSize(widget.id, e.target.value as 'small' | 'medium' | 'large' | 'full')}
                                className="text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                              >
                                <option value="small">{t('dashboard.builder.size.small', 'Small')}</option>
                                <option value="medium">{t('dashboard.builder.size.medium', 'Medium')}</option>
                                <option value="large">{t('dashboard.builder.size.large', 'Large')}</option>
                                <option value="full">{t('dashboard.builder.size.full', 'Full Width')}</option>
                              </select>

                              {/* Remove Button */}
                              <button
                                onClick={() => removeWidget(widget.id)}
                                className="p-1 text-red-400 hover:text-red-600 dark:hover:text-red-300"
                              >
                                <XMarkIcon className="h-5 w-5" />
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

      {/* Actions for standalone mode */}
      {!asModal && (
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button onClick={handleSave}>
            {t('common.save', 'Save Changes')}
          </Button>
        </div>
      )}
    </div>
  );

  if (!asModal) {
    return builderContent;
  }

  return (
    <>
      <Button
        onClick={handleOpen}
        variant="secondary"
        size="sm"
        className="flex items-center gap-2"
      >
        <Cog6ToothIcon className="h-4 w-4" />
        {t('dashboard.customize', 'Customize Dashboard')}
      </Button>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={t('dashboard.builder.title', 'Dashboard Builder')}
        size="large"
      >
        {builderContent}

        {/* Actions for modal mode */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700 mt-6">
          <Button variant="secondary" onClick={() => setIsOpen(false)}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button onClick={handleSave}>
            {t('common.save', 'Save Layout')}
          </Button>
        </div>
      </Modal>
    </>
  );
};


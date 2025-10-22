import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DragDropContext, Droppable, Draggable, DropResult, DroppableProvided, DroppableStateSnapshot, DraggableProvided, DraggableStateSnapshot } from 'react-beautiful-dnd';

interface OrderingQuestionProps {
  items: string[];
  correctOrder?: number[];
  onItemsChange?: (items: string[]) => void;
  onCorrectOrderChange?: (order: number[]) => void;
  isEditing?: boolean;
  studentAnswer?: number[];
  onStudentAnswerChange?: (order: number[]) => void;
}

const OrderingQuestion: React.FC<OrderingQuestionProps> = ({
  items,
  onItemsChange,
  isEditing = false,
  onStudentAnswerChange,
}) => {
  const { t } = useTranslation();
  const [currentItems, setCurrentItems] = useState<string[]>(items);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) {
      return;
    }

    const newItems = Array.from(currentItems);
    const [reorderedItem] = newItems.splice(result.source.index, 1);
    newItems.splice(result.destination.index, 0, reorderedItem);

    setCurrentItems(newItems);

    if (isEditing && onItemsChange) {
      onItemsChange(newItems);
    }

    if (!isEditing && onStudentAnswerChange) {
      // Create order array based on new positions
      const newOrder = newItems.map((item) => items.indexOf(item));
      onStudentAnswerChange(newOrder);
    }
  };

  const addItem = () => {
    const newItems = [...currentItems, ''];
    setCurrentItems(newItems);
    if (onItemsChange) {
      onItemsChange(newItems);
    }
  };

  const removeItem = (index: number) => {
    const newItems = currentItems.filter((_, i) => i !== index);
    setCurrentItems(newItems);
    if (onItemsChange) {
      onItemsChange(newItems);
    }
  };

  const updateItem = (index: number, value: string) => {
    const newItems = [...currentItems];
    newItems[index] = value;
    setCurrentItems(newItems);
    if (onItemsChange) {
      onItemsChange(newItems);
    }
  };

  return (
    <div className="ordering-question">
      <h4>{isEditing ? t('questions.define_items') : t('questions.drag_to_order')}</h4>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="ordering-items">
          {(provided: DroppableProvided, snapshot: DroppableStateSnapshot) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className={`ordering-items-list ${snapshot.isDraggingOver ? 'dragging-over' : ''}`}
            >
              {currentItems.map((item, index) => (
                <Draggable key={`item-${index}`} draggableId={`item-${index}`} index={index}>
                  {(provided: DraggableProvided, snapshot: DraggableStateSnapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      className={`ordering-item ${snapshot.isDragging ? 'dragging' : ''}`}
                    >
                      <span className="ordering-item-handle">☰</span>
                      {isEditing ? (
                        <input
                          type="text"
                          value={item}
                          onChange={(e) => updateItem(index, e.target.value)}
                          placeholder={t('questions.item_text')}
                          className="form-control"
                        />
                      ) : (
                        <span className="ordering-item-text">{item}</span>
                      )}
                      {isEditing && (
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="btn btn-sm btn-danger"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {isEditing && (
        <div className="mt-3">
          <button type="button" onClick={addItem} className="btn btn-secondary btn-sm">
            + {t('questions.add_item')}
          </button>
        </div>
      )}
    </div>
  );
};

export default OrderingQuestion;

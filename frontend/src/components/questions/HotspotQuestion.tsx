import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface HotspotRegion {
  x: number;
  y: number;
  radius: number;
}

interface HotspotQuestionProps {
  imageUrl: string;
  correctRegions?: HotspotRegion[];
  onCorrectRegionsChange?: (regions: HotspotRegion[]) => void;
  isEditing?: boolean;
  studentAnswer?: { x: number; y: number };
  onStudentAnswerChange?: (point: { x: number; y: number }) => void;
}

const HotspotQuestion: React.FC<HotspotQuestionProps> = ({
  imageUrl,
  correctRegions = [],
  onCorrectRegionsChange,
  isEditing = false,
  studentAnswer,
  onStudentAnswerChange,
}) => {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [regions, setRegions] = useState<HotspotRegion[]>(correctRegions);
  const [selectedRegionIndex, setSelectedRegionIndex] = useState<number | null>(null);
  const [radiusInput, setRadiusInput] = useState<number>(50);

  useEffect(() => {
    drawCanvas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regions, studentAnswer, imageUrl]);

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (!canvas || !image) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw image
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    // Draw correct regions (for editing or showing answers)
    if (isEditing || correctRegions.length > 0) {
      regions.forEach((region, index) => {
        ctx.beginPath();
        ctx.arc(region.x, region.y, region.radius, 0, 2 * Math.PI);
        ctx.strokeStyle = index === selectedRegionIndex ? '#007bff' : '#28a745';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.fillStyle = 'rgba(40, 167, 69, 0.2)';
        ctx.fill();

        // Draw label
        ctx.fillStyle = '#000';
        ctx.font = '14px Arial';
        ctx.fillText(`Region ${index + 1}`, region.x - 30, region.y - region.radius - 10);
      });
    }

    // Draw student answer
    if (!isEditing && studentAnswer) {
      ctx.beginPath();
      ctx.arc(studentAnswer.x, studentAnswer.y, 10, 0, 2 * Math.PI);
      ctx.fillStyle = '#007bff';
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (isEditing) {
      // Add new region
      const newRegion: HotspotRegion = { x, y, radius: radiusInput };
      const newRegions = [...regions, newRegion];
      setRegions(newRegions);
      if (onCorrectRegionsChange) {
        onCorrectRegionsChange(newRegions);
      }
    } else {
      // Student selecting answer
      if (onStudentAnswerChange) {
        onStudentAnswerChange({ x, y });
      }
    }
  };

  const removeRegion = (index: number) => {
    const newRegions = regions.filter((_, i) => i !== index);
    setRegions(newRegions);
    setSelectedRegionIndex(null);
    if (onCorrectRegionsChange) {
      onCorrectRegionsChange(newRegions);
    }
  };

  const handleImageLoad = () => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (canvas && image) {
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      drawCanvas();
    }
  };

  return (
    <div className="hotspot-question">
      <h4>{isEditing ? t('questions.define_hotspots') : t('questions.click_correct_area')}</h4>

      {isEditing && (
        <div className="hotspot-controls mb-3">
          <label>
            {t('questions.region_radius')}:
            <input
              type="number"
              value={radiusInput}
              onChange={(e) => setRadiusInput(Number(e.target.value))}
              min={10}
              max={200}
              className="form-control"
              style={{ width: '100px', display: 'inline-block', marginLeft: '10px' }}
            />
            px
          </label>
        </div>
      )}

      <div className="hotspot-image-container">
        <img
          ref={imageRef}
          src={imageUrl}
          alt="Hotspot question"
          onLoad={handleImageLoad}
          style={{ display: 'none' }}
        />
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          style={{
            border: '2px solid #ccc',
            cursor: 'crosshair',
            maxWidth: '100%',
            height: 'auto',
          }}
        />
      </div>

      {isEditing && regions.length > 0 && (
        <div className="hotspot-regions-list mt-3">
          <h5>{t('questions.defined_regions')}</h5>
          <ul className="list-group">
            {regions.map((region, index) => (
              <li
                key={index}
                className={`list-group-item d-flex justify-content-between align-items-center ${
                  index === selectedRegionIndex ? 'active' : ''
                }`}
                onClick={() => setSelectedRegionIndex(index)}
              >
                <span>
                  Region {index + 1}: ({Math.round(region.x)}, {Math.round(region.y)}, r=
                  {region.radius})
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeRegion(index);
                  }}
                  className="btn btn-sm btn-danger"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default HotspotQuestion;

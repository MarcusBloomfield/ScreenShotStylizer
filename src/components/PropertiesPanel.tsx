import React from 'react';
import '../styles/PropertiesPanel.css';

// Define the size presets based on Steam documentation
const steamSizePresets = [
  { name: 'Default (1024x1024)', width: 1024, height: 1024 },
  { name: 'Header Capsule (920x430)', width: 920, height: 430 },
  { name: 'Small Capsule (462x174)', width: 462, height: 174 },
  { name: 'Main Capsule (1232x706)', width: 1232, height: 706 },
  { name: 'Vertical Capsule (748x896)', width: 748, height: 896 },
  { name: 'Screenshot (1920x1080)', width: 1920, height: 1080 },
  { name: 'Page Background (1438x810)', width: 1438, height: 810 },
  { name: 'Bundle Header (707x232)', width: 707, height: 232 },
  { name: 'Library Capsule (600x900)', width: 600, height: 900 },
  // Library Header is same as Header Capsule
  { name: 'Library Hero (3840x1240)', width: 3840, height: 1240 },
  { name: 'Library Logo (1280x720)', width: 1280, height: 720 },
];

interface PropertiesPanelProps {
  selectedWidth: number | null;
  selectedHeight: number | null;
  onDimensionsChange: (width: number | null, height: number | null) => void;
  onResizeNow: () => void;
  isLoading: boolean;
}

const PropertiesPanel: React.FC<PropertiesPanelProps> = ({ 
  selectedWidth, 
  selectedHeight, 
  onDimensionsChange, 
  onResizeNow,
  isLoading 
}) => {

  const handleSizeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedValue = event.target.value;
    if (selectedValue === 'default') {
      onDimensionsChange(null, null); // Use null for default (no resizing)
    } else {
      const [widthStr, heightStr] = selectedValue.split('x');
      const width = parseInt(widthStr, 10);
      const height = parseInt(heightStr, 10);
      if (!isNaN(width) && !isNaN(height)) {
        onDimensionsChange(width, height);
      }
    }
  };

  // Determine the current value for the dropdown
  const currentDropdownValue = selectedWidth && selectedHeight 
    ? `${selectedWidth}x${selectedHeight}` 
    : 'default';

  return (
    <div className="properties-panel">
      <h3>Image Properties</h3>
      
      <div className="property-item">
        <label htmlFor="image-size-select">Output Size Preset:</label>
        <select 
          id="image-size-select"
          value={currentDropdownValue}
          onChange={handleSizeChange}
          disabled={isLoading}
        >
          <option value="default">Default (No Resize)</option>
          {steamSizePresets.map(preset => (
            <option key={preset.name} value={`${preset.width}x${preset.height}`}>
              {preset.name}
            </option>
          ))}
        </select>
      </div>

      <div className="property-item">
        <label>Current Output Dimensions:</label>
        <span>{selectedWidth && selectedHeight ? `${selectedWidth}px x ${selectedHeight}px` : 'Default (No Resize)'}</span>
      </div>
      
      {/* Resize Button */}
      <button 
        className="resize-button"
        onClick={onResizeNow} 
        disabled={isLoading || !selectedWidth || !selectedHeight}
        title="Resize the current image to the selected dimensions"
      >
        {isLoading ? 'Resizing...' : 'Resize Current Image'}
      </button>

    </div>
  );
};

export default PropertiesPanel; 
import React from 'react';
import { Button, ButtonGroup } from '@mui/material';

const ModeSelector = ({ currentMode, onModeChange }) => {
  return (
    <ButtonGroup fullWidth size="small" style={{ marginBottom: '16px' }}>
      <Button 
        variant={currentMode === 'history' ? 'contained' : 'outlined'}
        onClick={() => onModeChange('history')}
      >
        Historial
      </Button>
      <Button 
        variant={currentMode === 'topics' ? 'contained' : 'outlined'}
        onClick={() => onModeChange('topics')}
      >
        Temas
      </Button>
    </ButtonGroup>
  );
};

export default ModeSelector;
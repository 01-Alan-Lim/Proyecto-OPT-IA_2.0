import React, { useState } from 'react';
import { 
  Button, 
  Typography, 
  Snackbar, 
  Alert,
  Box
} from '@mui/material';
import { generateDocument, downloadDocument } from '../../services/api';

const TopicActionsView = ({ topic, onBack, onSendToChat }) => {
  const [notification, setNotification] = useState(null);

  const handleAction = async (actionType) => {
    try {
      const result = await generateDocument(topic, actionType);
      
      if (actionType === 'document') {
        downloadDocument(result.data.content, `documento-${topic}.txt`);
      } else {
        onSendToChat(result.data.content);
      }
    } catch (error) {
      console.error("Error al generar documento:", error);
    }
  };

  const handleCloseNotification = () => {
    setNotification(null);
  };

  return (
    <Box className="actions-view" sx={{ p: 1 }}>
      <Button 
        variant="outlined" 
        onClick={onBack}
        sx={{ 
          mb: 1,
          fontSize: '0.85rem',
          width: '100%'
        }}
      >
        Volver a temas
      </Button>
      
      <Typography 
        variant="subtitle1" 
        gutterBottom
        sx={{ 
          fontSize: '0.9rem',
          textAlign: 'center',
          mb: 1
        }}
      >
        {topic}
      </Typography>
      
      <Box className="action-buttons">
        <Button 
          variant="contained" 
          fullWidth 
          onClick={() => handleAction('summary')}
          sx={{ 
            mb: 1,
            fontSize: '0.85rem'
          }}
        >
          Resumen del tema
        </Button>
        
        <Button 
          variant="contained" 
          fullWidth 
          onClick={() => handleAction('data-table')}
          sx={{ 
            mb: 1,
            fontSize: '0.85rem'
          }}
        >
          Tabla de datos
        </Button>
        
        <Button 
          variant="contained" 
          fullWidth 
          onClick={() => handleAction('sources')}
          sx={{ 
            mb: 1,
            fontSize: '0.85rem'
          }}
        >
          Fuentes para investigar
        </Button>
        
        <Button 
          variant="contained" 
          fullWidth 
          onClick={() => handleAction('document')}
          sx={{ 
            mb: 1,
            fontSize: '0.85rem'
          }}
          color="secondary"
        >
          Generar documento
        </Button>
      </Box>
      
      <Snackbar
        open={!!notification}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
      >
        <Alert 
          onClose={handleCloseNotification} 
          severity={notification?.severity || 'info'}
          sx={{ width: '100%' }}
        >
          {notification?.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default TopicActionsView;
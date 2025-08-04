import React, { useState } from 'react';
import { Button, Typography, Snackbar, Alert } from '@mui/material';
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
    <div className="actions-view">
      <Button 
        variant="outlined" 
        onClick={onBack}
        style={{ marginBottom: '16px' }}
      >
        Volver a temas
      </Button>
      
      <Typography variant="subtitle1" gutterBottom>
        Acciones para: {topic}
      </Typography>
      
      <div className="action-buttons">
        <Button 
          variant="contained" 
          fullWidth 
          onClick={() => handleAction('summary')}
          style={{ marginBottom: '8px' }}
        >
          Resumen del tema
        </Button>
        
        <Button 
          variant="contained" 
          fullWidth 
          onClick={() => handleAction('data-table')}
          style={{ marginBottom: '8px' }}
        >
          Tabla de datos
        </Button>
        
        <Button 
          variant="contained" 
          fullWidth 
          onClick={() => handleAction('sources')}
          style={{ marginBottom: '8px' }}
        >
          Fuentes para investigar
        </Button>
        
        <Button 
          variant="contained" 
          fullWidth 
          onClick={() => handleAction('document')}
          style={{ marginBottom: '8px' }}
          color="secondary"
        >
          Generar documento
        </Button>
      </div>
      
      <Snackbar
        open={!!notification}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
      >
        <Alert 
          onClose={handleCloseNotification} 
          severity={notification?.severity || 'info'}
        >
          {notification?.message}
        </Alert>
      </Snackbar>
    </div>
  );
};

export default TopicActionsView;
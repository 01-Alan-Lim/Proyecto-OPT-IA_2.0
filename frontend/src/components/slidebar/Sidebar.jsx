import React, { useState } from 'react';
import { Typography, Box } from '@mui/material';
import HistoryIcon from '@mui/icons-material/History';
import ChatHistoryView from './ChatHistoryView';
import TopicsView from './TopicsView';
import TopicActionsView from './TopicActionsView';
import ModeSelector from './ModeSelector';
import NewChatButton from './NewChatButton';

const Sidebar = ({ chats, currentChatId, onSelectChat, onNewChat, onSendToChat }) => {
  const [mode, setMode] = useState('history');
  const [selectedTopic, setSelectedTopic] = useState(null);

  return (
    <div className="sidebar">
      {/* Encabezado */}
      <div className="sidebar-header">
        <Typography variant="h6" className="sidebar-title">
          <HistoryIcon className="sidebar-icon" />
          {mode === 'history' && 'Historial de Chats'}
          {mode === 'topics' && 'Temas del Chat'}
          {mode === 'actions' && `Acciones: ${selectedTopic}`}
        </Typography>
      </div>
      
      {/* Controles */}
      <Box className="sidebar-controls">
        <ModeSelector currentMode={mode} onModeChange={setMode} />
        <NewChatButton onClick={onNewChat} />
      </Box>
      
      {/* Contenido dinámico */}
      <div className="sidebar-content">
        {mode === 'history' && (
          <ChatHistoryView 
            chats={chats}
            currentChatId={currentChatId}
            onSelectChat={onSelectChat}
          />
        )}
        
        {mode === 'topics' && (
          <TopicsView 
            currentChatId={currentChatId}
            onTopicSelect={(topic) => {
              setSelectedTopic(topic);
              setMode('actions');
            }}
          />
        )}
        
        {mode === 'actions' && (
          <TopicActionsView 
            topic={selectedTopic}
            onBack={() => setMode('topics')}
            onSendToChat={onSendToChat} 
          />
        )}
      </div>
    </div>
  );
};

export default Sidebar;
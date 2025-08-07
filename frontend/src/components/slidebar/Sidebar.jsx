import React, { useState, useEffect } from 'react';
import { 
  Typography, 
  Box, 
  IconButton,
  useMediaQuery,
  Drawer,
  Tooltip,
  styled
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import HistoryIcon from '@mui/icons-material/History';
import ChatHistoryView from './ChatHistoryView';
import TopicsView from './TopicsView';
import TopicActionsView from './TopicActionsView';
import ModeSelector from './ModeSelector';
import NewChatButton from './NewChatButton';

const SidebarButton = styled(IconButton)(({ theme, sidebaropen }) => ({
  position: 'fixed',
  left: sidebaropen === 'true' ? 276 : 16, // 260px (sidebar width) + 16px (margin)
  top: 16,
  zIndex: 1200,
  backgroundColor: 'var(--bg-secondary)',
  color: 'var(--text-primary)',
  transition: 'left 0.3s ease',
  '&:hover': {
    backgroundColor: 'var(--bg-tertiary)'
  },
  [theme.breakpoints.down('md')]: {
    left: '16px !important' // En mobile siempre en la esquina
  }
}));

const Sidebar = ({ chats, currentChatId, onSelectChat, onNewChat, onSendToChat }) => {
  const [mode, setMode] = useState('history');
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false); // Empieza cerrado
  const isMobile = useMediaQuery('(max-width: 768px)');

  // En desktop, el sidebar puede empezar abierto si lo deseas
  useEffect(() => {
    if (!isMobile) {
      setSidebarOpen(true); // Abierto por defecto en desktop
    }
  }, [isMobile]);

  const handleDrawerToggle = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Cerrar sidebar al seleccionar algo en mobile
  const handleSelectChat = (chatId) => {
    onSelectChat(chatId);
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  const handleNewChat = () => {
    onNewChat();
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  const handleSendToChat = (content) => {
    onSendToChat(content);
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  const drawerContent = (
    <Box className="sidebar">
      <div className="sidebar-header">
        <Typography variant="h6" className="sidebar-title">
          <HistoryIcon className="sidebar-icon" />
          {mode === 'history' && 'Historial'}
          {mode === 'topics' && 'Temas'}
          {mode === 'actions' && `Acciones`}
        </Typography>
      </div>
      
      <Box className="sidebar-controls">
        <ModeSelector currentMode={mode} onModeChange={setMode} />
        <NewChatButton onClick={handleNewChat} />
      </Box>
      
      <div className="sidebar-content">
        {mode === 'history' && (
          <ChatHistoryView 
            chats={chats}
            currentChatId={currentChatId}
            onSelectChat={handleSelectChat}
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
            onSendToChat={handleSendToChat} 
          />
        )}
      </div>
    </Box>
  );

  return (
    <>
      <Tooltip title="Mostrar/ocultar menú">
        <SidebarButton
          color="inherit"
          aria-label="toggle drawer"
          edge="start"
          onClick={handleDrawerToggle}
          sidebaropen={(!isMobile && sidebarOpen).toString()}
        >
          <MenuIcon />
        </SidebarButton>
      </Tooltip>

      {/* Drawer condicional según dispositivo */}
      <Drawer
        variant={isMobile ? 'temporary' : 'persistent'}
        anchor="left"
        open={sidebarOpen}
        onClose={isMobile ? handleDrawerToggle : undefined}
        ModalProps={isMobile ? {
          keepMounted: true,
        } : undefined}
        sx={{
          width: sidebarOpen ? 260 : 0,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: 260,
            backgroundColor: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            border: 'none',
            ...(isMobile ? {} : { position: 'relative' }),
          },
        }}
      >
        {drawerContent}
      </Drawer>
    </>
  );
};

export default Sidebar;
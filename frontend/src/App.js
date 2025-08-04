import React from 'react';
import ChatPage from './pages/ChatPage';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import './styles/base.css';
import './styles/variables.css';
import './styles/sidebar.css';
import './styles/chat.css';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2', 
    },
    secondary: {
      main: '#4db6ac', 
    },
    background: {
      default: '#121212',
      paper: '#1E1E1E',
    },
    text: {
      primary: '#E0E0E0',
      secondary: '#B0B0B0',
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <div className="app">
        <ChatPage />
      </div>
    </ThemeProvider>
  );
}

export default App;
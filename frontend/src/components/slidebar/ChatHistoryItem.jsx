import React from 'react';
import { Typography } from '@mui/material';

const ChatHistoryItem = ({ chat, isSelected, onSelect }) => {
  return (
    <button
      className={`chat-item ${isSelected ? 'selected' : ''}`}
      onClick={() => onSelect(chat.id)}
    >
      <Typography noWrap style={{ fontWeight: 'bold' }}>
        {chat?.title || 'Chat sin título'}
      </Typography>
      <Typography noWrap style={{ fontSize: '0.8rem', opacity: 0.8 }}>
        {chat?.lastMessage || 'Sin mensajes'}
      </Typography>
    </button>
  );
};

export default ChatHistoryItem;
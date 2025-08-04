import React from 'react';
import { Typography } from '@mui/material';
import ChatHistoryItem from './ChatHistoryItem';

const ChatHistoryList = ({ chats, currentChatId, onSelectChat }) => {
  return (
    <div className="chat-list">
      {chats?.length > 0 ? (
        chats.map((chat) => (
          <ChatHistoryItem
            key={chat?.id}
            chat={chat}
            isSelected={chat?.id === currentChatId}
            onSelect={onSelectChat}
          />
        ))
      ) : (
        <Typography style={{ padding: 16, color: 'var(--text-light)' }}>
          No hay chats históricos
        </Typography>
      )}
    </div>
  );
};

export default ChatHistoryList;
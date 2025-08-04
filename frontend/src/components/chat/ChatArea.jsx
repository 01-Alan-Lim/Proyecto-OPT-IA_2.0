import React from 'react';
import ChatHeader from './ChatHeader';
import MessagesContainer from './MessagesContainer';
import ChatInput from './ChatInput';

const ChatArea = ({ messages, isLoading, error, onSubmit }) => {
  return (
    <div className="chat-main">
      <ChatHeader title="Bienvenido a Vexa" />
      
      <MessagesContainer 
        messages={messages}
        isLoading={isLoading}
        error={error}
      />
      
      <div className="input-container">
        <ChatInput onSubmit={onSubmit} isLoading={isLoading} />
      </div>
    </div>
  );
};

export default ChatArea;
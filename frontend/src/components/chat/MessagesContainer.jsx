import React from 'react';
import ChatMessage from './ChatMessage';
import LoadingDots from '../common/LoadingDots';
import ErrorMessage from '../common/ErrorMessage';

const MessagesContainer = ({ messages, isLoading, error }) => {
  return (
    <div className="messages-container">
      {messages?.map((msg, idx) => (
        <ChatMessage key={idx} message={msg} />
      ))}
      
      {isLoading && (
        <div className="message assistant">
          <LoadingDots />
        </div>
      )}
      
      {error && (
        <ErrorMessage message={error} />
      )}
    </div>
  );
};

export default MessagesContainer;
import React from 'react';
import { Typography } from '@mui/material';

const NewChatButton = ({ onClick }) => {
  return (
    <button className="new-chat-btn" onClick={onClick}>
      <Typography>Nuevo Chat</Typography>
    </button>
  );
};

export default NewChatButton;
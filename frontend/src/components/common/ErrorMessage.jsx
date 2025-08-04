import React from 'react';
import { Typography } from '@mui/material';

const ErrorMessage = ({ message }) => {
  return (
    <div className="message error">
      <Typography>{message}</Typography>
    </div>
  );
};

export default ErrorMessage;
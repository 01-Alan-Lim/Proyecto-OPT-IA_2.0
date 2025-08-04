import { Typography } from '@mui/material';

const ChatHeader = ({ title }) => (
  <div className="chat-header">
    <Typography variant="h6">{title}</Typography>
  </div>
);

export default ChatHeader;
import { useState } from 'react';
import { CircularProgress} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';

const ChatInput = ({ onSubmit, isLoading }) => {
  const [input, setInput] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    onSubmit(input);
    setInput('');
  };

  return (
    <form className="input-form" onSubmit={handleSubmit}>
      <input
        type="text"
        className="chat-input"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Escribe tu mensaje..."
        disabled={isLoading}
      />
      <button 
        type="submit" 
        className="send-btn"
        disabled={isLoading || !input.trim()}
      >
        {isLoading ? (
          <CircularProgress size={20} style={{ color: 'white' }} />
        ) : (
          <>
            Enviar <SendIcon style={{ fontSize: 18, marginLeft: 6 }} />
          </>
        )}
      </button>
    </form>
  );
};

export default ChatInput;
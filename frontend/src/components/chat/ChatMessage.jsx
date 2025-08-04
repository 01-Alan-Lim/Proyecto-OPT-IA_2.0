import ReactMarkdown from 'react-markdown';

const ChatMessage = ({ message }) => (
  <div className={`message ${message.role}`}>
    <div className="message-content">
      <ReactMarkdown>{message.content}</ReactMarkdown>
    </div>
    <span className="message-timestamp">
      {new Date(message.timestamp).toLocaleTimeString()}
    </span>
  </div>
);

export default ChatMessage;
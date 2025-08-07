
import Sidebar from '../components/slidebar/Sidebar';
import ChatArea from '../components/chat/ChatArea';
import useChat from '../hooks/useChat';
import useChatHistory from '../hooks/useChatHistory';
import '../styles/chatPage.css';

const ChatPage = ({ userId = 'default-user' }) => {
  
  const { 
    messages, 
    isLoading, 
    error, 
    sendMessage, 
    loadChat, 
    setMessages 
  } = useChat(userId);
  
  const { 
    chatHistory, 
    currentChatId, 
    setCurrentChatId, 
    setChatHistory 
  } = useChatHistory(userId);

  const handleSubmit = async (input) => {
    const chatId = await sendMessage(input, currentChatId);
    
    if (!currentChatId) {
      setChatHistory(prev => [{
        id: chatId,
        title: input.substring(0, 30) + (input.length > 30 ? '...' : ''),
        lastMessage: messages[0]?.content?.substring(0, 50) + '...' || 'Nuevo chat',
        timestamp: new Date().toISOString()
      }, ...prev]);
    }
    
    setCurrentChatId(chatId);
  };

  const handleLoadChat = async (chatId) => {
    await loadChat(chatId);
    setCurrentChatId(chatId);
  };

  const handleNewChat = () => {
    setMessages([]);
    setCurrentChatId(null);
  };

  const handleSendToChat = (content) => {
    const newMessage = {
      role: 'assistant',
      content: content,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, newMessage]);
  };

  return (
    <div className="chat-page-container">
      <Sidebar
        chats={chatHistory}
        currentChatId={currentChatId}
        onSelectChat={handleLoadChat}
        onNewChat={handleNewChat}
        onSendToChat={handleSendToChat} 
      />
      
      <div className="chat-main-container">
        <ChatArea
          messages={messages}
          isLoading={isLoading}
          error={error}
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  );
};

export default ChatPage;
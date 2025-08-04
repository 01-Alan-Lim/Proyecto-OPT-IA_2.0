import { getChatHistory } from '../services/api';
import { useState, useEffect } from 'react';
const useChatHistory = (userId) => {
  const [chatHistory, setChatHistory] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const response = await getChatHistory(userId);
        setChatHistory(response.data?.chats || []);
      } catch (err) {
        console.error("Error cargando historial:", err);
        setChatHistory([]);
      }
    };
    
    loadHistory();
  }, [userId]);

  return {
    chatHistory,
    currentChatId,
    setCurrentChatId,
    setChatHistory
  };
};
export default useChatHistory;
import { useState } from 'react';
import { sendMessage, loadChat } from '../services/api';

const useChat = (userId) => {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSendMessage = async (input, chatId) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await sendMessage(userId, input, chatId);
      setMessages(response.data?.history || []);
      return response.data?.chatId || null;
    } catch (error) {
      setError(error.response?.data?.error || error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadChat = async (chatId) => {
    try {
      setIsLoading(true);
      const response = await loadChat(userId, chatId);
      setMessages(response.data?.history || []);
      setError(null);
    } catch (err) {
      setError("Error cargando chat: " + (err.response?.data?.error || err.message));
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    messages,        // Asegúrate de incluir todas las propiedades
    isLoading,
    error,
    sendMessage: handleSendMessage,
    loadChat: handleLoadChat,
    setMessages     // Añade setMessages si se usa en el componente
  };
};

export default useChat;
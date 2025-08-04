import { useState, useEffect } from 'react';
import { getChatTopics } from '../services/api';

const useTopics = (chatId) => {
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!chatId) {
      setTopics([]);
      return;
    }

    const fetchTopics = async () => {
      setLoading(true);
      try {
        const response = await getChatTopics(chatId);
        setTopics(response.data?.topics || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTopics();
  }, [chatId]);

  return { topics, loading, error };
};

export default useTopics;
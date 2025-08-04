import React, { useEffect, useState } from 'react';
import { Typography, CircularProgress } from '@mui/material';
import { getChatTopics } from '../../services/api';

const TopicsView = ({ currentChatId, onTopicSelect }) => {
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!currentChatId) {
      setTopics([]);
      return;
    }

    const fetchTopics = async () => {
      setLoading(true);
      try {
        const response = await getChatTopics(currentChatId);
        setTopics(response.data?.topics || []);
      } catch (err) {
        setError(err.message);
        // Mock fallback si hay error
        setTopics(['Tema de ejemplo 1', 'Tema de ejemplo 2']);
      } finally {
        setLoading(false);
      }
    };

    fetchTopics();
  }, [currentChatId]);

  if (loading) return <CircularProgress style={{ margin: '20px auto' }} />;
  if (error) return <Typography color="error">{error}</Typography>;
  
  return (
    <div className="topics-list">
      {topics.length > 0 ? (
        topics.map((topic) => (
          <button
            key={topic}
            className="topic-item"
            onClick={() => onTopicSelect(topic)}
          >
            <Typography>{topic}</Typography>
          </button>
        ))
      ) : (
        <Typography style={{ padding: 16 }}>
          No se encontraron temas en este chat
        </Typography>
      )}
    </div>
  );
};

export default TopicsView;
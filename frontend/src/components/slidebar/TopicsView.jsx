import React, { useEffect, useState } from 'react';
import { 
  Typography, 
  CircularProgress,
  Box
} from '@mui/material';
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
        setTopics(['Tema de ejemplo 1', 'Tema de ejemplo 2']);
      } finally {
        setLoading(false);
      }
    };

    fetchTopics();
  }, [currentChatId]);

  if (loading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
      <CircularProgress size={20} />
    </Box>
  );
  
  if (error) return (
    <Typography 
      color="error" 
      sx={{ 
        p: 1,
        fontSize: '0.85rem',
        textAlign: 'center'
      }}
    >
      {error}
    </Typography>
  );
  
  return (
    <Box className="topics-list" sx={{ p: 1 }}>
      {topics.length > 0 ? (
        topics.map((topic) => (
          <button
            key={topic}
            className="topic-item"
            onClick={() => onTopicSelect(topic)}
          >
            <Typography sx={{ fontSize: '0.85rem' }}>{topic}</Typography>
          </button>
        ))
      ) : (
        <Typography 
          sx={{ 
            p: 1,
            fontSize: '0.85rem',
            textAlign: 'center'
          }}
        >
          No se encontraron temas en este chat
        </Typography>
      )}
    </Box>
  );
};

export default TopicsView;
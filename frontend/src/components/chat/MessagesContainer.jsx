import React from 'react';
import { Box, Typography, Link } from '@mui/material';
import ReactMarkdown from 'react-markdown';

const MessagesContainer = ({ messages, isLoading, error }) => {
    const renderMessageContent = (content) => {
        return (
            <ReactMarkdown
                components={{
                    a: ({ node, ...props }) => <Link {...props} target="_blank" rel="noopener" />,
                    p: ({ node, ...props }) => <Typography {...props} paragraph />
                }}
            >
                {content}
            </ReactMarkdown>
        );
    };

    return (
        <Box className="messages-container">
            {messages.map((message, index) => (
                <Box 
                    key={index} 
                    className={`message ${message.role}`}
                    sx={{
                        p: 2,
                        mb: 2,
                        borderRadius: 2,
                        bgcolor: message.role === 'user' ? 'primary.light' : 'background.paper',
                        alignSelf: message.role === 'user' ? 'flex-end' : 'flex-start',
                        maxWidth: '80%'
                    }}
                >
                    {renderMessageContent(message.content)}
                </Box>
            ))}
            
            {isLoading && (
                <Box className="message assistant">
                    <Typography>Procesando tu solicitud...</Typography>
                </Box>
            )}
            
            {error && (
                <Box className="error-message">
                    <Typography color="error">{error}</Typography>
                </Box>
            )}
        </Box>
    );
};

export default MessagesContainer;
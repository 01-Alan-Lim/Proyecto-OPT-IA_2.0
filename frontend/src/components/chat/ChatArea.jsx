import React, { useState, useEffect } from 'react';
import ChatHeader from './ChatHeader';
import MessagesContainer from './MessagesContainer';
import ChatInput from './ChatInput';
import DocumentModal from './DocumentModal';

const ChatArea = ({ messages, isLoading, error, onSubmit }) => {
    const [documents, setDocuments] = useState([]);
    const [showDocuments, setShowDocuments] = useState(false);

    useEffect(() => {
        const lastMessage = messages[messages.length - 1];
        if (lastMessage && lastMessage.documents) {
            setDocuments(lastMessage.documents);
            if (lastMessage.documents.length > 0) {
                setShowDocuments(true);
            }
        }
    }, [messages]);

    return (
        <div className="chat-main">
            <ChatHeader title="Bienvenido a OPT-IA" />
            <MessagesContainer 
                messages={messages}
                isLoading={isLoading}
                error={error}
            />
            
            <div className="input-container">
                <ChatInput onSubmit={onSubmit} isLoading={isLoading} />
            </div>

            <DocumentModal 
                documents={documents} 
                open={showDocuments} 
                onClose={() => setShowDocuments(false)} 
            />
        </div>
    );
};

export default ChatArea;
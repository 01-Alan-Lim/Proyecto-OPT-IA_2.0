const { BlobServiceClient } = require('@azure/storage-blob');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const config = {
    endpoint: process.env.AZURE_OPENAI_ENDPOINT,
    apiKey: process.env.AZURE_OPENAI_KEY,
    deploymentName: process.env.AZURE_OPENAI_DEPLOYMENT,
    apiVersion: "2024-05-01-preview",
};

const blobServiceClient = BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING);
const containerClient = blobServiceClient.getContainerClient("chatia");

module.exports = async function (context, req) {
    context.res = {
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Content-Type": "application/json",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, x-user-id"
        }
    };

    if (req.method === "OPTIONS") {
        return context.res;
    }

    try {
        const userId = req.headers['x-user-id'] || 'default-user';
        const chatId = req.query.chatId || uuidv4();
        const blobName = `${userId}/${chatId}.json`;
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);

        if (req.body?.action === "load_chat") {
            if (!chatId || chatId === 'undefined') {
                throw new Error("ID de chat no proporcionado");
            }
            if (!await blockBlobClient.exists()) {
                throw new Error(`Chat ${chatId} no encontrado`);
            }
            const downloadResponse = await blockBlobClient.download();
            const history = JSON.parse(await streamToString(downloadResponse.readableStreamBody));
            
            return context.res = {
                body: { 
                    history,
                    chatId
                }
            };
        }

        const { question } = req.body;

        if (!question || typeof question !== 'string') {
            throw new Error("El texto proporcionado no es válido");
        }

        let history = [];
        const isNewChat = !await blockBlobClient.exists();
        if (!isNewChat) {
            const downloadResponse = await blockBlobClient.download();
            history = JSON.parse(await streamToString(downloadResponse.readableStreamBody));
        }

        const newMessage = {
            role: 'user',
            content: question,
            timestamp: new Date().toISOString()
        };

        const systemPrompt = `Instrucciones para el Agente OPT-IA...`; // Tu prompt aquí

        const messages = [
            { role: "system", content: systemPrompt },
            ...history.filter(m => m.role !== 'system'),
            newMessage
        ];

        const endpoint = config.endpoint.trim().replace(/\/$/, '');
        const apiUrl = `${endpoint}/openai/deployments/${config.deploymentName}/chat/completions?api-version=${config.apiVersion}`;
        
        // --- LA CONFIGURACIÓN DE AZURE SEARCH AHORA ESTÁ EN EL CUERPO PRINCIPAL ---
        const fetchBody = {
            messages: messages,
            temperature: 0.7,
            max_tokens: 1000,
            data_sources: [{
                type: "azure_search",
                parameters: {
                    endpoint: process.env.AZURE_SEARCH_ENDPOINT,
                    index_name: process.env.AZURE_SEARCH_INDEX_NAME,
                    authentication: {
                        type: "api_key",
                        key: process.env.AZURE_SEARCH_KEY
                    },
                    semantic_configuration: "default",
                    query_type: "semantic",
                    in_scope: true,
                    top_n_documents: 5
                }
            }]
        };

        const response = await fetch(apiUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "api-key": config.apiKey
            },
            body: JSON.stringify(fetchBody)
        });

        const responseData = await response.json();

        if (!response.ok) {
            console.error('Error de la API de OpenAI:', responseData);
            throw new Error(`Error ${response.status}: ${responseData.error?.message || 'Error en la API'}`);
        }

        const aiResponse = {
            role: 'assistant',
            content: responseData.choices[0]?.message?.content,
            timestamp: new Date().toISOString()
        };

        const updatedHistory = [...history, newMessage, aiResponse];
        await blockBlobClient.upload(JSON.stringify(updatedHistory), JSON.stringify(updatedHistory).length);

        context.res.body = { 
            response: aiResponse.content,
            chatId,
            history: updatedHistory.map(m => ({
                role: m.role,
                content: m.content,
                timestamp: m.timestamp
            }))
        };

    } catch (error) {
        console.error('Error en la función:', error);
        context.res.status = 500;
        context.res.body = { 
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        };
    }
};

async function streamToString(readableStream) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        readableStream.on('data', (data) => chunks.push(data.toString()));
        readableStream.on('end', () => resolve(chunks.join('')));
        readableStream.on('error', reject);
    });
}
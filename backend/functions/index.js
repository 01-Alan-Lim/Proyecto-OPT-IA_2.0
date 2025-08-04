const { BlobServiceClient } = require('@azure/storage-blob');
const { v4: uuidv4 } = require('uuid');
const config = {
    endpoint: process.env.AZURE_OPENAI_ENDPOINT,
    apiKey: process.env.AZURE_OPENAI_KEY,
    deploymentName: process.env.AZURE_OPENAI_DEPLOYMENT,
    apiVersion: "2023-05-15",
    responseStyles: {
        default: "Eres un asistente útil que responde de manera clara y concisa",
        technical: "Eres un experto técnico. Proporciona respuestas detalladas con términos precisos.",
        simple: "Responde de manera breve y directa."
    }
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
                    history: history,
                    chatId: chatId
                }
            };
        }

        const { question, style = "default" } = req.body;

        if (!question || typeof question !== 'string') {
            throw new Error("El texto proporcionado no es válido");
        }

        let history = [];
        if (await blockBlobClient.exists()) {
            const downloadResponse = await blockBlobClient.download();
            history = JSON.parse(await streamToString(downloadResponse.readableStreamBody));
        }

        const newMessage = {
            role: 'user',
            content: question,
            timestamp: new Date().toISOString()
        };

        // --- Código para interactuar con Azure AI Search ---
        const searchServiceEndpoint = process.env.AZURE_AI_SEARCH_ENDPOINT;
        const searchApiKey = process.env.AZURE_AI_SEARCH_KEY;
        const searchIndexName = process.env.AZURE_AI_SEARCH_INDEX_NAME;

        // Función para realizar la búsqueda en Azure AI Search
        async function searchDocuments(query) {
            const searchUrl = `${searchServiceEndpoint}/indexes/${searchIndexName}/docs/search?api-version=2023-10-01-preview`;
            const searchBody = {
                search: query,
                queryType: "semantic",
                semanticConfiguration: "ind-ia", // Configura esto según tu índice
                select: "conocimiento-1" // Selecciona el campo que contiene el texto de los PDFs
            };

            const response = await fetch(searchUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "api-key": searchApiKey
                },
                body: JSON.stringify(searchBody)
            });

            if (!response.ok) {
                throw new Error(`Error en la búsqueda de Azure AI Search: ${response.statusText}`);
            }

            const data = await response.json();
            // Concatenamos el contenido de los resultados
            const searchResults = data.value.map(result => result.content).join("\n\n");
            return searchResults;
        }

        // ... En la función principal (module.exports) ...

        // Busca en el índice de Azure AI Search
        const searchResultContent = await searchDocuments(question);

        let systemMessageContent = config.responseStyles[style] || config.responseStyles.default;

        if (searchResultContent) {
            systemMessageContent += `\n\nBasándote en la siguiente información extraída de documentos: ${searchResultContent}`;
        }

        const messages = [
            {
                role: "system",
                content: systemMessageContent
            },
            ...history.filter(m => m.role !== 'system'),
            newMessage
        ];
        // ... El resto del código continúa igual ...




        const messages = [
            {
                role: "system",
                content: config.responseStyles[style] || config.responseStyles.default
            },
            ...history.filter(m => m.role !== 'system'),
            newMessage
        ];

        const endpoint = config.endpoint.trim().replace(/\/$/, '');
        const apiUrl = `${endpoint}/openai/deployments/${config.deploymentName}/chat/completions?api-version=${config.apiVersion}`;
        
        const response = await fetch(apiUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "api-key": config.apiKey
            },
            body: JSON.stringify({
                messages: messages,
                temperature: 0.7,
                max_tokens: 500
            })
        });

        const responseData = await response.json();
        
        if (!response.ok) {
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
            chatId: chatId,
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
        readableStream.on('data', (data) => {
            chunks.push(data.toString());
        });
        readableStream.on('end', () => {
            resolve(chunks.join(''));
        });
        readableStream.on('error', reject);
    });
}
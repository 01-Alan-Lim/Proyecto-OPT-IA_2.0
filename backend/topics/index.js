const { BlobServiceClient } = require('@azure/storage-blob');

const config = {
    endpoint: process.env.AZURE_OPENAI_ENDPOINT,
    apiKey: process.env.AZURE_OPENAI_KEY,
    deploymentName: process.env.AZURE_OPENAI_DEPLOYMENT,
    apiVersion: "2023-05-15"
};

module.exports = async function (context, req) {
    context.res = {
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Content-Type": "application/json",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, x-user-id"
        }
    };

    if (req.method === "OPTIONS") {
        return context.res;
    }

    try {
        const userId = req.headers['x-user-id'];
        const chatId = req.query.chatId;
        
        if (!userId || !chatId) {
            throw new Error("Se requieren userId y chatId");
        }

        const blobServiceClient = BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING);
        const containerClient = blobServiceClient.getContainerClient("chatia");
        const blobName = `${userId}/${chatId}.json`;
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);

        if (!await blockBlobClient.exists()) {
            throw new Error(`Chat ${chatId} no encontrado`);
        }

        const downloadResponse = await blockBlobClient.download();
        const history = JSON.parse(await streamToString(downloadResponse.readableStreamBody));
        
        const chatMessages = history.filter(m => m.role === 'user' || m.role === 'assistant');
        
        const endpoint = config.endpoint.trim().replace(/\/$/, '');
        const apiUrl = `${endpoint}/openai/deployments/${config.deploymentName}/chat/completions?api-version=${config.apiVersion}`;
        
        const response = await fetch(apiUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "api-key": config.apiKey
            },
            body: JSON.stringify({
                messages: [
                    {
                        role: "system",
                        content: "Analiza la conversación y extrae los 3-5 temas principales. Devuelve tu respuesta en formato JSON con un array llamado 'topics' que contenga strings con los temas identificados."
                    },
                    {
                        role: "user",
                        content: `Conversación:\n${JSON.stringify(chatMessages)}\n\nExtrae los temas principales y devuélvelos en formato JSON con el campo 'topics':`
                    }
                ],
                temperature: 0.3,
                max_tokens: 200
            })
        });

        const responseData = await response.json();
        
        if (!response.ok) {
            throw new Error(`Error ${response.status}: ${responseData.error?.message || 'Error en la API'}`);
        }

        let topics = [];
        try {
            const content = responseData.choices[0]?.message?.content;
            const parsed = JSON.parse(content);
            topics = parsed.topics || [];
        } catch (e) {
            console.error("Error parsing topics:", e);
            topics = chatMessages
                .filter(m => m.role === 'user')
                .slice(0, 3)
                .map(m => m.content.substring(0, 50) + (m.content.length > 50 ? '...' : ''));
        }

        context.res.body = { 
            topics: topics,
            chatId: chatId
        };

    } catch (error) {
        console.error('Error en topics function:', error);
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
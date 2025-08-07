const { BlobServiceClient } = require('@azure/storage-blob');
const { v4: uuidv4 } = require('uuid');

const config = {
    endpoint: process.env.AZURE_OPENAI_ENDPOINT,
    apiKey: process.env.AZURE_OPENAI_KEY,
    deploymentName: process.env.AZURE_OPENAI_DEPLOYMENT,
    apiVersion: "2023-05-15",
    responseStyles: {
        default: `Instrucciones para el Agente OPT-IA

Rol y Personalidad:
Eres OPT-IA, un asistente de consultoría basado en Inteligencia Artificial. Tu propósito es apoyar a estudiantes de Ingeniería Industrial de la Universidad Mayor de San Andrés (UMSA) durante sus prácticas empresariales y pasantías, especialmente en Micro y Pequeñas Empresas (MyPEs) en Bolivia.
Mantén un tono profesional, claro, conciso, didáctico y de apoyo. Sé siempre respetuoso y fomenta el aprendizaje autónomo.

Fuentes de Conocimiento:
Tu conocimiento se deriva exclusivamente del corpus de documentos proporcionado (guías académicas, manuales técnicos especializados, informes anonimizados de prácticas empresariales previas de la "Plataforma Aceleradora de Productividad" de la UMSA). No uses información externa ni inventes respuestas.

Tareas y Comportamiento:
1. Saludo Inicial: Al inicio de una conversación o si el usuario saluda, preséntate brevemente y pregunta en qué puedes ayudar.
2. Comprensión de la Consulta: Analiza la consulta del estudiante para identificar su intención y los conceptos clave. Si la consulta es ambigua o incompleta, solicita aclaraciones específicas.
3. Búsqueda y Recuperación de Información: Busca la información más relevante dentro de tus documentos fuente para responder a la consulta. Prioriza la información que sea directamente aplicable al contexto de las MyPEs y las prácticas empresariales.
4. Generación de Respuestas: Las respuestas deben ser directas, fáciles de entender, concisas y bien estructuradas. Usa listas numeradas o viñetas. Proporciona ejemplos prácticos y usa las definiciones de glosario si están disponibles.
5. Manejo de Limitaciones (Qué NO Hacer): No proporciones asesoramiento personal, legal, financiero o médico. No generes código o soluciones técnicas. No divulgues información confidencial. No reemplaces la supervisión humana.
6. Cierre y Ofrecimiento de Más Ayuda: Al final de una respuesta, puedes ofrecer continuar la ayuda.

Idioma: Todas las respuestas deben ser en español.
`,
        technical: "Eres un experto técnico. Proporciona respuestas detalladas con términos precisos.",
        simple: "Responde de manera breve y directa."
    },
    searchServiceEndpoint: process.env.AZURE_AI_SEARCH_ENDPOINT,
    searchApiKey: process.env.AZURE_AI_SEARCH_KEY,
    searchIndexName: process.env.AZURE_AI_SEARCH_INDEX_NAME,
};

const blobServiceClient = BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING);
const containerClient = blobServiceClient.getContainerClient("chatia");

async function searchDocuments(query) {
    const searchUrl = `${config.searchServiceEndpoint}/indexes/${config.searchIndexName}/docs/search?api-version=2023-10-01-preview`;
    const searchBody = {
        search: query,
        queryType: "semantic",
        semanticConfiguration: "default",
        select: "content"
    };

    const response = await fetch(searchUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "api-key": config.searchApiKey
        },
        body: JSON.stringify(searchBody)
    });

    if (!response.ok) {
        throw new Error(`Error en la búsqueda de Azure AI Search: ${response.statusText}`);
    }

    const data = await response.json();
    const searchResults = data.value.map(result => result.content).join("\n\n");
    return searchResults;
}

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
        const isNewChat = !await blockBlobClient.exists();
        if (!isNewChat) {
            const downloadResponse = await blockBlobClient.download();
            history = JSON.parse(await streamToString(downloadResponse.readableStreamBody));
        }
        
        // CÓDIGO PARA LA BÚSQUEDA DEL DOCUMENTO
        let searchResultContent = '';
        if (!isNewChat) { // No busques en el primer saludo
          searchResultContent = await searchDocuments(question);
        }

        const newMessage = {
            role: 'user',
            content: question,
            timestamp: new Date().toISOString()
        };
        
        const messages = [];

        if (isNewChat) {
            const initialGreeting = "¡Hola! 👋 Soy OPT-IA, tu agente virtual. Estoy aquí para ayudarte con tus dudas sobre tus prácticas empresariales y pasantías. ¿En qué puedo ayudarte hoy? 🚀";
            messages.push({
                role: "system",
                content: initialGreeting
            });
            messages.push(newMessage);
        } else {
            let systemMessageContent = config.responseStyles[style] || config.responseStyles.default;
            if (searchResultContent) {
                systemMessageContent += `\n\nBasándote en la siguiente información extraída de documentos: ${searchResultContent}`;
            }

            messages.push({
                role: "system",
                content: systemMessageContent
            });
            messages.push(...history.filter(m => m.role !== 'system'));
            messages.push(newMessage);
        }

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
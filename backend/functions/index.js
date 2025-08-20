const { BlobServiceClient } = require('@azure/storage-blob');
const { v4: uuidv4 } = require('uuid');

const config = {
    endpoint: process.env.AZURE_OPENAI_ENDPOINT,
    apiKey: process.env.AZURE_OPENAI_KEY,
    deploymentName: process.env.AZURE_OPENAI_DEPLOYMENT,
    apiVersion: "2024-05-01-preview", // Actualizada para soportar data sources
    // Configuración de Azure AI Search
    searchEndpoint: process.env.AZURE_AI_SEARCH_ENDPOINT,
    searchIndexName: process.env.AZURE_AI_SEARCH_INDEX_NAME,
    searchKey: process.env.AZURE_SEARCH_KEY,
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

Idioma: Todas las respuestas deben ser en español.`,
        technical: "Eres un experto técnico de OPT-IA. Proporciona respuestas detalladas con términos precisos basándote únicamente en la información de tus documentos fuente.",
        simple: "Eres OPT-IA. Responde de manera breve y directa basándote en tu base de conocimientos."
    }
};

let blobServiceClient = null;
let containerClient = null;
let documentsContainerClient = null;

// Inicialización lazy de clientes
function initializeClients() {
    if (!blobServiceClient && process.env.AZURE_STORAGE_CONNECTION_STRING) {
        blobServiceClient = BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING);
        containerClient = blobServiceClient.getContainerClient("chatia");
        documentsContainerClient = blobServiceClient.getContainerClient("documents");
    }
}

let keywordMap = null;
let guideDescriptions = null;

async function loadKeywordsAndDescriptions() {
    if (keywordMap && guideDescriptions) return { keywordMap, guideDescriptions };
    
    try {
        initializeClients();
        if (!containerClient) {
            keywordMap = {};
            guideDescriptions = {};
            return { keywordMap, guideDescriptions };
        }

        const blobClient = containerClient.getBlockBlobClient("names/key-words.txt");
        if (!await blobClient.exists()) {
            keywordMap = {};
            guideDescriptions = {};
            return { keywordMap, guideDescriptions };
        }

        const downloadResponse = await blobClient.download();
        const content = await streamToString(downloadResponse.readableStreamBody);
        
        keywordMap = {};
        guideDescriptions = {};
        const lines = content.split('\n');
        let currentSection = null;
        let currentGuide = null;

        for (const line of lines) {
            if (line.startsWith('===')) {
                if (line.includes('DESCRIPCIÓN')) currentSection = 'descriptions';
                else if (line.includes('PALABRAS CLAVE')) currentSection = 'keywords';
                continue;
            }

            if (line.trim() === '') continue;
            
            if (currentSection === 'descriptions' && line.includes('-')) {
                const [guidePart, description] = line.split('-').map(item => item.trim());
                const guideMatch = guidePart.match(/G\d+/);
                if (guideMatch) {
                    currentGuide = guideMatch[0];
                    guideDescriptions[currentGuide] = description;
                }
            }
            else if (currentSection === 'keywords' && line.includes('->')) {
                const [keywords, guide] = line.split('->').map(item => item.trim());
                keywords.split(',').forEach(keyword => {
                    keywordMap[keyword.trim().toLowerCase()] = guide;
                });
            }
        }
    } catch (error) {
        console.log('Warning: Could not load keywords, continuing without them:', error.message);
        keywordMap = {};
        guideDescriptions = {};
    }

    return { keywordMap, guideDescriptions };
}

async function checkKeywords(text) {
    try {
        const { keywordMap, guideDescriptions } = await loadKeywordsAndDescriptions();
        const foundKeywords = {};
        const lowerText = text.toLowerCase();

        for (const [keyword, guide] of Object.entries(keywordMap)) {
            if (lowerText.includes(keyword)) {
                foundKeywords[keyword] = {
                    guide,
                    description: guideDescriptions[guide] || 'Descripción no disponible'
                };
            }
        }

        return foundKeywords;
    } catch (error) {
        console.log('Warning: Error checking keywords:', error.message);
        return {};
    }
}

async function getDocumentInfo(guideId) {
    try {
        initializeClients();
        if (!documentsContainerClient) return null;

        const blobs = [];
        for await (const blob of documentsContainerClient.listBlobsFlat({ prefix: guideId })) {
            blobs.push(blob.name);
        }

        if (blobs.length > 0) {
            const blobClient = documentsContainerClient.getBlockBlobClient(blobs[0]);
            return {
                url: blobClient.url,
                filename: blobs[0].split('/').pop()
            };
        }
        return null;
    } catch (error) {
        console.log('Warning: Error getting document info:', error.message);
        return null;
    }
}

async function enhanceAIReponseWithDocuments(content, documents) {
    if (!documents || documents.length === 0) return content;

    let enhancedResponse = content + "\n\n📚 **Documentos recomendados:**\n";
    
    documents.forEach(doc => {
        enhancedResponse += `\n👉 [${doc.filename}](${doc.url}): ${doc.description}\n`;
    });

    enhancedResponse += "\nPuedes descargar estos documentos desde los enlaces proporcionados.";

    return enhancedResponse;
}

// Función para detectar si es la primera interacción del usuario
function isGreetingOrFirstInteraction(message, history) {
    // Si no hay historial o es muy corto, es primera interacción
    if (!history || history.length <= 1) return true;
    
    // Palabras clave de saludo
    const greetingWords = ['hola', 'buenos días', 'buenas tardes', 'buenas noches', 'saludos', 'hi', 'hello'];
    const lowerMessage = message.toLowerCase();
    
    return greetingWords.some(greeting => lowerMessage.includes(greeting));
}

// Función para generar saludo inicial
function generateInitialGreeting() {
    return "¡Hola! 👋 Soy OPT-IA, tu agente virtual. Estoy aquí para ayudarte con tus dudas sobre tus prácticas empresariales y pasantías. ¿En qué puedo ayudarte hoy? 🚀";
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
        console.log('Function started, request body:', JSON.stringify(req.body));
        console.log('Environment check:', {
            hasOpenAIEndpoint: !!process.env.AZURE_OPENAI_ENDPOINT,
            hasOpenAIKey: !!process.env.AZURE_OPENAI_KEY,
            hasDeployment: !!process.env.AZURE_OPENAI_DEPLOYMENT,
            hasSearchEndpoint: !!process.env.AZURE_AI_SEARCH_ENDPOINT,
            hasSearchIndex: !!process.env.AZURE_AI_SEARCH_INDEX_NAME,
            hasSearchKey: !!process.env.AZURE_SEARCH_KEY
        });

        const userId = req.headers['x-user-id'] || 'default-user';
        const chatId = req.query.chatId || uuidv4();

        // Verificar configuración mínima
        if (!config.endpoint || !config.apiKey || !config.deploymentName) {
            throw new Error("Configuración de Azure OpenAI incompleta. Verifica las variables de entorno.");
        }

        let blobName = null;
        let blockBlobClient = null;

        // Solo inicializar blob storage si está configurado
        if (process.env.AZURE_STORAGE_CONNECTION_STRING) {
            initializeClients();
            blobName = `${userId}/${chatId}.json`;
            blockBlobClient = containerClient.getBlockBlobClient(blobName);
        }

        if (req.body?.action === "load_chat") {
            if (!chatId || chatId === 'undefined') {
                throw new Error("ID de chat no proporcionado");
            }

            if (!blockBlobClient || !await blockBlobClient.exists()) {
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

        console.log('Processing question:', question);

        let history = [];
        if (blockBlobClient && await blockBlobClient.exists()) {
            try {
                const downloadResponse = await blockBlobClient.download();
                history = JSON.parse(await streamToString(downloadResponse.readableStreamBody));
            } catch (error) {
                console.log('Warning: Could not load history:', error.message);
                history = [];
            }
        }

        // Detectar si es primera interacción o saludo
        const isFirstInteraction = isGreetingOrFirstInteraction(question, history);
        
        let systemMessage = config.responseStyles[style] || config.responseStyles.default;
        
        // Si es primera interacción, agregar el saludo al sistema
        if (isFirstInteraction) {
            systemMessage += `\n\nIMPORTANTE: Esta es una primera interacción o saludo. Responde con el siguiente saludo exacto: "${generateInitialGreeting()}" y luego procede a responder la consulta si hay alguna pregunta específica.`;
        }

        const newMessage = {
            role: 'user',
            content: question,
            timestamp: new Date().toISOString()
        };
        
        const messages = [
            {
                role: "system",
                content: systemMessage
            },
            // Limpiar mensajes del historial - solo enviar role y content
            ...history.filter(m => m.role !== 'system').map(m => ({
                role: m.role,
                content: m.content
            })),
            // Limpiar nuevo mensaje - solo role y content
            {
                role: newMessage.role,
                content: newMessage.content
            }
        ];

        const endpoint = config.endpoint.trim().replace(/\/$/, '');
        const apiUrl = `${endpoint}/openai/deployments/${config.deploymentName}/chat/completions?api-version=${config.apiVersion}`;
        
        console.log('Making request to:', apiUrl);

        // Preparar el cuerpo de la solicitud
        const requestBody = {
            messages: messages,
            temperature: 0.7,
            max_tokens: 1000
        };

        // Solo agregar data_sources si están configuradas todas las variables
        if (config.searchEndpoint && config.searchIndexName && config.searchKey) {
            requestBody.data_sources = [{
                type: "azure_search",
                parameters: {
                    endpoint: config.searchEndpoint,
                    index_name: config.searchIndexName,
                    authentication: {
                        type: "api_key",
                        key: config.searchKey
                    },
                    semantic_configuration: "default",
                    query_type: "semantic",
                    in_scope: true,
                    top_n_documents: 5
                }
            }];
            console.log('Azure AI Search configured');
        } else {
            console.log('Azure AI Search not configured, using standard mode');
        }
        
        const response = await fetch(apiUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "api-key": config.apiKey
            },
            body: JSON.stringify(requestBody)
        });

        const responseData = await response.json();
        
        console.log('Response status:', response.status);
        console.log('Response data:', JSON.stringify(responseData));
        
        if (!response.ok) {
            throw new Error(`Error ${response.status}: ${responseData.error?.message || JSON.stringify(responseData) || 'Error en la API'}`);
        }

        // Verificar palabras clave para documentos adicionales
        const keywordsFound = await checkKeywords(question);
        const documents = [];

        for (const [keyword, docInfo] of Object.entries(keywordsFound)) {
            const docData = await getDocumentInfo(docInfo.guide);
            if (docData) {
                documents.push({
                    keyword,
                    guide: docInfo.guide,
                    description: docInfo.description,
                    url: docData.url,
                    filename: docData.filename
                });
            }
        }

        let aiResponseContent = responseData.choices[0]?.message?.content;
        
        if (!aiResponseContent) {
            throw new Error('No se recibió contenido de la respuesta de la IA');
        }

        // Si es primera interacción y no contiene el saludo, agregarlo
        if (isFirstInteraction && !aiResponseContent.includes("¡Hola! 👋 Soy OPT-IA")) {
            aiResponseContent = generateInitialGreeting() + "\n\n" + aiResponseContent;
        }

        // Mejorar respuesta con documentos adicionales si los hay
        aiResponseContent = await enhanceAIReponseWithDocuments(aiResponseContent, documents);

        const aiResponse = {
            role: 'assistant',
            content: aiResponseContent,
            timestamp: new Date().toISOString(),
            documents: documents.length > 0 ? documents : undefined
        };

        const updatedHistory = [...history, newMessage, aiResponse];
        
        // Solo guardar en blob storage si está configurado
        if (blockBlobClient) {
            try {
                await blockBlobClient.upload(JSON.stringify(updatedHistory), JSON.stringify(updatedHistory).length);
            } catch (error) {
                console.log('Warning: Could not save history:', error.message);
            }
        }

        context.res.body = { 
            response: aiResponse.content,
            chatId: chatId,
            history: updatedHistory.map(m => ({
                role: m.role,
                content: m.content,
                timestamp: m.timestamp,
                documents: m.documents
            })),
            documents: documents.length > 0 ? documents : undefined
        };

        console.log('Function completed successfully');

    } catch (error) {
        console.error('Error en la función:', error);
        console.error('Error stack:', error.stack);
        
        context.res.status = 500;
        context.res.body = { 
            error: `Error interno del servidor: ${error.message}`,
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
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
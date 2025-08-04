const { AzureOpenAI } = require("openai");

module.exports = async function (context, req) {
    // Configuración CORS
    context.res = {
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Content-Type": "application/json",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type"
        }
    };

    // Manejar solicitud OPTIONS para preflight
    if (req.method === "OPTIONS") {
        return context.res;
    }

    try {
        const { topic, actionType } = req.body;
                
        if (!topic || !actionType) {
            throw new Error("Se requieren topic y actionType");
        }

        // Configuración correcta del cliente
        const client = new AzureOpenAI({
            apiKey: process.env.AZURE_OPENAI_KEY,
            endpoint: process.env.AZURE_OPENAI_ENDPOINT,
            apiVersion: "2023-05-15"
        });

        let prompt = "";
        switch(actionType) {
            case "summary":
                prompt = `Crea un resumen conciso y bien estructurado sobre el tema "${topic}". Incluye los puntos clave.`;
                break;
            case "data-table":
                prompt = `Genera una tabla de datos en formato markdown sobre el tema "${topic}". Incluye columnas relevantes y datos de ejemplo.`;
                break;
            case "sources":
                prompt = `Proporciona 3-5 fuentes confiables para investigar sobre "${topic}". Incluye enlaces si es posible.`;
                break;
            case "document":
                prompt = `Crea un documento estructurado sobre "${topic}" con:\n1. Introducción\n2. Desarrollo (3-5 secciones)\n3. Conclusión\n4. Referencias`;
                break;
            default:
                throw new Error("Tipo de acción no válido");
        }

        const response = await client.chat.completions.create({
            model: process.env.AZURE_OPENAI_DEPLOYMENT, // Nombre del deployment
            messages: [
                {
                    role: "system",
                    content: "Eres un asistente que genera contenido bien estructurado y profesional."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            temperature: 0.5,
            max_tokens: 1000
        });

        const content = response.choices[0]?.message?.content || "No se pudo generar el contenido";

        context.res.body = { 
            content: content,
            topic: topic,
            actionType: actionType,
            timestamp: new Date().toISOString()
        };

    } catch (error) {
        console.error('Error en generate-document function:', error);
        context.res.status = 500;
        context.res.body = { 
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        };
    }
};
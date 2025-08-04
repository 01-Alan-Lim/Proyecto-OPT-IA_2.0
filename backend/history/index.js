const { BlobServiceClient } = require('@azure/storage-blob');

module.exports = async function (context, req) {
    context.res = {
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Content-Type": "application/json"
        }
    };

    try {
        const userId = req.headers['x-user-id'];
        if (!userId) {
            context.res.status = 400;
            context.res.body = { error: "Se requiere el header x-user-id" };
            return;
        }

        const blobServiceClient = BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING);
        const containerClient = blobServiceClient.getContainerClient("chatia");

        const chatList = [];
        
        for await (const blob of containerClient.listBlobsByHierarchy('/', { prefix: `${userId}/` })) {
            if (blob.kind === 'blob') {
                const blobClient = containerClient.getBlockBlobClient(blob.name);
                const properties = await blobClient.getProperties();
                
                const downloadResponse = await blobClient.download();
                const history = JSON.parse(await streamToString(downloadResponse.readableStreamBody));
                const lastMessage = history[history.length - 1]?.content || 'Nuevo chat';
                
                chatList.push({
                    id: blob.name.split('/')[1].replace('.json', ''),
                    title: lastMessage.substring(0, 50),
                    lastMessage: properties.lastModified.toISOString(),
                    preview: lastMessage.substring(0, 100) + (lastMessage.length > 100 ? '...' : '')
                });
            }
        }

        chatList.sort((a, b) => new Date(b.lastMessage) - new Date(a.lastMessage));

        context.res.body = { 
            chats: chatList,
            count: chatList.length
        };

    } catch (error) {
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
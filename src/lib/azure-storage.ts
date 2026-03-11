import { BlobServiceClient, ContainerClient } from '@azure/storage-blob';

const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;

if (!AZURE_STORAGE_CONNECTION_STRING) {
    throw new Error('Please define the AZURE_STORAGE_CONNECTION_STRING environment variable');
}

const CONTAINER_NAME = process.env.AZURE_STORAGE_CONTAINER_NAME || 'hallow-files';

let cachedContainerClient: ContainerClient | null = null;

function getContainerClient(): ContainerClient {
    if (cachedContainerClient) return cachedContainerClient;

    const blobServiceClient = BlobServiceClient.fromConnectionString(
        AZURE_STORAGE_CONNECTION_STRING as string
    );
    cachedContainerClient = blobServiceClient.getContainerClient(CONTAINER_NAME);
    return cachedContainerClient;
}

export async function uploadBlob(
    blobName: string,
    data: Buffer | ArrayBuffer | Uint8Array,
    contentType: string
): Promise<string> {
    const containerClient = getContainerClient();
    // Ensure the container exists
    await containerClient.createIfNotExists({ access: 'blob' });

    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    await blockBlobClient.uploadData(data, {
        blobHTTPHeaders: { blobContentType: contentType },
    });

    return blockBlobClient.url;
}

export async function getBlobUrl(blobName: string): Promise<string> {
    const containerClient = getContainerClient();
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    return blockBlobClient.url;
}

export async function deleteBlob(blobName: string): Promise<void> {
    const containerClient = getContainerClient();
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    await blockBlobClient.deleteIfExists();
}

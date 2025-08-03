import {
    S3Client,
    PutObjectCommand,
    GetObjectCommand,
    DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const env = process.env;

// Initialize S3 client
const s3Client = new S3Client({
    endpoint: env.S3_URL!,
    region: 'auto',
    credentials: {
        accessKeyId: env.S3_ACCESS_KEY_ID!,
        secretAccessKey: env.S3_SECRET_ACCESS_KEY!,
    },
});

// Extract bucket name from S3_URL
const getBucketName = () => {
    const url = new URL(env.S3_URL!);
    const pathParts = url.pathname.split('/');
    return pathParts[1] || 'eagleshifts-localdev'; // Default bucket name as fallback
};

const bucketName = getBucketName();

/**
 * Generate a unique key for the file
 * @param organizationId - The organization ID
 * @param shiftId - The shift ID
 * @param uploadGroupId - The upload group ID
 * @param fileName - The original file name
 * @returns A unique key for the file
 */
export const generateFileKey = (
    organizationId: string,
    shiftId: string,
    uploadGroupId: string,
    fileName: string
): string => {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const extension = fileName.split('.').pop();

    return `${organizationId}/${shiftId}/${uploadGroupId}/${timestamp}-${randomString}.${extension}`;
};

/**
 * Upload a file to S3
 * @param fileKey - The key for the file
 * @param file - The file to upload
 * @param contentType - The content type of the file
 * @returns The URL of the uploaded file
 */
export const uploadFile = async (
    fileKey: string,
    file: Buffer,
    contentType: string
): Promise<void> => {
    const params = {
        Bucket: bucketName,
        Key: fileKey,
        Body: file,
        ContentType: contentType,
    };

    await s3Client.send(new PutObjectCommand(params));
};

/**
 * Get a signed URL for downloading a file
 * @param fileKey - The key of the file
 * @param expiresIn - The number of seconds until the URL expires (default: 3600)
 * @param fileName - Optional filename to use for the download (sets Content-Disposition header)
 * @returns A signed URL for downloading the file
 */
export const getFileUrl = async (
    fileKey: string,
    expiresIn = 3600,
    fileName?: string
): Promise<string> => {
    const params: any = {
        Bucket: bucketName,
        Key: fileKey,
    };

    // If fileName is provided, set the Content-Disposition header
    if (fileName) {
        params.ResponseContentDisposition = `attachment; filename="${encodeURIComponent(fileName)}"`;
    }

    const command = new GetObjectCommand(params);
    return await getSignedUrl(s3Client, command, { expiresIn });
};

/**
 * Delete a file from S3
 * @param fileKey - The key of the file to delete
 */
export const deleteFile = async (fileKey: string): Promise<void> => {
    const params = {
        Bucket: bucketName,
        Key: fileKey,
    };

    await s3Client.send(new DeleteObjectCommand(params));
};

/**
 * Download a file from S3
 * @param fileKey - The key of the file to download
 * @returns The file buffer
 */
export const downloadFile = async (fileKey: string): Promise<Buffer> => {
    const params = {
        Bucket: bucketName,
        Key: fileKey,
    };

    const command = new GetObjectCommand(params);
    const response = await s3Client.send(command);

    // Convert the stream to a buffer
    const chunks: Uint8Array[] = [];
    for await (const chunk of response.Body as any) {
        chunks.push(chunk);
    }

    return Buffer.concat(chunks);
};

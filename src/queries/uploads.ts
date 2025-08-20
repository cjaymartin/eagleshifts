import { useMutation, useQuery } from '@tanstack/react-query';
import { trpc } from '@/lib/trpc/client';

// Get upload groups for the current organization
export const useUploadGroupsQuery = () => {
    return trpc.uploads.getUploadGroups.useQuery();
};

// Get uploads for a specific shift
export const useShiftUploadsQuery = (shiftId: string) => {
    return trpc.uploads.getShiftUploads.useQuery({ shiftId });
};

// Upload a file
export const useUploadFileMutation = () => {
    return trpc.uploads.uploadFile.useMutation();
};

// Get a signed URL for downloading a file
export const useFileUrlQuery = (uploadId: string) => {
    return trpc.uploads.getFileUrl.useQuery({ uploadId });
};

// Convert DOCX to PDF
export const useConvertDocxToPdfQuery = (uploadId: string) => {
    return trpc.uploads.convertDocxToPdf.useQuery({ uploadId });
};

// Convert XLSX to PDF
export const useConvertXlsxToPdfQuery = (uploadId: string) => {
    return trpc.uploads.convertXlsxToPdf.useQuery({ uploadId });
};

// Delete a file (mark as deleted)
export const useDeleteFileMutation = () => {
    return trpc.uploads.deleteFile.useMutation();
};

// Permanently delete a file (admin only)
export const usePermanentlyDeleteFileMutation = () => {
    return trpc.uploads.permanentlyDeleteFile.useMutation();
};

// Get all uploads for the organization (admin only)
export const useAllUploadsQuery = (
    options: {
        includeDeleted?: boolean;
        showOnlyInactive?: boolean;
        shiftId?: string;
        uploadGroupId?: string;
        uploaderId?: string;
    } = {}
) => {
    return trpc.uploads.getAllUploads.useQuery(options);
};

// Initialize upload groups based on organization_profile.uploadNames (admin only)
export const useInitializeUploadGroupsMutation = () => {
    return trpc.uploads.initializeUploadGroups.useMutation();
};

// Create a default checklist upload group if none exists
export const useCreateChecklistUploadGroupMutation = () => {
    return trpc.uploads.createChecklistUploadGroup.useMutation();
};

// Helper function to read a file as base64
export const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            resolve(reader.result as string);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

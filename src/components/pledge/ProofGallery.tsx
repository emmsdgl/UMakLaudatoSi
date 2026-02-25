'use client';

import { useState } from 'react';
import { X, FileText, Download, ImageIcon } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { PledgeProof } from '@/types';

interface ProofGalleryProps {
  proofs: PledgeProof[];
  onDelete?: (proofId: string) => void;
  readOnly?: boolean;
}

export default function ProofGallery({ proofs, onDelete, readOnly }: ProofGalleryProps) {
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  if (proofs.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400 dark:text-gray-500">
        <ImageIcon className="w-12 h-12 mx-auto mb-2" />
        <p className="text-sm">No proofs uploaded yet</p>
      </div>
    );
  }

  const handleDelete = async (proofId: string) => {
    if (!onDelete) return;
    setDeleting(proofId);
    try {
      await onDelete(proofId);
    } finally {
      setDeleting(null);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {proofs.map(proof => {
          const isImage = proof.file_type.startsWith('image/');
          const isPdf = proof.file_type === 'application/pdf';

          return (
            <div
              key={proof.id}
              className="relative group rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
            >
              {isImage ? (
                <div
                  className="aspect-square cursor-pointer"
                  onClick={() => setLightboxUrl(proof.file_url)}
                >
                  <img
                    src={proof.file_url}
                    alt={proof.file_name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                </div>
              ) : isPdf ? (
                <a
                  href={proof.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="aspect-square flex flex-col items-center justify-center p-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <FileText className="w-10 h-10 text-red-500 mb-2" />
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-300 text-center truncate w-full px-1">
                    {proof.file_name}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    {formatFileSize(proof.file_size)}
                  </p>
                </a>
              ) : null}

              {/* Delete button */}
              {!readOnly && onDelete && (
                <Button
                  size="icon"
                  variant="destructive"
                  className="absolute top-1.5 right-1.5 w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(proof.id);
                  }}
                  disabled={deleting === proof.id}
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {/* Lightbox for full-size images */}
      <Dialog open={!!lightboxUrl} onOpenChange={() => setLightboxUrl(null)}>
        <DialogContent className="max-w-3xl p-2 bg-black/90 border-0">
          {lightboxUrl && (
            <img
              src={lightboxUrl}
              alt="Proof"
              className="w-full h-auto max-h-[80vh] object-contain rounded"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

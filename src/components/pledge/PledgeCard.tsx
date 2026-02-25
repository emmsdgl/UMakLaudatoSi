'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ImageIcon, FileText } from 'lucide-react';
import PledgeStatusBadge from './PledgeStatusBadge';
import type { PledgeAlbum } from '@/types';

interface PledgeCardProps {
  pledge: PledgeAlbum;
  onClick: () => void;
}

export default function PledgeCard({ pledge, onClick }: PledgeCardProps) {
  const proofs = pledge.proofs || [];
  const imageProofs = proofs.filter(p => p.file_type.startsWith('image/'));
  const pdfProofs = proofs.filter(p => p.file_type === 'application/pdf');

  // Check if "New" — created less than 24 hours ago and still draft
  const isNew = pledge.status === 'draft' &&
    (Date.now() - new Date(pledge.created_at).getTime()) < 24 * 60 * 60 * 1000;

  return (
    <Card
      className="group cursor-pointer border-0 shadow-md hover:shadow-lg transition-all duration-200 overflow-hidden"
      onClick={onClick}
    >
      {/* Thumbnail area */}
      <div className="relative aspect-[4/3] bg-gray-100 dark:bg-gray-800 overflow-hidden">
        {imageProofs.length > 0 ? (
          <div className={`grid h-full ${imageProofs.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
            {imageProofs.slice(0, 4).map((proof, i) => (
              <div key={proof.id} className="relative overflow-hidden">
                <img
                  src={proof.file_url}
                  alt={proof.file_name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-400 dark:text-gray-500">
              <ImageIcon className="w-10 h-10 mx-auto mb-1" />
              <p className="text-xs">No proofs yet</p>
            </div>
          </div>
        )}

        {/* New badge */}
        {isNew && (
          <Badge className="absolute top-2 right-2 bg-chartreuse-500 text-green-900 text-[10px] px-1.5 py-0.5 bg-green-400 font-bold">
            NEW
          </Badge>
        )}
      </div>

      <CardContent className="p-3">
        <h3 className="font-semibold text-sm text-gray-800 dark:text-white truncate mb-1.5">
          {pledge.title}
        </h3>

        <div className="flex items-center justify-between gap-2">
          <PledgeStatusBadge status={pledge.status} pointsAwarded={pledge.points_awarded} />
          <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
            {imageProofs.length > 0 && (
              <span className="flex items-center gap-0.5">
                <ImageIcon className="w-3 h-3" />
                {imageProofs.length}
              </span>
            )}
            {pdfProofs.length > 0 && (
              <span className="flex items-center gap-0.5">
                <FileText className="w-3 h-3" />
                {pdfProofs.length}
              </span>
            )}
            {proofs.length === 0 && <span>0 proofs</span>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

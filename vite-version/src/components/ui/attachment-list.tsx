import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Download, FileText, File, Trash2, X, ZoomIn } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Attachment {
  id: number;
  fileName: string;
  originalFileName: string;
  fileSize: number;
  mimeType: string;
  isInternal: boolean;
  uploadedBy: string;
  uploadedAt: string;
}

interface AttachmentListProps {
  attachments: Attachment[];
  onDownload: (attachmentId: number) => void;
  getPreviewUrl?: (attachmentId: number) => string;
  onDelete?: (attachmentId: number) => void;
  showDelete?: boolean;
  className?: string;
}

export function AttachmentList({
  attachments,
  onDownload,
  getPreviewUrl,
  onDelete,
  showDelete = false,
  className
}: AttachmentListProps) {
  const [lightboxImage, setLightboxImage] = React.useState<string | null>(null);
  const [lightboxName, setLightboxName] = React.useState<string>('');

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isImage = (mimeType: string) => mimeType.startsWith('image/');

  const getFileIcon = (mimeType: string) => {
    if (mimeType === 'application/pdf') {
      return <FileText className="h-4 w-4" />;
    }
    return <File className="h-4 w-4" />;
  };

  const openLightbox = (url: string, name: string) => {
    setLightboxImage(url);
    setLightboxName(name);
  };

  const closeLightbox = () => {
    setLightboxImage(null);
    setLightboxName('');
  };

  // Close lightbox on escape key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && lightboxImage) {
        closeLightbox();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [lightboxImage]);

  if (attachments.length === 0) {
    return null;
  }

  // Separate images from other files
  const imageAttachments = attachments.filter(a => isImage(a.mimeType));
  const otherAttachments = attachments.filter(a => !isImage(a.mimeType));

  return (
    <>
      <div className={cn('space-y-3', className)}>
        {/* Image Grid */}
        {imageAttachments.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {imageAttachments.map((attachment) => {
              const previewUrl = getPreviewUrl ? getPreviewUrl(attachment.id) : undefined;
              return (
                <div
                  key={attachment.id}
                  className={cn(
                    'relative group rounded-lg overflow-hidden border',
                    attachment.isInternal && 'border-yellow-300 bg-yellow-50'
                  )}
                >
                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      alt={attachment.originalFileName}
                      className="w-full h-32 object-cover cursor-pointer transition-transform hover:scale-105"
                      onClick={() => openLightbox(previewUrl, attachment.originalFileName)}
                    />
                  ) : (
                    <div className="w-full h-32 bg-muted flex items-center justify-center">
                      <File className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}

                  {/* Overlay with actions */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    {previewUrl && (
                      <Button
                        variant="secondary"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openLightbox(previewUrl, attachment.originalFileName)}
                        title="Visualizza"
                      >
                        <ZoomIn className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="secondary"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => onDownload(attachment.id)}
                      title="Scarica"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    {showDelete && onDelete && (
                      <Button
                        variant="destructive"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onDelete(attachment.id)}
                        title="Elimina"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  {/* File info */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                    <p className="text-xs text-white truncate">{attachment.originalFileName}</p>
                    <p className="text-[10px] text-white/70">
                      {formatFileSize(attachment.fileSize)}
                      {attachment.isInternal && ' • Interno'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Non-image files */}
        {otherAttachments.map((attachment) => (
          <Card
            key={attachment.id}
            className={cn(
              'p-3',
              attachment.isInternal && 'border-yellow-200 bg-yellow-50'
            )}
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-muted rounded flex items-center justify-center flex-shrink-0">
                {getFileIcon(attachment.mimeType)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {attachment.originalFileName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(attachment.fileSize)} • {formatDate(attachment.uploadedAt)}
                  {attachment.isInternal && ' • Interno'}
                </p>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDownload(attachment.id)}
                  title="Scarica"
                >
                  <Download className="h-4 w-4" />
                </Button>
                {showDelete && onDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(attachment.id)}
                    title="Elimina"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Lightbox */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={closeLightbox}
        >
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 text-white hover:bg-white/20"
            onClick={closeLightbox}
          >
            <X className="h-6 w-6" />
          </Button>
          <div className="max-w-[90vw] max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <img
              src={lightboxImage}
              alt={lightboxName}
              className="max-w-full max-h-[85vh] object-contain rounded-lg"
            />
            <p className="text-white text-center mt-2 text-sm">{lightboxName}</p>
          </div>
        </div>
      )}
    </>
  );
}

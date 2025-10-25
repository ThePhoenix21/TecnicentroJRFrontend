"use client";

import { Progress } from "./progress";
import { AlertCircle, XCircle, Upload } from "lucide-react";
import { Button } from "./button";

interface ImageUploaderProps {
  inProgress: boolean;
  progress: number;
  error: string | null;
  failedFiles: { file: File; error: string }[];
  onRetry?: () => void;
  onContinue?: () => void;
}

export function ImageUploader({
  inProgress,
  progress,
  error,
  failedFiles,
  onRetry,
  onContinue,
}: ImageUploaderProps) {
  if (!inProgress && !error) return null;

  return (
    <div className="mt-4 p-4 border rounded-lg bg-card">
      {inProgress && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Upload className="h-4 w-4 animate-pulse" />
            <span className="text-sm font-medium">Subiendo imágenes...</span>
            <span className="text-sm text-muted-foreground ml-auto">
              {Math.round(progress)}%
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      )}

      {error && (
        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm font-medium">{error}</span>
          </div>

          {failedFiles.length > 0 && (
            <div className="text-sm text-muted-foreground">
              <p className="font-medium mb-2">Archivos con error:</p>
              <ul className="space-y-1">
                {failedFiles.map(({ file, error }, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-destructive flex-shrink-0" />
                    <span className="truncate">{file.name}</span>
                    <span className="text-xs text-muted-foreground truncate">
                      ({error})
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            {onRetry && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRetry}
                className="flex-1"
              >
                Reintentar
              </Button>
            )}
            {onContinue && (
              <Button
                variant="default"
                size="sm"
                onClick={onContinue}
                className="flex-1"
              >
                Continuar sin las imágenes
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

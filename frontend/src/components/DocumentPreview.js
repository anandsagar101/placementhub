import React from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { FileText, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DocumentPreview({ doc, title, open, onOpenChange }) {
  if (!doc) return null;
  const isImage = doc.resource_type === "image" || ["jpg", "jpeg", "png", "webp"].includes((doc.format || "").toLowerCase());
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-hidden" data-testid="document-preview">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><FileText className="h-4 w-4" /> {title || "Document"}</DialogTitle>
        </DialogHeader>
        <div className="max-h-[70vh] overflow-auto rounded-lg border border-border bg-muted/30">
          {isImage ? (
            <img src={doc.url} alt={title} className="mx-auto max-h-[68vh] w-auto object-contain" />
          ) : (
            <iframe src={doc.url} title={title} className="h-[68vh] w-full" />
          )}
        </div>
        <a href={doc.url} target="_blank" rel="noreferrer">
          <Button variant="outline" className="w-full rounded-full" data-testid="open-doc-newtab">
            <ExternalLink className="mr-2 h-4 w-4" /> Open in new tab
          </Button>
        </a>
      </DialogContent>
    </Dialog>
  );
}

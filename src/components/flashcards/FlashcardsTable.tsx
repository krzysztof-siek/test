import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { type FlashcardViewModel } from "./hooks/useFlashcards";
import { PencilIcon, TrashIcon, BrainIcon, UserIcon, CalendarIcon } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { Source } from "../../types";

interface FlashcardsTableProps {
  flashcards: FlashcardViewModel[];
  onEdit: (flashcard: FlashcardViewModel) => void;
  onDelete: (flashcard: FlashcardViewModel) => void;
}

// Komponent dla tekstu z ucinaniem i tooltipem
function TruncatedText({ text, className }: { text: string; className?: string }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn("block truncate w-full cursor-help", className)}>{text}</span>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="start" className="max-w-md p-4">
          <p className="max-h-[300px] overflow-y-auto break-words">{text}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Komponent dla wyświetlania źródła fiszki
function SourceBadge({ source }: { source: Source }) {
  const sourceConfig = {
    manual: {
      label: "Ręczna",
      icon: UserIcon,
    },
    "ai-full": {
      label: "AI",
      icon: BrainIcon,
    },
    "ai-edited": {
      label: "AI (edytowana)",
      icon: BrainIcon,
    },
  };

  const config = sourceConfig[source];

  return (
    <Badge variant="secondary" className="w-fit">
      <config.icon className="h-3 w-3 mr-1" />
      {config.label}
    </Badge>
  );
}

// Formatowanie daty
function formatDate(dateString: string) {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  }).format(date);
}

export function FlashcardsTable({ flashcards, onEdit, onDelete }: FlashcardsTableProps) {
  return (
    <div className="rounded-md border overflow-hidden">
      <div className="overflow-x-auto">
        <Table className="w-full table-fixed">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[30%] sm:w-[30%]">Przód</TableHead>
              <TableHead className="w-[30%] sm:w-[30%]">Tył</TableHead>
              <TableHead className="w-[30%] sm:w-[15%]">Typ</TableHead>
              <TableHead className="hidden sm:table-cell w-[15%]">Utworzono</TableHead>
              <TableHead className="w-[10%] text-right">Akcje</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {flashcards.map((flashcard) => (
              <TableRow key={flashcard.id}>
                <TableCell className="font-medium w-[30%] sm:w-[30%] p-2 sm:p-3 align-top">
                  <div className="w-full overflow-hidden">
                    <TruncatedText text={flashcard.front} className="font-medium" />
                  </div>
                </TableCell>
                <TableCell className="w-[30%] sm:w-[30%] p-2 sm:p-3 align-top">
                  <div className="w-full overflow-hidden">
                    <TruncatedText text={flashcard.back} />
                  </div>
                </TableCell>
                <TableCell className="w-[30%] sm:w-[15%] p-2 sm:p-3 align-top">
                  <SourceBadge source={flashcard.source} />
                </TableCell>
                <TableCell className="hidden sm:table-cell w-[15%] p-2 sm:p-3 align-top text-muted-foreground text-sm">
                  <div className="flex items-center">
                    <CalendarIcon className="h-3 w-3 mr-1.5" />
                    {formatDate(flashcard.created_at)}
                  </div>
                </TableCell>
                <TableCell className="text-right w-[10%] p-2 sm:p-3 align-top">
                  <div className="flex justify-end space-x-0.5 sm:space-x-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onEdit(flashcard)}
                      aria-label="Edytuj fiszkę"
                      className="h-8 w-8 sm:h-9 sm:w-9"
                    >
                      <PencilIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDelete(flashcard)}
                      aria-label="Usuń fiszkę"
                      disabled={flashcard.isDeleting}
                      className={cn(
                        "h-8 w-8 sm:h-9 sm:w-9",
                        flashcard.isDeleting ? "opacity-50 cursor-not-allowed" : ""
                      )}
                    >
                      {flashcard.isDeleting ? (
                        <div className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin rounded-full border-b-2 border-current"></div>
                      ) : (
                        <TrashIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-destructive" />
                      )}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

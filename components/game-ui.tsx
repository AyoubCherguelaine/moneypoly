"use client";
import { type CSSProperties, type ReactNode } from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { COLORS, TOKENS } from "@/lib/board";

export function Dice({ value, rolling }: { value: number; rolling: boolean }) {
  const dots: Record<number, number[]> = {
    1: [4],
    2: [0, 8],
    3: [0, 4, 8],
    4: [0, 2, 6, 8],
    5: [0, 2, 4, 6, 8],
    6: [0, 2, 3, 5, 6, 8],
  };
  return (
    <span
      className={`die ${rolling ? "rolling" : ""}`}
      aria-label={`حجر النرد: ${value}`}
    >
      {Array.from({ length: 9 }, (_, i) => (
        <i key={i} className={dots[value].includes(i) ? "dot" : ""} />
      ))}
    </span>
  );
}

export function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        className={`modal ${wide ? "wide" : ""}`}
        showCloseButton={false}
        aria-describedby={undefined}
      >
        <div className="modal-head">
          <DialogTitle>{title}</DialogTitle>
          <DialogClose asChild>
            <Button
              variant="ghost"
              size="icon"
              className="icon-button"
              aria-label="إغلاق النافذة"
            >
              <X size={20} />
            </Button>
          </DialogClose>
        </div>
        {children}
      </DialogContent>
    </Dialog>
  );
}

export function Token({ id }: { id: number }) {
  return (
    <span
      className="player-token"
      style={{ "--token-color": COLORS[id] } as CSSProperties}
    >
      {TOKENS[id]}
    </span>
  );
}

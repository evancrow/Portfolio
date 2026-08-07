"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { Entry } from "@/content/types";
import { renderRichText, splitSentences } from "@/lib/rich-text";
import { EntryIcon } from "@/components/ui/icons";
import { EntryMetadata } from "./EntryMetadata";

/**
   Detail view for a single entry. Radix supplies the portal, focus trap,
   Escape handling, scroll lock, and ARIA wiring.
*/
export function EntryModal({
  entry,
  open,
  onOpenChange,
}: {
  entry: Entry;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/15 data-[state=closed]:animate-fade-out data-[state=open]:animate-fade-in" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-50 max-h-[65vh] w-[500px] max-w-[85%] -translate-x-1/2 -translate-y-1/2 overflow-auto rounded-[10px] bg-surface p-[1.5rem_20px] shadow-[0_8px_24px_rgba(0,0,0,0.12)] data-[state=closed]:animate-panel-out data-[state=open]:animate-panel-in sm:max-w-[80vw] sm:p-8">
          <div className="flex w-full flex-row items-center">
            <div className="flex max-w-[80%] flex-1 flex-row items-center gap-[12px] sm:max-w-none sm:gap-[18px]">
              {entry.icon && <EntryIcon icon={entry.icon} alt="" size={45} />}
              <div>
                <Dialog.Title className="pt-[4px] text-[1.3em] leading-none font-medium sm:text-[1.5em]">
                  {entry.title}
                </Dialog.Title>
                {entry.subheader && (
                  <p className="mt-[0.15rem] text-[0.85em] font-normal text-muted [font-variant:all-small-caps] sm:text-[0.95em]">
                    {entry.subheader}
                  </p>
                )}
              </div>
            </div>
            <Dialog.Close
              aria-label="Close"
              className="ml-auto flex h-[38px] cursor-pointer items-center justify-center px-[0.5rem] py-[0.25rem] transition-colors hover:text-ink-hover sm:h-[45px]"
            >
              <X size={20} />
            </Dialog.Close>
          </div>

          <div className="flex w-full flex-col text-[0.95em] leading-[1.3em] sm:text-[1em]">
            {entry.description ? (
              <Dialog.Description asChild>
                <div className="mt-[16px]">
                  {splitSentences(entry.description).map((sentence, i) => (
                    <p key={i} className="mb-[10px] last:mb-0">
                      {renderRichText(sentence)}
                    </p>
                  ))}
                </div>
              </Dialog.Description>
            ) : (
              <Dialog.Description className="sr-only">
                {entry.subheader ?? entry.title}
              </Dialog.Description>
            )}

            {entry.platforms && (
              <EntryMetadata header="Platforms" values={entry.platforms} />
            )}
            {entry.languages && (
              <EntryMetadata header="Languages" values={entry.languages} />
            )}

            {entry.link && (
              <a
                href={entry.link}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-[1.5rem] w-fit rounded-[5px] bg-ink px-[0.9rem] py-[0.4rem] text-[0.9em] text-white transition-colors duration-300 hover:bg-ink-hover sm:px-[1rem] sm:py-[0.5rem] sm:text-[1em]"
              >
                View
              </a>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

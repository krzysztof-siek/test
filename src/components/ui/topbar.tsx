import React from "react";
import { Button } from "./button";
import { AuthStatus } from "@/components/auth/AuthStatus";

interface TopbarProps {
  user?: {
    email: string;
  } | null;
}

export function Topbar({ user }: TopbarProps) {
  return (
    <div className="border-b bg-background">
      <div className="container max-w-8xl mx-auto px-2 py-3 flex items-center justify-between">
        <a href="/" className="text-xl font-bold hover:opacity-80 transition-opacity hidden sm:block">
          10x-cards-by-Krzysiek
        </a>
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Button variant="ghost" asChild>
                <a href="/generate">Generator</a>
              </Button>
              <Button variant="ghost" asChild>
                <a href="/flashcards">Fiszki</a>
              </Button>
              <Button variant="ghost" asChild>
                <a href="/practice">Ćwicz</a>
              </Button>
            </>
          ) : (
            <Button variant="ghost" asChild>
              <a href="/">Strona główna</a>
            </Button>
          )}
          <AuthStatus user={user} />
        </div>
      </div>
    </div>
  );
}

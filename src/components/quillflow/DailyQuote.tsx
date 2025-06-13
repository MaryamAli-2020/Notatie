"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { mockDailyQuotes } from '@/lib/mock-data';
import type { DailyQuoteType } from '@/types';

export function DailyQuote() {
  const [quote, setQuote] = useState<DailyQuoteType | null>(null);

  useEffect(() => {
    // Select a random quote on component mount (client-side)
    const randomIndex = Math.floor(Math.random() * mockDailyQuotes.length);
    setQuote(mockDailyQuotes[randomIndex]);
  }, []);

  if (!quote) {
    return (
      <Card className="bg-accent/50 border-accent shadow-sm">
        <CardContent className="p-3">
          <p className="text-sm italic text-accent-foreground/80">Loading inspirational quote...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-accent/50 border-accent shadow-sm">
      <CardContent className="p-3 pt-4">
        <blockquote className="text-sm italic text-accent-foreground/90">
          "{quote.text}"
        </blockquote>
      </CardContent>
      <CardFooter className="p-3 pt-0">
        <p className="text-xs text-accent-foreground/70 text-right w-full">- {quote.author}</p>
      </CardFooter>
    </Card>
  );
}

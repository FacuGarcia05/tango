"use client";

import { useGamePrice } from "@/hooks/useGamePrice";

interface GamePriceDisplayProps {
  title: string;
  basePriceUSD: number;
  currency?: string;
}

export function GamePriceDisplay({ title, basePriceUSD, currency = "ARS" }: GamePriceDisplayProps) {
  const { convertedPrice, loading, error } = useGamePrice(title, basePriceUSD, currency);

  if (loading) {
    return <span className="text-sm text-text-muted">(cargando precio...)</span>;
  }

  if (error) {
    return <span className="text-sm text-danger">Error al cargar precio</span>;
  }

  if (!convertedPrice) {
    return null;
  }

  return (
    <span className="text-sm rounded-full bg-primary/20 px-3 py-1 text-primary">
      💰 {convertedPrice}
    </span>
  );
}

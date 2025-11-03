"use client";

import { useEffect, useState } from "react";

/**
 * Hook que obtiene el precio convertido desde el backend (SOAP Wrapper).
 * @param title Título del juego
 * @param basePriceUSD Precio base en USD (de ejemplo o tomado de la API)
 * @param targetCurrency Moneda destino ("ARS", "EUR", "USD", etc.)
 */
export function useGamePrice(
  title: string,
  basePriceUSD: number,
  targetCurrency: string = "ARS"
) {
  const [convertedPrice, setConvertedPrice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!title || !basePriceUSD) return;

    const fetchPrice = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `http://localhost:3001/api/soap/convert?title=${encodeURIComponent(
            title
          )}&price=${basePriceUSD}&currency=${targetCurrency}`
        );

        if (!response.ok)
          throw new Error("Error al obtener el precio convertido");

        const data = await response.json();
        setConvertedPrice(data.convertedPrice ?? null);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPrice();
  }, [title, basePriceUSD, targetCurrency]);

  return { convertedPrice, loading, error };
}

"use client";

import { useState, useEffect } from "react";

interface DropdownOption {
  id: string;
  label: string;
  value: string;
}

type DropdownOptions = Record<string, DropdownOption[]>;

export function useDropdownOptions() {
  const [options, setOptions] = useState<DropdownOptions>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchOptions() {
      try {
        const res = await fetch("/api/dropdowns?activeOnly=true");
        if (!res.ok) throw new Error("Failed to fetch dropdown options");
        const json = await res.json();
        setOptions(json.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load options");
      } finally {
        setIsLoading(false);
      }
    }

    fetchOptions();
  }, []);

  return { options, isLoading, error };
}

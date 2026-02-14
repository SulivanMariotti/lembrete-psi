// src/features/patient/components/InlineLoading.js
"use client";

import React from "react";
import { Loader2 } from "lucide-react";

/**
 * Estado de carregamento inline (leve)
 * Uso: <InlineLoading label="Carregando agenda..." />
 */
export default function InlineLoading({ label = "Carregando…", className = "" }) {
  return (
    <div className={`flex items-center gap-2 text-sm text-slate-500 ${className}`}>
      <Loader2 size={16} className="animate-spin" />
      <span>{label}</span>
    </div>
  );
}

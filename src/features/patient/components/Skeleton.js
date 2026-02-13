// src/features/patient/components/Skeleton.js
"use client";

import React from "react";

export default function Skeleton({ className = "" }) {
  return <div className={`animate-pulse rounded-xl bg-slate-100 ${className}`} />;
}

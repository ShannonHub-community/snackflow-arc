import React from "react";

export const ALLOWED_WESTERN_ICONS = ["tea", "coffee", "pizza", "burger", "sandwich", "pasta"];

export const StoreLogoIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 2.5z" />
  </svg>
);

export const CoffeeIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className || "w-full h-full"}>
    <path d="M8 10L10 26C10 27.1 10.9 28 12 28H20C21.1 28 22 27.1 22 26L24 10" />
    <path d="M6 10H26" />
    <path d="M8 7H24L26 10H6L8 7Z" />
    <path d="M18 7V2L22 2" />
  </svg>
);

export const PizzaIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className || "w-full h-full"}>
    <path d="M16 3L3 27H29L16 3Z" />
    <circle cx="16" cy="14" r="1.5" fill="currentColor" />
    <circle cx="12" cy="20" r="1.5" fill="currentColor" />
    <circle cx="20" cy="19" r="1.5" fill="currentColor" />
    <path d="M5 23H27" />
  </svg>
);

export const BurgerIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className || "w-full h-full"}>
    <path d="M6 14C6 8 10 4 16 4C22 4 26 8 26 14H6Z" />
    <path d="M5 16C7 15 9 17 11 16C13 15 15 17 17 16C19 15 21 17 23 16C25 15 27 17 29 16" />
    <rect x="5" y="18" width="22" height="4" rx="2" />
    <path d="M6 24H26C26 26 22 28 16 28C10 28 6 26 6 24Z" />
  </svg>
);

export const SandwichIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className || "w-full h-full"}>
    <path d="M4 22L28 12V22L4 22Z" />
    <path d="M4 12L28 4V12L4 12Z" />
    <path d="M4 22L28 22L28 26L4 26Z" />
  </svg>
);

export const PastaIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className || "w-full h-full"}>
    <path d="M4 16C4 22 9 26 16 26C23 26 28 22 28 16" />
    <path d="M2 16H30" />
    <path d="M10 16C10 10 12 6 16 6C20 6 22 10 22 16" />
    <path d="M14 16C14 11 15 8 16 8C17 8 18 11 18 16" />
  </svg>
);

export const IconResolver = ({ type, className }: { type: string; className?: string }) => {
  const lower = (type || "").toLowerCase();
  if (lower.includes("tea") || lower.includes("coffee") || lower.includes("latte") || lower.includes("cup")) {
    return <CoffeeIcon className={className} />;
  }
  if (lower.includes("pizza")) {
    return <PizzaIcon className={className} />;
  }
  if (lower.includes("burger")) {
    return <BurgerIcon className={className} />;
  }
  if (lower.includes("sandwich")) {
    return <SandwichIcon className={className} />;
  }
  if (lower.includes("pasta") || lower.includes("bowl") || lower.includes("salad") || lower.includes("utensils")) {
    return <PastaIcon className={className} />;
  }
  return <BurgerIcon className={className} />;
};

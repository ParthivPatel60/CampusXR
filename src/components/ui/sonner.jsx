"use client"

import { useEffect, useState } from "react";
import { Toaster as Sonner } from "sonner";
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const getTheme = () => {
  if (typeof window === "undefined") return "system";
  const root = document.documentElement;
  if (root.classList.contains("dark")) return "dark";
  if (root.classList.contains("light")) return "light";
  if (window.matchMedia?.("(prefers-color-scheme: dark)")?.matches) return "dark";
  return "system";
};

const Toaster = ({
  ...props
}) => {
  const [theme, setTheme] = useState(getTheme);

  useEffect(() => {
    const handleMediaChange = () => setTheme(getTheme());
    const mediaQuery = window.matchMedia?.("(prefers-color-scheme: dark)") ?? null;
    mediaQuery?.addEventListener?.("change", handleMediaChange);

    const observer = new MutationObserver(() => setTheme(getTheme()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    return () => {
      mediaQuery?.removeEventListener?.("change", handleMediaChange);
      observer.disconnect();
    };
  }, []);

  return (
    <Sonner
      theme={theme}
      className="toaster group"
      icons={{
        success: (
          <CircleCheckIcon className="size-4" />
        ),
        info: (
          <InfoIcon className="size-4" />
        ),
        warning: (
          <TriangleAlertIcon className="size-4" />
        ),
        error: (
          <OctagonXIcon className="size-4" />
        ),
        loading: (
          <Loader2Icon className="size-4 animate-spin" />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)"
        }
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast",
        },
      }}
      {...props} />
  );
}

export { Toaster }

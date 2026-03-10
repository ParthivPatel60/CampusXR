"use client"

import { useEffect, useState } from "react";
import { Toaster as Sonner } from "sonner";
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const Toaster = ({
  ...props
}) => {
  const [theme, setTheme] = useState("system");

  useEffect(() => {
    const root = document.documentElement;

    const getTheme = () => {
      if (root.classList.contains("dark")) return "dark";
      if (root.classList.contains("light")) return "light";
      if (window.matchMedia?.("(prefers-color-scheme: dark)")?.matches) return "dark";
      return "system";
    };

    setTheme(getTheme());

    const mediaQuery = window.matchMedia?.("(prefers-color-scheme: dark)") ?? null;
    const handleMediaChange = () => setTheme(getTheme());

    mediaQuery?.addEventListener?.("change", handleMediaChange);

    const observer = new MutationObserver(() => setTheme(getTheme()));
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });

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

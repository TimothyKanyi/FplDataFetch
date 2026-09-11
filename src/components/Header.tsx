import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";

export const Header = () => {
  const { theme, setTheme } = useTheme();

  return (
    <header className="border-b border-border bg-card">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div>
          {/* Light mode ends on emerald-700 rather than --accent: the accent
              green only reaches ~2.3:1 against white, which fails WCAG AA even
              for large text. emerald-700 is ~5.5:1. Dark mode keeps --accent
              (~8:1 on the dark background). */}
          <h1 className="font-heading text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary to-emerald-700 dark:to-accent bg-clip-text text-transparent">
            FPL Data Fetcher
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Analyze Fantasy Premier League data with ease
          </p>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="rounded-full"
        >
          <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </div>
    </header>
  );
};

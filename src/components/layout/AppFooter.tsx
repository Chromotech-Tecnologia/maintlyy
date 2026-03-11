export function AppFooter({ className = "" }: { className?: string }) {
  return (
    <footer className={`text-center py-4 text-sm text-muted-foreground ${className}`}>
      <div className="flex items-center justify-center gap-1.5 flex-wrap">
        <a
          href="https://maintly.chromotech.com.br"
          target="_blank"
          rel="noopener noreferrer"
          className="font-bold bg-clip-text text-transparent hover:opacity-80 transition-opacity"
          style={{ backgroundImage: "var(--gradient-primary)" }}
        >
          Maintly©
        </a>
        <span className="text-muted-foreground/70">—</span>
        <span className="text-muted-foreground/70">Um produto</span>
        <a
          href="https://chromotech.com.br"
          target="_blank"
          rel="noopener noreferrer"
          className="font-bold bg-clip-text text-transparent hover:opacity-80 transition-opacity"
          style={{ backgroundImage: "var(--gradient-primary)" }}
        >
          Chromotech®
        </a>
      </div>
    </footer>
  )
}

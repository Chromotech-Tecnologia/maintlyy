export function AppFooter({ className = "" }: { className?: string }) {
  return (
    <footer className={`text-center py-4 text-xs text-muted-foreground ${className}`}>
      <a 
        href="https://maintly.chromotech.com.br" 
        target="_blank" 
        rel="noopener noreferrer"
        className="font-semibold text-primary hover:underline"
      >
        Maintly©
      </a>
      {" — Um produto "}
      <a 
        href="https://chromotech.com.br" 
        target="_blank" 
        rel="noopener noreferrer"
        className="font-semibold text-primary hover:underline"
      >
        Chromotech®
      </a>
    </footer>
  )
}

interface DividerProps {
  label: string;
}

export function Divider({ label }: DividerProps) {
  return (
    <div className="flex items-center gap-3 py-1" role="separator">
      <span className="h-px flex-1 bg-border" />
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}

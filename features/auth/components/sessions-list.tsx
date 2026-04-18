type Session = {
  id: string;
  action: string;
  created_at: string;
  meta: Record<string, unknown> | null;
};

export function SessionsList({ sessions }: { sessions: Session[] }) {
  if (sessions.length === 0) {
    return <p className="text-sm text-neutral-600">No hay eventos de sesión recientes.</p>;
  }
  return (
    <ul className="divide-y rounded-md border">
      {sessions.map((s) => (
        <li key={s.id} className="flex items-center justify-between p-3 text-sm">
          <div>
            <p className="font-medium">{s.action}</p>
            <p className="text-xs text-neutral-500">{new Date(s.created_at).toLocaleString()}</p>
          </div>
          {s.meta && Object.keys(s.meta).length > 0 ? (
            <code className="max-w-xs truncate rounded bg-neutral-100 px-2 py-1 text-xs">
              {JSON.stringify(s.meta)}
            </code>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

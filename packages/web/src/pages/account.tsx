import React from "react";
import { useMe } from "../lib/api";
import { useAuth } from "../lib/authClient";

export default function Account() {
  const { getToken, isSignedIn } = useAuth();
  const [token, setToken] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (isSignedIn) getToken().then(setToken);
    else setToken(null);
  }, [isSignedIn, getToken]);

  const { me, error } = useMe(token || undefined);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black tracking-tight">Account</h1>
      </div>

      {!me && !error && <div className="animate-pulse">Loading account details...</div>}
      
      {error && (
        <div className="p-4 rounded-lg bg-destructive/10 text-destructive border border-destructive/20">
          Not signed in or API error.
        </div>
      )}

      {me && (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="p-6 rounded-xl border border-border bg-card shadow-sm">
              <div className="text-sm font-medium text-muted-foreground mb-1">Email</div>
              <div className="font-bold text-lg">{me.email || '—'}</div>
            </div>
            <div className="p-6 rounded-xl border border-border bg-card shadow-sm">
              <div className="text-sm font-medium text-muted-foreground mb-1">Balance</div>
              <div className="font-mono font-bold text-2xl text-primary">${me.balance.toLocaleString()}</div>
            </div>
          </div>

          <div className="p-6 rounded-xl border border-border bg-card shadow-sm space-y-4">
            <h3 className="font-bold text-lg">History</h3>
            <p className="text-sm text-muted-foreground">View your past entries and results.</p>
            <a className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 w-full sm:w-auto" href="/entries">
              View Entry History
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
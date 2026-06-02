import { useCallback, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";
import {
  api,
  type Account,
  type ActivityItem,
  type PendingPost,
  type Platform,
  type SyncHistoryItem,
} from "./api";

const PLATFORM_LABELS: Record<Platform, string> = {
  pinterest: "Pinterest",
  twitter: "X (Twitter)",
  instagram: "Instagram",
  linkedin: "LinkedIn",
  facebook: "Facebook",
};

const EVENT_LABELS: Record<string, string> = {
  user_registered: "Account created",
  user_signed_in: "Signed in",
  account_linked: "Social linked",
  account_unlinked: "Social unlinked",
  watch_enabled: "Monitoring on",
  watch_disabled: "Monitoring off",
  post_detected: "New photo/video",
  post_published: "Cross-posted",
  post_dismissed: "Skipped",
};

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [pending, setPending] = useState<PendingPost[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [history, setHistory] = useState<SyncHistoryItem[]>([]);
  const [supported, setSupported] = useState<Platform[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [destByPending, setDestByPending] = useState<Record<number, number[]>>({});

  const refresh = useCallback(async () => {
    const [accs, pend, act, hist, plats] = await Promise.all([
      api.accounts(),
      api.pending(),
      api.activity(),
      api.history(),
      api.platforms(),
    ]);
    setAccounts(accs);
    setPending(pend);
    setActivity(act);
    setHistory(hist);
    setSupported(plats.supported);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authOk = params.get("auth_success");
    const authErr = params.get("auth_error");
    if (authOk) {
      setToast({ type: "success", msg: `Connected ${authOk} successfully` });
      window.history.replaceState({}, "", "/");
    }
    if (authErr) {
      setToast({ type: "error", msg: decodeURIComponent(authErr) });
      window.history.replaceState({}, "", "/");
    }
  }, []);

  useEffect(() => {
    refresh()
      .catch(() => setToast({ type: "error", msg: "Cannot reach API. Start the backend on port 8000." }))
      .finally(() => setLoading(false));

    const interval = setInterval(() => {
      api.pending().then(setPending).catch(() => {});
    }, 30_000);
    return () => clearInterval(interval);
  }, [refresh]);

  async function connect(platform: Platform) {
    try {
      const { url } = await api.startAuth(platform);
      window.location.href = url;
    } catch (e) {
      setToast({ type: "error", msg: e instanceof Error ? e.message : "OAuth failed" });
    }
  }

  async function toggleWatch(accountId: number, watched: boolean) {
    try {
      await api.setWatched(accountId, watched);
      await refresh();
      setToast({
        type: "success",
        msg: watched
          ? "Monitoring enabled — new photos & videos will appear below"
          : "Monitoring disabled",
      });
    } catch (e) {
      setToast({ type: "error", msg: e instanceof Error ? e.message : "Failed" });
    }
  }

  function toggleDestForPending(pendingId: number, accountId: number) {
    setDestByPending((prev) => {
      const cur = prev[pendingId] ?? [];
      const next = cur.includes(accountId)
        ? cur.filter((x) => x !== accountId)
        : [...cur, accountId];
      return { ...prev, [pendingId]: next };
    });
  }

  async function publishPost(p: PendingPost) {
    const dests = destByPending[p.id] ?? [];
    if (!dests.length) {
      setToast({ type: "error", msg: "Select at least one account to post to" });
      return;
    }
    try {
      const r = await api.publishPending(p.id, dests);
      setToast({
        type: r.errors.length && !r.published ? "error" : "success",
        msg:
          r.published > 0
            ? `Published to ${r.published} account(s)`
            : r.errors.join("; ") || "Done",
      });
      setDestByPending((prev) => {
        const copy = { ...prev };
        delete copy[p.id];
        return copy;
      });
      await refresh();
    } catch (e) {
      setToast({ type: "error", msg: e instanceof Error ? e.message : "Publish failed" });
    }
  }

  async function dismissPost(id: number) {
    await api.dismissPending(id);
    await refresh();
  }

  const destinationOptions = (sourceAccountId: number) =>
    accounts.filter((a) => a.id !== sourceAccountId);

  if (loading) {
    return <p className="empty">Loading…</p>;
  }

  return (
    <>
      <header className="app-header">
        <div>
          <h1>CrossPost Hub</h1>
          <p className="subtitle">
            Signed in as <strong>{user?.name}</strong> · Photos & videos only
          </p>
        </div>
        <button type="button" className="btn btn-ghost" onClick={signOut}>
          Sign out
        </button>
      </header>

      {toast && (
        <div className={`toast ${toast.type}`} role="alert">
          {toast.msg}
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            style={{ float: "right", marginTop: "-2px" }}
            onClick={() => setToast(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      <section>
        <h2>Linked accounts</h2>
        <p className="section-hint">
          Connect social accounts, then enable <strong>Monitor</strong> on accounts where you post.
        </p>
        <div className="connect-grid">
          {(["pinterest", "twitter", "instagram", "linkedin", "facebook"] as Platform[]).map(
            (p) => (
              <button
                key={p}
                type="button"
                className="connect-btn"
                disabled={!supported.includes(p)}
                onClick={() => connect(p)}
              >
                <span className={`platform-badge ${p}`}>+ {PLATFORM_LABELS[p]}</span>
              </button>
            )
          )}
        </div>
        {accounts.length === 0 ? (
          <p className="empty">No accounts linked yet.</p>
        ) : (
          accounts.map((a) => (
            <div key={a.id} className="card">
              <div className="card-row">
                <div>
                  <span className={`platform-badge ${a.platform}`}>
                    @{a.username} · {PLATFORM_LABELS[a.platform]}
                  </span>
                  {a.watched && (
                    <span className="watch-badge">Monitoring photos & videos</span>
                  )}
                </div>
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    className={`btn btn-sm ${a.watched ? "btn-ghost" : "btn-primary"}`}
                    onClick={() => toggleWatch(a.id, !a.watched)}
                  >
                    {a.watched ? "Stop monitoring" : "Monitor"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    onClick={async () => {
                      await api.deleteAccount(a.id);
                      await refresh();
                    }}
                  >
                    Unlink
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </section>

      <section>
        <h2>Ready to cross-post</h2>
        <p className="section-hint">
          When you post a photo or video on a monitored account, choose which other accounts to
          share it to.
        </p>
        {pending.length === 0 ? (
          <p className="empty">No new posts waiting. Post a photo or video on a monitored account.</p>
        ) : (
          pending.map((p) => {
            const dests = destinationOptions(p.source_account_id);
            const selected = destByPending[p.id] ?? [];
            const preview = p.media[0]?.url;
            return (
              <div key={p.id} className="card pending-card">
                <div className="pending-preview">
                  {preview && p.media_type === "image" && (
                    <img src={preview} alt="" className="pending-thumb" />
                  )}
                  <div>
                    <span className={`platform-badge ${p.source_platform}`}>
                      {PLATFORM_LABELS[p.source_platform]} · {p.media_type}
                    </span>
                    <p className="pending-title">{p.title || p.description || "New post"}</p>
                    {p.description && p.title && (
                      <p className="pending-desc">{p.description.slice(0, 120)}</p>
                    )}
                  </div>
                </div>
                <p className="section-hint" style={{ margin: "0.75rem 0 0.5rem" }}>
                  Post to:
                </p>
                <div className="form-row">
                  {dests.length === 0 ? (
                    <span className="empty">Link another account first.</span>
                  ) : (
                    dests.map((a) => (
                      <label
                        key={a.id}
                        className="btn btn-ghost"
                        style={{
                          cursor: "pointer",
                          borderColor: selected.includes(a.id) ? "var(--accent)" : undefined,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selected.includes(a.id)}
                          onChange={() => toggleDestForPending(p.id, a.id)}
                          style={{ marginRight: 6 }}
                        />
                        {PLATFORM_LABELS[a.platform]}
                      </label>
                    ))
                  )}
                </div>
                <div className="form-row" style={{ marginTop: "0.75rem" }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={!dests.length}
                    onClick={() => publishPost(p)}
                  >
                    Cross-post
                  </button>
                  <button type="button" className="btn btn-ghost" onClick={() => dismissPost(p.id)}>
                    Skip
                  </button>
                </div>
              </div>
            );
          })
        )}
      </section>

      <section>
        <h2>Activity</h2>
        {activity.length === 0 ? (
          <p className="empty">Your activity will appear here (links, posts, cross-posts).</p>
        ) : (
          activity.map((a) => (
            <div key={a.id} className="card history-item">
              <span className="activity-type">{EVENT_LABELS[a.event_type] ?? a.event_type}</span>
              <br />
              {a.summary}
              <br />
              <small>{new Date(a.created_at).toLocaleString()}</small>
            </div>
          ))
        )}
      </section>

      <section>
        <h2>Cross-post history</h2>
        {history.length === 0 ? (
          <p className="empty">No cross-posts yet.</p>
        ) : (
          history.map((h) => (
            <div key={h.id} className="card history-item">
              <strong className={`platform-badge ${h.source_platform}`}>
                {h.source_platform}
              </strong>
              {" → "}
              <strong className={`platform-badge ${h.dest_platform}`}>
                {h.dest_platform}
              </strong>
              <span className="media-tag"> · {h.media_type}</span>
              {" · "}
              {h.status === "success" ? "Posted" : `Failed: ${h.error_message}`}
              <br />
              <small>{new Date(h.synced_at).toLocaleString()}</small>
            </div>
          ))
        )}
      </section>
    </>
  );
}

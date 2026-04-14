import { useEffect, useRef, useState } from "react";
import { supabase } from "./supabaseClient";
import {
  getAccessToken,
  getSession,
  signInWithGoogle,
  signOutUser,
  validateUserAccess
} from "./auth";
import googleSignInImage from "./assets/image.png";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:4000/api";

const CRITERIA = [
  { key: "problem_understanding", label: "Problem Understanding" },
  { key: "innovation_creativity", label: "Innovation / Creativity" },
  { key: "technical_implementation", label: "Technical Implementation" },
  { key: "functionality_demo", label: "Functionality / Demo" },
  { key: "impact_usefulness", label: "Impact & Usefulness" },
  { key: "ui_ux_design", label: "UI/UX Design" },
  { key: "feasibility", label: "Feasibility" },
  { key: "presentation_communication", label: "Presentation / Communication" },
  { key: "business_market_potential", label: "Business / Market Potential" },
  { key: "testing_robustness", label: "Testing & Robustness" }
];

const fetchJson = async (url, options = {}) => {
  const token = await getAccessToken();
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "Request failed");
  }
  return data;
};

const App = () => {
  const [isAuthed, setIsAuthed] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [userEmail, setUserEmail] = useState("");
  const [teams, setTeams] = useState([]);
  const [leaderboardByDomain, setLeaderboardByDomain] = useState({});
  const [search, setSearch] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [toastMessage, setToastMessage] = useState("");
  const [scores, setScores] = useState({});
  const [submittedTeams, setSubmittedTeams] = useState({});
  const [expandedTeamId, setExpandedTeamId] = useState(null);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const toastTimerRef = useRef(null);

  const showToast = (text) => {
    if (!text) {
      return;
    }

    setToastMessage(text);
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = setTimeout(() => {
      setToastMessage("");
    }, 5000);
  };

  const loadTeams = async (query = "") => {
    const data = await fetchJson(`${API_BASE}/teams?search=${encodeURIComponent(query)}`);
    setTeams(data.teams || []);
  };

  const loadLeaderboard = async () => {
    const data = await fetchJson(`${API_BASE}/leaderboard`);
    setLeaderboardByDomain(data.leaderboardByDomain || {});
  };

  const loadSubmittedTeams = async () => {
    const data = await fetchJson(`${API_BASE}/scores/teams`);
    const submittedMap = (data.teamIds || []).reduce((acc, teamId) => {
      acc[teamId] = true;
      return acc;
    }, {});
    setSubmittedTeams(submittedMap);
  };

  const handleLogin = async () => {
    setAuthMessage("");
    try {
      await signInWithGoogle();
    } catch (error) {
      setAuthMessage(error.message || "Failed to start Google sign-in.");
    }
  };

  const handleScoreChange = (teamId, field, value) => {
    setScores((prev) => ({
      ...prev,
      [teamId]: {
        ...prev[teamId],
        [field]: value
      }
    }));
  };

  const submitScore = async (teamId) => {
    if (submittedTeams[teamId]) {
      showToast("Cannot be re-submitted.");
      return;
    }
    setToastMessage("");
    const teamScores = scores[teamId] || {};
    const payloadScores = CRITERIA.reduce((acc, item) => {
      acc[item.key] = teamScores[item.key] ?? 0;
      return acc;
    }, {});

    try {
      await fetchJson(`${API_BASE}/scores`, {
        method: "POST",
        body: JSON.stringify({ teamId, scores: payloadScores })
      });

      await loadLeaderboard();
      showToast("Score saved.");
      setSubmittedTeams((prev) => ({ ...prev, [teamId]: true }));
    } catch (error) {
      if (error.message && error.message.includes("Score exists")) {
        setSubmittedTeams((prev) => ({ ...prev, [teamId]: true }));
        return;
      }
      showToast(error.message);
    }
  };


  const handleLogout = async () => {
    try {
      await signOutUser();
    } catch (error) {
      setAuthMessage(error.message || "Failed to sign out.");
    }
    setIsAuthed(false);
    setUserEmail("");
    setTeams([]);
    setLeaderboardByDomain({});
    setSearch("");
    setScores({});
    setSubmittedTeams({});
    setToastMessage("");
    setExpandedTeamId(null);
    setShowLeaderboard(false);
  };

  const handleLeaderboardToggle = async () => {
    if (!showLeaderboard) {
      await loadLeaderboard();
    }
    setShowLeaderboard((prev) => !prev);
  };

  const handleSession = async (session) => {
    if (!session?.user) {
      setIsAuthed(false);
      setUserEmail("");
      return;
    }

    const email = session.user.email || "";
    try {
      const allowed = await validateUserAccess(email);
      if (!allowed) {
        await signOutUser();
        setAuthMessage("You are not authorized as a jury member.");
        setIsAuthed(false);
        setUserEmail("");
        return;
      }

      setAuthMessage("");
      setIsAuthed(true);
      setUserEmail(email);
      await loadTeams();
      await loadLeaderboard();
      await loadSubmittedTeams();
    } catch (error) {
      setAuthMessage(error.message || "Failed to validate access.");
      setIsAuthed(false);
      setUserEmail("");
    }
  };

  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      setIsAuthLoading(true);
      try {
        const session = await getSession();
        if (isMounted) {
          await handleSession(session);
        }
      } catch (error) {
        if (isMounted) {
          setAuthMessage(error.message || "Authentication error.");
        }
      } finally {
        if (isMounted) {
          setIsAuthLoading(false);
        }
      }
    };

    initAuth();

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      handleSession(session).catch(() => {});
    });

    return () => {
      isMounted = false;
      data.subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!isAuthed) {
      return;
    }
    loadTeams(search).catch(() => {});
  }, [isAuthed, search]);

  useEffect(() => () => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
  }, []);

  if (!isAuthed) {
    return (
      <div className="page page-auth">
        <div className="card">
          <h1>Krithoathon - Jury Console</h1>
          <p>Sign in with Google to continue.</p>
          <button
            type="button"
            className="google-image-button"
            onClick={handleLogin}
            disabled={isAuthLoading}
          >
            <img
              src={googleSignInImage}
              alt={isAuthLoading ? "Checking..." : "Continue with Google"}
            />
          </button>
          {authMessage && <div className="message">{authMessage}</div>}
        </div>
        <a
          className="back-home"
          href="https://krithoathon-4-0.netlify.app/"
        >
          &larr; Back to Home
        </a>
      </div>
    );
  }

  return (
    <div className="page">
      <header className="header">
        <h1>Krithoathon - Jury Console</h1>
        <div className="actions">
          <span className="user-email">{userEmail}</span>
          <button type="button" onClick={handleLeaderboardToggle}>
            {showLeaderboard ? "Hide leaderboard" : "Leaderboard"}
          </button>
          <button type="button" className="logout" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      {toastMessage && <div className="toast">{toastMessage}</div>}

      <section className="panel">
        <div className="panel-header">
          <h2>Teams</h2>
          <div className="panel-tools">
            <input
              type="search"
              placeholder="Search teams"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </div>
        <div className="team-list">
          {teams.length === 0 && <div className="empty">No teams found.</div>}
          {(() => {
            const grouped = teams.reduce((acc, team) => {
              const domain = team.domain;
              if (!domain) {
                return acc;
              }
              if (!acc[domain]) {
                acc[domain] = [];
              }
              acc[domain].push(team);
              return acc;
            }, {});
            const domainOrder = ["Health", "Agriculture", "AI"];
            const orderedDomains = [
              ...domainOrder,
              ...Object.keys(grouped).filter((key) => !domainOrder.includes(key))
            ];

            return orderedDomains
              .filter((domain) => grouped[domain]?.length)
              .map((domain) => (
                <div key={domain} className="domain-section">
                  <div className="domain-title">{domain}</div>
                  {grouped[domain].map((team) => (
                    <div key={team.id} className="team-card">
                      <div className="team-info">
                        <h3 className="team-name">
                          <span>{team.name}</span>
                          {submittedTeams[team.id] && (
                            <span className="team-check" aria-label="scored">
                              {"\u2713"}
                            </span>
                          )}
                        </h3>
                      </div>
                      <div className="team-actions">
                        <button
                          type="button"
                          className="link-button"
                          onClick={() =>
                            setExpandedTeamId((prev) =>
                              prev === team.id ? null : team.id
                            )
                          }
                        >
                          {expandedTeamId === team.id ? "Hide criteria" : "Score team"}
                        </button>
                      </div>
                      {expandedTeamId === team.id && (
                        <div className="criteria-grid">
                          {CRITERIA.map((item) => (
                            <label key={item.key} className="criteria-item">
                              {item.label}
                              <input
                                type="number"
                                min="0"
                                max="10"
                                step="1"
                                value={scores[team.id]?.[item.key] ?? ""}
                                onChange={(event) =>
                                  handleScoreChange(team.id, item.key, event.target.value)
                                }
                                placeholder="0-10"
                              />
                            </label>
                          ))}
                          <div className="criteria-actions">
                            <button type="button" onClick={() => submitScore(team.id)}>
                              {submittedTeams[team.id] ? "Submitted" : "Submit"}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ));
          })()}
        </div>
      </section>

      {showLeaderboard && (
        <section className="panel">
          <h2>Leaderboard</h2>
          {(() => {
            const domainOrder = ["Health", "Agriculture", "AI"];
            const domains = [
              ...domainOrder,
              ...Object.keys(leaderboardByDomain).filter(
                (key) => !domainOrder.includes(key)
              )
            ];
            const hasRows = domains.some((domain) => leaderboardByDomain[domain]?.length);

            if (!hasRows) {
              return <div className="empty">No scores yet.</div>;
            }

            return domains
              .filter((domain) => leaderboardByDomain[domain]?.length)
              .map((domain) => (
                <div key={domain} className="leaderboard-domain">
                  <div className="domain-title">{domain}</div>
                  <div className="leaderboard">
                    {leaderboardByDomain[domain].map((row, index) => (
                      <div key={row.team_id} className="leaderboard-row">
                        <span className="rank">#{index + 1}</span>
                        <span className="team-name">{row.team_name}</span>
                        <span className="score">{row.total_score ?? 0}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ));
          })()}
        </section>
      )}

    </div>
  );
};

export default App;

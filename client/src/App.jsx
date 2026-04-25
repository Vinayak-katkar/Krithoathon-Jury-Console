// src/App.jsx

import { useEffect, useRef, useState } from "react";
import { supabase } from "./supabaseClient";
import {
  getAccessToken,
  getSession,
  signInWithGoogle,
  signOutUser,
  validateUserAccess,
  fetchJson
} from "./auth";
import TeamDetail from "./TeamDetail"; 
import googleButtonImage from "./assets/image.png";

const styles = `
.page { font-family: sans-serif; min-height: 100vh; background-color: #f4f7f6; color: #333; }
.page-auth {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background:
    radial-gradient(circle at 25% 18%, rgba(139, 19, 19, 0.6), transparent 45%),
    radial-gradient(circle at 74% 30%, rgba(93, 18, 9, 0.55), transparent 42%),
    linear-gradient(160deg, #5a0707 0%, #2a0707 48%, #120a14 100%);
  padding: 28px;
}
.auth-card {
  width: min(760px, 94%);
  background: #f3f3f3;
  border-radius: 34px;
  padding: 44px 44px;
  text-align: center;
  box-shadow: 0 20px 45px rgba(0, 0, 0, 0.3);
}
.auth-title {
  margin: 0 0 20px;
  font-size: clamp(1.8rem, 3.2vw, 3rem);
  font-weight: 800;
  letter-spacing: 0.3px;
  color: #181a1f;
}
.auth-subtitle {
  margin: 0 0 22px;
  font-size: clamp(1rem, 1.5vw, 1.6rem);
  color: #1d1f24;
}
.google-login-button {
  width: min(560px, 100%);
  border: none;
  background: transparent;
  border-radius: 20px;
  cursor: pointer;
  padding: 0;
  margin: 0 auto;
}
.google-login-button img {
  width: 100%;
  display: block;
  border-radius: 20px;
}
.google-login-button:hover {
  transform: translateY(-1px);
}
.auth-error {
  margin-top: 14px;
  display: inline-block;
  background: #f44336;
  color: #fff;
  padding: 10px 14px;
  border-radius: 8px;
  font-weight: 600;
}
.back-home {
  margin-top: 24px;
  font-size: clamp(1rem, 1.2vw, 1.2rem);
  text-decoration: none;
  color: #fff;
  font-weight: 700;
  padding: 11px 30px;
  border-radius: 999px;
  border: 2px solid rgba(255, 255, 255, 0.85);
  box-shadow: 0 0 0 1px rgba(255, 120, 54, 0.6), 0 0 28px rgba(255, 94, 40, 0.45);
  background: rgba(24, 9, 17, 0.6);
}
.back-home:hover {
  background: rgba(38, 17, 29, 0.82);
}
.header { display: flex; justify-content: space-between; align-items: center; padding: 20px 40px; border-bottom: 1px solid #e0e0e0; background: #2c1a12; }
.header h1 { margin: 0; font-size: 1.5rem; color: #fff; font-weight: bold; }
.actions { display: flex; gap: 15px; align-items: center; }
.user-email { font-size: 0.9rem; color: #ccc; }
.actions button { padding: 8px 15px; border: 1px solid #ccc; background: #fff; border-radius: 4px; cursor: pointer; color: #333; font-weight: 500; transition: all 0.2s; }
.actions button:hover { background: #eee; }
.actions button.logout { background: #f44336; color: white; border: none; }
.actions button.logout:hover { background: #d32f2f; }
.main-content { padding: 40px; }
.panel { border: 1px solid #e0e0e0; border-radius: 8px; padding: 30px; background: #fff; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
.panel-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; border-bottom: 1px solid #f0f0f0; padding-bottom: 15px; }
.panel-header h2 { margin: 0; font-size: 1.3rem; font-weight: 600; color: #444; }
.panel-tools input { padding: 10px 15px; border: 1px solid #ccc; border-radius: 6px; font-size: 0.9rem; width: 250px; }
.team-list { display: flex; flex-direction: column; gap: 20px; }
.domain-section { margin-bottom: 30px; }
.domain-title { font-weight: 700; font-size: 1.1rem; color: #2c1a12; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 15px; border-bottom: 2px solid #2c1a12; padding-bottom: 8px; }
.team-card { border: 1px solid #eee; border-radius: 6px; padding: 20px; background: #fff; display: grid; grid-template-columns: 1fr auto; gap: 15px; align-items: start; transition: border-color 0.2s, box-shadow 0.2s; }
.team-card:hover { border-color: #ddd; box-shadow: 0 4px 8px rgba(0,0,0,0.03); }
.team-info { display: flex; flex-direction: column; gap: 8px; }
.team-name { margin: 0; font-size: 1.3rem; font-weight: 600; display: flex; align-items: center; gap: 12px; }
.team-round-status { display: flex; gap: 8px; }
.team-round-pill { font-size: 0.75rem; padding: 3px 8px; border-radius: 12px; background: #eee; color: #666; font-weight: 500; text-transform: uppercase; }
.team-round-pill-submitted { background: #4caf50; color: white; }
.team-actions { text-align: right; }
.link-button { background: none; border: none; color: #2196f3; cursor: pointer; text-decoration: none; padding: 0; font-size: 0.9rem; font-weight: 500; border-bottom: 1px solid transparent; }
.link-button:hover { border-bottom-color: #2196f3; }
.criteria-grid { grid-column: 1 / -1; display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; border-top: 1px solid #f0f0f0; padding-top: 20px; margin-top: 10px; }
.criteria-rounds { grid-column: 1 / -1; display: flex; items-center: center; gap: 15px; flex-wrap: wrap; margin-bottom: 15px; padding: 15px; background: #f8f8f8; border-radius: 6px; border: 1px solid #eee; }
.criteria-rounds-label { font-size: 0.95rem; color: #555; font-weight: 600; }
.round-toggle { display: flex; gap: 8px; }
.round-toggle-button { padding: 6px 12px; border: 1px solid #ccc; background: #fff; border-radius: 4px; cursor: pointer; font-size: 0.9rem; font-weight: 500; transition: all 0.2s; }
.round-toggle-button:hover { background: #eee; }
.round-toggle-button-active { background: #2196f3; color: white; border-color: #2196f3; }
.round-submitted-note { font-size: 0.85rem; color: #4caf50; font-weight: bold; }
.round-blocked-note { font-size: 0.85rem; color: #f44336; font-weight: bold; }
.criteria-item { display: flex; flex-direction: column; gap: 7px; font-size: 0.95rem; color: #555; font-weight: 500; }
.criteria-item input, .criteria-item textarea { padding: 10px; border: 1px solid #ccc; border-radius: 6px; font-family: inherit; font-size: 0.95rem; }
.criteria-item input:disabled, .criteria-item textarea:disabled { background-color: #f5f5f5; color: #999; cursor: not-allowed; border-color: #e0e0e0; }
.criteria-review { grid-column: 1 / -1; }
.criteria-actions { grid-column: 1 / -1; text-align: right; margin-top: 15px; }
.criteria-actions button { padding: 12px 24px; background: #4caf50; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 1rem; transition: background 0.2s; }
.criteria-actions button:hover { background: #43a047; }
.criteria-actions button:disabled { background: #ccc; cursor: not-allowed; }
.leaderboard-domain { margin-bottom: 35px; }
.leaderboard { display: flex; flex-direction: column; gap: 10px; }
.leaderboard-row { display: grid; grid-template-columns: 60px 1fr 100px; gap: 15px; padding: 15px 20px; border: 1px solid #eee; border-radius: 6px; background: white; align-items: center; transition: background 0.2s; }
.leaderboard-row:hover { background: #fafafa; }
.leaderboard-row .rank { font-weight: bold; color: #999; text-align: center; font-size: 1.1rem; }
.leaderboard-row .team-name { font-weight: 600; font-size: 1.1rem; }
.leaderboard-row .team-name-link { color: inherit; text-decoration: none; border-bottom: 1px solid transparent; transition: color 0.2s, border-color 0.2s; }
.leaderboard-row .team-name-link:hover { color: #2196f3; border-bottom-color: #2196f3; }
.leaderboard-row .score { text-align: right; font-weight: bold; color: #2196f3; font-size: 1.2rem; }
.toast-container { position: fixed; bottom: 30px; right: 30px; display: flex; flex-direction: column; gap: 10px; z-index: 1000; }
.toast { background: #333; color: white; padding: 12px 24px; border-radius: 6px; box-shadow: 0 4px 8px rgba(0,0,0,0.2); font-size: 0.95rem; font-weight: 500; max-width: 400px; animation: slideIn 0.3s ease-out, fadeOut 0.5s ease-in 4.5s forwards; }
@keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
@keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }
.teams-loading, .empty { text-align: center; color: #999; padding: 40px; font-size: 1.1rem; font-weight: 500; }
.team-skeleton-group { margin-bottom: 20px; }
.team-skeleton-domain { height: 24px; width: 120px; background: #eee; margin-bottom: 12px; border-radius: 4px; }
.team-skeleton-card { border: 1px solid #eee; border-radius: 6px; padding: 20px; background: white; margin-bottom: 12px; }
.team-skeleton-line { height: 18px; background: #eee; border-radius: 4px; margin-bottom: 10px; }
.team-skeleton-line-title { width: 60%; }
.team-skeleton-line-action { width: 30%; margin-left: auto; }
@media (max-width: 1024px) {
  .main-content { padding: 28px; }
  .panel { padding: 24px; }
  .header { padding: 16px 22px; }
  .header h1 { font-size: 1.25rem; }
  .user-email { max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .panel-header { gap: 12px; align-items: flex-start; }
  .panel-tools { width: 100%; }
  .panel-tools input { width: 100%; max-width: 100%; }
  .criteria-grid { grid-template-columns: 1fr; }
}
@media (max-width: 768px) {
  .main-content { padding: 16px; }
  .panel { padding: 16px; border-radius: 10px; }
  .header { flex-direction: column; align-items: flex-start; gap: 12px; }
  .actions { width: 100%; flex-wrap: wrap; gap: 10px; }
  .actions button { padding: 8px 12px; }
  .panel-header { flex-direction: column; margin-bottom: 16px; }
  .domain-title { font-size: 1rem; margin-bottom: 10px; }
  .team-card { grid-template-columns: 1fr auto; padding: 14px; }
  .team-actions { text-align: right; align-self: start; }
  .team-info { min-width: 0; }
  .team-name { font-size: 1.08rem; flex-direction: row; align-items: center; gap: 8px; flex-wrap: wrap; }
  .criteria-rounds { gap: 10px; padding: 12px; }
  .round-toggle { flex-wrap: wrap; }
  .criteria-actions { text-align: left; }
  .criteria-actions button { width: 100%; }
  .leaderboard-row {
    grid-template-columns: 40px 1fr;
    grid-template-areas:
      "rank name"
      "rank score";
    gap: 6px 12px;
    padding: 12px;
  }
  .leaderboard-row .rank { grid-area: rank; font-size: 0.95rem; }
  .leaderboard-row .team-name { grid-area: name; font-size: 1rem; }
  .leaderboard-row .score { grid-area: score; text-align: left; font-size: 1rem; }
  .toast-container { right: 12px; left: 12px; bottom: 12px; }
  .toast { max-width: 100%; }
}
@media (max-width: 480px) {
  .page-auth { padding: 14px; }
  .auth-card { width: 100%; }
  .auth-title { letter-spacing: 0; }
  .back-home { width: 100%; text-align: center; }
  .panel-tools input { font-size: 0.95rem; }
  .team-card { grid-template-columns: 1fr auto; }
  .team-name { font-size: 1rem; }
}
@media (max-width: 760px) {
  .auth-card {
    padding: 30px 20px;
    border-radius: 24px;
  }
  .back-home {
    padding: 12px 28px;
  }
}
`;

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:4000/api";

// === ACTIVATE LIVE DATABASE: SET TO FALSE ===
const ENABLE_LOADING_PREVIEW = false; 

// === ENSURE CONSTANTS ARE RE-ADDED ===
const ROUNDS = [1];

const CRITERIA = [
  { key: "problem_understanding", label: "Problem Understanding" },
  { key: "innovation_creativity", label: "Novelty" },
  { key: "technical_implementation", label: "Feasibility" },
  { key: "functionality_demo", label: "Practicability of Idea" },
  { key: "impact_usefulness", label: "Sustainability" },
  { key: "ui_ux_design", label: "Rate of scale of impact" },
  { key: "feasibility", label: "User Experience and Potential for future work" }
];

const getRouteFromPath = (path) => {
    if (path === "/leaderboard") return "/leaderboard";
    if (path.startsWith("/team/")) return path;
    return "/"; // Default to Teams console
};
const createEmptyRoundMap = () =>
  ROUNDS.reduce((acc, roundNumber) => {
    acc[roundNumber] = {};
    return acc;
  }, {});
const normalizeScoreInput = (value) => {
  if (value === "") {
    return "";
  }

  const numericValue = Number(value);
  if (Number.isNaN(numericValue)) {
    return null;
  }

  return String(Math.min(10, Math.max(0, numericValue)));
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
  const [isTeamsLoading, setIsTeamsLoading] = useState(false);
  const [scores, setScores] = useState({});
  const [submittedTeams, setSubmittedTeams] = useState(createEmptyRoundMap);
  const [expandedTeamId, setExpandedTeamId] = useState(null);
  const [selectedRounds, setSelectedRounds] = useState({});
  const [route, setRoute] = useState(() => getRouteFromPath(window.location.pathname));
  const toastTimerRef = useRef(null);
  const latestTeamsRequestRef = useRef(0);

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
    const requestId = latestTeamsRequestRef.current + 1;
    latestTeamsRequestRef.current = requestId;
    setIsTeamsLoading(true);

    try {
      const data = await fetchJson(`${API_BASE}/teams?search=${encodeURIComponent(query)}`);
      if (latestTeamsRequestRef.current === requestId) {
        setTeams(data.teams || []);
      }
    } finally {
      if (latestTeamsRequestRef.current === requestId) {
        setIsTeamsLoading(false);
      }
    }
  };

  const loadLeaderboard = async () => {
    const data = await fetchJson(`${API_BASE}/leaderboard`);
    setLeaderboardByDomain(data.leaderboardByDomain || {});
  };

  const loadSubmittedTeams = async () => {
    const roundEntries = await Promise.all(
      ROUNDS.map(async (roundNumber) => {
        const data = await fetchJson(`${API_BASE}/scores/teams?roundNumber=${roundNumber}`);
        const submittedMap = (data.teamIds || []).reduce((acc, teamId) => {
          acc[teamId] = true;
          return acc;
        }, {});
        return [roundNumber, submittedMap];
      })
    );

    setSubmittedTeams(
      roundEntries.reduce((acc, [roundNumber, submittedMap]) => {
        acc[roundNumber] = submittedMap;
        return acc;
      }, createEmptyRoundMap())
    );
  };

  const handleLogin = async () => {
    setAuthMessage("");
    try {
      await signInWithGoogle();
    } catch (error) {
      setAuthMessage(error.message || "Failed to start Google sign-in.");
    }
  };

  const handleScoreChange = (teamId, roundNumber, field, value) => {
    const normalizedValue =
      field === "review" ? value : normalizeScoreInput(value);

    if (normalizedValue === null) {
      return;
    }

    setScores((prev) => ({
      ...prev,
      [teamId]: {
        ...prev[teamId],
        [roundNumber]: {
          ...(prev[teamId]?.[roundNumber] || {}),
          ...(field === "review"
            ? { review: normalizedValue }
            : {
                scores: {
                  ...(prev[teamId]?.[roundNumber]?.scores || {}),
                  [field]: normalizedValue
                }
              })
        }
      }
    }));
  };

  const submitScore = async (teamId, roundNumber) => {
    if (submittedTeams[roundNumber]?.[teamId]) {
      showToast(`Round ${roundNumber} cannot be re-submitted.`);
      return;
    }

    if (roundNumber > 1 && !submittedTeams[roundNumber - 1]?.[teamId]) {
      showToast(`Complete Round ${roundNumber - 1} before submitting Round ${roundNumber}.`);
      return;
    }

    setToastMessage("");
    const teamScores = scores[teamId]?.[roundNumber] || {};
    const review = String(teamScores.review || "").trim();
    const payloadScores = {};

    for (const item of CRITERIA) {
      const rawValue = teamScores.scores?.[item.key] ?? 0;
      const numericValue = Number(rawValue);

      if (Number.isNaN(numericValue) || numericValue < 0 || numericValue > 10) {
        showToast(`${item.label} must be between 0 and 10.`);
        return;
      }

      payloadScores[item.key] = numericValue;
    }

    try {
      await fetchJson(`${API_BASE}/scores`, {
        method: "POST", // Now it is correctly set to the string "POST"
        body: JSON.stringify({ teamId, roundNumber, scores: payloadScores, review })
      });

      await loadLeaderboard();
      showToast("Score saved.");
      setSubmittedTeams((prev) => ({
        ...prev,
        [roundNumber]: {
          ...prev[roundNumber],
          [teamId]: true
        }
      }));
    } catch (error) {
      if (error.message && error.message.includes("Score exists")) {
        setSubmittedTeams((prev) => ({
          ...prev,
          [roundNumber]: {
            ...prev[roundNumber],
            [teamId]: true
          }
        }));
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
    setSubmittedTeams(createEmptyRoundMap());
    setToastMessage("");
    setExpandedTeamId(null);
    setSelectedRounds({});
  };

  const navigateTo = async (nextPath) => {
    const normalizedPath = getRouteFromPath(nextPath);
    if (normalizedPath === route) {
      return;
    }

    if (normalizedPath === "/leaderboard" && !Object.keys(leaderboardByDomain).length) {
      await loadLeaderboard();
    }

    window.history.pushState({}, "", normalizedPath);
    setRoute(normalizedPath);
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

    const handlePopState = () => {
      setRoute(getRouteFromPath(window.location.pathname));
    };

    window.addEventListener("popstate", handlePopState);

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      handleSession(session).catch(() => {});
    });

    return () => {
      isMounted = false;
      window.removeEventListener("popstate", handlePopState);
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

  useEffect(() => {
    if (route !== "/leaderboard") {
      return;
    }

    if (!isAuthed) {
      return;
    }

    if (Object.keys(leaderboardByDomain).length) {
      return;
    }

    loadLeaderboard().catch(() => {});
  }, [route, isAuthed, leaderboardByDomain]);

  useEffect(() => {
    const loadExistingScores = async () => {
      if (!expandedTeamId || ENABLE_LOADING_PREVIEW) return;

      try {
        const data = await fetchJson(`${API_BASE}/scores/${expandedTeamId}`);
        if (data) {
          setScores((prev) => ({
            ...prev,
            [expandedTeamId]: data
          }));
        }
      } catch (error) {
        console.error("Could not fetch existing scores:", error);
      }
    };

    loadExistingScores();
  }, [expandedTeamId]); // Runs whenever you open/switch teams

  const getSelectedRound = (teamId) => selectedRounds[teamId] || 1;
  const canSubmitRound = (teamId, roundNumber) =>
    roundNumber === 1 || Boolean(submittedTeams[roundNumber - 1]?.[teamId]);

  if (!isAuthed) {
    return (
      <div className="page page-auth">
        <style>{styles}</style>
        <div className="auth-card">
          <h1 className="auth-title">Krithoathon - Jury Console</h1>
          <p className="auth-subtitle">Sign in with Google to continue.</p>
          <button
            type="button"
            className="google-login-button"
            onClick={handleLogin}
            aria-label="Continue with Google"
          >
            <img src={googleButtonImage} alt="Continue with Google" />
          </button>
          {authMessage && <div className="auth-error">{authMessage}</div>}
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

  if (route.startsWith("/team/")) {
      return <TeamDetail />;
  }

  return (
    <div className="page">
      <style>{styles}</style>
      <header className="header">
        <h1>Krithoathon - Jury Console</h1>
        <div className="actions">
          <span className="user-email">{userEmail}</span>
          <button
            type="button"
            onClick={() => navigateTo(route === "/" ? "/leaderboard" : "/")}
          >
            {route === "/" ? "Leaderboard" : "Teams"}
          </button>
          <button type="button" className="logout" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      {toastMessage && (
        <div className="toast-container">
          <div className="toast">{toastMessage}</div>
        </div>
      )}

      <main className="main-content">
        {route === "/" && (
          <section className="panel">
            <div className="panel-header">
              <h2>Teams Console</h2>
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
              {isTeamsLoading && (
                <div className="teams-loading" aria-live="polite" aria-busy="true">
                  <div className="team-skeleton-groups" aria-hidden="true">
                    {[" ", " ", " "].map((domain) => (
                      <div key={domain} className="team-skeleton-group">
                        <div className="team-skeleton-domain">{domain}</div>
                        {[0, 1].map((item) => (
                        <div key={`${domain}-${item}`} className="team-skeleton-card">
                          <div className="team-skeleton-line team-skeleton-line-title" />
                          <div className="team-skeleton-line team-skeleton-line-action" />
                        </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {!isTeamsLoading && teams.length === 0 && <div className="empty">No teams found.</div>}
              {!isTeamsLoading &&
                (() => {
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
                        {grouped[domain].map((team) => {
                          const currentRound = getSelectedRound(team.id);
                          const isRoundSubmitted = Boolean(submittedTeams[currentRound]?.[team.id]);
                          
                          return (
                            <div key={team.id} className="team-card">
                              <div className="team-info">
                                <h3 className="team-name">
                                  <span>{team.name}</span>
                                  <span className="team-round-status">
                                    {ROUNDS.map((roundNumber) => (
                                      <span
                                        key={roundNumber}
                                        className={`team-round-pill ${
                                          submittedTeams[roundNumber]?.[team.id]
                                            ? "team-round-pill-submitted"
                                            : ""
                                      }`}
                                    >
                                      Marked
                                    </span>
                                  ))}
                                </span>
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
                                <div className="criteria-rounds">
                                  <span className="criteria-rounds-label">Evaluation status</span>
                                  <div className="round-toggle" role="tablist" aria-label="Evaluation status">
                                    
                                  </div>
                                  {isRoundSubmitted && (
                                    <span className="round-submitted-note">
                                       Already Submitted 
                                    </span>
                                 )}
                                  {!isRoundSubmitted && !canSubmitRound(team.id, currentRound) && (
                                    <span className="round-blocked-note">
                                      Submit Round {currentRound - 1} first
                                    </span>
                                  )}
                                </div>
                                {CRITERIA.map((item) => (
                                  <label key={item.key} className={`criteria-item ${isRoundSubmitted ? "disabled" : ""}`}>
                                    {item.label}
                                    <input
                                      type="text"
                                      inputMode="numeric"
                                      placeholder="0-10"
                                      value={
                                      scores[team.id]?.[currentRound]?.scores?.[item.key] ?? ""
                                    }
                                    onChange={(event) => {
                                      let val = event.target.value;

                                      // Allow only digits
                                      if (!/^\d*$/.test(val)) return;

                                      // Enforce 0–10 range
                                      if (val !== "") {
                                        const num = Number(val);
                                        if (num < 0 || num > 10) return;
                                      }

                                      handleScoreChange(team.id, currentRound, item.key, val);
                                    }}
                                    disabled={isRoundSubmitted}
 
                                    />
                                 </label>
                                ))}
                                <label className={`criteria-item criteria-review ${isRoundSubmitted ? "disabled" : ""}`}>
                                  Jury review
                                  <textarea
                                    rows="4"
                                    value={scores[team.id]?.[currentRound]?.review ?? ""}
                                    onChange={(event) =>
                                      handleScoreChange(
                                        team.id,
                                        currentRound,
                                        "review",
                                        event.target.value
                                      )
                                    }
                                    placeholder="Add feedback on presentation, execution, and strengths."
                                    disabled={isRoundSubmitted}
                                  />
                                </label>
                                <div className="criteria-actions">
                                  <button
                                    type="button"
                                    disabled={isRoundSubmitted || !canSubmitRound(team.id, currentRound)}
                                    onClick={() => submitScore(team.id, currentRound)}
                                  >
                                    {isRoundSubmitted
                                      ? `Submitted`
                                      : `Submit`}
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ));
              })()}
            </div>
          </section>
        )}

        {route === "/leaderboard" && (
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
                          <span className="team-name">
                              {/* FIX: Link to Team Details */}
                              <a href={`/team/${row.team_id}`} className="team-name-link" onClick={(e) => { e.preventDefault(); navigateTo(`/team/${row.team_id}`); }}>
                                {row.team_name}
                              </a>
                          </span>
                          <span className="score">{row.total_score ?? 0}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ));
            })()}
          </section>
        )}
      </main>
    </div>
  );
};

export default App;

// src/TeamDetail.jsx
import { useEffect, useState } from "react";
import { fetchJson } from "./auth";

const styles = `
.page { font-family: sans-serif; min-height: 100vh; background-color: #f4f7f6; color: #333; }
.header { display: flex; justify-content: space-between; align-items: center; padding: 20px 40px; border-bottom: 1px solid #e0e0e0; background: #2c1a12; }
.header h1 { margin: 0; font-size: 1.5rem; color: #fff; font-weight: bold; }
.main-content { padding: 40px; }
.panel { border: 1px solid #e0e0e0; border-radius: 8px; padding: 30px; background: #fff; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
.panel-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; border-bottom: 1px solid #f0f0f0; padding-bottom: 15px; }
.panel-header h2 { margin: 0; font-size: 1.3rem; font-weight: 600; color: #444; }
.back-link { text-decoration: none; color: #2196f3; font-weight: 500; }
.team-meta { margin-bottom: 20px; color: #666; font-size: 1.1rem;}
.round-scores { margin-top: 30px; }
.round-score-card { border: 1px solid #eee; border-radius: 6px; padding: 20px; background: white; margin-bottom: 20px;}
.round-title { font-size: 1.3rem; font-weight: 700; color: #2c1a12; margin-bottom: 15px; }
.criteria-item { display: grid; grid-template-columns: 1fr auto; gap: 10px; align-items: center; font-size: 0.95rem; color: #555; padding: 8px 0; border-bottom: 1px solid #f9f9f9;}
.score-value { font-weight: bold; color: #2196f3; font-size: 1.1rem;}
.total-score { display: grid; grid-template-columns: 1fr auto; gap: 10px; align-items: center; margin-top: 14px; padding-top: 12px; border-top: 2px solid #eee; font-size: 1rem; font-weight: 700; color: #2c1a12; }
.review-box { margin-top: 20px; padding: 15px; background: #f9f9f9; border-radius: 4px; border: 1px solid #eee; font-style: italic; color: #444; white-space: pre-wrap;}
.detail-loading-shell { display: flex; flex-direction: column; gap: 18px; }
.skeleton-line {
  height: 16px;
  border-radius: 8px;
  background: linear-gradient(90deg, #ececec 25%, #f5f5f5 50%, #ececec 75%);
  background-size: 200% 100%;
  animation: shimmer 1.15s infinite;
}
.skeleton-title { height: 34px; width: min(320px, 85%); }
.skeleton-subtitle { width: min(220px, 60%); }
.skeleton-card {
  border: 1px solid #eee;
  border-radius: 10px;
  padding: 16px;
  background: #fff;
}
.skeleton-row { margin-top: 10px; }
@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
@media (max-width: 900px) {
  .main-content { padding: 24px; }
  .panel { padding: 20px; }
  .header { padding: 16px 20px; }
  .header h1 { font-size: 1.2rem; }
}
@media (max-width: 640px) {
  .main-content { padding: 14px; }
  .panel { padding: 14px; border-radius: 10px; }
  .panel-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
    margin-bottom: 14px;
    padding-bottom: 12px;
  }
  .panel-header h2 { font-size: 1.05rem; word-break: break-word; }
  .team-meta { font-size: 0.95rem; margin-bottom: 12px; }
  .round-score-card { padding: 14px; margin-bottom: 14px; }
  .round-title { font-size: 1.05rem; margin-bottom: 10px; }
  .criteria-item {
    grid-template-columns: 1fr;
    gap: 4px;
    align-items: flex-start;
    font-size: 0.92rem;
  }
  .score-value { font-size: 0.98rem; }
  .total-score {
    grid-template-columns: 1fr;
    gap: 5px;
    font-size: 0.95rem;
  }
  .review-box { padding: 12px; font-size: 0.92rem; }
}
`;

// Reuse base URL and constants from existing setup
const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:4000/api";
const ROUNDS = [1];
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

const TeamDetail = () => {
  const [teamData, setTeamData] = useState(null);
  const [scoresByRound, setScoresByRound] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const getRoundTotal = (roundScore) =>
    CRITERIA.reduce((total, criterion) => {
      const value = Number(roundScore?.scores?.[criterion.key] ?? 0);
      return total + (Number.isNaN(value) ? 0 : value);
    }, 0);

  // Helper to extract teamId from current URL path /team/:teamId
  const getTeamIdFromUrl = () => {
    const pathSegments = window.location.pathname.split('/');
    // Get the last segment
    return pathSegments[pathSegments.length - 1];
  };

  const loadData = async () => {
    const teamId = getTeamIdFromUrl();
    if (!teamId) {
      setError("No team ID specified.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      // Fetch team list and find the selected team.
      // Server currently exposes GET /api/teams (not /api/teams/:id).
      const teamListResponse = await fetchJson(`${API_BASE}/teams`);
      const matchedTeam = (teamListResponse.teams || []).find(
        (team) => String(team.id) === String(teamId)
      );
      setTeamData(matchedTeam || null);

      // Fetch all submitted round scores in one call.
      // Server responds as: { "1": { review, scores }, ... }
      const scoresMap = await fetchJson(`${API_BASE}/scores/${teamId}`);
      setScoresByRound(scoresMap || {});

    } catch (err) {
      setError(err.message || "Failed to load team details.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    
    // Custom popstate handler for routing within this view
    const handlePopState = () => {
        // App.jsx will handle rendering, but we ensure we are clean.
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  if (isLoading) {
    return (
      <div className="page">
        <style>{styles}</style>
        <main className="main-content">
          <section className="panel detail-loading-shell" aria-live="polite" aria-busy="true">
            <div className="skeleton-line skeleton-title" />
            <div className="skeleton-line skeleton-subtitle" />
            {[1].map((item) => (
              <div key={item} className="skeleton-card">
                <div className="skeleton-line" style={{ width: "40%", height: "22px" }} />
                <div className="skeleton-line skeleton-row" style={{ width: "95%" }} />
                <div className="skeleton-line skeleton-row" style={{ width: "85%" }} />
                <div className="skeleton-line skeleton-row" style={{ width: "72%" }} />
              </div>
            ))}
          </section>
        </main>
      </div>
    );
  }
  if (error) return <div className="page main-content panel"><style>{styles}</style><div className="round-blocked-note">Error: {error}</div><a href="/leaderboard" className="back-link">&larr; Back to Leaderboard</a></div>;
  if (!teamData) return <div className="page main-content panel"><style>{styles}</style>Team not found.<a href="/leaderboard" className="back-link">&larr; Back to Leaderboard</a></div>;

  return (
    <div className="page">
      <style>{styles}</style>
      <header className="header">
        <h1>Krithoathon - Team Details</h1>
      </header>
      <main className="main-content">
        <section className="panel">
          <div className="panel-header">
            <h2>{teamData.name}</h2>
            <a href="/leaderboard" className="back-link">&larr; Back to Leaderboard</a>
          </div>
          <div className="team-meta">
            Domain: <strong>{teamData.domain}</strong>
          </div>

          <div className="round-scores">
            {Object.keys(scoresByRound).length === 0 && <div className="empty">No scores submitted yet.</div>}
            
            {ROUNDS.map((roundNumber) => {
              const roundScore = scoresByRound[roundNumber];
              if (!roundScore) return null; // Skip if no score for this round

              return (
                <div key={roundNumber} className="round-score-card">
                  <h3 className="round-title">Team Score</h3>
                  <div className="leaderboard">
                    {CRITERIA.map((criterion) => {
                      const scoreValue = roundScore.scores?.[criterion.key];
                      return (
                        <div key={criterion.key} className="criteria-item">
                          <span>{criterion.label}:</span>
                          <span className="score-value">{scoreValue ?? 'N/A'} / 10</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="total-score">
                    <span>Total Score:</span>
                    <span>{getRoundTotal(roundScore)} / {CRITERIA.length * 10}</span>
                  </div>
                  {roundScore.review && (
                    <div className="review-box">
                      {roundScore.review}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
};

export default TeamDetail;

import "dotenv/config";
import express from "express";
import cors from "cors";
import { createClient } from "@supabase/supabase-js";

const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  ALLOWED_EMAILS,
  PORT = 4000
} = process.env;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const app = express();
app.use(cors());
app.use(express.json());

const allowedEmailSet = new Set(
  (ALLOWED_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
);

const CRITERIA_FIELDS = [
  "problem_understanding",
  "innovation_creativity",
  "technical_implementation",
  "functionality_demo",
  "impact_usefulness",
  "ui_ux_design",
  "feasibility"
];

// === 1. NEW HELPER FUNCTION TO GET THE ROUND-SPECIFIC TABLE NAME ===
const getTableNameForRound = (roundNumber) => {
  if (roundNumber === 1) {
    return "scores_round1";
  } else if (roundNumber === 2) {
    return "scores_round2";
  }
  return null; // Handle unexpected round numbers
};

const isEmailAllowed = async (email) => {
  const normalized = String(email || "").trim().toLowerCase();
  if (!normalized) {
    return false;
  }

  if (allowedEmailSet.has(normalized)) {
    return true;
  }

  const { data, error } = await supabase
    .from("allowed_users")
    .select("id")
    .eq("email", normalized)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return Boolean(data);
};

const requireJuryAccess = async (req, res, next) => {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  if (!token) {
    return res.status(401).json({ error: "Missing auth token." });
  }

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) {
    return res.status(401).json({ error: "Invalid auth token." });
  }

  const email = data.user.email || "";
  try {
    const allowed = await isEmailAllowed(email);
    if (!allowed) {
      return res.status(403).json({ error: "You are not authorized as a jury member." });
    }

    req.user = { id: data.user.id, email };
    return next();
  } catch (err) {
    return res.status(500).json({ error: err.message || "Access check failed." });
  }
};

app.get("/api/teams", requireJuryAccess, async (req, res) => {
  const search = String(req.query.search || "").trim();

  let query = supabase.from("teams").select("id,name,domain").order("name");
  if (search) {
    query = query.ilike("name", `%${search}%`);
  }

  const { data, error } = await query;
  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.json({ teams: data || [] });
});

// === 2. UPDATED ENDPOINT TO INSERT INTO THE CORRECT ROUND-SPECIFIC TABLE ===
app.post("/api/scores", requireJuryAccess, async (req, res) => {
  const { teamId, roundNumber, scores, review } = req.body;

  if (!teamId || !scores || !Number.isInteger(roundNumber) || roundNumber < 1) {
    return res.status(400).json({
      error: "TeamId, roundNumber, and scores are required."
    });
  }

  const tableName = getTableNameForRound(roundNumber);
  if (!tableName) {
    return res.status(400).json({ error: `Invalid round number: ${roundNumber}.` });
  }

  // Check if a score already exists for this team in this SPECIFIC round table
  const { data: existing, error: existingError } = await supabase
    .from(tableName)
    .select("team_id")
    .eq("team_id", teamId)
    .maybeSingle();

  if (existingError) {
    return res.status(500).json({ error: existingError.message });
  }

  if (existing) {
    return res.status(409).json({ error: `Score exists for Round ${roundNumber}. Admin key required to edit.` });
  }

  // Enforce sequential round rule: if submitting Round 2, ensure Round 1 is complete in scores_round1
  if (roundNumber > 1) {
    const previousRoundTableName = getTableNameForRound(roundNumber - 1);
    const { data: previousRound, error: previousRoundError } = await supabase
      .from(previousRoundTableName)
      .select("team_id")
      .eq("team_id", teamId)
      .maybeSingle();

    if (previousRoundError) {
      return res.status(500).json({ error: previousRoundError.message });
    }

    if (!previousRound) {
      return res.status(400).json({
        error: `Round ${roundNumber - 1} must be evaluated before Round ${roundNumber}.`
      });
    }
  }

  // Prepare the payload, mapping roundNumber, email, review, and criteria
  const payload = {
    team_id: teamId,
    // Note: round_number is NOT in the round-specific table payload. The table IS the round.
    created_by_key: req.user.email,
    review: String(review || "").trim()
  };
  for (const field of CRITERIA_FIELDS) {
    const value = Number(scores[field]);
    if (Number.isNaN(value) || value < 0 || value > 10) {
      return res.status(400).json({ error: `Invalid score for ${field}.` });
    }
    payload[field] = value;
  }

  // Insert the score into the correct round-specific table
  const { error: insertError } = await supabase.from(tableName).insert(payload);

  if (insertError) {
    return res.status(500).json({ error: insertError.message });
  }

  return res.json({ ok: true });
});

// === 3. UPDATED ENDPOINT TO CHECK SUBMISSION STATUS IN THE CORRECT TABLE ===
app.get("/api/scores/teams", requireJuryAccess, async (req, res) => {
  const roundNumber = Number.parseInt(req.query.roundNumber || "1", 10);

  if (!Number.isInteger(roundNumber) || roundNumber < 1) {
    return res.status(400).json({ error: "Valid roundNumber is required." });
  }

  const tableName = getTableNameForRound(roundNumber);
  if (!tableName) {
    return res.status(400).json({ error: `Invalid round number: ${roundNumber}.` });
  }

  // Fetch submitted team IDs from the round-specific table
  const { data, error } = await supabase
    .from(tableName)
    .select("team_id");

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  // Map the rows to just the IDs
  return res.json({ teamIds: (data || []).map((row) => row.team_id) });
});

app.get("/api/scores/:teamId", requireJuryAccess, async (req, res) => {
  const { teamId } = req.params;

  try {
    // Fetch from both tables in parallel
    const [r1, r2] = await Promise.all([
      supabase.from("scores_round1").select("*").eq("team_id", teamId).maybeSingle(),
      supabase.from("scores_round2").select("*").eq("team_id", teamId).maybeSingle()
    ]);

    const result = {};

    if (r1.data) {
      result[1] = {
        review: r1.data.review,
        // Map criteria fields into a nested scores object
        scores: CRITERIA_FIELDS.reduce((acc, field) => {
          acc[field] = r1.data[field];
          return acc;
        }, {})
      };
    }

    if (r2.data) {
      result[2] = {
        review: r2.data.review,
        scores: CRITERIA_FIELDS.reduce((acc, field) => {
          acc[field] = r2.data[field];
          return acc;
        }, {})
      };
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
// The GET /api/leaderboard endpoint remains unchanged. It works perfectly
// because it relies on the 'leaderboard' VIEW, which you correctly updated 
// in your SQL to COALESCE the sums from scores_round1 and scores_round2.

app.get("/api/leaderboard", requireJuryAccess, async (_req, res) => {
  const [{ data: teams, error: teamsError }, { data: leaderboard, error: lbError }] =
    await Promise.all([
      supabase.from("teams").select("id,domain"),
      supabase.from("leaderboard").select("team_id,team_name,total_score")
    ]);

  if (teamsError || lbError) {
    return res.status(500).json({
      error: teamsError?.message || lbError?.message || "Leaderboard fetch failed."
    });
  }

  const domainById = (teams || []).reduce((acc, team) => {
    acc[team.id] = team.domain || "Unassigned";
    return acc;
  }, {});

  const leaderboardRows = (leaderboard || []).map((row) => ({
    team_id: row.team_id,
    team_name: row.team_name,
    domain: domainById[row.team_id] || "Unassigned",
    total_score: Number(row.total_score || 0)
  }));

  const leaderboardByDomain = leaderboardRows.reduce((acc, row) => {
    const domain = row.domain || "Unassigned";
    if (!acc[domain]) {
      acc[domain] = [];
    }
    acc[domain].push(row);
    return acc;
  }, {});

  Object.values(leaderboardByDomain).forEach((rows) => {
    rows.sort((a, b) => {
      if (b.total_score !== a.total_score) {
        return b.total_score - a.total_score;
      }
      return a.team_name.localeCompare(b.team_name);
    });
  });

  return res.json({ leaderboardByDomain });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  Search, Upload, Copy, Check, AlertCircle, Loader2, Sparkles,
  X, ShieldCheck, ChevronRight, Briefcase, TrendingUp, Home, GraduationCap,
  Scale, FileCheck, Send, Settings, Bell, HelpCircle, Search as SearchIcon,
  MoreHorizontal, FolderOpen, Plus, Download, Users, RefreshCw,
  HelpCircle as HelpIcon, Clipboard, UserCheck, UserX, Database, Link as LinkIcon, ExternalLink,
  Calendar, History, FileSearch, ArrowRight, Zap, Activity
} from "lucide-react";

// ============================================================================
// CONSTANTS
// ============================================================================
const PLATFORM_FLOOR = 25000000;
const QUARTERLY_REVIEW_DAYS = 90;
const COVERAGE_DECAY_MONTHS = 24;

// "Today" for the demo — fixed so dates feel real and consistent
const DEMO_TODAY = new Date("2026-04-27T10:00:00Z");

const REG_STANDARDS = {
  ACCREDITED_INVESTOR: { name: "Accredited Investor", threshold: 5000000, citation: "17 CFR § 230.501(a)", short: "AI" },
  QUALIFIED_PURCHASER: { name: "Qualified Purchaser", threshold: 25000000, citation: "15 U.S.C. § 80a-2(a)(51)", short: "QP" },
  QIB: { name: "Qualified Institutional Buyer", threshold: 100000000, citation: "17 CFR § 230.144A", short: "QIB" },
};

const DEALS = {
  HELIOS: { codename: "Project Helios", type: "Pre-IPO secondary", sector: "Fintech unicorn", size: "$45M tranche", standard: "ACCREDITED_INVESTOR", launchDate: "2026-03-15" },
  CASCADE: { codename: "Project Cascade", type: "Direct lending fund", sector: "Mid-market credit", size: "$300M target", standard: "QUALIFIED_PURCHASER", launchDate: "2026-02-01" },
  ATLAS: { codename: "Project Atlas", type: "GP-led continuation", sector: "Buyout secondaries", size: "$1.2B NAV", standard: "QUALIFIED_PURCHASER", launchDate: "2026-04-10" },
  IRONWOOD: { codename: "Project Ironwood", type: "Real estate JV", sector: "Industrial logistics", size: "$120M LP", standard: "ACCREDITED_INVESTOR", launchDate: "2023-09-01" },
  MERIDIAN: { codename: "Project Meridian", type: "144A bond placement", sector: "IG utility", size: "$750M notes", standard: "QIB", launchDate: "2026-04-22" },
};

const INVESTOR_TYPES = {
  RIA: { label: "Registered Investment Adviser", short: "RIA", icon: Briefcase, color: "#0176D3" },
  HEDGE_FUND: { label: "Hedge Fund Manager", short: "Hedge Fund", icon: TrendingUp, color: "#5867E8" },
  VC_PE: { label: "Venture Capital / Private Equity", short: "VC / PE", icon: TrendingUp, color: "#9333EA" },
  FAMILY_OFFICE: { label: "Family Office", short: "Family Office", icon: Home, color: "#C2410C" },
  ENDOWMENT: { label: "Endowment / Foundation", short: "Endowment", icon: GraduationCap, color: "#0F766E" },
  UNKNOWN: { label: "Unclassified", short: "Unknown", icon: HelpIcon, color: "#706E6B" },
};

const STATUSES = {
  verified: { label: "Verified", color: "#2E844A", bg: "#CDEFC4" },
  needs_review: { label: "Review Queue", color: "#8C4B02", bg: "#FEF3C7" },
  attestation_required: { label: "Attestation Required", color: "#C2410C", bg: "#FFEDD5" },
  rejected: { label: "Rejected", color: "#BA0517", bg: "#FEDBD8" },
};

// ============================================================================
// HELPERS
// ============================================================================
const formatAUM = (n) => {
  if (n == null) return "—";
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(0)}M`;
  return `$${n.toLocaleString()}`;
};

const getEffectiveThreshold = (standardKey) => Math.max(REG_STANDARDS[standardKey].threshold, PLATFORM_FLOOR);

const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

// Date helpers — operate on ISO strings, return relative human-friendly text
const daysSince = (isoDate) => {
  if (!isoDate) return null;
  return Math.floor((DEMO_TODAY - new Date(isoDate)) / (1000 * 60 * 60 * 24));
};
const monthsSince = (isoDate) => {
  if (!isoDate) return null;
  return daysSince(isoDate) / 30.44;
};
const formatRelative = (isoDate) => {
  const d = daysSince(isoDate);
  if (d == null) return "—";
  if (d < 1) return "today";
  if (d === 1) return "1 day ago";
  if (d < 14) return `${d} days ago`;
  if (d < 60) return `${Math.floor(d / 7)} weeks ago`;
  if (d < 365) return `${Math.floor(d / 30)} months ago`;
  return `${(d / 365).toFixed(1)} years ago`;
};
const formatTimestamp = (isoDate) => {
  const dt = new Date(isoDate);
  return dt.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true });
};
const isOverdueForReview = (lastFullReview) => {
  return daysSince(lastFullReview) > QUARTERLY_REVIEW_DAYS;
};
const isCoverageStale = (lastInteraction) => {
  if (!lastInteraction) return true;
  return monthsSince(lastInteraction) > COVERAGE_DECAY_MONTHS;
};

// Build an audit log entry
const auditEntry = (actor, action, details, outcome) => ({
  timestamp: new Date().toISOString(),
  actor, action, details, outcome,
});
// Static audit entry with a backdated timestamp (for seed data)
const seedAuditEntry = (daysAgo, actor, action, details, outcome) => ({
  timestamp: new Date(DEMO_TODAY.getTime() - daysAgo * 24 * 60 * 60 * 1000).toISOString(),
  actor, action, details, outcome,
});

// ============================================================================
// REGISTRIES
// ============================================================================
const IA_REGISTRY = [
  { name: "Bridgewater Associates", aum: 171700000000, type: "HEDGE_FUND", crd: "104228" },
  { name: "Citadel Advisors", aum: 397000000000, type: "HEDGE_FUND", crd: "107488" },
  { name: "Renaissance Technologies", aum: 106000000000, type: "HEDGE_FUND", crd: "131411" },
  { name: "Millennium Management", aum: 70300000000, type: "HEDGE_FUND" },
  { name: "Two Sigma", aum: 73000000000, type: "HEDGE_FUND" },
  { name: "D.E. Shaw", aum: 65000000000, type: "HEDGE_FUND" },
  { name: "Point72 Asset Management", aum: 36000000000, type: "HEDGE_FUND" },
  { name: "Brevan Howard Asset Management", aum: 34000000000, type: "HEDGE_FUND" },
  { name: "Tudor Investment Corporation", aum: 16000000000, type: "HEDGE_FUND" },
  { name: "Hudson Bay Capital Management", aum: 18000000000, type: "HEDGE_FUND" },
  { name: "Pershing Square Capital Management", aum: 18500000000, type: "HEDGE_FUND" },
  { name: "Lone Pine Capital", aum: 16000000000, type: "HEDGE_FUND" },
  { name: "Tiger Global Management", aum: 58000000000, type: "HEDGE_FUND" },
  { name: "Coatue Management", aum: 59000000000, type: "HEDGE_FUND" },
  { name: "Elliott Investment Management", aum: 70000000000, type: "HEDGE_FUND" },
  { name: "AQR Capital Management", aum: 119200000000, type: "RIA", crd: "150877" },
  { name: "Ariel Investments", aum: 14800000000, type: "RIA", crd: "112937" },
  { name: "Generation Investment Management", aum: 36000000000, type: "RIA" },
  { name: "BlackRock", aum: 11600000000000, type: "RIA" },
  { name: "PIMCO", aum: 2200000000000, type: "RIA" },
  { name: "Sequoia Capital Operations", aum: 85000000000, type: "VC_PE" },
  { name: "Andreessen Horowitz", aum: 45000000000, type: "VC_PE" },
  { name: "Apollo Global Management", aum: 750000000000, type: "VC_PE" },
  { name: "KKR", aum: 638000000000, type: "VC_PE" },
  { name: "Blackstone", aum: 1100000000000, type: "VC_PE" },
  { name: "Carlyle Group", aum: 426000000000, type: "VC_PE" },
  { name: "TPG", aum: 230000000000, type: "VC_PE" },
  { name: "Bain Capital", aum: 185000000000, type: "VC_PE" },
  { name: "Vista Equity Partners", aum: 100000000000, type: "VC_PE" },
  { name: "Thoma Bravo", aum: 142000000000, type: "VC_PE" },
  { name: "Foundry Lane Ventures III", aum: 285000000, type: "VC_PE" },
  { name: "Granite Peak Partners V", aum: 1200000000, type: "VC_PE" },
  // Borderline — note: AUM can drift quarter-to-quarter, picked up by re-verification
  { name: "Cobalt Ridge Capital", aum: 31000000, type: "HEDGE_FUND" }, // bumped from 27.4 to 31 to demo "newly verified"
  { name: "Northbeam Partners", aum: 22000000, type: "HEDGE_FUND" },
  { name: "Meridian Lane Advisors", aum: 67000000, type: "RIA" },
  { name: "Seedling Capital Fund I", aum: 18000000, type: "VC_PE" },
  { name: "Tidemark Strategies", aum: 4300000, type: "RIA" },
  { name: "Vellum Capital Advisors", aum: 2500000, type: "RIA" },
  // Ariel Investments AUM dropped — to demo a verified investor flipping to rejected on re-verification
  // Wait — Ariel is at $14.8B which is way above floor, so re-verification won't change it
  // Real demo case: Foundry Lane stays the same; meaningful changes come from coverage decay
  { name: "Yale University Investments Office", aum: 41400000000, type: "ENDOWMENT" },
  { name: "Harvard Management Company", aum: 53200000000, type: "ENDOWMENT" },
  { name: "Bill & Melinda Gates Foundation Trust", aum: 75000000000, type: "ENDOWMENT" },
  { name: "Ford Foundation", aum: 16000000000, type: "ENDOWMENT" },
  { name: "California Public Employees Retirement System", aum: 502000000000, type: "ENDOWMENT" },
  { name: "Wellcome Trust", aum: 47000000000, type: "ENDOWMENT" },
  { name: "MIT Investment Management Company", aum: 25100000000, type: "ENDOWMENT" },
  { name: "Massachusetts Institute of Technology Investment Management", aum: 25100000000, type: "ENDOWMENT" },
  { name: "Princeton University Investment Company", aum: 35000000000, type: "ENDOWMENT" },
  { name: "Stanford Management Company", aum: 36500000000, type: "ENDOWMENT" },
  { name: "Children's Hospital of Philadelphia Foundation", aum: 1800000000, type: "ENDOWMENT" },
  { name: "Common Fund Capital", aum: 14000000000, type: "ENDOWMENT" },
  { name: "Riverside Community Foundation", aum: 8500000, type: "ENDOWMENT" },
  { name: "Pinegrove Independent School Endowment", aum: 18000000, type: "ENDOWMENT" },
];

const CRM_COVERAGE = [
  { firmName: "Bridgewater Associates", banker: "M. Chen", desk: "Hedge Fund Coverage", since: "2018-03" },
  { firmName: "Citadel Advisors", banker: "M. Chen", desk: "Hedge Fund Coverage", since: "2017-09" },
  { firmName: "Renaissance Technologies", banker: "M. Chen", desk: "Hedge Fund Coverage", since: "2019-01" },
  { firmName: "Millennium Management", banker: "S. Patel", desk: "Hedge Fund Coverage", since: "2020-06" },
  { firmName: "Two Sigma", banker: "S. Patel", desk: "Hedge Fund Coverage", since: "2018-11" },
  { firmName: "Tudor Investment Corporation", banker: "M. Chen", desk: "Hedge Fund Coverage", since: "2021-04" },
  { firmName: "Pershing Square Capital Management", banker: "M. Chen", desk: "Hedge Fund Coverage", since: "2019-08" },
  { firmName: "Lone Pine Capital", banker: "S. Patel", desk: "Hedge Fund Coverage", since: "2020-02" },
  { firmName: "Tiger Global Management", banker: "S. Patel", desk: "Hedge Fund Coverage", since: "2018-07" },
  { firmName: "Coatue Management", banker: "S. Patel", desk: "Hedge Fund Coverage", since: "2019-12" },
  { firmName: "Elliott Investment Management", banker: "M. Chen", desk: "Hedge Fund Coverage", since: "2017-05" },
  { firmName: "AQR Capital Management", banker: "R. Okafor", desk: "Asset Manager Coverage", since: "2019-03" },
  { firmName: "Generation Investment Management", banker: "R. Okafor", desk: "Asset Manager Coverage", since: "2020-09" },
  { firmName: "BlackRock", banker: "R. Okafor", desk: "Strategic Accounts", since: "2015-01" },
  { firmName: "PIMCO", banker: "R. Okafor", desk: "Strategic Accounts", since: "2016-02" },
  { firmName: "Sequoia Capital Operations", banker: "L. Andersen", desk: "Sponsor Coverage", since: "2019-04" },
  { firmName: "Andreessen Horowitz", banker: "L. Andersen", desk: "Sponsor Coverage", since: "2020-01" },
  { firmName: "Apollo Global Management", banker: "L. Andersen", desk: "Sponsor Coverage", since: "2016-08" },
  { firmName: "KKR", banker: "L. Andersen", desk: "Sponsor Coverage", since: "2015-05" },
  { firmName: "Blackstone", banker: "L. Andersen", desk: "Sponsor Coverage", since: "2014-09" },
  { firmName: "Carlyle Group", banker: "L. Andersen", desk: "Sponsor Coverage", since: "2017-03" },
  { firmName: "Bain Capital", banker: "L. Andersen", desk: "Sponsor Coverage", since: "2018-06" },
  { firmName: "Vista Equity Partners", banker: "L. Andersen", desk: "Sponsor Coverage", since: "2019-11" },
  { firmName: "Thoma Bravo", banker: "L. Andersen", desk: "Sponsor Coverage", since: "2020-07" },
  { firmName: "Foundry Lane Ventures III", banker: "L. Andersen", desk: "Sponsor Coverage", since: "2022-02" },
  { firmName: "Cobalt Ridge Capital", banker: "S. Patel", desk: "Hedge Fund Coverage", since: "2024-01" },
  { firmName: "Yale University Investments Office", banker: "K. Hosseini", desk: "Institutional Coverage", since: "2017-10" },
  { firmName: "Harvard Management Company", banker: "K. Hosseini", desk: "Institutional Coverage", since: "2017-10" },
  { firmName: "Bill & Melinda Gates Foundation Trust", banker: "K. Hosseini", desk: "Institutional Coverage", since: "2018-04" },
  { firmName: "Ford Foundation", banker: "K. Hosseini", desk: "Institutional Coverage", since: "2018-09" },
  { firmName: "California Public Employees Retirement System", banker: "K. Hosseini", desk: "Pension Coverage", since: "2016-03" },
  { firmName: "Wellcome Trust", banker: "K. Hosseini", desk: "Institutional Coverage", since: "2019-06" },
  { firmName: "Princeton University Investment Company", banker: "K. Hosseini", desk: "Institutional Coverage", since: "2018-12" },
  { firmName: "Stanford Management Company", banker: "K. Hosseini", desk: "Institutional Coverage", since: "2017-08" },
  { firmName: "MIT Investment Management Company", banker: "K. Hosseini", desk: "Institutional Coverage", since: "2018-02" },
  { firmName: "Children's Hospital of Philadelphia Foundation", banker: "K. Hosseini", desk: "Institutional Coverage", since: "2021-04" },
  { firmName: "Common Fund Capital", banker: "K. Hosseini", desk: "Institutional Coverage", since: "2019-01" },
  { firmName: "Sterling Family Holdings LP", banker: "T. Vargas", desk: "Family Office Coverage", since: "2019-05" },
  { firmName: "Hawthorn Family Office", banker: "T. Vargas", desk: "Family Office Coverage", since: "2020-03" },
  { firmName: "Aldrich Holdings Family Office", banker: "T. Vargas", desk: "Family Office Coverage", since: "2021-09" },
];

const lookupRegistry = (name) => {
  const target = norm(name);
  return IA_REGISTRY.find((r) => {
    const candidate = norm(r.name);
    if (candidate === target) return true;
    if (candidate.length >= 8 && target.includes(candidate.slice(0, 12))) return true;
    if (target.length >= 8 && candidate.includes(target.slice(0, 12))) return true;
    return false;
  });
};
const lookupCoverage = (name) => {
  const target = norm(name);
  return CRM_COVERAGE.find((c) => {
    const candidate = norm(c.firmName);
    if (candidate === target) return true;
    if (candidate.length >= 8 && target.includes(candidate.slice(0, 12))) return true;
    if (target.length >= 8 && candidate.includes(target.slice(0, 12))) return true;
    return false;
  });
};

// ============================================================================
// SEED INVESTORS — with realistic dates and audit history
// ============================================================================
let nextId = 1;
const mkId = () => `inv_${nextId++}`;

// Helper to construct a seed investor — keeps the data block readable
const seed = ({ name, email, country = "US", type, conf = "high", aum, aumSource = "registry", crd, status, lastReviewDays, lastInteractionDays, coverageObj, flagReason, attestationNote, classificationReasoning, audit = [] }) => ({
  id: mkId(),
  name, email, country, type,
  typeConfidence: conf,
  aum, aumSource, crd,
  verificationStatus: status,
  lastFullReview: new Date(DEMO_TODAY.getTime() - lastReviewDays * 24 * 60 * 60 * 1000).toISOString(),
  lastInteraction: lastInteractionDays != null ? new Date(DEMO_TODAY.getTime() - lastInteractionDays * 24 * 60 * 60 * 1000).toISOString() : null,
  lastReviewed: formatRelative(new Date(DEMO_TODAY.getTime() - lastReviewDays * 24 * 60 * 60 * 1000).toISOString()),
  coverage: coverageObj,
  flagReason,
  attestationNote,
  classificationReasoning,
  auditLog: audit,
});

const SEED_INVESTORS = [
  // Verified, recently reviewed, active interactions — clean state
  seed({ name: "Bridgewater Associates, LP", email: "ir@bwater.com", type: "HEDGE_FUND", aum: 171700000000, crd: "104228", status: "verified",
    lastReviewDays: 30, lastInteractionDays: 14,
    coverageObj: { banker: "M. Chen", desk: "Hedge Fund Coverage", since: "2018-03" },
    audit: [
      seedAuditEntry(120, "system", "ingested", "Onboarded via bulk import", null),
      seedAuditEntry(120, "Claude", "classified", "Type: HEDGE_FUND (high confidence)", "HEDGE_FUND"),
      seedAuditEntry(120, "system", "registry_match", "SEC IA registry match — CRD 104228, AUM $171.7B", null),
      seedAuditEntry(120, "system", "coverage_match", "CRM match: M. Chen (Hedge Fund Coverage)", null),
      seedAuditEntry(120, "system", "verified", "All three gates cleared", "verified"),
      seedAuditEntry(30, "system", "quarterly_review", "Re-verified — all gates still pass", "verified"),
      seedAuditEntry(14, "M. Chen", "interaction_logged", "Quarterly portfolio review call", null),
    ]
  }),
  seed({ name: "Citadel Advisors LLC", email: "investors@citadel.com", type: "HEDGE_FUND", aum: 397000000000, crd: "107488", status: "verified",
    lastReviewDays: 45, lastInteractionDays: 21,
    coverageObj: { banker: "M. Chen", desk: "Hedge Fund Coverage", since: "2017-09" },
    audit: [
      seedAuditEntry(180, "system", "ingested", "Onboarded via bulk import", null),
      seedAuditEntry(180, "system", "verified", "All three gates cleared", "verified"),
      seedAuditEntry(45, "system", "quarterly_review", "Re-verified", "verified"),
      seedAuditEntry(21, "M. Chen", "interaction_logged", "Allocations meeting", null),
    ]
  }),
  seed({ name: "AQR Capital Management, LLC", email: "ir@aqr.com", type: "RIA", aum: 119200000000, crd: "150877", status: "verified",
    lastReviewDays: 22, lastInteractionDays: 10,
    coverageObj: { banker: "R. Okafor", desk: "Asset Manager Coverage", since: "2019-03" },
    audit: [
      seedAuditEntry(200, "system", "ingested", "Onboarded via bulk import", null),
      seedAuditEntry(200, "system", "verified", "All three gates cleared", "verified"),
      seedAuditEntry(22, "system", "quarterly_review", "Re-verified", "verified"),
      seedAuditEntry(10, "R. Okafor", "interaction_logged", "Email exchange re: macro views", null),
    ]
  }),
  seed({ name: "Renaissance Technologies LLC", email: "info@rentec.com", type: "HEDGE_FUND", aum: 106000000000, crd: "131411", status: "verified",
    lastReviewDays: 40, lastInteractionDays: 35,
    coverageObj: { banker: "M. Chen", desk: "Hedge Fund Coverage", since: "2019-01" },
    audit: [
      seedAuditEntry(180, "system", "ingested", "Onboarded via bulk import", null),
      seedAuditEntry(180, "system", "verified", "All three gates cleared", "verified"),
      seedAuditEntry(40, "system", "quarterly_review", "Re-verified", "verified"),
    ]
  }),
  seed({ name: "Yale University Investments Office", email: "investments@yale.edu", type: "ENDOWMENT", aum: 41400000000, status: "verified",
    lastReviewDays: 60, lastInteractionDays: 18,
    coverageObj: { banker: "K. Hosseini", desk: "Institutional Coverage", since: "2017-10" },
    audit: [
      seedAuditEntry(365, "system", "ingested", "Onboarded via bulk import", null),
      seedAuditEntry(365, "system", "verified", "All three gates cleared", "verified"),
      seedAuditEntry(60, "system", "quarterly_review", "Re-verified", "verified"),
      seedAuditEntry(18, "K. Hosseini", "interaction_logged", "Annual asset allocation review", null),
    ]
  }),
  seed({ name: "Harvard Management Company", email: "info@hmc.harvard.edu", type: "ENDOWMENT", aum: 53200000000, status: "verified",
    lastReviewDays: 50, lastInteractionDays: 40,
    coverageObj: { banker: "K. Hosseini", desk: "Institutional Coverage", since: "2017-10" }
  }),
  seed({ name: "Bill & Melinda Gates Foundation Trust", email: "info@gatesfoundation.org", type: "ENDOWMENT", aum: 75000000000, status: "verified",
    lastReviewDays: 70, lastInteractionDays: 30,
    coverageObj: { banker: "K. Hosseini", desk: "Institutional Coverage", since: "2018-04" }
  }),

  // Verified — but OVERDUE for quarterly review (>90 days)
  seed({ name: "Foundry Lane Ventures III, LP", email: "lp-relations@foundrylane.com", type: "VC_PE", aum: 285000000, status: "verified",
    lastReviewDays: 105, lastInteractionDays: 60,
    coverageObj: { banker: "L. Andersen", desk: "Sponsor Coverage", since: "2022-02" }
  }),
  seed({ name: "Granite Peak Partners V, LP", email: "ir@granitepeakpartners.com", type: "VC_PE", aum: 1200000000, status: "verified",
    lastReviewDays: 110, lastInteractionDays: 75,
    coverageObj: { banker: "L. Andersen", desk: "Sponsor Coverage", since: "2020-07" }
  }),

  // Verified — but interactions getting close to 24-month decay (interesting demo case)
  seed({ name: "Sterling Family Holdings LP", email: "office@sterlingfh.com", type: "FAMILY_OFFICE", aum: 85000000, aumSource: "attestation", status: "verified",
    lastReviewDays: 35, lastInteractionDays: 680, // ~22.4 months — close to but not over 24
    coverageObj: { banker: "T. Vargas", desk: "Family Office Coverage", since: "2019-05" },
    attestationNote: "Manufacturing liquidity event 2013, professional staff",
    audit: [
      seedAuditEntry(400, "system", "ingested", "Manual record creation", null),
      seedAuditEntry(400, "T. Vargas", "attestation_received", "Audited financials + accountant letter on file", null),
      seedAuditEntry(400, "system", "verified", "Attestation packet complete; AUM $85M clears QP threshold", "verified"),
      seedAuditEntry(680, "T. Vargas", "interaction_logged", "Discussion of secondaries opportunities", null),
      seedAuditEntry(35, "system", "quarterly_review", "Re-verified — all gates pass; coverage warning: interaction approaching 24-month limit", "verified"),
    ]
  }),

  // INTERESTING DEMO CASE: Verified investor with stale interactions (>24 months) — should lose coverage on next re-verify
  seed({ name: "Elliott Investment Management", email: "ir@elliottmgmt.com", type: "HEDGE_FUND", aum: 70000000000, status: "verified",
    lastReviewDays: 88, lastInteractionDays: 760, // 25 months — past decay threshold
    coverageObj: { banker: "M. Chen", desk: "Hedge Fund Coverage", since: "2017-05" },
    audit: [
      seedAuditEntry(400, "system", "ingested", "Onboarded via bulk import", null),
      seedAuditEntry(400, "system", "verified", "All three gates cleared", "verified"),
      seedAuditEntry(760, "M. Chen", "interaction_logged", "Initial allocations call", null),
      seedAuditEntry(180, "system", "quarterly_review", "Re-verified — flagged: no recent interactions", "verified"),
      seedAuditEntry(88, "system", "quarterly_review", "Re-verified — last interaction 22mo ago, approaching decay threshold", "verified"),
    ]
  }),

  // Review queue — verified AUM but no coverage
  seed({ name: "Brevan Howard Asset Management", email: "ir@brevanhoward.com", country: "UK", type: "HEDGE_FUND", aum: 34000000000, status: "needs_review",
    lastReviewDays: 25, lastInteractionDays: null,
    coverageObj: null,
    flagReason: "AUM clears thresholds; no banker coverage in CRM"
  }),
  seed({ name: "D.E. Shaw & Co.", email: "ir@deshaw.com", type: "HEDGE_FUND", aum: 65000000000, status: "needs_review",
    lastReviewDays: 30, lastInteractionDays: null,
    coverageObj: null,
    flagReason: "AUM clears thresholds; no banker coverage in CRM"
  }),

  // Borderline ADV
  seed({ name: "Cobalt Ridge Capital, LP", email: "investors@cobaltridge.com", type: "HEDGE_FUND", aum: 27400000, status: "needs_review",
    lastReviewDays: 92, lastInteractionDays: 60,
    coverageObj: { banker: "S. Patel", desk: "Hedge Fund Coverage", since: "2024-01" },
    flagReason: "AUM within ±10% of $25M floor; recently registered (2yr)",
    audit: [
      seedAuditEntry(120, "system", "ingested", "Bulk import", null),
      seedAuditEntry(120, "Claude", "classified", "HEDGE_FUND (high)", "HEDGE_FUND"),
      seedAuditEntry(120, "system", "registry_match", "AUM $27.4M — within ±10% of platform floor", null),
      seedAuditEntry(120, "system", "borderline", "Routed to Review Queue", "needs_review"),
      seedAuditEntry(92, "system", "quarterly_review", "Re-checked — AUM unchanged, still borderline", "needs_review"),
    ]
  }),
  seed({ name: "Northbeam Partners LLC", email: "ir@northbeam.com", type: "HEDGE_FUND", aum: 22000000, status: "needs_review",
    lastReviewDays: 95, lastInteractionDays: null,
    coverageObj: null,
    flagReason: "Below platform floor; concentrated client base; no coverage"
  }),

  // Attestation required
  seed({ name: "Hawthorn Family Office", email: "info@hawthornfo.com", type: "FAMILY_OFFICE", aum: null, aumSource: "unknown", status: "attestation_required",
    lastReviewDays: 5, lastInteractionDays: 90,
    coverageObj: { banker: "T. Vargas", desk: "Family Office Coverage", since: "2020-03" },
    flagReason: "SFO exempt from ADV — attestation packet incomplete"
  }),
  seed({ name: "Apex Capital Family Trust", email: "trust@apexcapital.com", type: "FAMILY_OFFICE", conf: "medium", aum: 750000000, aumSource: "attestation", status: "needs_review",
    lastReviewDays: 1, lastInteractionDays: null,
    coverageObj: null,
    flagReason: "Claude flagged: entity formed 2025, vague source-of-wealth"
  }),
  seed({ name: "Aldrich Holdings Family Office", email: "ir@aldrichholdings.com", type: "FAMILY_OFFICE", aum: null, aumSource: "unknown", status: "attestation_required",
    lastReviewDays: 2, lastInteractionDays: 200,
    coverageObj: { banker: "T. Vargas", desk: "Family Office Coverage", since: "2021-09" }
  }),

  // Rejected
  seed({ name: "Tidemark Strategies LLC", email: "info@tidemarkstrat.com", type: "RIA", aum: 4300000, status: "rejected",
    lastReviewDays: 14, lastInteractionDays: null,
    coverageObj: null,
    flagReason: "Below regulatory floor ($5M Accredited Investor)"
  }),
  seed({ name: "Vellum Capital Advisors", email: "info@vellumcap.com", type: "RIA", aum: 2500000, status: "rejected",
    lastReviewDays: 30, lastInteractionDays: null,
    coverageObj: null,
    flagReason: "Sole proprietorship — non-institutional structure"
  }),
  seed({ name: "Pinegrove Independent School Endowment", email: "treasurer@pinegrove.edu", type: "ENDOWMENT", aum: 18000000, status: "rejected",
    lastReviewDays: 21, lastInteractionDays: null,
    coverageObj: null,
    flagReason: "Below platform $25M floor"
  }),
  seed({ name: "Riverside Community Foundation", email: "info@riversidecf.org", type: "ENDOWMENT", aum: 8500000, status: "rejected",
    lastReviewDays: 30, lastInteractionDays: null,
    coverageObj: null,
    flagReason: "Below platform $25M floor"
  }),
];

const SAMPLE_PASTE = `Tudor Investment Corporation
Hudson Bay Capital Management
Andreessen Horowitz
Wellcome Trust
Permian Basin Family Office
Massachusetts Institute of Technology Investment Management
Tiger Global Management
Singh Family Holdings LP
Apollo Global Management
Sequoia Capital Operations
Common Fund Capital
Generation Investment Management
The Walton Family Holdings
Children's Hospital of Philadelphia Foundation
Coatue Management
Pershing Square Capital Management
Aldrich Family Office of Boston
Lone Pine Capital
Cobblestone Wealth Partners
Brennan-Wexler Endowment Trust`;

// ============================================================================
// CLAUDE
// ============================================================================
const callClaude = async (messages, maxTokens = 2000) => {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: maxTokens, messages }),
  });
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  const data = await response.json();
  return data.content.map((b) => (b.type === "text" ? b.text : "")).join("").trim();
};

const classifyInvestorList = async (names, onProgress) => {
  const BATCH_SIZE = 10;
  const DELAY_MS = 1500;
  const allResults = [];
  for (let i = 0; i < names.length; i += BATCH_SIZE) {
    const batch = names.slice(i, i + BATCH_SIZE);
    const prompt = `You are an investor classification system for a private market deal platform. For each investor name, classify into one of: RIA, HEDGE_FUND, VC_PE, FAMILY_OFFICE, ENDOWMENT, UNKNOWN. Return ONLY a JSON array, no preamble or markdown fences.

Hints:
- "Family Office", "Family Holdings", surnames + "Trust" or "Holdings" → FAMILY_OFFICE
- "Ventures", "Partners V", "Capital Partners", "Fund I/II/III" → VC_PE
- "Foundation", "Endowment", "University", "Hospital", "Trust" (nonprofit), "Pension" → ENDOWMENT
- "Capital Management", "Asset Management" alone → likely HEDGE_FUND or RIA
- Confidence: high (clear signal) | medium (educated guess) | low (very ambiguous)

Investors:
${batch.map((n, idx) => `${idx + 1}. ${n}`).join("\n")}

Return JSON array: [{"name":"...","type":"FAMILY_OFFICE","confidence":"high","reasoning":"max 12 words"}, ...]
Same order as input.`;

    let attempt = 0, parsed = null;
    while (attempt < 3 && !parsed) {
      try {
        const text = await callClaude([{ role: "user", content: prompt }], 2000);
        const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
        parsed = JSON.parse(cleaned);
      } catch (e) {
        attempt++;
        if (attempt >= 3) throw e;
        await new Promise((r) => setTimeout(r, 2000 * attempt));
      }
    }
    allResults.push(...parsed);
    if (onProgress) onProgress(allResults.length, names.length);
    if (i + BATCH_SIZE < names.length) await new Promise((r) => setTimeout(r, DELAY_MS));
  }
  return allResults;
};

// ============================================================================
// COMPONENT
// ============================================================================
export default function App() {
  const [investors, setInvestors] = useState(SEED_INVESTORS);
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [statusFilter, setStatusFilter] = useState(null);
  const [typeFilter, setTypeFilter] = useState(null);
  const [coverageFilter, setCoverageFilter] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedInvestorId, setSelectedInvestorId] = useState(null);

  const [ingestModalOpen, setIngestModalOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [classifying, setClassifying] = useState(false);
  const [classifyError, setClassifyError] = useState(null);
  const [classifyResults, setClassifyResults] = useState(null);
  const [routedResults, setRoutedResults] = useState(null);
  const [classifyProgress, setClassifyProgress] = useState(null);

  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [reverifyModalOpen, setReverifyModalOpen] = useState(false);
  const [reverifying, setReverifying] = useState(false);
  const [reverifyResults, setReverifyResults] = useState(null);
  const [reverifyProgress, setReverifyProgress] = useState(null);

  const fileInputRef = useRef(null);

  const counts = useMemo(() => {
    const c = { verified: 0, needs_review: 0, attestation_required: 0, rejected: 0, total: investors.length };
    investors.forEach((inv) => { c[inv.verificationStatus] = (c[inv.verificationStatus] || 0) + 1; });
    return c;
  }, [investors]);

  // How many investors are overdue for quarterly review
  const overdueCount = useMemo(() => {
    return investors.filter((inv) => isOverdueForReview(inv.lastFullReview)).length;
  }, [investors]);

  const dealEligibilityCheck = (inv) => {
    if (!selectedDeal) return true;
    const deal = DEALS[selectedDeal];
    const effective = getEffectiveThreshold(deal.standard);
    if (inv.verificationStatus !== "verified") return false;
    if (inv.aum == null) return false;
    if (inv.aum < effective) return false;
    if (!inv.coverage) return false;
    // PSR must predate the deal launch — relationship formed after launch = solicitation, not pre-existing
    const coverageStart = new Date(inv.coverage.since + "-01");
    const dealLaunch = new Date(deal.launchDate);
    if (coverageStart >= dealLaunch) return false;
    return true;
  };

  const filteredInvestors = useMemo(() => {
    return investors.filter((inv) => {
      if (statusFilter && inv.verificationStatus !== statusFilter) return false;
      if (typeFilter && inv.type !== typeFilter) return false;
      if (coverageFilter === "covered" && !inv.coverage) return false;
      if (coverageFilter === "uncovered" && inv.coverage) return false;
      if (searchQuery && !inv.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (selectedDeal && !dealEligibilityCheck(inv)) return false;
      return true;
    });
  }, [investors, statusFilter, typeFilter, coverageFilter, searchQuery, selectedDeal]);

  const dealEligibleCount = useMemo(() => {
    if (!selectedDeal) return 0;
    return investors.filter(dealEligibilityCheck).length;
  }, [selectedDeal, investors]);

  const selectedInvestor = useMemo(() => investors.find((i) => i.id === selectedInvestorId), [investors, selectedInvestorId]);

  // ---- Routing for ingestion (v7 logic, unchanged) ----
  const routeInvestor = (classified) => {
    const type = classified.type;
    const confidence = classified.confidence;
    const audit = [
      auditEntry("system", "ingested", `Bulk ingest from CSV/paste`, null),
      auditEntry("Claude", "classified", `${type} (${confidence} confidence) — ${classified.reasoning}`, type),
    ];
    const result = { type, typeConfidence: confidence, classificationReasoning: classified.reasoning };

    if (type === "UNKNOWN" || confidence === "low") {
      audit.push(auditEntry("system", "routed", "Type ambiguous — sent to Review Queue", "needs_review"));
      return { ...result, verificationStatus: "needs_review", aum: null, aumSource: "unknown", flagReason: "Type unclear — manual review needed", auditLog: audit };
    }

    const cov = lookupCoverage(classified.name);
    const coverage = cov ? { banker: cov.banker, desk: cov.desk, since: cov.since } : null;
    if (coverage) {
      audit.push(auditEntry("system", "coverage_match", `CRM match: ${coverage.banker} (${coverage.desk}, since ${coverage.since})`, null));
    } else {
      audit.push(auditEntry("system", "coverage_check", "No coverage match in CRM", null));
    }

    if (type === "FAMILY_OFFICE") {
      audit.push(auditEntry("system", "routed", "SFO exempt from ADV — attestation packet required", "attestation_required"));
      return { ...result, verificationStatus: "attestation_required", aum: null, aumSource: "unknown", coverage, flagReason: "SFO exempt from ADV — attestation packet required", auditLog: audit };
    }

    const reg = lookupRegistry(classified.name);
    if (!reg) {
      audit.push(auditEntry("system", "routed", "Not found in IA registry — manual verification needed", "needs_review"));
      return { ...result, verificationStatus: "needs_review", aum: null, aumSource: "unknown", coverage, flagReason: "Not found in IA registry — manual verification needed", auditLog: audit };
    }

    audit.push(auditEntry("system", "registry_match", `SEC IA registry — AUM ${formatAUM(reg.aum)}${reg.crd ? ", CRD " + reg.crd : ""}`, null));
    const aboveFloor = reg.aum >= PLATFORM_FLOOR;
    const borderline = reg.aum >= PLATFORM_FLOOR * 0.9 && reg.aum < PLATFORM_FLOOR;

    if (!aboveFloor && !borderline) {
      audit.push(auditEntry("system", "routed", `AUM ${formatAUM(reg.aum)} below $25M platform floor`, "rejected"));
      return { ...result, verificationStatus: "rejected", aum: reg.aum, aumSource: "registry", crd: reg.crd, coverage, flagReason: `Below platform $25M floor (AUM ${formatAUM(reg.aum)})`, auditLog: audit };
    }
    if (borderline) {
      audit.push(auditEntry("system", "routed", `AUM ${formatAUM(reg.aum)} within ±10% of floor`, "needs_review"));
      return { ...result, verificationStatus: "needs_review", aum: reg.aum, aumSource: "registry", crd: reg.crd, coverage, flagReason: `AUM ${formatAUM(reg.aum)} within ±10% of $25M floor`, auditLog: audit };
    }
    if (!coverage) {
      audit.push(auditEntry("system", "routed", "AUM clears thresholds but no coverage in CRM", "needs_review"));
      return { ...result, verificationStatus: "needs_review", aum: reg.aum, aumSource: "registry", crd: reg.crd, coverage: null, flagReason: "AUM clears thresholds; no banker coverage found in CRM", auditLog: audit };
    }
    audit.push(auditEntry("system", "verified", "All three gates cleared", "verified"));
    return { ...result, verificationStatus: "verified", aum: reg.aum, aumSource: "registry", crd: reg.crd, coverage, auditLog: audit };
  };

  const handleClassify = async () => {
    const lines = pasteText.split("\n").map((s) => s.trim()).filter(Boolean);
    if (lines.length === 0) return;
    setClassifying(true);
    setClassifyError(null);
    setClassifyResults(null);
    setRoutedResults(null);
    setClassifyProgress({ done: 0, total: lines.length });
    try {
      const classifications = await classifyInvestorList(lines, (done, total) => setClassifyProgress({ done, total }));
      setClassifyResults(classifications);
      const routed = classifications.map((c) => ({ name: c.name, ...routeInvestor(c) }));
      setRoutedResults(routed);
    } catch (e) {
      const msg = e.message || "Classification failed";
      setClassifyError(msg.includes("429") ? "Rate limit hit. Try again in a moment, or paste fewer names at a time." : msg);
    } finally {
      setClassifying(false);
      setClassifyProgress(null);
    }
  };

  const handleConfirmIngest = () => {
    if (!routedResults) return;
    const newInvestors = routedResults.map((r) => ({
      id: mkId(),
      email: "—",
      country: "US",
      lastFullReview: new Date().toISOString(),
      lastInteraction: null,
      lastReviewed: "ingested just now",
      ...r,
    }));
    setInvestors([...newInvestors, ...investors]);
    setIngestModalOpen(false);
    setPasteText("");
    setClassifyResults(null);
    setRoutedResults(null);
  };

  const loadSample = () => setPasteText(SAMPLE_PASTE);
  const handleFileUpload = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const lines = text.split("\n").map((l) => {
        const cols = l.split(",");
        return cols[0]?.replace(/^"|"$/g, "").trim();
      }).filter((l) => l && l.toLowerCase() !== "name" && l.toLowerCase() !== "investor name");
      setPasteText(lines.join("\n"));
    };
    reader.readAsText(file);
  };

  // ---- Bulk re-verification ----
  const reverifyOne = (inv) => {
    const audit = [...(inv.auditLog || [])];
    const changes = [];
    let next = { ...inv };

    // Fresh registry lookup (skip Family Offices and rejected — they don't have ADV-based AUM)
    const isAdvType = inv.type === "RIA" || inv.type === "HEDGE_FUND" || inv.type === "VC_PE" || inv.type === "ENDOWMENT";
    if (isAdvType) {
      const reg = lookupRegistry(inv.name);
      if (reg && reg.aum !== inv.aum) {
        audit.push(auditEntry("system", "aum_updated", `Registry refresh: AUM ${formatAUM(inv.aum)} → ${formatAUM(reg.aum)}`, null));
        changes.push(`AUM updated: ${formatAUM(inv.aum)} → ${formatAUM(reg.aum)}`);
        next.aum = reg.aum;
      }
    }

    // Coverage decay check — 24 months of no interaction = strip coverage
    if (next.coverage && isCoverageStale(next.lastInteraction)) {
      const monthsAgo = next.lastInteraction ? Math.floor(monthsSince(next.lastInteraction)) : "?";
      audit.push(auditEntry("system", "coverage_lapsed", `Last interaction ${monthsAgo} months ago — exceeds 24-month threshold. Coverage stripped.`, null));
      changes.push(`Coverage decayed: last interaction ${monthsAgo}mo ago`);
      next.coverage = null;
    }

    // Recompute status
    const oldStatus = next.verificationStatus;
    let newStatus = oldStatus;
    let newFlag = next.flagReason;

    if (next.type === "FAMILY_OFFICE") {
      // Family Office logic unchanged on re-verify (driven by attestation, not registry)
      newStatus = next.aum != null ? "verified" : "attestation_required";
    } else if (next.aum == null) {
      newStatus = "needs_review";
      newFlag = "AUM unknown — manual verification needed";
    } else if (next.aum < PLATFORM_FLOOR * 0.9) {
      newStatus = "rejected";
      newFlag = `Below platform $25M floor (AUM ${formatAUM(next.aum)})`;
    } else if (next.aum < PLATFORM_FLOOR) {
      newStatus = "needs_review";
      newFlag = `AUM ${formatAUM(next.aum)} within ±10% of $25M floor`;
    } else if (!next.coverage) {
      newStatus = "needs_review";
      newFlag = "AUM clears thresholds; no banker coverage in CRM";
    } else {
      newStatus = "verified";
      newFlag = null;
    }

    if (newStatus !== oldStatus) {
      audit.push(auditEntry("system", "status_changed", `${STATUSES[oldStatus]?.label || oldStatus} → ${STATUSES[newStatus]?.label || newStatus}`, newStatus));
      changes.push(`Status: ${STATUSES[oldStatus]?.label || oldStatus} → ${STATUSES[newStatus]?.label || newStatus}`);
    }

    audit.push(auditEntry("system", "quarterly_review", changes.length > 0 ? `Re-verified — ${changes.length} change${changes.length > 1 ? "s" : ""}` : "Re-verified — no changes", newStatus));

    next.verificationStatus = newStatus;
    next.flagReason = newFlag;
    next.lastFullReview = new Date().toISOString();
    next.lastReviewed = "just re-verified";
    next.auditLog = audit;
    return { investor: next, changes };
  };

  const handleBulkReverify = async () => {
    setReverifying(true);
    setReverifyResults(null);
    setReverifyProgress({ done: 0, total: investors.length });

    const summary = { unchanged: 0, gainedVerified: 0, lostCoverage: 0, statusFlipped: 0, changes: [] };
    const updated = [];

    // Process in small batches with a tiny delay so the progress bar feels real
    for (let i = 0; i < investors.length; i++) {
      const { investor: next, changes } = reverifyOne(investors[i]);
      updated.push(next);
      if (changes.length === 0) summary.unchanged++;
      else {
        summary.changes.push({ name: next.name, changes });
        if (next.verificationStatus === "verified" && investors[i].verificationStatus !== "verified") summary.gainedVerified++;
        if (investors[i].coverage && !next.coverage) summary.lostCoverage++;
        if (next.verificationStatus !== investors[i].verificationStatus) summary.statusFlipped++;
      }
      if (i % 3 === 0 || i === investors.length - 1) {
        setReverifyProgress({ done: i + 1, total: investors.length });
        await new Promise((r) => setTimeout(r, 50));
      }
    }

    setInvestors(updated);
    setReverifyResults(summary);
    setReverifying(false);
    setBannerDismissed(true); // overdue count drops, banner naturally goes away
  };

  return (
    <div className="min-h-screen w-full" style={{ backgroundColor: "#F3F3F3", fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", color: "#181818" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
        .mono { font-family: 'JetBrains Mono', ui-monospace, monospace; }
        .sf-card { background: white; border: 1px solid #DDDBDA; border-radius: 4px; }
        .sf-card-shadow { box-shadow: 0 2px 4px rgba(0,0,0,0.07), 0 1px 2px rgba(0,0,0,0.04); }
        .sf-btn-primary { background: #0176D3; color: white; border: 1px solid #0176D3; border-radius: 4px; padding: 6px 14px; font-size: 13px; font-weight: 500; line-height: 1.4; transition: all 0.1s; cursor: pointer; position: relative; }
        .sf-btn-primary:hover:not(:disabled) { background: #014486; border-color: #014486; }
        .sf-btn-primary:disabled { background: #C9C7C5; border-color: #C9C7C5; cursor: not-allowed; }
        .sf-btn-neutral { background: white; color: #0176D3; border: 1px solid #DDDBDA; border-radius: 4px; padding: 6px 14px; font-size: 13px; font-weight: 500; line-height: 1.4; transition: all 0.1s; cursor: pointer; position: relative; }
        .sf-btn-neutral:hover { background: #F3F3F3; }
        .sf-btn-ghost { background: transparent; color: #444; border: none; padding: 4px 10px; font-size: 12px; cursor: pointer; border-radius: 4px; }
        .sf-btn-ghost:hover { background: #ECEBEA; }
        .sf-input { width: 100%; padding: 6px 12px; border: 1px solid #C9C7C5; border-radius: 4px; font-size: 13px; line-height: 1.4; background: white; color: #181818; outline: none; transition: border-color 0.1s; }
        .sf-input:focus { border-color: #0176D3; box-shadow: 0 0 3px #0176D3; }
        .sf-label { font-size: 11px; font-weight: 600; color: #3E3E3C; text-transform: uppercase; letter-spacing: 0.5px; line-height: 1.4; margin: 0; display: block; }
        .sf-label-sm { font-size: 10px; font-weight: 600; color: #706E6B; text-transform: uppercase; letter-spacing: 0.5px; line-height: 1.4; margin: 0; display: block; }
        .sf-h1 { font-size: 22px; font-weight: 700; color: #080707; line-height: 1.25; letter-spacing: -0.2px; margin: 0; }
        .sf-h2 { font-size: 16px; font-weight: 600; color: #080707; line-height: 1.35; margin: 0; }
        .sf-h3 { font-size: 14px; font-weight: 600; color: #181818; line-height: 1.4; margin: 0; }
        .sf-body { font-size: 13px; color: #181818; line-height: 1.5; margin: 0; }
        .sf-body-sm { font-size: 12px; color: #444; line-height: 1.5; margin: 0; }
        .sf-meta { font-size: 11px; color: #706E6B; line-height: 1.4; margin: 0; }
        .sf-link { color: #0176D3; cursor: pointer; }
        .sf-link:hover { text-decoration: underline; }
        .sf-pill { display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; line-height: 1.4; }
        .sf-tab { padding: 10px 16px; font-size: 13px; font-weight: 500; color: #444; border-bottom: 2px solid transparent; cursor: pointer; }
        .sf-tab-active { color: #0176D3; border-bottom-color: #0176D3; font-weight: 600; }
        .sf-divider { border-color: #ECEBEA; }
        .sf-table { width: 100%; border-collapse: collapse; }
        .sf-table th { background: #FAFAF9; text-align: left; padding: 8px 12px; font-size: 11px; font-weight: 600; color: #3E3E3C; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #DDDBDA; }
        .sf-table td { padding: 10px 12px; font-size: 13px; border-bottom: 1px solid #ECEBEA; vertical-align: middle; }
        .sf-table tr:hover td { background: #FAFAFA; cursor: pointer; }
        .sf-table tr.selected td { background: #F1F8FE; }
        .bucket-card { padding: 10px 12px; border: 1px solid #DDDBDA; border-radius: 4px; cursor: pointer; transition: all 0.1s; background: white; }
        .bucket-card:hover { border-color: #0176D3; }
        .bucket-card.active { border-color: #0176D3; box-shadow: 0 0 0 1px #0176D3; }
        .badge-dot { position: absolute; top: -3px; right: -3px; width: 8px; height: 8px; border-radius: 50%; background: #BA0517; border: 2px solid white; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        .fade-in { animation: fadeIn 0.25s ease-out both; }
        @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
        .slide-in { animation: slideIn 0.25s ease-out both; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
        .badge-dot { animation: pulse 2s infinite; }
        .scrollbar-thin::-webkit-scrollbar { width: 6px; }
        .scrollbar-thin::-webkit-scrollbar-thumb { background: #C9C7C5; border-radius: 3px; }
      `}</style>

      {/* Top nav */}
      <div style={{ background: "#16325C", color: "white" }}>
        <div className="flex items-center px-4 h-12 gap-6">
          <div className="flex items-center gap-2 font-semibold">
            <div className="w-7 h-7 rounded flex items-center justify-center" style={{ background: "#0176D3" }}>
              <Scale size={15} />
            </div>
            <span style={{ fontSize: "14px" }}>DealHub</span>
          </div>
          <nav className="flex gap-1 ml-2">
            {["Investors", "Deals", "Pipeline", "Compliance", "Reports"].map((t) => (
              <button key={t} className={`px-3 py-1.5 text-xs rounded ${t === "Investors" ? "bg-white/15" : "hover:bg-white/10"}`} style={{ fontSize: "13px" }}>
                {t}
              </button>
            ))}
          </nav>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <div className="relative">
              <SearchIcon size={13} className="absolute top-1/2 -translate-y-1/2 opacity-70" style={{ left: "10px", pointerEvents: "none" }} />
              <input className="pr-3 py-1 text-xs rounded text-white placeholder-white/60" style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.2)", width: "200px", paddingLeft: "28px" }} placeholder="Search…" />
            </div>
            <button className="p-1.5 hover:bg-white/10 rounded"><Bell size={14} /></button>
            <button className="p-1.5 hover:bg-white/10 rounded"><HelpCircle size={14} /></button>
            <button className="p-1.5 hover:bg-white/10 rounded"><Settings size={14} /></button>
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold" style={{ background: "#0176D3" }}>JD</div>
          </div>
        </div>
        <div className="px-4 py-2 flex items-center gap-2 text-xs" style={{ background: "#1B5297", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
          <FolderOpen size={11} className="opacity-70" />
          <span className="opacity-70">Investors</span>
          <ChevronRight size={11} className="opacity-50" />
          <span className="font-medium">All Investors</span>
        </div>
      </div>

      <div className="max-w-[1500px] mx-auto px-6 py-5">

        {/* Quarterly review banner */}
        {overdueCount > 0 && !bannerDismissed && (
          <div className="sf-card mb-4 fade-in" style={{ borderLeft: "4px solid #C2410C", background: "#FFF7ED" }}>
            <div className="px-4 py-3 flex items-center gap-3 flex-wrap">
              <Calendar size={16} style={{ color: "#C2410C" }} />
              <div className="flex-1 min-w-0">
                <div style={{ fontSize: "13px", fontWeight: 600, color: "#7C2D12" }}>
                  Quarterly review due
                </div>
                <div className="sf-body-sm" style={{ color: "#7C2D12" }}>
                  <span style={{ fontWeight: 600 }}>{overdueCount} investor{overdueCount === 1 ? "" : "s"}</span> haven't been re-verified in 90+ days. Run a bulk re-verification to refresh AUM, coverage, and interaction data.
                </div>
              </div>
              <button onClick={() => setReverifyModalOpen(true)} className="sf-btn-primary flex items-center gap-1.5">
                <RefreshCw size={11} /> Run quarterly review
              </button>
              <button onClick={() => setBannerDismissed(true)} className="sf-btn-ghost"><X size={14} /></button>
            </div>
          </div>
        )}

        {/* Page header */}
        <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded flex items-center justify-center" style={{ background: "#0176D3", color: "white" }}>
              <Users size={18} />
            </div>
            <div>
              <div className="sf-label-sm" style={{ marginBottom: "2px" }}>Investor Universe</div>
              <h1 className="sf-h1">Investors <span style={{ color: "#706E6B", fontWeight: 500 }}>· {counts.total}</span></h1>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => setReverifyModalOpen(true)} className="sf-btn-neutral flex items-center gap-1.5">
              <RefreshCw size={12} /> Run quarterly review
              {overdueCount > 0 && <span className="badge-dot" />}
            </button>
            <button className="sf-btn-neutral flex items-center gap-1.5"><Download size={12} /> Export</button>
            <button onClick={() => setIngestModalOpen(true)} className="sf-btn-primary flex items-center gap-1.5"><Plus size={12} /> Ingest investors</button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b sf-divider flex items-center mb-4">
          <div className="sf-tab sf-tab-active">All</div>
          <div className="sf-tab">My Coverage</div>
          <div className="sf-tab">Recently Ingested</div>
          <div className="sf-tab">Stale (90+ days)</div>
        </div>

        {/* Bucket bar */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4">
          <div onClick={() => setStatusFilter(null)} className={`bucket-card ${statusFilter === null ? "active" : ""}`}>
            <div className="sf-label-sm" style={{ marginBottom: "4px" }}>Total</div>
            <div className="sf-h2 mono">{counts.total}</div>
            <div className="sf-meta" style={{ marginTop: "2px" }}>All investors</div>
          </div>
          <div onClick={() => setStatusFilter("verified")} className={`bucket-card ${statusFilter === "verified" ? "active" : ""}`}>
            <div className="sf-label-sm flex items-center gap-1.5" style={{ marginBottom: "4px" }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#2E844A" }} /> Verified
            </div>
            <div className="sf-h2 mono" style={{ color: "#2E844A" }}>{counts.verified}</div>
            <div className="sf-meta" style={{ marginTop: "2px" }}>All gates cleared</div>
          </div>
          <div onClick={() => setStatusFilter("needs_review")} className={`bucket-card ${statusFilter === "needs_review" ? "active" : ""}`}>
            <div className="sf-label-sm flex items-center gap-1.5" style={{ marginBottom: "4px" }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#8C4B02" }} /> Review Queue
            </div>
            <div className="sf-h2 mono" style={{ color: "#8C4B02" }}>{counts.needs_review || 0}</div>
            <div className="sf-meta" style={{ marginTop: "2px" }}>Borderline / no coverage</div>
          </div>
          <div onClick={() => setStatusFilter("attestation_required")} className={`bucket-card ${statusFilter === "attestation_required" ? "active" : ""}`}>
            <div className="sf-label-sm flex items-center gap-1.5" style={{ marginBottom: "4px" }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#C2410C" }} /> Attestation Req.
            </div>
            <div className="sf-h2 mono" style={{ color: "#C2410C" }}>{counts.attestation_required || 0}</div>
            <div className="sf-meta" style={{ marginTop: "2px" }}>Awaiting docs from LP</div>
          </div>
          <div onClick={() => setStatusFilter("rejected")} className={`bucket-card ${statusFilter === "rejected" ? "active" : ""}`}>
            <div className="sf-label-sm flex items-center gap-1.5" style={{ marginBottom: "4px" }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#BA0517" }} /> Rejected
            </div>
            <div className="sf-h2 mono" style={{ color: "#BA0517" }}>{counts.rejected || 0}</div>
            <div className="sf-meta" style={{ marginTop: "2px" }}>Below thresholds</div>
          </div>
        </div>

        {/* Filters */}
        <div className="sf-card mb-4 px-3 py-2.5 flex items-center gap-3 flex-wrap">
          <div className="relative" style={{ width: "260px" }}>
            <Search size={13} className="absolute top-1/2 -translate-y-1/2 text-gray-400" style={{ left: "10px", pointerEvents: "none" }} />
            <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search investors…" className="sf-input" style={{ height: "30px", paddingLeft: "30px" }} />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="sf-label-sm">Type</span>
            <select value={typeFilter || ""} onChange={(e) => setTypeFilter(e.target.value || null)} className="sf-input" style={{ width: "auto", height: "30px", padding: "0 24px 0 8px" }}>
              <option value="">All</option>
              {Object.entries(INVESTOR_TYPES).map(([k, t]) => <option key={k} value={k}>{t.short}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="sf-label-sm">Coverage</span>
            <select value={coverageFilter || ""} onChange={(e) => setCoverageFilter(e.target.value || null)} className="sf-input" style={{ width: "auto", height: "30px", padding: "0 24px 0 8px" }}>
              <option value="">All</option>
              <option value="covered">Covered</option>
              <option value="uncovered">No coverage</option>
            </select>
          </div>
          <div className="flex items-center gap-1.5">
            <Briefcase size={11} className="text-gray-400" />
            <span className="sf-label-sm">Filter by deal</span>
            <select value={selectedDeal || ""} onChange={(e) => setSelectedDeal(e.target.value || null)} className="sf-input" style={{ width: "auto", height: "30px", padding: "0 24px 0 8px" }}>
              <option value="">— No deal filter —</option>
              {Object.entries(DEALS).map(([k, d]) => <option key={k} value={k}>{d.codename} · {REG_STANDARDS[d.standard].short}</option>)}
            </select>
          </div>
          {(statusFilter || typeFilter || coverageFilter || selectedDeal || searchQuery) && (
            <button onClick={() => { setStatusFilter(null); setTypeFilter(null); setCoverageFilter(null); setSelectedDeal(null); setSearchQuery(""); }} className="sf-btn-ghost flex items-center gap-1">
              <X size={11} /> Clear
            </button>
          )}
          <div className="ml-auto sf-meta">Showing <span style={{ color: "#181818", fontWeight: 600 }}>{filteredInvestors.length}</span> of {counts.total}</div>
        </div>

        {/* Deal context strip */}
        {selectedDeal && (
          <div className="sf-card sf-card-shadow mb-4 fade-in" style={{ borderLeft: "3px solid #0176D3" }}>
            <div className="px-4 py-3 flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Briefcase size={14} className="text-[#0176D3]" />
                <div>
                  <div className="sf-label-sm">Deal context applied</div>
                  <div className="sf-h3" style={{ color: "#0176D3" }}>{DEALS[selectedDeal].codename}</div>
                </div>
              </div>
              <div className="hidden md:block" style={{ width: "1px", height: "32px", background: "#DDDBDA" }} />
              <div>
                <div className="sf-label-sm">4 gates</div>
                <div className="sf-body-sm" style={{ fontWeight: 500 }}>
                  {REG_STANDARDS[DEALS[selectedDeal].standard].name} · {formatAUM(getEffectiveThreshold(DEALS[selectedDeal].standard))} floor · Coverage · PSR pre-existing
                </div>
                <div className="sf-meta mt-0.5">Deal launched {DEALS[selectedDeal].launchDate}</div>
              </div>
              <div className="ml-auto text-right">
                <div className="sf-label-sm">Eligible</div>
                <div className="sf-h2 mono" style={{ color: "#2E844A" }}>{dealEligibleCount} <span style={{ color: "#706E6B", fontSize: "12px", fontWeight: 400 }}>/ {counts.verified} verified</span></div>
              </div>
            </div>
          </div>
        )}

        {/* Investor table */}
        <div className="sf-card sf-card-shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="sf-table">
              <thead>
                <tr>
                  <th>Investor</th>
                  <th>Type</th>
                  <th>AUM</th>
                  <th>Coverage</th>
                  <th>Status</th>
                  <th>Last reviewed</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredInvestors.map((inv) => {
                  const t = INVESTOR_TYPES[inv.type];
                  const Icon = t.icon;
                  const status = STATUSES[inv.verificationStatus];
                  const overdue = isOverdueForReview(inv.lastFullReview);
                  return (
                    <tr key={inv.id} className={selectedInvestorId === inv.id ? "selected" : ""} onClick={() => setSelectedInvestorId(inv.id)}>
                      <td>
                        <div style={{ fontWeight: 500 }}>{inv.name}</div>
                        <div className="sf-meta mono">{inv.email}</div>
                      </td>
                      <td>
                        <div className="flex items-center gap-1.5">
                          <Icon size={11} style={{ color: t.color }} />
                          <span style={{ fontSize: "12px" }}>{t.short}</span>
                          {inv.typeConfidence === "medium" && <span className="sf-meta">(med)</span>}
                          {inv.typeConfidence === "low" && <span className="sf-meta" style={{ color: "#C2410C" }}>(low)</span>}
                        </div>
                      </td>
                      <td className="mono" style={{ fontWeight: inv.aum ? 500 : 400, color: inv.aum ? "#181818" : "#706E6B" }}>{formatAUM(inv.aum)}</td>
                      <td>
                        {inv.coverage ? (
                          <div className="flex items-center gap-1.5">
                            <UserCheck size={11} style={{ color: "#2E844A" }} />
                            <span style={{ fontSize: "12px", fontWeight: 500 }}>{inv.coverage.banker}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <UserX size={11} style={{ color: "#BA0517" }} />
                            <span style={{ fontSize: "12px", color: "#BA0517" }}>None</span>
                          </div>
                        )}
                      </td>
                      <td>
                        <span className="sf-pill" style={{ background: status.bg, color: status.color }}>{status.label}</span>
                      </td>
                      <td className="sf-meta">
                        {inv.lastReviewed}
                        {overdue && <span className="sf-pill ml-2" style={{ background: "#FEDBD8", color: "#BA0517", fontSize: "10px" }}>OVERDUE</span>}
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <button className="sf-btn-ghost"><MoreHorizontal size={14} /></button>
                      </td>
                    </tr>
                  );
                })}
                {filteredInvestors.length === 0 && (
                  <tr><td colSpan={7} className="text-center py-8 sf-meta">No investors match the current filters</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="sf-meta text-center mt-4">
          {selectedDeal
            ? `${dealEligibleCount} investors clear all 4 gates for ${DEALS[selectedDeal].codename}.`
            : "Click any row for the eligibility review and audit trail."}
        </div>
      </div>

      {/* Ingest modal */}
      {ingestModalOpen && (
        <IngestModal
          pasteText={pasteText} setPasteText={setPasteText}
          classifying={classifying} classifyError={classifyError}
          classifyProgress={classifyProgress}
          routedResults={routedResults}
          onClassify={handleClassify} onConfirm={handleConfirmIngest}
          onClose={() => { setIngestModalOpen(false); setRoutedResults(null); setClassifyResults(null); }}
          onLoadSample={loadSample} onUpload={handleFileUpload} fileInputRef={fileInputRef}
          onBack={() => { setRoutedResults(null); setClassifyResults(null); }}
        />
      )}

      {/* Re-verify modal */}
      {reverifyModalOpen && (
        <ReverifyModal
          reverifying={reverifying} reverifyResults={reverifyResults} reverifyProgress={reverifyProgress}
          onRun={handleBulkReverify}
          onClose={() => { setReverifyModalOpen(false); setReverifyResults(null); setReverifyProgress(null); }}
          totalCount={investors.length} overdueCount={overdueCount}
        />
      )}

      {/* Detail slide-over */}
      {selectedInvestor && (
        <div className="fixed inset-0 z-40 flex justify-end" onClick={() => setSelectedInvestorId(null)}>
          <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.3)" }} />
          <div className="relative w-full max-w-xl bg-white slide-in overflow-y-auto scrollbar-thin" onClick={(e) => e.stopPropagation()} style={{ height: "100vh" }}>
            <InvestorDetailPanel investor={selectedInvestor} onClose={() => setSelectedInvestorId(null)} />
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// INGEST MODAL (extracted for clarity — same as v7)
// ============================================================================
function IngestModal({ pasteText, setPasteText, classifying, classifyError, classifyProgress, routedResults, onClassify, onConfirm, onClose, onLoadSample, onUpload, fileInputRef, onBack }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.4)" }} onClick={() => !classifying && onClose()}>
      <div className="sf-card sf-card-shadow w-full max-w-3xl max-h-[90vh] overflow-y-auto scrollbar-thin fade-in" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-3 border-b sf-divider flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Plus size={14} className="text-[#0176D3]" />
            <div className="sf-h3">Ingest investors</div>
            <span className="sf-pill" style={{ background: "#E5F3FF", color: "#014486" }}>3 systems orchestrated</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
        </div>

        {!routedResults && (
          <>
            <div className="px-5 py-4">
              <div className="sf-label" style={{ marginBottom: "6px" }}>Paste investor names (one per line)</div>
              <textarea value={pasteText} onChange={(e) => setPasteText(e.target.value)} rows={9} placeholder="Bridgewater Associates&#10;Yale University Investments Office&#10;Sterling Family Holdings LP&#10;..." className="sf-input mono text-xs resize-none" />
              <div className="flex items-center justify-between mt-2 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <button onClick={onLoadSample} className="sf-btn-ghost flex items-center gap-1"><Clipboard size={11} /> Load sample list (20 names)</button>
                  <span className="text-gray-300">·</span>
                  <button onClick={() => fileInputRef.current?.click()} className="sf-btn-ghost flex items-center gap-1"><Upload size={11} /> Upload CSV</button>
                  <input ref={fileInputRef} type="file" accept=".csv,.txt" onChange={(e) => onUpload(e.target.files?.[0])} className="hidden" />
                </div>
                <span className="sf-meta">{pasteText.split("\n").map((s) => s.trim()).filter(Boolean).length} names</span>
              </div>

              <div className="mt-4 p-3 rounded" style={{ background: "#FAFAF9", border: "1px solid #ECEBEA" }}>
                <div className="sf-label-sm mb-2">On submit, each name is run through:</div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="flex items-start gap-2"><Sparkles size={11} className="text-[#0176D3] mt-0.5" /><div><div style={{ fontSize: "12px", fontWeight: 600 }}>1. Classify type</div><div className="sf-meta">Claude: RIA / HF / VC / FO / Endow.</div></div></div>
                  <div className="flex items-start gap-2"><Database size={11} className="text-[#0176D3] mt-0.5" /><div><div style={{ fontSize: "12px", fontWeight: 600 }}>2. Verify AUM</div><div className="sf-meta">SEC IA registry lookup</div></div></div>
                  <div className="flex items-start gap-2"><UserCheck size={11} className="text-[#0176D3] mt-0.5" /><div><div style={{ fontSize: "12px", fontWeight: 600 }}>3. Find coverage</div><div className="sf-meta">CRM (Compass) lookup</div></div></div>
                </div>
              </div>
            </div>

            {classifyError && (
              <div className="px-5 pb-4">
                <div className="px-3 py-2 rounded text-xs" style={{ background: "#FEDBD8", color: "#BA0517" }}>
                  <AlertCircle size={11} className="inline mr-1" /> {classifyError}
                </div>
              </div>
            )}

            <div className="px-5 py-3 border-t sf-divider flex items-center justify-between" style={{ background: "#FAFAF9" }}>
              <div className="sf-meta">All three gates required for Verified status.</div>
              <div className="flex items-center gap-2">
                <button onClick={onClose} className="sf-btn-neutral">Cancel</button>
                <button onClick={onClassify} disabled={classifying || !pasteText.trim()} className="sf-btn-primary flex items-center gap-1.5">
                  {classifying ? (<><Loader2 size={11} className="animate-spin" />{classifyProgress ? `Classifying ${classifyProgress.done}/${classifyProgress.total}…` : "Running…"}</>) : <><Sparkles size={11} /> Classify & verify</>}
                </button>
              </div>
            </div>
          </>
        )}

        {routedResults && (
          <>
            <div className="px-5 py-3 border-b sf-divider" style={{ background: "#F8FAFD" }}>
              <div className="flex items-center gap-2 flex-wrap">
                <Check size={13} className="text-[#2E844A]" />
                <span className="sf-h3">Pipeline complete</span>
                <span className="sf-meta">· {routedResults.length} processed</span>
                <div className="ml-auto flex items-center gap-3 sf-meta">
                  <span><span className="w-1.5 h-1.5 rounded-full inline-block mr-1" style={{ background: "#2E844A" }} /> {routedResults.filter((r) => r.verificationStatus === "verified").length} verified</span>
                  <span><span className="w-1.5 h-1.5 rounded-full inline-block mr-1" style={{ background: "#8C4B02" }} /> {routedResults.filter((r) => r.verificationStatus === "needs_review").length} review</span>
                  <span><span className="w-1.5 h-1.5 rounded-full inline-block mr-1" style={{ background: "#C2410C" }} /> {routedResults.filter((r) => r.verificationStatus === "attestation_required").length} attestation</span>
                  <span><span className="w-1.5 h-1.5 rounded-full inline-block mr-1" style={{ background: "#BA0517" }} /> {routedResults.filter((r) => r.verificationStatus === "rejected").length} rejected</span>
                </div>
              </div>
            </div>
            <div className="px-5 py-3 max-h-[450px] overflow-y-auto scrollbar-thin">
              <table className="sf-table">
                <thead><tr><th>Investor</th><th>Type</th><th>AUM</th><th>Coverage</th><th>Routed to</th></tr></thead>
                <tbody>
                  {routedResults.map((r, i) => {
                    const t = INVESTOR_TYPES[r.type] || INVESTOR_TYPES.UNKNOWN;
                    const Icon = t.icon;
                    const status = STATUSES[r.verificationStatus];
                    return (
                      <tr key={i}>
                        <td style={{ fontWeight: 500 }}>{r.name}</td>
                        <td><div className="flex items-center gap-1.5"><Icon size={11} style={{ color: t.color }} /><span style={{ fontSize: "12px" }}>{t.short}</span></div></td>
                        <td className="mono">{formatAUM(r.aum)}</td>
                        <td>{r.coverage ? <div className="flex items-center gap-1.5"><UserCheck size={11} style={{ color: "#2E844A" }} /><span style={{ fontSize: "12px" }}>{r.coverage.banker}</span></div> : <span style={{ fontSize: "12px", color: "#BA0517" }}>None</span>}</td>
                        <td><span className="sf-pill" style={{ background: status.bg, color: status.color }}>{status.label}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-3 border-t sf-divider flex items-center justify-between" style={{ background: "#FAFAF9" }}>
              <div className="sf-meta">Each investor placed in its bucket. Audit trail captured.</div>
              <div className="flex items-center gap-2">
                <button onClick={onBack} className="sf-btn-neutral">Back</button>
                <button onClick={onConfirm} className="sf-btn-primary flex items-center gap-1.5"><Check size={11} /> Add {routedResults.length} to universe</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// REVERIFY MODAL
// ============================================================================
function ReverifyModal({ reverifying, reverifyResults, reverifyProgress, onRun, onClose, totalCount, overdueCount }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.4)" }} onClick={() => !reverifying && onClose()}>
      <div className="sf-card sf-card-shadow w-full max-w-2xl max-h-[90vh] overflow-y-auto scrollbar-thin fade-in" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-3 border-b sf-divider flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RefreshCw size={14} className="text-[#0176D3]" />
            <div className="sf-h3">Quarterly Re-Verification</div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
        </div>

        {!reverifyResults && !reverifying && (
          <>
            <div className="px-5 py-4">
              <div className="sf-body" style={{ marginBottom: "12px" }}>
                Re-runs the three-gate pipeline against all <span style={{ fontWeight: 600 }}>{totalCount}</span> investors using fresh registry and CRM data.
                {overdueCount > 0 && <span> <span style={{ fontWeight: 600, color: "#C2410C" }}>{overdueCount}</span> are overdue.</span>}
              </div>
              <div className="p-3 rounded" style={{ background: "#FAFAF9", border: "1px solid #ECEBEA" }}>
                <div className="sf-label-sm mb-2">For each investor:</div>
                <div className="space-y-1.5 sf-body-sm">
                  <div className="flex items-start gap-2"><Database size={11} className="text-[#0176D3] mt-0.5" /><span>Refresh AUM from SEC IA registry</span></div>
                  <div className="flex items-start gap-2"><UserCheck size={11} className="text-[#0176D3] mt-0.5" /><span>Re-check banker coverage in CRM</span></div>
                  <div className="flex items-start gap-2"><Activity size={11} className="text-[#C2410C] mt-0.5" /><span><span style={{ fontWeight: 600 }}>Coverage decay rule:</span> if no banker interaction in 24+ months, coverage is automatically stripped</span></div>
                  <div className="flex items-start gap-2"><Calendar size={11} className="text-[#0176D3] mt-0.5" /><span>Per-deal PSR check: coverage must predate deal launch (pre-existing substantive relationship)</span></div>
                  <div className="flex items-start gap-2"><Zap size={11} className="text-[#0176D3] mt-0.5" /><span>Recompute eligibility status; route to appropriate bucket if changed</span></div>
                  <div className="flex items-start gap-2"><History size={11} className="text-[#0176D3] mt-0.5" /><span>Append entries to audit trail</span></div>
                </div>
              </div>
            </div>
            <div className="px-5 py-3 border-t sf-divider flex items-center justify-between" style={{ background: "#FAFAF9" }}>
              <div className="sf-meta">Substantive relationship gate is enforced — stale coverage will be removed.</div>
              <div className="flex items-center gap-2">
                <button onClick={onClose} className="sf-btn-neutral">Cancel</button>
                <button onClick={onRun} className="sf-btn-primary flex items-center gap-1.5"><RefreshCw size={11} /> Run on all {totalCount}</button>
              </div>
            </div>
          </>
        )}

        {reverifying && (
          <div className="px-5 py-8 text-center">
            <Loader2 size={24} className="animate-spin mx-auto mb-3 text-[#0176D3]" />
            <div className="sf-h3 mb-1">Re-verifying {reverifyProgress?.done || 0} of {reverifyProgress?.total || totalCount}…</div>
            <div className="sf-meta">Refreshing registry, checking CRM, applying coverage decay rule</div>
            <div className="mt-4 mx-auto" style={{ maxWidth: "300px", height: "4px", background: "#ECEBEA", borderRadius: "2px", overflow: "hidden" }}>
              <div style={{ width: `${((reverifyProgress?.done || 0) / (reverifyProgress?.total || 1)) * 100}%`, height: "100%", background: "#0176D3", transition: "width 0.2s" }} />
            </div>
          </div>
        )}

        {reverifyResults && (
          <>
            <div className="px-5 py-3 border-b sf-divider" style={{ background: "#F8FAFD" }}>
              <div className="flex items-center gap-2"><Check size={13} className="text-[#2E844A]" /><span className="sf-h3">Re-verification complete</span></div>
            </div>
            <div className="px-5 py-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                <div className="bucket-card"><div className="sf-label-sm" style={{ marginBottom: "4px" }}>Unchanged</div><div className="sf-h2 mono">{reverifyResults.unchanged}</div></div>
                <div className="bucket-card"><div className="sf-label-sm" style={{ marginBottom: "4px" }}>Status flipped</div><div className="sf-h2 mono" style={{ color: "#0176D3" }}>{reverifyResults.statusFlipped}</div></div>
                <div className="bucket-card"><div className="sf-label-sm" style={{ marginBottom: "4px" }}>Newly verified</div><div className="sf-h2 mono" style={{ color: "#2E844A" }}>{reverifyResults.gainedVerified}</div></div>
                <div className="bucket-card"><div className="sf-label-sm" style={{ marginBottom: "4px" }}>Lost coverage</div><div className="sf-h2 mono" style={{ color: "#BA0517" }}>{reverifyResults.lostCoverage}</div></div>
              </div>
              {reverifyResults.changes.length > 0 ? (
                <div>
                  <div className="sf-label mb-2">Changes ({reverifyResults.changes.length})</div>
                  <div className="space-y-1.5 max-h-72 overflow-y-auto scrollbar-thin">
                    {reverifyResults.changes.map((c, i) => (
                      <div key={i} className="px-3 py-2 rounded text-xs" style={{ background: "#FAFAF9", border: "1px solid #ECEBEA" }}>
                        <div style={{ fontWeight: 600, fontSize: "12px", marginBottom: "2px" }}>{c.name}</div>
                        {c.changes.map((ch, j) => <div key={j} className="sf-body-sm" style={{ color: "#444" }}>→ {ch}</div>)}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="sf-body-sm" style={{ color: "#706E6B" }}>All {reverifyResults.unchanged} investors re-verified with no material changes.</div>
              )}
            </div>
            <div className="px-5 py-3 border-t sf-divider flex justify-end" style={{ background: "#FAFAF9" }}>
              <button onClick={onClose} className="sf-btn-primary flex items-center gap-1.5"><Check size={11} /> Done</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// DETAIL PANEL — now with Overview / Audit Trail tabs
// ============================================================================
function InvestorDetailPanel({ investor, onClose }) {
  const [activeTab, setActiveTab] = useState("overview");
  const t = INVESTOR_TYPES[investor.type];
  const Icon = t.icon;
  const status = STATUSES[investor.verificationStatus];
  const overdue = isOverdueForReview(investor.lastFullReview);
  const coverageStale = investor.coverage && isCoverageStale(investor.lastInteraction);

  return (
    <div>
      <div className="px-5 py-3 border-b sf-divider flex items-center justify-between sticky top-0 bg-white z-10">
        <div className="flex items-center gap-2">
          <Icon size={14} style={{ color: t.color }} />
          <span className="sf-label-sm">{t.label}</span>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
      </div>

      <div className="px-5 py-4 border-b sf-divider">
        <div className="sf-h2" style={{ marginBottom: "6px" }}>{investor.name}</div>
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className="sf-pill" style={{ background: status.bg, color: status.color }}>{status.label}</span>
          {investor.crd && <span className="mono text-xs" style={{ color: "#706E6B" }}>CRD {investor.crd}</span>}
          {overdue && <span className="sf-pill" style={{ background: "#FEDBD8", color: "#BA0517" }}>Review overdue</span>}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="sf-label-sm" style={{ marginBottom: "2px" }}>AUM</div>
            <div className="sf-h3 mono">{formatAUM(investor.aum)}</div>
            <div className="sf-meta">Source: {investor.aumSource}</div>
          </div>
          <div>
            <div className="sf-label-sm" style={{ marginBottom: "2px" }}>Last full review</div>
            <div className="sf-body-sm">{formatRelative(investor.lastFullReview)}</div>
            <div className="sf-meta">{overdue ? `Quarterly review due` : `Within quarterly window`}</div>
          </div>
        </div>
      </div>

      {/* Tab nav */}
      <div className="border-b sf-divider flex items-center px-5 sticky top-[49px] bg-white z-10">
        <button onClick={() => setActiveTab("overview")} className={`sf-tab ${activeTab === "overview" ? "sf-tab-active" : ""}`}>Overview</button>
        <button onClick={() => setActiveTab("audit")} className={`sf-tab ${activeTab === "audit" ? "sf-tab-active" : ""}`}>
          Audit Trail
          {investor.auditLog?.length > 0 && <span className="ml-1.5 sf-meta">({investor.auditLog.length})</span>}
        </button>
      </div>

      {activeTab === "overview" && (
        <div>
          {/* Coverage section */}
          <div className="px-5 py-3 border-b sf-divider" style={{ background: investor.coverage ? "#F4FBF6" : "#FFF4F4" }}>
            <div className="flex items-center justify-between mb-2">
              <div className="sf-label flex items-center gap-1.5">
                <Database size={11} className="text-[#0176D3]" /> Banker Coverage <span className="sf-meta" style={{ textTransform: "none", letterSpacing: 0 }}>(via Compass CRM)</span>
              </div>
              <a href="#" onClick={(e) => e.preventDefault()} className="sf-link text-xs flex items-center gap-1">View in Compass <ExternalLink size={10} /></a>
            </div>
            {investor.coverage ? (
              <div>
                <div className="grid grid-cols-2 gap-3 mb-2">
                  <div>
                    <div className="sf-label-sm" style={{ marginBottom: "2px" }}>Assigned banker</div>
                    <div className="sf-body-sm" style={{ fontWeight: 600 }}>{investor.coverage.banker}</div>
                    <div className="sf-meta">{investor.coverage.desk}</div>
                  </div>
                  <div>
                    <div className="sf-label-sm" style={{ marginBottom: "2px" }}>PSR established</div>
                    <div className="sf-body-sm">{investor.coverage.since}</div>
                    <div className="sf-meta">Substantive relationship documented</div>
                  </div>
                </div>
                <div className="pt-2 border-t" style={{ borderColor: "rgba(0,0,0,0.08)" }}>
                  <div className="sf-label-sm flex items-center gap-1.5" style={{ marginBottom: "2px" }}>
                    <Activity size={10} /> Last interaction
                  </div>
                  <div className="sf-body-sm">
                    {investor.lastInteraction ? formatRelative(investor.lastInteraction) : "No interactions logged"}
                    {coverageStale && <span className="sf-pill ml-2" style={{ background: "#FEDBD8", color: "#BA0517" }}>Stale (24mo+)</span>}
                  </div>
                  {coverageStale && <div className="sf-meta mt-1" style={{ color: "#BA0517" }}>Coverage will be stripped on next quarterly review unless interaction is logged.</div>}
                </div>
              </div>
            ) : (
              <div>
                <div className="sf-body-sm" style={{ color: "#BA0517", fontWeight: 500, marginBottom: "4px" }}>No banker coverage found in CRM</div>
                <div className="sf-meta" style={{ color: "#444" }}>Substantive relationship is required by SEC rules for 506(b) offerings and platform policy for all deals. This investor cannot be marketed to until coverage is established.</div>
                <div className="mt-2 flex gap-2">
                  <button className="sf-btn-primary flex items-center gap-1.5"><UserCheck size={11} /> Request coverage</button>
                  <button className="sf-btn-neutral flex items-center gap-1.5"><LinkIcon size={11} /> Manually link</button>
                </div>
              </div>
            )}
          </div>

          {investor.flagReason && (
            <div className="px-5 py-3 border-b sf-divider" style={{ background: "#FEF8E7" }}>
              <div className="sf-label-sm flex items-center gap-1.5" style={{ marginBottom: "4px", color: "#8C4B02" }}>
                <AlertCircle size={11} /> Why this status
              </div>
              <div className="sf-body-sm" style={{ color: "#444" }}>{investor.flagReason}</div>
            </div>
          )}

          {investor.attestationNote && (
            <div className="px-5 py-3 border-b sf-divider" style={{ background: "#F8FAFD" }}>
              <div className="sf-label-sm flex items-center gap-1.5" style={{ marginBottom: "4px", color: "#0176D3" }}>
                <FileCheck size={11} /> Attestation note <Sparkles size={9} />
              </div>
              <div className="sf-body-sm" style={{ color: "#444" }}>{investor.attestationNote}</div>
            </div>
          )}

          {investor.classificationReasoning && (
            <div className="px-5 py-3 border-b sf-divider">
              <div className="sf-label-sm flex items-center gap-1.5" style={{ marginBottom: "4px" }}>
                Classification reasoning <Sparkles size={9} className="text-[#0176D3]" />
              </div>
              <div className="sf-body-sm" style={{ color: "#444" }}>{investor.classificationReasoning}</div>
              <div className="sf-meta" style={{ marginTop: "4px" }}>Confidence: {investor.typeConfidence}</div>
            </div>
          )}

          <div className="px-5 py-3 border-b sf-divider">
            <div className="sf-label" style={{ marginBottom: "8px" }}>Eligibility across deals (4-gate check)</div>
            <div className="space-y-1.5">
              {Object.entries(DEALS).map(([key, deal]) => {
                const reg = REG_STANDARDS[deal.standard];
                const effective = getEffectiveThreshold(deal.standard);
                const aumKnown = investor.aum != null;
                const aumClearsRegulatory = aumKnown && investor.aum >= reg.threshold;
                const aumClearsFloor = aumKnown && investor.aum >= effective;
                const coverageGateOk = !!investor.coverage;
                // PSR-predates-launch check
                let psrOk = false;
                let psrReason = "No coverage";
                if (investor.coverage) {
                  const coverageStart = new Date(investor.coverage.since + "-01");
                  const dealLaunch = new Date(deal.launchDate);
                  psrOk = coverageStart < dealLaunch;
                  if (!psrOk) {
                    psrReason = `Coverage started ${investor.coverage.since}, deal launched ${deal.launchDate.slice(0, 7)}`;
                  }
                }
                const eligible = aumClearsRegulatory && aumClearsFloor && coverageGateOk && psrOk;
                return (
                  <div key={key} className="py-2 px-2 rounded text-xs" style={{ background: eligible ? "#F4FBF6" : "#FAFAF9" }}>
                    <div className="flex items-center justify-between mb-1">
                      <div style={{ fontWeight: 600, fontSize: "12px" }}>{deal.codename}</div>
                      <span className="sf-meta">{reg.short} · launched {deal.launchDate.slice(0, 7)}</span>
                    </div>
                    <div className="flex items-center gap-3 sf-meta flex-wrap">
                      <span style={{ color: !aumKnown ? "#706E6B" : aumClearsRegulatory ? "#2E844A" : "#BA0517" }}>{!aumKnown ? "?" : aumClearsRegulatory ? "✓" : "✗"} Reg</span>
                      <span style={{ color: !aumKnown ? "#706E6B" : aumClearsFloor ? "#2E844A" : "#BA0517" }}>{!aumKnown ? "?" : aumClearsFloor ? "✓" : "✗"} Floor</span>
                      <span style={{ color: coverageGateOk ? "#2E844A" : "#BA0517" }}>{coverageGateOk ? "✓" : "✗"} Coverage</span>
                      <span style={{ color: psrOk ? "#2E844A" : "#BA0517" }} title={psrReason}>{psrOk ? "✓" : "✗"} PSR pre-existing</span>
                      <span className="ml-auto" style={{ fontWeight: 600, color: eligible ? "#2E844A" : "#706E6B" }}>{eligible ? "Eligible" : "Not eligible"}</span>
                    </div>
                    {investor.coverage && !psrOk && (
                      <div className="sf-meta mt-1" style={{ color: "#BA0517" }}>{psrReason} — relationship is not pre-existing relative to this deal.</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="px-5 py-3 flex items-center gap-2 flex-wrap" style={{ background: "#FAFAF9" }}>
            <button className="sf-btn-primary flex items-center gap-1.5"><RefreshCw size={11} /> Re-verify</button>
            <button className="sf-btn-neutral flex items-center gap-1.5"><Send size={11} /> Request attestation</button>
            <button className="sf-btn-neutral flex items-center gap-1.5"><Copy size={11} /> Copy review packet</button>
          </div>
        </div>
      )}

      {activeTab === "audit" && (
        <div className="px-5 py-4">
          {investor.auditLog && investor.auditLog.length > 0 ? (
            <div className="space-y-3">
              {[...investor.auditLog].reverse().map((entry, i) => (
                <AuditEntry key={i} entry={entry} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 sf-meta">No audit entries recorded yet.</div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// AUDIT ENTRY ROW
// ============================================================================
function AuditEntry({ entry }) {
  const ACTION_META = {
    ingested: { icon: Plus, color: "#706E6B", label: "Ingested" },
    classified: { icon: Sparkles, color: "#0176D3", label: "Classified" },
    registry_match: { icon: Database, color: "#0176D3", label: "Registry Match" },
    coverage_match: { icon: UserCheck, color: "#2E844A", label: "Coverage Found" },
    coverage_check: { icon: UserX, color: "#706E6B", label: "Coverage Check" },
    coverage_lapsed: { icon: UserX, color: "#BA0517", label: "Coverage Lapsed" },
    routed: { icon: ArrowRight, color: "#0176D3", label: "Routed" },
    verified: { icon: ShieldCheck, color: "#2E844A", label: "Verified" },
    borderline: { icon: AlertCircle, color: "#8C4B02", label: "Borderline" },
    quarterly_review: { icon: RefreshCw, color: "#0176D3", label: "Quarterly Review" },
    interaction_logged: { icon: Activity, color: "#0F766E", label: "Interaction" },
    aum_updated: { icon: TrendingUp, color: "#0176D3", label: "AUM Updated" },
    status_changed: { icon: ArrowRight, color: "#C2410C", label: "Status Changed" },
    attestation_received: { icon: FileCheck, color: "#0176D3", label: "Attestation" },
  };
  const meta = ACTION_META[entry.action] || { icon: HelpIcon, color: "#706E6B", label: entry.action };
  const Icon = meta.icon;
  const isSystem = entry.actor === "system" || entry.actor === "Claude";

  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: `${meta.color}15`, border: `1px solid ${meta.color}40` }}>
          <Icon size={12} style={{ color: meta.color }} />
        </div>
      </div>
      <div className="flex-1 min-w-0 pb-3" style={{ borderBottom: "1px solid #ECEBEA" }}>
        <div className="flex items-baseline justify-between gap-2 flex-wrap">
          <div style={{ fontSize: "13px", fontWeight: 600, color: meta.color }}>{meta.label}</div>
          <div className="sf-meta mono">{formatTimestamp(entry.timestamp)}</div>
        </div>
        <div className="sf-body-sm mt-0.5" style={{ color: "#444" }}>{entry.details}</div>
        <div className="flex items-center gap-2 mt-1.5">
          <span className="sf-pill" style={{
            background: isSystem ? "#E5F3FF" : "#F4FBF6",
            color: isSystem ? "#014486" : "#2E844A",
            fontSize: "10px",
          }}>
            {entry.actor === "Claude" ? <><Sparkles size={9} /> Claude</> : entry.actor === "system" ? "System" : entry.actor}
          </span>
          {entry.outcome && (
            <span className="sf-pill" style={{ background: STATUSES[entry.outcome]?.bg || "#ECEBEA", color: STATUSES[entry.outcome]?.color || "#706E6B", fontSize: "10px" }}>
              → {STATUSES[entry.outcome]?.label || entry.outcome}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * MemberDashboard.jsx
 * DANK Cannabis Club — Staff Member Dashboard
 * วางไฟล์นี้ที่ src/components/MemberDashboard.jsx
 *
 * Features:
 *   - Top 10 Spending Members
 *   - Birthday This Month
 *   - Member Stats (total, tier breakdown)
 */

import { useEffect, useState } from "react";
import Papa from "papaparse";

const CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTwGEAAU2YtXrj9VsS0sLNTeCkAuzSfgYWgyZYjnHWJ7yniymo4_TxIwP1O8P1QHvtYnvlXSuvdE7zP/pub?output=csv";

const TIER_COLOR = {
  VIP: { bg: "#fef3c7", text: "#92400e", border: "#f59e0b" },
  Gold: { bg: "#fef9c3", text: "#713f12", border: "#eab308" },
  Silver: { bg: "#f1f5f9", text: "#475569", border: "#94a3b8" },
};

const MONTH_TH = [
  "มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน",
  "กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม",
];

export default function MemberDashboard({ onBack }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  const thisMonth = new Date().getMonth(); // 0-based
  const thisMonthLabel = MONTH_TH[thisMonth];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch(CSV_URL + "&t=" + Date.now()); // cache-bust
      const csv = await res.text();
      Papa.parse(csv, {
        header: true,
        skipEmptyLines: true,
        complete: ({ data }) => {
          setMembers(data);
          setLastUpdated(new Date());
          setLoading(false);
        },
      });
    } catch {
      setLoading(false);
    }
  };

  // ── Derived data ──────────────────────────────────────────────
  const topSpenders = [...members]
    .sort(
      (a, b) =>
        Number(b["Total Spending"] || 0) - Number(a["Total Spending"] || 0)
    )
    .slice(0, 10);

  const birthdayThisMonth = members.filter((m) => {
    const raw = m["Birthdate"] || m["birthdate"] || m["Birth Date"] || m["วันเกิด"] || "";
    if (!raw) return false;
    const d = new Date(raw);
    return !isNaN(d) && d.getMonth() === thisMonth;
  }).sort((a, b) => {
    const dayA = new Date(a["Birthdate"] || a["birthdate"] || "").getDate();
    const dayB = new Date(b["Birthdate"] || b["birthdate"] || "").getDate();
    return dayA - dayB;
  });

  const tierCount = members.reduce((acc, m) => {
    const t = m["Membership Tier"] || "Unknown";
    acc[t] = (acc[t] || 0) + 1;
    return acc;
  }, {});

  const totalSpend = members.reduce(
    (sum, m) => sum + Number(m["Total Spending"] || 0), 0
  );

  const avgSpend = members.length ? Math.round(totalSpend / members.length) : 0;

  // ── Render ────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: "#0f1117", color: "#e5e7eb", fontFamily: "sans-serif" }}>
      {/* Header */}
      <div style={{
        background: "#1a1f2e",
        borderBottom: "1px solid #2d3748",
        padding: "16px 24px",
        display: "flex",
        alignItems: "center",
        gap: "16px",
      }}>
        <button
          onClick={onBack}
          style={{
            background: "none",
            border: "1px solid #4a5568",
            color: "#9ca3af",
            padding: "6px 14px",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "13px",
          }}
        >
          ← กลับ
        </button>
        <div>
          <div style={{ fontSize: "18px", fontWeight: 700, color: "#4ade80" }}>
            🌿 DANK Member Dashboard
          </div>
          <div style={{ fontSize: "11px", color: "#6b7280", marginTop: "2px" }}>
            {lastUpdated
              ? `อัปเดต ${lastUpdated.toLocaleTimeString("th-TH")}`
              : "กำลังโหลด..."}
          </div>
        </div>
        <button
          onClick={loadData}
          style={{
            marginLeft: "auto",
            background: "#16a34a",
            border: "none",
            color: "white",
            padding: "8px 16px",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "13px",
          }}
        >
          🔄 Refresh
        </button>
      </div>

      <div style={{ padding: "24px", maxWidth: "1100px", margin: "0 auto" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "80px", color: "#6b7280" }}>
            <div style={{ fontSize: "32px", marginBottom: "12px" }}>⏳</div>
            <div>กำลังดึงข้อมูลจาก Google Sheet...</div>
          </div>
        ) : (
          <>
            {/* ── KPI Row ── */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px", marginBottom: "28px" }}>
              <KpiCard icon="👥" label="สมาชิกทั้งหมด" value={members.length.toLocaleString()} color="#4ade80" />
              <KpiCard icon="👑" label="VIP" value={tierCount["VIP"] || 0} color="#f59e0b" />
              <KpiCard icon="🥇" label="Gold" value={tierCount["Gold"] || 0} color="#eab308" />
              <KpiCard icon="🥈" label="Silver" value={tierCount["Silver"] || 0} color="#94a3b8" />
              <KpiCard icon="💰" label="Avg Spending" value={`฿${avgSpend.toLocaleString()}`} color="#818cf8" />
              <KpiCard icon="🎂" label={`เกิดเดือน${thisMonthLabel}`} value={birthdayThisMonth.length} color="#f472b6" />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
              {/* ── Top Spending ── */}
              <div style={cardStyle}>
                <div style={cardHeaderStyle}>
                  <span>🏆 Top Spending Members</span>
                  <span style={{ fontSize: "12px", color: "#6b7280" }}>Top {topSpenders.length}</span>
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                  <thead>
                    <tr style={{ color: "#6b7280", borderBottom: "1px solid #2d3748" }}>
                      <th style={thStyle}>#</th>
                      <th style={thStyle}>ชื่อ</th>
                      <th style={thStyle}>Tier</th>
                      <th style={{ ...thStyle, textAlign: "right" }}>ยอดรวม</th>
                      <th style={{ ...thStyle, textAlign: "right" }}>Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topSpenders.map((m, i) => {
                      const tier = m["Membership Tier"] || "Silver";
                      const tc = TIER_COLOR[tier] || TIER_COLOR.Silver;
                      return (
                        <tr key={i} style={{ borderBottom: "1px solid #1e2433" }}>
                          <td style={tdStyle}>
                            <span style={{ color: i < 3 ? ["#f59e0b","#94a3b8","#b45309"][i] : "#6b7280", fontWeight: 700 }}>
                              {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                            </span>
                          </td>
                          <td style={tdStyle}>{m["Crm Name"] || "—"}</td>
                          <td style={tdStyle}>
                            <span style={{
                              background: tc.bg,
                              color: tc.text,
                              border: `1px solid ${tc.border}`,
                              padding: "2px 8px",
                              borderRadius: "20px",
                              fontSize: "11px",
                              fontWeight: 600,
                            }}>
                              {tier}
                            </span>
                          </td>
                          <td style={{ ...tdStyle, textAlign: "right", color: "#4ade80", fontWeight: 600 }}>
                            ฿{Number(m["Total Spending"] || 0).toLocaleString()}
                          </td>
                          <td style={{ ...tdStyle, textAlign: "right", color: "#818cf8" }}>
                            {Number(m["Points"] || 0).toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* ── Birthday This Month ── */}
              <div style={cardStyle}>
                <div style={cardHeaderStyle}>
                  <span>🎂 วันเกิดเดือน{thisMonthLabel}</span>
                  <span style={{ fontSize: "12px", color: "#6b7280" }}>{birthdayThisMonth.length} คน</span>
                </div>

                {birthdayThisMonth.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "40px", color: "#4b5563" }}>
                    <div style={{ fontSize: "32px" }}>🎉</div>
                    <div style={{ marginTop: "8px", fontSize: "13px" }}>ไม่มีสมาชิกเกิดเดือนนี้</div>
                    {members.length > 0 && (
                      <div style={{ marginTop: "8px", fontSize: "11px", color: "#6b7280" }}>
                        (Sheet อาจไม่มีคอลัมน์ Birthdate — ตรวจสอบชื่อคอลัมน์)
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "440px", overflowY: "auto" }}>
                    {birthdayThisMonth.map((m, i) => {
                      const raw = m["Birthdate"] || m["birthdate"] || m["Birth Date"] || m["วันเกิด"] || "";
                      const d = new Date(raw);
                      const day = d.getDate();
                      const today = new Date().getDate();
                      const isToday = day === today;
                      const tier = m["Membership Tier"] || "Silver";
                      const tc = TIER_COLOR[tier] || TIER_COLOR.Silver;
                      return (
                        <div key={i} style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "12px",
                          padding: "10px 12px",
                          background: isToday ? "rgba(244,114,182,.08)" : "#1a1f2e",
                          border: `1px solid ${isToday ? "#f472b6" : "#2d3748"}`,
                          borderRadius: "10px",
                        }}>
                          <div style={{
                            width: "38px",
                            height: "38px",
                            background: isToday ? "rgba(244,114,182,.15)" : "#0f1117",
                            border: `1px solid ${isToday ? "#f472b6" : "#374151"}`,
                            borderRadius: "10px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "18px",
                            flexShrink: 0,
                          }}>
                            {isToday ? "🎂" : "🎁"}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, color: isToday ? "#f472b6" : "#e5e7eb", fontSize: "14px" }}>
                              {m["Crm Name"]}
                              {isToday && <span style={{ marginLeft: "6px", fontSize: "11px", background: "#f472b6", color: "white", padding: "1px 6px", borderRadius: "10px" }}>วันนี้!</span>}
                            </div>
                            <div style={{ fontSize: "11px", color: "#6b7280", marginTop: "2px" }}>
                              {d.toLocaleDateString("th-TH", { day: "numeric", month: "long" })} · {m["Phone Number"]}
                            </div>
                          </div>
                          <span style={{
                            background: tc.bg,
                            color: tc.text,
                            border: `1px solid ${tc.border}`,
                            padding: "2px 8px",
                            borderRadius: "20px",
                            fontSize: "11px",
                            fontWeight: 600,
                            flexShrink: 0,
                          }}>
                            {tier}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Upcoming birthdays (next month preview) */}
                <div style={{ marginTop: "16px", padding: "10px 12px", background: "#1a1f2e", borderRadius: "8px", fontSize: "12px", color: "#6b7280" }}>
                  💡 วันเกิดแสดงโดยอัตโนมัติตามเดือนปัจจุบัน · ตอนนี้: {thisMonthLabel}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────
function KpiCard({ icon, label, value, color }) {
  return (
    <div style={{
      background: "#1a1f2e",
      border: "1px solid #2d3748",
      borderRadius: "12px",
      padding: "16px 20px",
    }}>
      <div style={{ fontSize: "20px", marginBottom: "6px" }}>{icon}</div>
      <div style={{ fontSize: "22px", fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "2px" }}>{label}</div>
    </div>
  );
}

const cardStyle = {
  background: "#1a1f2e",
  border: "1px solid #2d3748",
  borderRadius: "14px",
  padding: "20px",
  overflow: "hidden",
};

const cardHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "16px",
  fontSize: "15px",
  fontWeight: 700,
  color: "#e5e7eb",
};

const thStyle = {
  padding: "8px 10px",
  textAlign: "left",
  fontWeight: 600,
  fontSize: "12px",
};

const tdStyle = {
  padding: "10px",
  color: "#d1d5db",
};

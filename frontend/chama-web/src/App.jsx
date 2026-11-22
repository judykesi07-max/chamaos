import { useEffect, useState } from "react";

const API = "http://192.168.99.216:5035";

function App() {
  const [members, setMembers] = useState([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [search, setSearch] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [tab, setTab] = useState("home"); // home, loans, merry, ledger
  const [myName, setMyName] = useState(() => localStorage.getItem("chama_myName") || "");
  const [tempName, setTempName] = useState("");
  const [receipt, setReceipt] = useState(null);

  // Weekly payments: { memberId: true } for THIS week
  const [weeklyPaid, setWeeklyPaid] = useState(() => {
    try { return JSON.parse(localStorage.getItem("chama_weekly") || "{}"); } catch { return {}; }
  });
  const [weekNumber, setWeekNumber] = useState(() => localStorage.getItem("chama_week") || "1");

  // Loans with maths
  const [loanRequests, setLoanRequests] = useState(() => {
    try { return JSON.parse(localStorage.getItem("chama_loans") || "[]"); } catch { return []; }
  });
  const [loanName, setLoanName] = useState("");
  const [loanAmountInput, setLoanAmountInput] = useState("");
  const [loanWeeks, setLoanWeeks] = useState(4);

  // Merry-go-round order
  const [merryOrder, setMerryOrder] = useState(() => {
    try { return JSON.parse(localStorage.getItem("chama_merry") || "[]"); } catch { return []; }
  });
  const [merryIndex, setMerryIndex] = useState(() => Number(localStorage.getItem("chama_merry_index") || "0"));

  // Ledger - CANNOT be cleared from UI anymore, only in Settings with double confirm
  const [history, setHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem("chama_history") || "[]"); } catch { return []; }
  });

  const [settings, setSettings] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("chama_settings") || JSON.stringify({
        chamaName: "Vidazini Youth Chama", location: "Vidazini", weeklyAmount: 1000, meetingDay: "Monday", darkMode: false, interestRate: 10, fineAmount: 100,
      }));
    } catch { return { chamaName: "Vidazini Youth Chama", location: "Vidazini", weeklyAmount: 1000, meetingDay: "Monday", darkMode: false, interestRate: 10, fineAmount: 100 }; }
  });

  const saveSettings = (ns) => { setSettings(ns); localStorage.setItem("chama_settings", JSON.stringify(ns)); };
  const saveWeekly = (w) => { setWeeklyPaid(w); localStorage.setItem("chama_weekly", JSON.stringify(w)); };
  const saveLoans = (l) => { setLoanRequests(l); localStorage.setItem("chama_loans", JSON.stringify(l)); };
  const saveMerry = (o, idx) => { setMerryOrder(o); setMerryIndex(idx); localStorage.setItem("chama_merry", JSON.stringify(o)); localStorage.setItem("chama_merry_index", String(idx)); };

  const total = members.reduce((s, m) => s + m.totalContributed, 0);
  const totalLoans = members.reduce((s, m) => s + (m.loanBalance || 0), 0);
  const paidCount = members.filter(m => weeklyPaid[m.id]).length;
  const notPaid = members.filter(m => !weeklyPaid[m.id]);
  const expectedThisWeek = members.length * settings.weeklyAmount;
  const collectedThisWeek = paidCount * settings.weeklyAmount;

  const addHistory = (text, type) => {
    const entry = { id: Date.now(), text, type, time: new Date().toLocaleString("en-KE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) };
    const updated = [entry, ...history].slice(0, 200);
    setHistory(updated); localStorage.setItem("chama_history", JSON.stringify(updated));
  };

  const loadMembers = () => fetch(`${API}/api/members`).then(r => r.json()).then(d => setMembers(d));
  useEffect(() => { loadMembers(); }, []);

  const saveMyName = () => {
    if (!tempName.trim()) return;
    setMyName(tempName.trim()); localStorage.setItem("chama_myName", tempName.trim());
  };

  // WEEKLY PAY - simulated M-Pesa
  const payThisWeek = async (m) => {
    if (weeklyPaid[m.id]) return;
    // In real M-Pesa, this is where STK Push happens. For now we simulate confirmation
    const confirmPay = window.confirm(`Simulate M-Pesa STK Push?\n\n${m.name} will pay KES ${settings.weeklyAmount.toLocaleString()}\nM-Pesa popup would appear on ${m.phone}`);
    if (!confirmPay) return;
    await fetch(`${API}/api/members/${m.id}/contribute`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amount: settings.weeklyAmount }) });
    const nw = { ...weeklyPaid, [m.id]: true }; saveWeekly(nw);
    addHistory(`💚 ${m.name} PAID Week ${weekNumber} — KES ${settings.weeklyAmount.toLocaleString()} — M-Pesa QK${Math.floor(1000000 + Math.random()*9000000)}`, "contribution");
    setReceipt({ title: `Week ${weekNumber} Payment`, name: m.name, amount: settings.weeklyAmount, type: "contribution", code: "QK" + Math.floor(1000000 + Math.random()*9000000), extra: "M-Pesa Confirmed ✅" });
    loadMembers();
  };

  const startNewWeek = () => {
    if (!window.confirm(`Start Week ${Number(weekNumber)+1}? This will reset all PAID ticks to NOT PAID and add KES ${settings.fineAmount} fine note for those who missed.`)) return;
    // Add fine note for not paid
    notPaid.forEach(m => addHistory(`⚠️ ${m.name} missed Week ${weekNumber} — Fine KES ${settings.fineAmount} (rule agreed)`, "fine"));
    const nw = Number(weekNumber)+1; setWeekNumber(String(nw)); localStorage.setItem("chama_week", String(nw));
    saveWeekly({});
    addHistory(`📅 New Week Started — Week ${nw} — Everyone owes KES ${settings.weeklyAmount.toLocaleString()}`, "member");
  };

  const sendReminder = (m) => {
    const msg = `Hi ${m.name}, this is ${settings.chamaName}. You have NOT paid KES ${settings.weeklyAmount.toLocaleString()} for Week ${weekNumber} (${settings.meetingDay}). Please pay today. Thank you! 💚`;
    window.open(`https://wa.me/${m.phone.replace(/^0/, "254")}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  // LOAN MATHS - Faith Example
  const loanCalc = (principal, weeks) => {
    const interest = Math.round(principal * settings.interestRate / 100);
    const totalPay = principal + interest;
    const weekly = Math.ceil(totalPay / weeks);
    return { interest, totalPay, weekly };
  };
  const preview = loanAmountInput ? loanCalc(Number(loanAmountInput), loanWeeks) : null;

  const requestLoan = () => {
    if (!loanName || !loanAmountInput) return alert("Pick member and amount");
    const calc = loanCalc(Number(loanAmountInput), loanWeeks);
    const req = { id: Date.now(), name: loanName, principal: Number(loanAmountInput), weeks: loanWeeks, interest: calc.interest, totalPay: calc.totalPay, weekly: calc.weekly, paidSoFar: 0, remaining: calc.totalPay, status: "pending", date: new Date().toLocaleDateString("en-KE") };
    saveLoans([req, ...loanRequests]);
    addHistory(`📝 ${loanName} requested loan KES ${req.principal.toLocaleString()} — Total to pay KES ${req.totalPay.toLocaleString()} (${req.weekly.toLocaleString()}/week x ${req.weeks} weeks)`, "loan");
  };

  const approveLoan = async (req) => {
    const member = members.find(m => m.name === req.name);
    if (member) {
      await fetch(`${API}/api/members/${member.id}/loan`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amount: req.principal }) });
    }
    const updated = loanRequests.map(l => l.id === req.id ? { ...l, status: "approved" } : l);
    saveLoans(updated);
    addHistory(`✅ Loan APPROVED for ${req.name} — KES ${req.principal.toLocaleString()} sent`, "loan");
    setReceipt({ title: "Loan Approved & Sent", name: req.name, amount: req.principal, type: "loan", code: "LN" + Math.floor(100000 + Math.random()*900000), extra: `Pay KES ${req.weekly.toLocaleString()} / week for ${req.weeks} weeks. Total KES ${req.totalPay.toLocaleString()}` });
    loadMembers();
  };

  const payLoanWeek = async (req) => {
    const member = members.find(m => m.name === req.name);
    if (member) {
      await fetch(`${API}/api/members/${member.id}/repay`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amount: req.weekly }) });
    }
    const newRemaining = req.remaining - req.weekly;
    const updated = loanRequests.map(l => l.id === req.id ? { ...l, paidSoFar: l.paidSoFar + req.weekly, remaining: Math.max(0, newRemaining), status: newRemaining <= 0 ? "finished" : "approved" } : l);
    saveLoans(updated);
    addHistory(`✅ ${req.name} paid loan week — KES ${req.weekly.toLocaleString()} — Remaining KES ${Math.max(0, newRemaining).toLocaleString()}`, "repay");
    loadMembers();
  };

  // MERRY-GO-ROUND
  const setupMerry = () => {
    if (members.length === 0) return;
    const order = members.map(m => m.name);
    saveMerry(order, 0);
    addHistory(`🔄 Merry-Go-Round started — Order: ${order.join(" → ")}`, "member");
  };
  const nextMerry = () => {
    const nextIdx = (merryIndex + 1) % merryOrder.length;
    saveMerry(merryOrder, nextIdx);
    addHistory(`🔄 Merry-Go-Round: Now it's ${merryOrder[nextIdx]}'s turn`, "member");
  };

  const isDark = settings.darkMode;
  const cardBg = isDark ? "#1E1E1E" : "white";
  const textColor = isDark ? "white" : "#222";
  const subText = isDark ? "#AAA" : "#888";
  const pageBg = isDark ? "#121212" : "linear-gradient(180deg, #F0F7F2, #E8F5EE 30%, #FDF6F0)";

  if (!myName) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", background: "linear-gradient(180deg, #11998e, #38ef7d)", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
        <div style={{ background: "white", padding: "32px 26px", borderRadius: "24px", maxWidth: "380px", width: "100%", textAlign: "center" }}>
          <div style={{ fontSize: "48px" }}>💚</div>
          <h2 style={{ margin: "12px 0 6px", fontSize: "26px", fontWeight: "800" }}>Karibu sana! ✨</h2>
          <p style={{ color: "#555", fontSize: "15px" }}>Welcome home, beautiful.<br/>Your chama family is waiting for you.</p>
          <p style={{ color: "#888", fontSize: "13.5px" }}>Tell us your name so we can make this place feel like yours.</p>
          <input placeholder="Your name, e.g. KayCee" value={tempName} onChange={e => setTempName(e.target.value)} onKeyDown={e => e.key === "Enter" && saveMyName()} style={{ width: "100%", padding: "14px", borderRadius: "14px", border: "1.5px solid #E6EDE8", fontSize: "15px", margin: "14px 0 12px" }} />
          <button onClick={saveMyName} style={{ width: "100%", background: "linear-gradient(135deg, #11998e, #38ef7d)", color: "white", border: "none", padding: "14px", borderRadius: "14px", fontWeight: "800" }}>Enter My Chama →</button>
        </div>
      </div>
    );
  }

  if (showSettings) {
    return (
      <div style={{ minHeight: "100vh", background: pageBg, padding: "20px", fontFamily: "'Segoe UI', system-ui, sans-serif", color: textColor }}>
        <div style={{ maxWidth: "600px", margin: "0 auto" }}>
          <div style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "18px" }}>
            <button onClick={() => setShowSettings(false)} style={{ background: cardBg, border: "1px solid #DDD", width: "40px", height: "40px", borderRadius: "50%" }}>←</button>
            <h2 style={{ margin: 0 }}>⚙️ Settings</h2>
          </div>
          <div style={{ background: cardBg, padding: "20px", borderRadius: "20px", marginBottom: "12px" }}>
            <h3 style={{ margin: "0 0 12px" }}>🏠 Chama Details</h3>
            <label style={{ fontSize: "13px", fontWeight: "700" }}>Chama Name</label>
            <input value={settings.chamaName} onChange={e => saveSettings({ ...settings, chamaName: e.target.value })} style={{ width: "100%", padding: "12px", borderRadius: "12px", border: "1.5px solid #E6EDE8", margin: "6px 0 12px" }} />
            <label style={{ fontSize: "13px", fontWeight: "700" }}>Weekly Amount (KES)</label>
            <input type="number" value={settings.weeklyAmount} onChange={e => saveSettings({ ...settings, weeklyAmount: Number(e.target.value) })} style={{ width: "100%", padding: "12px", borderRadius: "12px", border: "1.5px solid #E6EDE8", margin: "6px 0 12px" }} />
            <label style={{ fontSize: "13px", fontWeight: "700" }}>Loan Interest %</label>
            <input type="number" value={settings.interestRate} onChange={e => saveSettings({ ...settings, interestRate: Number(e.target.value) })} style={{ width: "100%", padding: "12px", borderRadius: "12px", border: "1.5px solid #E6EDE8", margin: "6px 0 12px" }} />
            <label style={{ fontSize: "13px", fontWeight: "700" }}>Fine for Missing Week (KES)</label>
            <input type="number" value={settings.fineAmount} onChange={e => saveSettings({ ...settings, fineAmount: Number(e.target.value) })} style={{ width: "100%", padding: "12px", borderRadius: "12px", border: "1.5px solid #E6EDE8", margin: "6px 0 12px" }} />
            <label style={{ fontSize: "13px", fontWeight: "700" }}>Your Name</label>
            <input value={tempName || myName} onChange={e => setTempName(e.target.value)} style={{ width: "100%", padding: "12px", borderRadius: "12px", border: "1.5px solid #E6EDE8", margin: "6px 0" }} />
            <button onClick={saveMyName} style={{ background: "#11998e", color: "white", border: "none", padding: "10px 16px", borderRadius: "10px", fontWeight: "800", marginTop: "6px" }}>Save Name</button>
          </div>
          <div style={{ background: cardBg, padding: "20px", borderRadius: "20px", marginBottom: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div><b>Dark Mode 🌙</b><div style={{ fontSize: "12px", color: subText }}>Easy on eyes at night</div></div>
            <button onClick={() => saveSettings({ ...settings, darkMode: !settings.darkMode })} style={{ background: settings.darkMode ? "#11998e" : "#DDD", border: "none", width: "52px", height: "28px", borderRadius: "20px", position: "relative" }}>
              <span style={{ position: "absolute", top: "3px", left: settings.darkMode ? "26px" : "3px", width: "22px", height: "22px", background: "white", borderRadius: "50%", display: "block" }} />
            </button>
          </div>
          <button onClick={() => setShowSettings(false)} style={{ width: "100%", background: "linear-gradient(135deg, #11998e, #38ef7d)", color: "white", border: "none", padding: "15px", borderRadius: "16px", fontWeight: "800" }}>✓ Done — Back to Chama</button>
          <p style={{ textAlign: "center", fontSize: "12px", color: subText, marginTop: "12px" }}>Ledger is protected — history cannot be deleted from home screen. Only reset here in Settings with double confirm.</p>
        </div>
      </div>
    );
  }

  const filtered = members.filter(m => m.name.toLowerCase().includes(search.toLowerCase()) || m.phone.includes(search));
  const sorted = [...filtered].sort((a,b) => (myName && a.name.toLowerCase()===myName.toLowerCase() ? 0:1) - (myName && b.name.toLowerCase()===myName.toLowerCase() ? 0:1));

  return (
    <div style={{ minHeight: "100vh", background: pageBg, padding: "20px", fontFamily: "'Segoe UI', system-ui, sans-serif", color: textColor }}>
      {receipt && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", zIndex: 999 }}>
          <div style={{ background: "white", color: "#222", borderRadius: "24px", padding: "26px 22px", maxWidth: "360px", width: "100%", textAlign: "center" }}>
            <div style={{ fontSize: "40px" }}>✅</div>
            <h3 style={{ margin: "8px 0" }}>{receipt.title}</h3>
            <div style={{ fontSize: "13px", color: "#888" }}>{new Date().toLocaleString("en-KE")}</div>
            <div style={{ borderTop: "1px dashed #DDD", margin: "16px 0", paddingTop: "14px", textAlign: "left", display: "flex", flexDirection: "column", gap: "8px", fontSize: "14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span>Member</span><b>{receipt.name}</b></div>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span>Amount</span><b>KES {receipt.amount.toLocaleString()}</b></div>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span>Code</span><b>{receipt.code}</b></div>
              {receipt.extra && <div style={{ background: "#E8F8F0", padding: "10px", borderRadius: "10px", fontSize: "13px" }}>{receipt.extra}</div>}
            </div>
            <button onClick={() => setReceipt(null)} style={{ width: "100%", background: "#11998e", color: "white", border: "none", padding: "13px", borderRadius: "14px", fontWeight: "800" }}>Done</button>
          </div>
        </div>
      )}

      <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div><div style={{ fontSize: "22px", fontWeight: "800" }}>Hi {myName.split(" ")[0]} 👋</div><div style={{ fontSize: "13px", color: subText }}>{settings.chamaName} • Week {weekNumber} • {settings.meetingDay}</div></div>
          <button onClick={() => setShowSettings(true)} style={{ background: cardBg, border: "1px solid #DDD", padding: "10px 14px", borderRadius: "20px", fontWeight: "700" }}>⚙️ Settings</button>
        </div>

        {/* MERRY-GO-ROUND BANNER */}
        {merryOrder.length > 0 && (
          <div style={{ background: "linear-gradient(135deg, #f6d365, #fda085)", color: "#5A3A00", padding: "16px 18px", borderRadius: "18px", marginTop: "16px" }}>
            <div style={{ fontSize: "12px", fontWeight: "800", letterSpacing: "1px" }}>🔄 MERRY-GO-ROUND • THIS WEEK</div>
            <div style={{ fontSize: "20px", fontWeight: "900", marginTop: "4px" }}>It's {merryOrder[merryIndex]}'s turn — KES {(members.length * settings.weeklyAmount).toLocaleString()}</div>
            <div style={{ fontSize: "13px", marginTop: "2px" }}>Next week: {merryOrder[(merryIndex+1)%merryOrder.length]} • <button onClick={nextMerry} style={{ background: "white", border: "none", padding: "6px 12px", borderRadius: "20px", fontWeight: "800", fontSize: "12px" }}>Mark as Paid → Next Person</button></div>
          </div>
        )}

        {/* WEEKLY STATUS */}
        <div style={{ display: "flex", gap: "12px", marginTop: "16px", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: "240px", background: "linear-gradient(135deg, #11998e, #38ef7d)", color: "white", padding: "20px", borderRadius: "20px" }}>
            <div style={{ fontSize: "12px", fontWeight: "700" }}>💚 WEEK {weekNumber} COLLECTED</div>
            <div style={{ fontSize: "28px", fontWeight: "900", margin: "6px 0" }}>KES {collectedThisWeek.toLocaleString()} / {expectedThisWeek.toLocaleString()}</div>
            <div style={{ fontSize: "13px" }}>{paidCount} paid ✅ • {notPaid.length} not paid ❌</div>
            <div style={{ background: "rgba(255,255,255,0.3)", height: "8px", borderRadius: "10px", marginTop: "10px", overflow: "hidden" }}><div style={{ width: `${expectedThisWeek ? (collectedThisWeek/expectedThisWeek)*100 : 0}%`, height: "100%", background: "white" }} /></div>
          </div>
          <div style={{ flex: 1, minWidth: "240px", background: cardBg, padding: "20px", borderRadius: "20px", boxShadow: "0 8px 20px rgba(0,0,0,0.06)" }}>
            <div style={{ fontSize: "12px", fontWeight: "700" }}>🧡 TOTAL SAVINGS (ALL TIME)</div>
            <div style={{ fontSize: "28px", fontWeight: "900", margin: "6px 0" }}>KES {total.toLocaleString()}</div>
            <div style={{ fontSize: "13px", color: subText }}>Loans out: KES {totalLoans.toLocaleString()}</div>
            <button onClick={startNewWeek} style={{ marginTop: "10px", background: "#222", color: "white", border: "none", padding: "10px 14px", borderRadius: "12px", fontWeight: "800", fontSize: "12px", width: "100%" }}>📅 Start New Week (Week {Number(weekNumber)+1})</button>
          </div>
        </div>

        {/* TABS */}
        <div style={{ display: "flex", gap: "8px", marginTop: "18px", overflowX: "auto" }}>
          {[
            { id: "home", label: "🏠 Home / Pay" },
            { id: "loans", label: "🏦 Loans" },
            { id: "merry", label: "🔄 Merry-Go-Round" },
            { id: "ledger", label: "📜 Ledger (Cannot Erase)" },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ background: tab===t.id ? "#11998e" : cardBg, color: tab===t.id ? "white" : textColor, border: "1px solid #DDD", padding: "11px 16px", borderRadius: "20px", fontWeight: "800", fontSize: "13px", whiteSpace: "nowrap" }}>{t.label}</button>
          ))}
        </div>

        {tab === "home" && (
          <>
            <div style={{ marginTop: "16px", position: "relative" }}>
              <span style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)" }}>🔍</span>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search member..." style={{ width: "100%", padding: "14px 14px 14px 44px", borderRadius: "16px", border: "1.5px solid #E6EDE8", background: cardBg, color: textColor }} />
            </div>

            {/* NOT PAID LIST */}
            {notPaid.length > 0 && (
              <div style={{ background: "#FFE8E8", padding: "14px 16px", borderRadius: "16px", marginTop: "14px" }}>
                <b style={{ color: "#C0392B" }}>⚠️ {notPaid.length} have NOT paid this week:</b> <span style={{ color: "#333" }}>{notPaid.map(m=>m.name).join(", ")}</span>
              </div>
            )}

            <form onSubmit={async (e) => { e.preventDefault(); await fetch(`${API}/api/members`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, phone, totalContributed: Number(amount) }) }); addHistory(`👤 ${name} joined with KES ${Number(amount).toLocaleString()}`, "member"); setName(""); setPhone(""); setAmount(""); loadMembers(); }} style={{ background: cardBg, padding: "18px", borderRadius: "18px", marginTop: "14px" }}>
              <h3 style={{ margin: "0 0 12px" }}>✨ Add Member</h3>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <input placeholder="Full name" value={name} onChange={e=>setName(e.target.value)} required style={{ flex: 1, padding: "12px", borderRadius: "12px", border: "1.5px solid #E6EDE8" }} />
                <input placeholder="Phone 07..." value={phone} onChange={e=>setPhone(e.target.value)} required style={{ flex: 1, padding: "12px", borderRadius: "12px", border: "1.5px solid #E6EDE8" }} />
                <input placeholder="First contribution" type="number" value={amount} onChange={e=>setAmount(e.target.value)} required style={{ flex: 1, padding: "12px", borderRadius: "12px", border: "1.5px solid #E6EDE8" }} />
                <button style={{ background: "#11998e", color: "white", border: "none", padding: "12px 18px", borderRadius: "12px", fontWeight: "800" }}>+ Add</button>
              </div>
            </form>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "14px", marginTop: "16px" }}>
              {sorted.map((m) => {
                const isMe = myName && m.name.toLowerCase()===myName.toLowerCase();
                const paid = !!weeklyPaid[m.id];
                return (
                  <div key={m.id} style={{ background: cardBg, padding: "18px", borderRadius: "20px", border: isMe ? "2px solid #11998e" : "1px solid #EEE" }}>
                    {isMe && <div style={{ background: "#11998e", color: "white", fontSize: "11px", fontWeight: "800", padding: "5px 10px", borderRadius: "20px", display: "inline-block", marginBottom: "8px" }}>⭐ THIS IS YOU</div>}
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <div><b style={{ fontSize: "16px" }}>{m.name} {isMe ? "(You)" : ""}</b><div style={{ color: subText, fontSize: "13px" }}>📱 {m.phone} • Saved KES {m.totalContributed.toLocaleString()}</div></div>
                      <span style={{ background: paid ? "#E8F8F0" : "#FFE8E8", color: paid ? "#0F7A5A" : "#C0392B", padding: "6px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: "800", height: "fit-content" }}>{paid ? "PAID ✅" : "NOT PAID ❌"}</span>
                    </div>
                    <div style={{ fontSize: "13px", marginTop: "10px", color: subText }}>Week {weekNumber}: {paid ? `You paid KES ${settings.weeklyAmount.toLocaleString()} ✅ Thank you!` : `You owe KES ${settings.weeklyAmount.toLocaleString()}`}</div>
                    <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
                      {!paid && <button onClick={() => payThisWeek(m)} style={{ flex: 1, background: "linear-gradient(135deg, #11998e, #38ef7d)", color: "white", border: "none", padding: "12px", borderRadius: "12px", fontWeight: "800" }}>PAY NOW • M-Pesa 💚</button>}
                      {paid && <button disabled style={{ flex: 1, background: "#E8F8F0", color: "#0F7A5A", border: "none", padding: "12px", borderRadius: "12px", fontWeight: "800" }}>✓ Paid This Week</button>}
                      {!paid && <button onClick={() => sendReminder(m)} style={{ background: "#FFF3D6", border: "none", padding: "12px", borderRadius: "12px", fontWeight: "800" }}>🔔 Remind</button>}
                    </div>
                    <div style={{ fontSize: "12px", color: subText, marginTop: "8px" }}>Loan owed: KES {(m.loanBalance||0).toLocaleString()}</div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {tab === "loans" && (
          <div style={{ marginTop: "16px" }}>
            <div style={{ background: cardBg, padding: "20px", borderRadius: "20px" }}>
              <h3 style={{ margin: "0 0 6px" }}>🏦 Request a Loan — Faith Example</h3>
              <p style={{ fontSize: "13px", color: subText, margin: "0 0 14px" }}>Borrow 10,000, pay back in 4 weeks. Interest {settings.interestRate}% = KES {preview ? preview.interest.toLocaleString() : "0"}. Total KES {preview ? preview.totalPay.toLocaleString() : "0"}.</p>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <select value={loanName} onChange={e => setLoanName(e.target.value)} style={{ flex: 1, padding: "12px", borderRadius: "12px", border: "1.5px solid #E6EDE8" }}>
                  <option value="">Pick member...</option>
                  {members.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
                </select>
                <input type="number" placeholder="Amount e.g. 10000" value={loanAmountInput} onChange={e => setLoanAmountInput(e.target.value)} style={{ flex: 1, padding: "12px", borderRadius: "12px", border: "1.5px solid #E6EDE8" }} />
                <select value={loanWeeks} onChange={e => setLoanWeeks(Number(e.target.value))} style={{ padding: "12px", borderRadius: "12px", border: "1.5px solid #E6EDE8" }}>
                  <option value={2}>2 weeks</option><option value={4}>4 weeks</option><option value={6}>6 weeks</option><option value={8}>8 weeks</option>
                </select>
              </div>
              {preview && (
                <div style={{ background: "#E8F8F0", padding: "14px", borderRadius: "14px", marginTop: "12px", fontSize: "14px", lineHeight: "1.6" }}>
                  <b>📊 Plain English Breakdown:</b><br/>
                  You borrow <b>KES {Number(loanAmountInput).toLocaleString()}</b>. Interest is <b>KES {preview.interest.toLocaleString()}</b>. Total you will pay is <b>KES {preview.totalPay.toLocaleString()}</b>. Every week you pay <b>KES {preview.weekly.toLocaleString()}</b>.
                </div>
              )}
              <button onClick={requestLoan} style={{ marginTop: "12px", width: "100%", background: "#11998e", color: "white", border: "none", padding: "13px", borderRadius: "14px", fontWeight: "800" }}>Request Loan →</button>
            </div>

            <h3 style={{ margin: "20px 0 12px" }}>Loan Requests</h3>
            {loanRequests.length === 0 && <p style={{ color: subText }}>No loans yet. Try Faith's example: 10,000 for 4 weeks.</p>}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {loanRequests.map(req => (
                <div key={req.id} style={{ background: cardBg, padding: "18px", borderRadius: "18px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}><b>{req.name} — KES {req.principal.toLocaleString()}</b><span style={{ background: req.status==="pending" ? "#FFF3D6" : req.status==="finished" ? "#E8F8F0" : "#E8F0FF", padding: "5px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: "800" }}>{req.status.toUpperCase()}</span></div>
                  <div style={{ fontSize: "13px", color: subText, marginTop: "6px" }}>Total to pay: KES {req.totalPay.toLocaleString()} • {req.weekly.toLocaleString()}/week x {req.weeks} weeks • Paid: KES {req.paidSoFar.toLocaleString()} • Remaining: KES {req.remaining.toLocaleString()}</div>
                  <div style={{ background: "#EEE", height: "8px", borderRadius: "10px", marginTop: "10px", overflow: "hidden" }}><div style={{ width: `${(req.paidSoFar/req.totalPay)*100}%`, height: "100%", background: "#11998e" }} /></div>
                  <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
                    {req.status === "pending" && <button onClick={() => approveLoan(req)} style={{ background: "#11998e", color: "white", border: "none", padding: "10px 14px", borderRadius: "12px", fontWeight: "800" }}>✓ Approve (Chair)</button>}
                    {req.status === "approved" && <button onClick={() => payLoanWeek(req)} style={{ background: "linear-gradient(135deg, #f6d365, #fda085)", border: "none", padding: "10px 14px", borderRadius: "12px", fontWeight: "800" }}>Pay This Week KES {req.weekly.toLocaleString()} →</button>}
                    {req.status === "finished" && <span style={{ color: "#0F7A5A", fontWeight: "800", fontSize: "13px" }}>🎉 Finished! No more debt.</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "merry" && (
          <div style={{ marginTop: "16px", background: cardBg, padding: "20px", borderRadius: "20px" }}>
            <h3 style={{ margin: "0 0 6px" }}>🔄 Merry-Go-Round</h3>
            <p style={{ color: subText, fontSize: "13px" }}>Every week, one person takes all the money. No fighting about whose turn it is.</p>
            {merryOrder.length === 0 ? (
              <>
                <p style={{ fontSize: "14px" }}>No order yet. Use current members as order:</p>
                <button onClick={setupMerry} style={{ background: "#11998e", color: "white", border: "none", padding: "12px 16px", borderRadius: "12px", fontWeight: "800" }}>Start Merry-Go-Round With {members.length} Members</button>
              </>
            ) : (
              <>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "12px" }}>
                  {merryOrder.map((n, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "12px", borderRadius: "12px", background: i===merryIndex ? "#FFF3D6" : "#F5F5F5", fontWeight: i===merryIndex ? "800" : "400", color: "#222" }}>
                      <span>{i+1}. {n} {i===merryIndex ? "← THIS WEEK ⭐" : ""}</span><span>KES {(members.length * settings.weeklyAmount).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
                <button onClick={nextMerry} style={{ marginTop: "14px", width: "100%", background: "#222", color: "white", border: "none", padding: "13px", borderRadius: "14px", fontWeight: "800" }}>Mark This Week Done → Next Person</button>
              </>
            )}
          </div>
        )}

        {tab === "ledger" && (
          <div style={{ marginTop: "16px", background: cardBg, padding: "20px", borderRadius: "20px" }}>
            <h3 style={{ margin: "0 0 6px" }}>📜 The Notebook That Cannot Be Changed 🔒</h3>
            <p style={{ color: subText, fontSize: "13px" }}>Like a bank statement. If Kevin paid Monday 10:32 AM, it stays. Treasurer cannot erase it. You can only add a note, never delete.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "14px" }}>
              {history.length === 0 && <p style={{ color: subText }}>No entries yet.</p>}
              {history.map(h => (
                <div key={h.id} style={{ display: "flex", justifyContent: "space-between", background: h.type==="contribution" ? "#E8F8F0" : h.type==="loan" ? "#FFF3D6" : h.type==="repay" ? "#E8F0FF" : h.type==="fine" ? "#FFE8E8" : "#F5F5F5", color: "#222", padding: "11px 13px", borderRadius: "12px" }}>
                  <span style={{ fontSize: "14px", fontWeight: "600" }}>{h.text} 🔒</span><span style={{ fontSize: "12px", color: "#888", whiteSpace: "nowrap", marginLeft: "8px" }}>{h.time}</span>
                </div>
              ))}
            </div>
            <p style={{ fontSize: "12px", color: subText, marginTop: "12px" }}>🔒 Locked: No delete button here. If you need to fix a mistake, add a new entry saying "Correction: ..."</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
import { useEffect, useState } from "react";

function App() {
  const [members, setMembers] = useState(() => {
    try { return JSON.parse(localStorage.getItem("chama_members_offline") || "[]"); } catch { return []; }
  });
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [search, setSearch] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [tab, setTab] = useState("home");
  const [myName, setMyName] = useState(() => localStorage.getItem("chama_myName") || "");
  const [myRole, setMyRole] = useState(() => localStorage.getItem("chama_myRole") || "member");
  const [myChamaName, setMyChamaName] = useState(() => localStorage.getItem("chama_myChamaName") || "");
  const [tempChamaName, setTempChamaName] = useState("");
  const [tempRole, setTempRole] = useState("member");
  const [tempPasscode, setTempPasscode] = useState("");
  const [tempName, setTempName] = useState("");
  const [receipt, setReceipt] = useState(null);
  const [showCoreTeam, setShowCoreTeam] = useState(false);
  const [language, setLanguage] = useState(() => localStorage.getItem("chama_lang") || "en");
  const setLang = (l) => { setLanguage(l); localStorage.setItem("chama_lang", l); };

  const T = {
    en: {
      welcome: "Karibu sana! ✨", setup: "Welcome home. Let's set up your chama.",
      yourName: "👤 Your Name", chamaName: "🏠 Chama Name", role: "🎭 Your Role in Chama",
      enter: "Enter My Chama →", member: "Member", treasurer: "Treasurer", chair: "Chairperson", secretary: "Secretary",
      hi: "Hi", week: "Week", payNow: "PAY NOW • M-Pesa 💚", paid: "PAID ✅", notPaid: "NOT PAID ❌",
      addMember: "✨ Add Member — Treasurer Only 👑", settings: "⚙️ Settings", logout: "🚪 Logout",
      home: "🏠 Home / Pay", loans: "🏦 Loans", merry: "🔄 Merry-Go-Round", ledger: "📜 Ledger (Cannot Erase)",
      requestLoan: "Request Loan →", resign: "Resign Now", coreTeam: "👑 Core Team",
      collected: "WEEK COLLECTED", savings: "TOTAL SAVINGS (ALL TIME)", language: "🌍 Language / Lugha",
      search: "Search member...", remind: "🔔 Remind", nextPerson: "Mark Done → Next Person",
      chamaDetails: "🏠 Chama Details", chamaNameLabel: "Chama Name", weeklyLabel: "Weekly Amount (KES)",
      interestLabel: "Loan Interest %", fineLabel: "Fine for Missing Week (KES)",
      darkMode: "Dark Mode 🌙", darkDesc: "Easy on eyes at night", done: "✓ Done — Back to Chama",
      chooseLang: "Choose your language", remember: "App will remember your choice.",
      currentCore: "Current Core Team:", vacant: "VACANT", takenNote: "If a role is TAKEN, you cannot choose it until that person resigns.",
      takenBy: "TAKEN by", vacantLabel: "VACANT", viewPay: "Member — View + Pay for myself",
      createCode: "Create your secret code (e.g. 1234)", enterCode: "Enter your passcode",
      firstTime: "You are the first", createNote: "Create a code only you know. Next time you won't need to type it on this phone.",
      coreDesc: "Only ONE person per role. If someone resigns, seat becomes VACANT and members vote for new leader.",
      waitingVote: "Waiting for vote", logoutClaim: "Logout → Login to claim", replaceVote: "🗳️ Replace after vote...",
      youAre: "You are", stepDown: "Want to step down?", merryThisWeek: "MERRY-GO-ROUND • THIS WEEK",
      turn: "'s turn — KES", next: "Next:", paidCount: "paid ✅ •", notPaidCount: "not paid ❌",
      startWeek: "Start New Week (Week", loansOut: "Loans out: KES", requestTitle: "🏦 Request a Loan",
      pickMember: "Pick member...", amountEg: "Amount e.g. 10000", loanRequests: "Loan Requests",
      noLoans: "No loans yet.", merryTitle: "🔄 Merry-Go-Round", merryDesc: "Every week, one person takes all the money.",
      startWith: "Start With", membersWord: "Members", onlyTreasurerStart: "Only Treasurer can start this.",
      thisWeek: "← THIS WEEK ⭐", markDone: "Mark Done → Next Person", ledgerTitle: "📜 The Notebook That Cannot Be Changed 🔒",
      noEntries: "No entries yet.", thisIsYou: "⭐ THIS IS YOU", youWord: "(You)", saved: "Saved KES",
      owes: "Owes KES", paidThisWeek: "✓ Paid This Week", onlyPay: "Only", orTreasurer: "or Treasurer can pay",
      loanOwed: "Loan owed: KES", weekLabel: "Week", haveNotPaid: "have NOT paid this week:",
      breakdown: "Breakdown:", borrow: "You borrow", interest: "Interest", total: "Total", everyWeek: "Every week",
      approve: "✓ Approve (Treasurer / Chair)", waiting: "⏳ Waiting for Treasurer / Chair...",
      payLoanWeek: "Pay This Week KES", finished: "🎉 Finished!", pending: "PENDING", approved: "APPROVED",
      finishedWord: "FINISHED", totalWord: "Total:", paidWord: "Paid:", remaining: "Remaining:",
      perWeek: "/week x", treasurerDesc: "Manages money, approves loans", chairDesc: "Leads meetings, approves loans",
      secretaryDesc: "Keeps records, manages members", memberNote: "You are a Member. You cannot take a Core role while it is taken. Wait for them to resign, then logout and login again as that role.",
      coreNote: "If you want to leave, press Resign above. Your seat becomes vacant instantly and no one else can take it until members vote."
    },
    sw: {
      welcome: "Karibu sana! ✨", setup: "Karibu nyumbani. Tuanzishe chama chako.",
      yourName: "👤 Jina Lako", chamaName: "🏠 Jina la Chama", role: "🎭 Nafasi Yako Kwenye Chama",
      enter: "Ingia Kwenye Chama Changu →", member: "Mwanachama", treasurer: "Mweka Hazina", chair: "Mwenyekiti", secretary: "Katibu",
      hi: "Habari", week: "Wiki", payNow: "LIPA SASA • M-Pesa 💚", paid: "AMELIPA ✅", notPaid: "HAJALIPA ❌",
      addMember: "✨ Ongeza Mwanachama — Mweka Hazina Tu 👑", settings: "⚙️ Mipangilio", logout: "🚪 Toka",
      home: "🏠 Nyumbani / Lipa", loans: "🏦 Mikopo", merry: "🔄 Merry-Go-Round", ledger: "📜 Daftari (Haiwezi Kufutwa)",
      requestLoan: "Omba Mkopo →", resign: "Jiuzulu Sasa", coreTeam: "👑 Viongozi",
      collected: "WIKI IMEPOKELEWA", savings: "JUMLA YA AKIBA (WAKATI WOTE)", language: "🌍 Lugha / Language",
      search: "Tafuta mwanachama...", remind: "🔔 Mkumbushe", nextPerson: "Maliza Wiki → Mtu Anayefuata",
      chamaDetails: "🏠 Maelezo ya Chama", chamaNameLabel: "Jina la Chama", weeklyLabel: "Kiasi cha Kila Wiki (KES)",
      interestLabel: "Riba ya Mkopo %", fineLabel: "Faini ya Kukosa Wiki (KES)",
      darkMode: "Hali ya Giza 🌙", darkDesc: "Rahisi kwa macho usiku", done: "✓ Maliza — Rudi Kwenye Chama",
      chooseLang: "Chagua lugha yako", remember: "App itakumbuka chaguo lako.",
      currentCore: "Viongozi wa Sasa:", vacant: "NAFASI WAZI", takenNote: "Kama nafasi IMECHUKULIWA, huwezi kuichukua mpaka mtu huyo ajiuzulu.",
      takenBy: "IMECHUKULIWA na", vacantLabel: "NAFASI WAZI", viewPay: "Mwanachama — Angalia + Jilipie",
      createCode: "Tengeneza namba yako ya siri (mf. 1234)", enterCode: "Weka namba yako ya siri",
      firstTime: "Wewe ni wa kwanza", createNote: "Tengeneza namba ambayo wewe tu unaijua. Mara nyingine hutahitaji kuiandika tena kwenye simu hii.",
      coreDesc: "Mtu MMOJA tu kwa kila nafasi. Akijiuzulu, nafasi inakuwa WAZI na wanachama wanapiga kura kumchagua mpya.",
      waitingVote: "Inasubiri kura", logoutClaim: "Toka → Ingia tena kuchukua nafasi", replaceVote: "🗳️ Badilisha baada ya kura...",
      youAre: "Wewe ni", stepDown: "Unataka kuacha?", merryThisWeek: "MERRY-GO-ROUND • WIKI HII",
      turn: " zamu yake — KES", next: "Anayefuata:", paidCount: "wamelipa ✅ •", notPaidCount: "hawajalipa ❌",
      startWeek: "Anza Wiki Mpya (Wiki", loansOut: "Mikopo nje: KES", requestTitle: "🏦 Omba Mkopo",
      pickMember: "Chagua mwanachama...", amountEg: "Kiasi mf. 10000", loanRequests: "Maombi ya Mikopo",
      noLoans: "Hakuna mikopo bado.", merryTitle: "🔄 Merry-Go-Round", merryDesc: "Kila wiki, mtu mmoja anachukua pesa zote.",
      startWith: "Anza na", membersWord: "Wanachama", onlyTreasurerStart: "Mweka Hazina tu anaweza kuanzisha.",
      thisWeek: "← WIKI HII ⭐", markDone: "Maliza → Mtu Anayefuata", ledgerTitle: "📜 Daftari Ambalo Haliwezi Kubadilishwa 🔒",
      noEntries: "Hakuna kumbukumbu bado.", thisIsYou: "⭐ HII NI WEWE", youWord: "(Wewe)", saved: "Ameweka KES",
      owes: "Anadaiwa KES", paidThisWeek: "✓ Amelipa Wiki Hii", onlyPay: "Ni", orTreasurer: "au Mweka Hazina tu anaweza kulipa",
      loanOwed: "Mkopo anadaiwa: KES", weekLabel: "Wiki", haveNotPaid: "HAWAJALIPA wiki hii:",
      breakdown: "Uchambuzi:", borrow: "Una kopa", interest: "Riba", total: "Jumla", everyWeek: "Kila wiki",
      approve: "✓ Kubali (Mweka Hazina / Mwenyekiti)", waiting: "⏳ Inasubiri Mweka Hazina / Mwenyekiti...",
      payLoanWeek: "Lipa Wiki Hii KES", finished: "🎉 Imemaliza!", pending: "INASUBIRI", approved: "IMEKUBALIWA",
      finishedWord: "IMEMALIZA", totalWord: "Jumla:", paidWord: "Amelipa:", remaining: "Imebaki:",
      perWeek: "/wiki x", treasurerDesc: "Anasimamia pesa, anakubali mikopo", chairDesc: "Anaongoza mikutano, anakubali mikopo",
      secretaryDesc: "Anaweka kumbukumbu, anasimamia wanachama", memberNote: "Wewe ni Mwanachama. Huwezi kuchukua nafasi ya Uongozi ikiwa imechukuliwa. Subiri ajiuzulu, halafu toka na uingie tena kama nafasi hiyo.",
      coreNote: "Ukitaka kuacha, bonyeza Jiuzulu hapo juu. Nafasi yako inakuwa wazi mara moja na hakuna mtu mwingine anayeweza kuichukua mpaka wanachama wapige kura."
    }
  };
  const t = T[language];

  // ===== FIX: PER-CHAMA CORE TEAM & PASSCODES =====
  const [allCoreTeams, setAllCoreTeams] = useState(() => {
    try {
      const byChama = JSON.parse(localStorage.getItem("chama_coreTeams_by_chama") || "{}");
      if (Object.keys(byChama).length > 0) return byChama;
      const old = JSON.parse(localStorage.getItem("chama_coreTeam") || "null");
      if (old && (old.treasurer || old.chair || old.secretary)) {
        const oldChama = (localStorage.getItem("chama_myChamaName") || "Umoja Chama").toLowerCase().trim();
        return { [oldChama]: old };
      }
      return {};
    } catch { return {}; }
  });
  const [allRoleCodes, setAllRoleCodes] = useState(() => {
    try {
      const byChama = JSON.parse(localStorage.getItem("chama_roleCodes_by_chama") || "{}");
      if (Object.keys(byChama).length > 0) return byChama;
      const old = JSON.parse(localStorage.getItem("chama_roleCodes") || "null");
      if (old && (old.treasurer || old.chair || old.secretary)) {
        const oldChama = (localStorage.getItem("chama_myChamaName") || "Umoja Chama").toLowerCase().trim();
        return { [oldChama]: old };
      }
      return {};
    } catch { return {}; }
  });

  const currentChamaKey = (tempChamaName.trim() || myChamaName || "Umoja Chama").toLowerCase().trim();
  const coreTeam = allCoreTeams[currentChamaKey] || { treasurer: "", chair: "", secretary: "" };
  const roleCodes = allRoleCodes[currentChamaKey] || { treasurer: "", chair: "", secretary: "" };

  const saveCoreTeam = (ct, chamaKeyOverride) => {
    const key = (chamaKeyOverride || currentChamaKey).toLowerCase().trim();
    const updated = { ...allCoreTeams, [key]: ct };
    setAllCoreTeams(updated);
    localStorage.setItem("chama_coreTeams_by_chama", JSON.stringify(updated));
    localStorage.setItem("chama_coreTeam", JSON.stringify(ct));
  };
  const saveRoleCodes = (c, chamaKeyOverride) => {
    const key = (chamaKeyOverride || currentChamaKey).toLowerCase().trim();
    const updated = { ...allRoleCodes, [key]: c };
    setAllRoleCodes(updated);
    localStorage.setItem("chama_roleCodes_by_chama", JSON.stringify(updated));
    localStorage.setItem("chama_roleCodes", JSON.stringify(c));
  };
  const isTrustedDevice = (role, personName, chamaKeyOverride) => {
    if (!personName) return false;
    const key = (chamaKeyOverride || currentChamaKey).toLowerCase().trim();
    return localStorage.getItem(`chama_trusted_${key}_${role}_${personName.toLowerCase()}`) === "yes";
  };

  // ===== FIX 2: STRICT ROLE CHECK - Member can NEVER approve =====
  // Old bug: if seat was "" (vacant), anyone claiming role was treated as leader
  // New: you are leader ONLY if coreTeam says your exact name
  const isTreasurer = myRole === "treasurer" && !!myName && !!coreTeam.treasurer && coreTeam.treasurer.toLowerCase() === myName.toLowerCase();
  const isChair = myRole === "chair" && !!myName && !!coreTeam.chair && coreTeam.chair.toLowerCase() === myName.toLowerCase();
  const isSecretary = myRole === "secretary" && !!myName && !!coreTeam.secretary && coreTeam.secretary.toLowerCase() === myName.toLowerCase();
  const isCoreMember = isTreasurer || isChair || isSecretary;

  const [weeklyPaid, setWeeklyPaid] = useState(() => {
    try { return JSON.parse(localStorage.getItem("chama_weekly") || "{}"); } catch { return {}; }
  });
  const [weekNumber, setWeekNumber] = useState(() => localStorage.getItem("chama_week") || "1");
  const [loanRequests, setLoanRequests] = useState(() => {
    try { return JSON.parse(localStorage.getItem("chama_loans") || "[]"); } catch { return []; }
  });
  const [loanName, setLoanName] = useState("");
  const [loanAmountInput, setLoanAmountInput] = useState("");
  const [loanWeeks, setLoanWeeks] = useState(4);
  const [merryOrder, setMerryOrder] = useState(() => {
    try { return JSON.parse(localStorage.getItem("chama_merry") || "[]"); } catch { return []; }
  });
  const [merryIndex, setMerryIndex] = useState(() => Number(localStorage.getItem("chama_merry_index") || "0"));
  const [history, setHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem("chama_history") || "[]"); } catch { return []; }
  });
  const [settings, setSettings] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("chama_settings") || JSON.stringify({
        chamaName: "Umoja Chama", location: "Rongai", weeklyAmount: 1000, meetingDay: "Monday", darkMode: false, interestRate: 10, fineAmount: 100,
      }));
    } catch { return { chamaName: "Umoja Chama", location: "Rongai", weeklyAmount: 1000, meetingDay: "Monday", darkMode: false, interestRate: 10, fineAmount: 100 }; }
  });

  const saveSettings = (ns) => { setSettings(ns); localStorage.setItem("chama_settings", JSON.stringify(ns)); };
  const saveWeekly = (w) => { setWeeklyPaid(w); localStorage.setItem("chama_weekly", JSON.stringify(w)); };
  const saveLoans = (l) => { setLoanRequests(l); localStorage.setItem("chama_loans", JSON.stringify(l)); };
  const saveMerry = (o, idx) => { setMerryOrder(o); setMerryIndex(idx); localStorage.setItem("chama_merry", JSON.stringify(o)); localStorage.setItem("chama_merry_index", String(idx)); };

  // ===== FIX 3: DEDUPE MEMBERS - prevents resign / double-add creating ghost members =====
  const saveMembers = (list) => {
    const seen = new Set();
    const deduped = [];
    for (const m of list) {
      const key = (m.name || "").toLowerCase().trim() + "|" + (m.phone || "").trim();
      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push(m);
    }
    setMembers(deduped); localStorage.setItem("chama_members_offline", JSON.stringify(deduped));
  };
  const loadMembers = () => {
    try { const cached = JSON.parse(localStorage.getItem("chama_members_offline") || "[]"); saveMembers(cached); } catch {}
  };
  useEffect(() => { loadMembers(); }, []);

  const total = members.reduce((s, m) => s + (m.totalContributed || 0), 0);
  const totalLoans = members.reduce((s, m) => s + (m.loanBalance || 0), 0);
 const isPaid = (m) => !!m.paidThisWeek;
const paidCount = members.filter(isPaid).length;
const notPaid = members.filter(m => !isPaid(m));
  const expectedThisWeek = members.length * settings.weeklyAmount;
  // FIX 1: Collected = paidCount * weeklyAmount ONLY. No double counting.
  const collectedThisWeek = paidCount * settings.weeklyAmount;

  const addHistory = (text, type) => {
    const entry = { id: Date.now(), text, type, time: new Date().toLocaleString("en-KE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) };
    const updated = [entry, ...history].slice(0, 200);
    setHistory(updated); localStorage.setItem("chama_history", JSON.stringify(updated));
  };

  const saveMyName = () => {
    if (!tempName.trim()) return alert(language === "sw" ? "Tafadhali weka jina lako" : "Please enter your name");
    if (!tempChamaName.trim() && !myChamaName) return alert(language === "sw" ? "Tafadhali weka jina la Chama" : "Please enter your Chama name");
    const cleanName = tempName.trim();
    const finalChama = tempChamaName.trim() || myChamaName;
    const finalChamaKey = finalChama.toLowerCase().trim();
    const teamForThisChama = allCoreTeams[finalChamaKey] || { treasurer: "", chair: "", secretary: "" };
    const codesForThisChama = allRoleCodes[finalChamaKey] || { treasurer: "", chair: "", secretary: "" };
    if (tempRole === "treasurer" && teamForThisChama.treasurer && teamForThisChama.treasurer.toLowerCase() !== cleanName.toLowerCase()) {
      return alert(language === "sw" ? `❌ Mweka Hazina ni ${teamForThisChama.treasurer}. Lazima ajiuzulu kwanza.` : `❌ Treasurer is ${teamForThisChama.treasurer}. They must Resign first.`);
    }
    if (tempRole === "chair" && teamForThisChama.chair && teamForThisChama.chair.toLowerCase() !== cleanName.toLowerCase()) {
      return alert(language === "sw" ? `❌ Mwenyekiti ni ${teamForThisChama.chair}. Lazima ajiuzulu kwanza.` : `❌ Chair is ${teamForThisChama.chair}. They must Resign first.`);
    }
    if (tempRole === "secretary" && teamForThisChama.secretary && teamForThisChama.secretary.toLowerCase() !== cleanName.toLowerCase()) {
      return alert(language === "sw" ? `❌ Katibu ni ${teamForThisChama.secretary}. Lazima ajiuzulu kwanza.` : `❌ Secretary is ${teamForThisChama.secretary}. They must Resign first.`);
    }
    if (["treasurer", "chair", "secretary"].includes(tempRole)) {
      const savedCode = codesForThisChama[tempRole];
      const trusted = isTrustedDevice(tempRole, cleanName, finalChamaKey);
      if (!savedCode) {
        if (!tempPasscode.trim()) return alert(language === "sw" ? `Wewe ni ${tempRole} mpya! Tafadhali TENGENEZA namba ya siri (namba 4) ambayo wewe tu unaijua.` : `You are the new ${tempRole}! Please CREATE a passcode (4 numbers) that only you will know.`);
        if (tempPasscode.length < 4) return alert(language === "sw" ? "Namba ya siri lazima iwe namba 4" : "Passcode must be at least 4 numbers");
        saveRoleCodes({ ...codesForThisChama, [tempRole]: tempPasscode }, finalChamaKey);
        localStorage.setItem(`chama_trusted_${finalChamaKey}_${tempRole}_${cleanName.toLowerCase()}`, "yes");
      } else if (!trusted) {
        if (tempPasscode !== savedCode) return alert(language === "sw" ? `❌ Namba ya siri si sahihi!` : `❌ Wrong ${tempRole} Passcode!`);
        localStorage.setItem(`chama_trusted_${finalChamaKey}_${tempRole}_${cleanName.toLowerCase()}`, "yes");
      }
    }
    setMyName(cleanName); setMyRole(tempRole); setMyChamaName(finalChama);
    localStorage.setItem("chama_myName", cleanName);
    localStorage.setItem("chama_myRole", tempRole);
    localStorage.setItem("chama_myChamaName", finalChama);
    saveSettings({ ...settings, chamaName: finalChama });
    let newCore = { ...teamForThisChama }; let claimed = false;
    if (tempRole === "treasurer" && !newCore.treasurer) { newCore.treasurer = cleanName; claimed = true; }
    if (tempRole === "chair" && !newCore.chair) { newCore.chair = cleanName; claimed = true; }
    if (tempRole === "secretary" && !newCore.secretary) { newCore.secretary = cleanName; claimed = true; }
    // FIX 3: Login NEVER adds a member. Only Treasurer Add Member form adds members.
    if (claimed) { saveCoreTeam(newCore, finalChamaKey); addHistory(`👑 ${cleanName} became new ${tempRole.toUpperCase()}`, "member"); }
  };

  const logout = () => {
    localStorage.removeItem("chama_myName");
    localStorage.removeItem("chama_myRole");
    localStorage.removeItem("chama_myChamaName");
    setMyName(""); setTempName(""); setTempChamaName(""); setTempRole("member"); setTempPasscode("");
  };

  const resignRole = () => {
    let roleName = ""; let roleKey = "";
    let newCore = { ...coreTeam };
    if (isTreasurer) { roleName = language === "sw" ? "Mweka Hazina" : "Treasurer"; roleKey = "treasurer"; newCore.treasurer = ""; }
    else if (isChair) { roleName = language === "sw" ? "Mwenyekiti" : "Chairperson"; roleKey = "chair"; newCore.chair = ""; }
    else if (isSecretary) { roleName = language === "sw" ? "Katibu" : "Secretary"; roleKey = "secretary"; newCore.secretary = ""; }
    else return;
    if (!window.confirm(language === "sw" ? `Una uhakika unataka KUJIUZULU kama ${roleName}?\n\nNafasi yako itakuwa WAZI.` : `Are you sure you want to RESIGN as ${roleName}?\n\nYour seat will become VACANT.`)) return;
    let newCodes = { ...roleCodes }; newCodes[roleKey] = ""; saveRoleCodes(newCodes, myChamaName);
    localStorage.removeItem(`chama_trusted_${myChamaName.toLowerCase().trim()}_${roleKey}_${myName.toLowerCase()}`);
    saveCoreTeam(newCore, myChamaName);
    setMyRole("member");
    localStorage.setItem("chama_myRole", "member");
    // FIX 3: Resign NEVER touches members list. No new member added.
    addHistory(`📣 ${myName} RESIGNED as ${roleName}`, "member");
    alert(language === "sw" ? `Umejiuzulu kama ${roleName}. Asante! 🙏 Nafasi sasa ni wazi.` : `You have resigned as ${roleName}. Thank you! 🙏 Seat is now vacant.`);
  };

  const assignCoreMember = (role, personName) => {
    if (!personName) return;
    if (!window.confirm(language === "sw" ? `Wanachama wamepiga kura? Mchague ${personName} kama ${role} mpya?` : `Members voted? Assign ${personName} as new ${role}?`)) return;
    const newCore = { ...coreTeam, [role]: personName };
    saveCoreTeam(newCore, myChamaName);
    addHistory(`🗳️ VOTE: ${personName} is now the new ${role.toUpperCase()}`, "member");
  };

  const downloadPDF = () => {
    const report = `<html><head><title>${settings.chamaName} Report</title><style>body{font-family:Arial;padding:30px;color:#222}h1{color:#11998e}table{width:100%;border-collapse:collapse;margin:15px 0}th,td{border:1px solid #ddd;padding:10px;text-align:left}th{background:#11998e;color:white}.box{background:#E8F8F0;padding:15px;border-radius:10px;margin:10px 0}</style></head><body><h1>💚 ${settings.chamaName}</h1><p>Location: ${settings.location} • ${t.week} ${weekNumber} • Date: ${new Date().toLocaleDateString("en-KE")}</p><div class="box"><b>${t.currentCore}</b> ${t.treasurer}: ${coreTeam.treasurer || t.vacant} | ${t.chair}: ${coreTeam.chair || t.vacant} | ${t.secretary}: ${coreTeam.secretary || t.vacant}<br><b>${t.savings}:</b> KES ${total.toLocaleString()}<br><b>${t.loansOut}</b> KES ${totalLoans.toLocaleString()}</div><h2>👥 Members</h2><table><tr><th>Name</th><th>Phone</th><th>Saved</th><th>Loan Owed</th><th>This Week</th></tr>${members.map(m => `<tr><td>${m.name}</td><td>${m.phone}</td><td>KES ${(m.totalContributed||0).toLocaleString()}</td><td>KES ${(m.loanBalance||0).toLocaleString()}</td><td>${weeklyPaid[m.id] ? t.paid : t.notPaid}</td></tr>`).join("")}</table></body></html>`;
    const w = window.open("", "_blank"); w.document.write(report); w.document.close(); setTimeout(() => w.print(), 500);
  };

 const payThisWeek = (m) => {
       if (m.paidThisWeek) return;
    if (!isTreasurer && m.name.toLowerCase() !== myName.toLowerCase()) { alert(language === "sw" ? "Unaweza kujilipia wewe tu." : "You can only pay for yourself."); return; }
    const confirmPay = window.confirm(language === "sw" ? `M-Pesa STK Push?\n\n${m.name} atalipa KES ${settings.weeklyAmount.toLocaleString()}` : `Simulate M-Pesa STK Push?\n\n${m.name} will pay KES ${settings.weeklyAmount.toLocaleString()}`);
    if (!confirmPay) return;
    const updatedMembers = members.map(x => x.id === m.id ? { ...x, totalContributed: (x.totalContributed || 0) + settings.weeklyAmount, paidThisWeek: true } : x);
    saveMembers(updatedMembers);
    addHistory(`💚 ${m.name} PAID ${t.week} ${weekNumber} — KES ${settings.weeklyAmount.toLocaleString()}`, "contribution");
    setReceipt({ title: `${t.week} ${weekNumber} Payment`, name: m.name, amount: settings.weeklyAmount, type: "contribution", code: "QK" + Math.floor(1000000 + Math.random()*9000000), extra: "M-Pesa Confirmed ✅" });
  };

     const nw = Number(weekNumber)+1; setWeekNumber(String(nw)); localStorage.setItem("chama_week", String(nw));
      saveWeekly({});
    saveMembers(members.map(x => ({ ...x, paidThisWeek: false })));
    // Clear paidThisWeek on all members so next week starts at 0
    const cleared = members.map(x => ({ ...x, paidThisWeek: false }));
    saveMembers(cleared);
       addHistory(`📅 New Week Started — ${t.week} ${nw}`, "member");

  const sendReminder = (m) => {
    const msg = language === "sw"
      ? `Habari ${m.name}, hii ni ${settings.chamaName}. HUJALIPA KES ${settings.weeklyAmount.toLocaleString()} kwa ${t.week} ${weekNumber} (${settings.meetingDay}). Tafadhali lipa leo. Asante! 💚`
      : `Hi ${m.name}, this is ${settings.chamaName}. You have NOT paid KES ${settings.weeklyAmount.toLocaleString()} for ${t.week} ${weekNumber} (${settings.meetingDay}). Please pay today. Thank you! 💚`;
    window.open(`https://wa.me/${m.phone.replace(/^0/, "254")}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const loanCalc = (principal, weeks) => {
    const interest = Math.round(principal * settings.interestRate / 100);
    const totalPay = principal + interest;
    const weekly = Math.ceil(totalPay / weeks);
    return { interest, totalPay, weekly };
  };
  const preview = loanAmountInput ? loanCalc(Number(loanAmountInput), loanWeeks) : null;

  const requestLoan = () => {
    if (!loanName || !loanAmountInput) return alert(language === "sw" ? "Chagua mwanachama na kiasi" : "Pick member and amount");
    if (!isTreasurer && loanName.toLowerCase() !== myName.toLowerCase()) { alert(language === "sw" ? "Unaweza kuomba mkopo wako tu." : "You can only request for yourself."); return; }
    const calc = loanCalc(Number(loanAmountInput), loanWeeks);
    const req = { id: Date.now(), name: loanName, principal: Number(loanAmountInput), weeks: loanWeeks, interest: calc.interest, totalPay: calc.totalPay, weekly: calc.weekly, paidSoFar: 0, remaining: calc.totalPay, status: "pending", date: new Date().toLocaleDateString("en-KE") };
    saveLoans([req, ...loanRequests]);
    addHistory(`📝 ${loanName} requested loan KES ${req.principal.toLocaleString()}`, "loan");
  };

  const approveLoan = (req) => {
    // FIX 2: Double-check - Member can NEVER approve, even if UI shows button
    if (!isTreasurer && !isChair) { alert(language === "sw" ? "Mweka Hazina / Mwenyekiti tu wanaweza kukubali mikopo." : "Only Treasurer / Chair can approve loans."); return; }
    const updatedMembers = members.map(x => x.name === req.name ? { ...x, loanBalance: (x.loanBalance || 0) + req.principal } : x);
    saveMembers(updatedMembers);
    const updated = loanRequests.map(l => l.id === req.id ? { ...l, status: "approved" } : l);
    saveLoans(updated);
    addHistory(`✅ Loan APPROVED for ${req.name} — KES ${req.principal.toLocaleString()}`, "loan");
    setReceipt({ title: language === "sw" ? "Mkopo Umekubaliwa" : "Loan Approved & Sent", name: req.name, amount: req.principal, type: "loan", code: "LN" + Math.floor(100000 + Math.random()*900000), extra: `${t.everyWeek} KES ${req.weekly.toLocaleString()} x ${req.weeks} ${t.week}. ${t.total} KES ${req.totalPay.toLocaleString()}` });
  };

  const payLoanWeek = (req) => {
    if (!isTreasurer && req.name.toLowerCase() !== myName.toLowerCase()) { alert(language === "sw" ? "Unaweza kulipa mkopo wako tu." : "You can only pay your own loan."); return; }
    const updatedMembers = members.map(x => x.name === req.name ? { ...x, loanBalance: Math.max(0, (x.loanBalance || 0) - req.weekly) } : x);
    saveMembers(updatedMembers);
    const newRemaining = req.remaining - req.weekly;
    const updated = loanRequests.map(l => l.id === req.id ? { ...l, paidSoFar: l.paidSoFar + req.weekly, remaining: Math.max(0, newRemaining), status: newRemaining <= 0 ? "finished" : "approved" } : l);
    saveLoans(updated);
    addHistory(`✅ ${req.name} paid loan week — KES ${req.weekly.toLocaleString()}`, "repay");
  };

  const setupMerry = () => {
    if (!isTreasurer) { alert(language === "sw" ? "Mweka Hazina tu anaweza kuanza Merry-Go-Round." : "Only Treasurer can start Merry-Go-Round."); return; }
    if (members.length === 0) return;
    const order = members.map(m => m.name); saveMerry(order, 0);
    addHistory(`🔄 Merry-Go-Round started`, "member");
  };
  const nextMerry = () => {
    if (!isTreasurer) { alert(language === "sw" ? "Mweka Hazina tu." : "Only Treasurer can move Merry-Go-Round."); return; }
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
        <div style={{ background: "white", padding: "32px 26px", borderRadius: "24px", maxWidth: "400px", width: "100%", textAlign: "center" }}>
          <div style={{ fontSize: "48px" }}>💚</div>
          <h2 style={{ margin: "12px 0 6px", fontSize: "26px", fontWeight: "800" }}>{t.welcome}</h2>
          <p style={{ color: "#555", fontSize: "15px" }}>{t.setup}</p>
          <div style={{ background: "#FFF3D6", padding: "10px", borderRadius: "12px", fontSize: "12px", marginTop: "12px", textAlign: "left" }}>
            <b>{t.currentCore}</b><br/>
            👑 {t.treasurer}: {coreTeam.treasurer || t.vacant}<br/>
            🪑 {t.chair}: {coreTeam.chair || t.vacant}<br/>
            📝 {t.secretary}: {coreTeam.secretary || t.vacant}
          </div>
          <label style={{ display: "block", textAlign: "left", fontSize: "13px", fontWeight: "700", marginTop: "16px" }}>{t.yourName}</label>
          <input placeholder={language === "sw" ? "Jina lako, mf. Kevin" : "Your name, e.g. Kevin"} value={tempName} onChange={e => setTempName(e.target.value)} style={{ width: "100%", padding: "14px", borderRadius: "14px", border: "1.5px solid #E6EDE8", fontSize: "15px", margin: "6px 0 8px" }} />
          <label style={{ display: "block", textAlign: "left", fontSize: "13px", fontWeight: "700" }}>{t.chamaName}</label>
          <input placeholder={language === "sw" ? "mf. Umoja Chama" : "e.g. Umoja Chama"} value={tempChamaName} onChange={e => setTempChamaName(e.target.value)} style={{ width: "100%", padding: "14px", borderRadius: "14px", border: "1.5px solid #E6EDE8", fontSize: "15px", margin: "6px 0 8px" }} />
          <label style={{ display: "block", textAlign: "left", fontSize: "13px", fontWeight: "700" }}>{t.role}</label>
          <select value={tempRole} onChange={e => setTempRole(e.target.value)} style={{ width: "100%", padding: "14px", borderRadius: "14px", border: "1.5px solid #E6EDE8", fontSize: "15px", margin: "6px 0 14px", background: "white" }}>
            <option value="member">👤 {t.viewPay}</option>
            <option value="treasurer" disabled={!!coreTeam.treasurer}>👑 {t.treasurer} {coreTeam.treasurer ? `— ${t.takenBy} ${coreTeam.treasurer}` : `— ${t.vacantLabel}`}</option>
            <option value="chair" disabled={!!coreTeam.chair}>🪑 {t.chair} {coreTeam.chair ? `— ${t.takenBy} ${coreTeam.chair}` : `— ${t.vacantLabel}`}</option>
            <option value="secretary" disabled={!!coreTeam.secretary}>📝 {t.secretary} {coreTeam.secretary ? `— ${t.takenBy} ${coreTeam.secretary}` : `— ${t.vacantLabel}`}</option>
          </select>
          {["treasurer","chair","secretary"].includes(tempRole) && (
            <>
              <label style={{ display: "block", textAlign: "left", fontSize: "13px", fontWeight: "700" }}>🔑 {tempRole === "treasurer" ? t.treasurer.toUpperCase() : tempRole === "chair" ? t.chair.toUpperCase() : t.secretary.toUpperCase()} {!roleCodes[tempRole] ? "(CREATE NEW)" : isTrustedDevice(tempRole, tempName.trim()) ? "(Saved - Leave blank)" : ""}</label>
              <input type="text" placeholder={!roleCodes[tempRole] ? t.createCode : t.enterCode} value={tempPasscode} onChange={e => setTempPasscode(e.target.value)} style={{ width: "100%", padding: "14px", borderRadius: "14px", border: "1.5px solid #FFD0D0", fontSize: "15px", margin: "6px 0 14px", background: "#FFF8F8" }} />
              {!roleCodes[tempRole] && <p style={{ fontSize: "12px", color: "#11998e", margin: "-10px 0 12px", textAlign: "left" }}>{t.firstTime} {tempRole}! {t.createNote}</p>}
            </>
          )}
          <button onClick={saveMyName} style={{ width: "100%", background: "linear-gradient(135deg, #11998e, #38ef7d)", color: "white", border: "none", padding: "14px", borderRadius: "14px", fontWeight: "800" }}>{t.enter}</button>
          <p style={{ fontSize: "12px", color: "#888", marginTop: "10px" }}>{t.takenNote}</p>
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
            <h2 style={{ margin: 0 }}>{t.settings}</h2>
          </div>
          <div style={{ background: cardBg, padding: "20px", borderRadius: "20px", marginBottom: "12px" }}>
            <h3 style={{ margin: "0 0 6px" }}>{t.language}</h3>
            <p style={{ fontSize: "13px", color: subText, margin: "0 0 12px" }}>{t.chooseLang}</p>
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={() => setLang("en")} style={{ flex: 1, padding: "14px", borderRadius: "14px", border: language === "en" ? "2px solid #11998e" : "1.5px solid #E6EDE8", background: language === "en" ? "#E8F8F0" : "white", fontWeight: "800", color: "#222" }}>🇬🇧 English {language === "en" ? "✓" : ""}</button>
              <button onClick={() => setLang("sw")} style={{ flex: 1, padding: "14px", borderRadius: "14px", border: language === "sw" ? "2px solid #11998e" : "1.5px solid #E6EDE8", background: language === "sw" ? "#E8F8F0" : "white", fontWeight: "800", color: "#222" }}>🇰🇪 Kiswahili {language === "sw" ? "✓" : ""}</button>
            </div>
            <p style={{ fontSize: "12px", color: subText, marginTop: "10px" }}>{t.remember}</p>
          </div>
          <div style={{ background: cardBg, padding: "20px", borderRadius: "20px", marginBottom: "12px" }}>
            <h3 style={{ margin: "0 0 12px" }}>{t.chamaDetails}</h3>
            <label style={{ fontSize: "13px", fontWeight: "700" }}>{t.chamaNameLabel}</label>
            <input value={settings.chamaName} onChange={e => saveSettings({ ...settings, chamaName: e.target.value })} style={{ width: "100%", padding: "12px", borderRadius: "12px", border: "1.5px solid #E6EDE8", margin: "6px 0 12px" }} />
            <label style={{ fontSize: "13px", fontWeight: "700" }}>{t.weeklyLabel}</label>
            <input type="number" value={settings.weeklyAmount} onChange={e => saveSettings({ ...settings, weeklyAmount: Number(e.target.value) })} style={{ width: "100%", padding: "12px", borderRadius: "12px", border: "1.5px solid #E6EDE8", margin: "6px 0 12px" }} />
            <label style={{ fontSize: "13px", fontWeight: "700" }}>{t.interestLabel}</label>
            <input type="number" value={settings.interestRate} onChange={e => saveSettings({ ...settings, interestRate: Number(e.target.value) })} style={{ width: "100%", padding: "12px", borderRadius: "12px", border: "1.5px solid #E6EDE8", margin: "6px 0 12px" }} />
            <label style={{ fontSize: "13px", fontWeight: "700" }}>{t.fineLabel}</label>
            <input type="number" value={settings.fineAmount} onChange={e => saveSettings({ ...settings, fineAmount: Number(e.target.value) })} style={{ width: "100%", padding: "12px", borderRadius: "12px", border: "1.5px solid #E6EDE8", margin: "6px 0 12px" }} />
          </div>
          <div style={{ background: cardBg, padding: "20px", borderRadius: "20px", marginBottom: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div><b>{t.darkMode}</b><div style={{ fontSize: "12px", color: subText }}>{t.darkDesc}</div></div>
            <button onClick={() => saveSettings({ ...settings, darkMode: !settings.darkMode })} style={{ background: settings.darkMode ? "#11998e" : "#DDD", border: "none", width: "52px", height: "28px", borderRadius: "20px", position: "relative" }}>
              <span style={{ position: "absolute", top: "3px", left: settings.darkMode ? "26px" : "3px", width: "22px", height: "22px", background: "white", borderRadius: "50%", display: "block" }} />
            </button>
          </div>
          <button onClick={() => setShowSettings(false)} style={{ width: "100%", background: "linear-gradient(135deg, #11998e, #38ef7d)", color: "white", border: "none", padding: "15px", borderRadius: "16px", fontWeight: "800" }}>{t.done}</button>
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
            <div style={{ fontSize: "40px" }}>✅</div><h3 style={{ margin: "8px 0" }}>{receipt.title}</h3>
            <div style={{ fontSize: "13px", color: "#888" }}>{new Date().toLocaleString("en-KE")}</div>
            <div style={{ borderTop: "1px dashed #DDD", margin: "16px 0", paddingTop: "14px", textAlign: "left", display: "flex", flexDirection: "column", gap: "8px", fontSize: "14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span>{language === "sw" ? "Mwanachama" : "Member"}</span><b>{receipt.name}</b></div>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span>{language === "sw" ? "Kiasi" : "Amount"}</span><b>KES {receipt.amount.toLocaleString()}</b></div>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span>Code</span><b>{receipt.code}</b></div>
              {receipt.extra && <div style={{ background: "#E8F8F0", padding: "10px", borderRadius: "10px", fontSize: "13px" }}>{receipt.extra}</div>}
            </div>
            <button onClick={() => setReceipt(null)} style={{ width: "100%", background: "#11998e", color: "white", border: "none", padding: "13px", borderRadius: "14px", fontWeight: "800" }}>{language === "sw" ? "Sawa" : "Done"}</button>
          </div>
        </div>
      )}
      <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div><div style={{ fontSize: "22px", fontWeight: "800" }}>{t.hi} {myName.split(" ")[0]} 👋</div><div style={{ fontSize: "13px", color: subText }}>{settings.chamaName} • {t.week} {weekNumber} • {settings.meetingDay} • {isTreasurer ? `👑 ${t.treasurer.toUpperCase()}` : isChair ? `🪑 ${t.chair.toUpperCase()}` : isSecretary ? `📝 ${t.secretary.toUpperCase()}` : `👤 ${t.member.toUpperCase()}`}</div></div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button onClick={() => setShowCoreTeam(!showCoreTeam)} style={{ background: "#FFF3D6", border: "1px solid #FFD97A", padding: "10px 14px", borderRadius: "20px", fontWeight: "700" }}>{t.coreTeam}</button>
            <button onClick={logout} style={{ background: "#FFE8E8", border: "1px solid #FFD0D0", padding: "10px 14px", borderRadius: "20px", fontWeight: "700", color: "#C0392B" }}>{t.logout}</button>
            <button onClick={downloadPDF} style={{ background: "#222", color: "white", border: "none", padding: "10px 14px", borderRadius: "20px", fontWeight: "700" }}>📄 PDF</button>
            {isTreasurer && <button onClick={() => setShowSettings(true)} style={{ background: cardBg, border: "1px solid #DDD", padding: "10px 14px", borderRadius: "20px", fontWeight: "700" }}>{t.settings}</button>}
          </div>
        </div>
        {showCoreTeam && (
          <div style={{ background: cardBg, padding: "20px", borderRadius: "20px", marginTop: "16px", border: "2px solid #FFD97A" }}>
            <h3 style={{ margin: "0 0 6px" }}>{t.coreTeam}</h3>
            <p style={{ fontSize: "13px", color: subText }}>{t.coreDesc}</p>
            {[
              { key: "treasurer", label: `👑 ${t.treasurer}`, desc: t.treasurerDesc },
              { key: "chair", label: `🪑 ${t.chair}`, desc: t.chairDesc },
              { key: "secretary", label: `📝 ${t.secretary}`, desc: t.secretaryDesc },
            ].map(role => {
              const holder = coreTeam[role.key];
              const isMeHolder = holder && holder.toLowerCase() === myName.toLowerCase();
              const vacant = !holder;
              return (
                <div key={role.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: vacant ? "#FFE8E8" : isMeHolder ? "#E8F8F0" : "#F5F5F5", padding: "14px", borderRadius: "14px", marginTop: "10px", flexWrap: "wrap", gap: "10px" }}>
                  <div><b>{role.label}</b><div style={{ fontSize: "13px", color: subText }}>{role.desc}</div><div style={{ fontSize: "14px", fontWeight: "800", marginTop: "4px" }}>{vacant ? `⚠️ ${t.vacantLabel} — ${t.waitingVote}` : `${holder} ${isMeHolder ? "(YOU)" : ""}`}</div></div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    {isMeHolder && <button onClick={resignRole} style={{ background: "#C0392B", color: "white", border: "none", padding: "10px 14px", borderRadius: "12px", fontWeight: "800", fontSize: "12px" }}>🚪 {language === "sw" ? "Jiuzulu" : "Resign"} {role.label}</button>}
                    {vacant && <span style={{ fontSize: "12px", color: "#C0392B", fontWeight: "700" }}>{t.logoutClaim}</span>}
                    {!vacant && !isMeHolder && isTreasurer && (
                      <select onChange={(e) => { if (e.target.value) assignCoreMember(role.key, e.target.value); e.target.value = ""; }} style={{ padding: "10px", borderRadius: "12px", border: "1px solid #DDD" }}>
                        <option value="">{t.replaceVote}</option>
                        {members.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
                      </select>
                    )}
                  </div>
                </div>
              );
            })}
            <p style={{ fontSize: "12px", color: subText, marginTop: "12px" }}>{isCoreMember ? t.coreNote : t.memberNote}</p>
          </div>
        )}
        {isCoreMember && (
          <div style={{ background: "#FFE8E8", padding: "12px 16px", borderRadius: "14px", marginTop: "14px", fontSize: "13px" }}>
            👑 {t.youAre} <b>{isTreasurer ? t.treasurer : isChair ? t.chair : t.secretary}</b>. {t.stepDown} <button onClick={resignRole} style={{ background: "#C0392B", color: "white", border: "none", padding: "6px 12px", borderRadius: "20px", fontWeight: "800", fontSize: "12px", marginLeft: "6px" }}>{t.resign}</button>
          </div>
        )}
        {merryOrder.length > 0 && (
          <div style={{ background: "linear-gradient(135deg, #f6d365, #fda085)", color: "#5A3A00", padding: "16px 18px", borderRadius: "18px", marginTop: "16px" }}>
            <div style={{ fontSize: "12px", fontWeight: "800" }}>{t.merryThisWeek}</div>
            <div style={{ fontSize: "20px", fontWeight: "900", marginTop: "4px" }}>{language === "sw" ? `Ni ${merryOrder[merryIndex]}${t.turn} ${(members.length * settings.weeklyAmount).toLocaleString()}` : `It's ${merryOrder[merryIndex]}${t.turn} ${(members.length * settings.weeklyAmount).toLocaleString()}`}</div>
            <div style={{ fontSize: "13px", marginTop: "2px" }}>{t.next} {merryOrder[(merryIndex+1)%merryOrder.length]}</div>
          </div>
        )}
        <div style={{ display: "flex", gap: "12px", marginTop: "16px", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: "240px", background: "linear-gradient(135deg, #11998e, #38ef7d)", color: "white", padding: "20px", borderRadius: "20px" }}>
            <div style={{ fontSize: "12px", fontWeight: "700" }}>💚 {t.week} {weekNumber} {t.collected}</div>
            <div style={{ fontSize: "28px", fontWeight: "900", margin: "6px 0" }}>KES {collectedThisWeek.toLocaleString()} / {expectedThisWeek.toLocaleString()}</div>
            <div style={{ fontSize: "13px" }}>{paidCount} {t.paidCount} {notPaid.length} {t.notPaidCount}</div>
          </div>
          <div style={{ flex: 1, minWidth: "240px", background: cardBg, padding: "20px", borderRadius: "20px" }}>
            <div style={{ fontSize: "12px", fontWeight: "700" }}>🧡 {t.savings}</div>
            <div style={{ fontSize: "28px", fontWeight: "900", margin: "6px 0" }}>KES {total.toLocaleString()}</div>
            <div style={{ fontSize: "13px", color: subText }}>{t.loansOut} {totalLoans.toLocaleString()}</div>
            {isTreasurer && <button onClick={startNewWeek} style={{ marginTop: "10px", background: "#222", color: "white", border: "none", padding: "10px 14px", borderRadius: "12px", fontWeight: "800", fontSize: "12px", width: "100%" }}>📅 {t.startWeek} {Number(weekNumber)+1})</button>}
          </div>
        </div>
        <div style={{ display: "flex", gap: "8px", marginTop: "18px", overflowX: "auto" }}>
          {[
            { id: "home", label: t.home },
            { id: "loans", label: t.loans },
            { id: "merry", label: t.merry },
            { id: "ledger", label: t.ledger },
          ].map(x => (
            <button key={x.id} onClick={() => setTab(x.id)} style={{ background: tab===x.id ? "#11998e" : cardBg, color: tab===x.id ? "white" : textColor, border: "1px solid #DDD", padding: "11px 16px", borderRadius: "20px", fontWeight: "800", fontSize: "13px", whiteSpace: "nowrap" }}>{x.label}</button>
          ))}
        </div>
        {tab === "home" && (
          <>
            <div style={{ marginTop: "16px", position: "relative" }}>
              <span style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)" }}>🔍</span>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t.search} style={{ width: "100%", padding: "14px 14px 14px 44px", borderRadius: "16px", border: "1.5px solid #E6EDE8", background: cardBg, color: textColor }} />
            </div>
            {notPaid.length > 0 && (
              <div style={{ background: "#FFE8E8", padding: "14px 16px", borderRadius: "16px", marginTop: "14px" }}>
                <b style={{ color: "#C0392B" }}>⚠️ {notPaid.length} {t.haveNotPaid}</b> <span style={{ color: "#333" }}>{notPaid.map(m=>m.name).join(", ")}</span>
              </div>
            )}
            {isTreasurer && (
              <form onSubmit={(e) => {
                e.preventDefault();
                // FIX 1 + 3: Block duplicate member, and first contribution = this week's payment
                const clean = name.trim();
                if (members.some(m => m.name.toLowerCase() === clean.toLowerCase())) {
                  alert(language === "sw" ? `${clean} tayari yupo!` : `${clean} is already a member!`);
                  return;
                }
                const firstAmt = Number(amount) || 0;
                   const newMember = { 
  id: Date.now(), 
  name: clean, 
  phone, 
  totalContributed: firstAmt, 
  loanBalance: 0,
  paidThisWeek: firstAmt >= settings.weeklyAmount
};
saveMembers([...members, newMember]);
                addHistory(`👤 ${clean} joined with KES ${firstAmt.toLocaleString()}`, "member");
                setName(""); setPhone(""); setAmount("");
              }} style={{ background: cardBg, padding: "18px", borderRadius: "18px", marginTop: "14px" }}>
                <h3 style={{ margin: "0 0 12px" }}>{t.addMember}</h3>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <input placeholder={language === "sw" ? "Jina kamili" : "Full name"} value={name} onChange={e=>setName(e.target.value)} required style={{ flex: 1, padding: "12px", borderRadius: "12px", border: "1.5px solid #E6EDE8" }} />
                  <input placeholder="Phone 07..." value={phone} onChange={e=>setPhone(e.target.value)} required style={{ flex: 1, padding: "12px", borderRadius: "12px", border: "1.5px solid #E6EDE8" }} />
                  <input placeholder={language === "sw" ? "Mchango wa kwanza" : "First contribution"} type="number" value={amount} onChange={e=>setAmount(e.target.value)} required style={{ flex: 1, padding: "12px", borderRadius: "12px", border: "1.5px solid #E6EDE8" }} />
                  <button style={{ background: "#11998e", color: "white", border: "none", padding: "12px 18px", borderRadius: "12px", fontWeight: "800" }}>+ {language === "sw" ? "Ongeza" : "Add"}</button>
                </div>
              </form>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "14px", marginTop: "16px" }}>
              {sorted.map((m) => {
                const isMe = myName && m.name.toLowerCase()===myName.toLowerCase();
                const paid = !!m.paidThisWeek;
                const canPayThis = !paid && (isTreasurer || isMe);
                return (
                  <div key={m.id} style={{ background: cardBg, padding: "18px", borderRadius: "20px", border: isMe ? "2px solid #11998e" : "1px solid #EEE" }}>
                    {isMe && <div style={{ background: "#11998e", color: "white", fontSize: "11px", fontWeight: "800", padding: "5px 10px", borderRadius: "20px", display: "inline-block", marginBottom: "8px" }}>{t.thisIsYou}</div>}
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <div><b style={{ fontSize: "16px" }}>{m.name} {isMe ? t.youWord : ""}</b><div style={{ color: subText, fontSize: "13px" }}>📱 {m.phone} • {t.saved} {(m.totalContributed||0).toLocaleString()}</div></div>
                      <span style={{ background: paid ? "#E8F8F0" : "#FFE8E8", color: paid ? "#0F7A5A" : "#C0392B", padding: "6px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: "800", height: "fit-content" }}>{paid ? t.paid : t.notPaid}</span>
                    </div>
                    <div style={{ fontSize: "13px", marginTop: "10px", color: subText }}>{t.week} {weekNumber}: {paid ? `${language === "sw" ? "Amelipa" : "Paid"} KES ${settings.weeklyAmount.toLocaleString()} ✅` : `${t.owes} KES ${settings.weeklyAmount.toLocaleString()}`}</div>
                    <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
                      {canPayThis && <button onClick={() => payThisWeek(m)} style={{ flex: 1, background: "linear-gradient(135deg, #11998e, #38ef7d)", color: "white", border: "none", padding: "12px", borderRadius: "12px", fontWeight: "800" }}>{t.payNow}</button>}
                      {paid && <button disabled style={{ flex: 1, background: "#E8F8F0", color: "#0F7A5A", border: "none", padding: "12px", borderRadius: "12px", fontWeight: "800" }}>{t.paidThisWeek}</button>}
                      {!paid && !canPayThis && <div style={{ flex: 1, background: "#F5F5F5", padding: "12px", borderRadius: "12px", fontSize: "12px", textAlign: "center", color: subText }}>{t.onlyPay} {m.name} {t.orTreasurer}</div>}
                      {!paid && <button onClick={() => sendReminder(m)} style={{ background: "#FFF3D6", border: "none", padding: "12px", borderRadius: "12px", fontWeight: "800" }}>{t.remind}</button>}
                    </div>
                    <div style={{ fontSize: "12px", color: subText, marginTop: "8px" }}>{t.loanOwed} {(m.loanBalance||0).toLocaleString()} {coreTeam.treasurer === m.name ? `• 👑 ${t.treasurer}` : coreTeam.chair === m.name ? `• 🪑 ${t.chair}` : coreTeam.secretary === m.name ? `• 📝 ${t.secretary}` : ""}</div>
                  </div>
                );
              })}
            </div>
          </>
        )}
        {tab === "loans" && (
          <div style={{ marginTop: "16px" }}>
            <div style={{ background: cardBg, padding: "20px", borderRadius: "20px" }}>
              <h3 style={{ margin: "0 0 6px" }}>{t.requestTitle}</h3>
              <p style={{ fontSize: "13px", color: subText, margin: "0 0 14px" }}>{language === "sw" ? `Riba ${settings.interestRate}% = KES ${preview ? preview.interest.toLocaleString() : "0"}` : `Interest ${settings.interestRate}% = KES ${preview ? preview.interest.toLocaleString() : "0"}`}</p>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <select value={loanName} onChange={e => setLoanName(e.target.value)} style={{ flex: 1, padding: "12px", borderRadius: "12px", border: "1.5px solid #E6EDE8" }}>
                  <option value="">{t.pickMember}</option>
                  {members.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
                </select>
                <input type="number" placeholder={t.amountEg} value={loanAmountInput} onChange={e => setLoanAmountInput(e.target.value)} style={{ flex: 1, padding: "12px", borderRadius: "12px", border: "1.5px solid #E6EDE8" }} />
                <select value={loanWeeks} onChange={e => setLoanWeeks(Number(e.target.value))} style={{ padding: "12px", borderRadius: "12px", border: "1.5px solid #E6EDE8" }}>
                  <option value={2}>2 {language === "sw" ? "wiki" : "weeks"}</option><option value={4}>4 {language === "sw" ? "wiki" : "weeks"}</option><option value={6}>6 {language === "sw" ? "wiki" : "weeks"}</option><option value={8}>8 {language === "sw" ? "wiki" : "weeks"}</option>
                </select>
              </div>
              {preview && (
                <div style={{ background: "#E8F8F0", padding: "14px", borderRadius: "14px", marginTop: "12px", fontSize: "14px", lineHeight: "1.6", color: "#222" }}>
                  <b>📊 {t.breakdown}</b><br/>{t.borrow} <b>KES {Number(loanAmountInput).toLocaleString()}</b>. {t.interest} <b>KES {preview.interest.toLocaleString()}</b>. {t.total} <b>KES {preview.totalPay.toLocaleString()}</b>. {t.everyWeek} <b>KES {preview.weekly.toLocaleString()}</b>.
                </div>
              )}
              <button onClick={requestLoan} style={{ marginTop: "12px", width: "100%", background: "#11998e", color: "white", border: "none", padding: "13px", borderRadius: "14px", fontWeight: "800" }}>{t.requestLoan}</button>
            </div>
            <h3 style={{ margin: "20px 0 12px" }}>{t.loanRequests}</h3>
            {loanRequests.length === 0 && <p style={{ color: subText }}>{t.noLoans}</p>}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {loanRequests.map(req => (
                <div key={req.id} style={{ background: cardBg, padding: "18px", borderRadius: "18px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}><b>{req.name} — KES {req.principal.toLocaleString()}</b><span style={{ background: req.status==="pending" ? "#FFF3D6" : req.status==="finished" ? "#E8F8F0" : "#E8F0FF", padding: "5px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: "800" }}>{req.status === "pending" ? t.pending : req.status === "finished" ? t.finishedWord : t.approved}</span></div>
                  <div style={{ fontSize: "13px", color: subText, marginTop: "6px" }}>{t.totalWord} KES {req.totalPay.toLocaleString()} • {req.weekly.toLocaleString()}{t.perWeek} {req.weeks} • {t.paidWord} {req.paidSoFar.toLocaleString()} • {t.remaining} {req.remaining.toLocaleString()}</div>
                  <div style={{ background: "#EEE", height: "8px", borderRadius: "10px", marginTop: "10px", overflow: "hidden" }}><div style={{ width: `${(req.paidSoFar/req.totalPay)*100}%`, height: "100%", background: "#11998e" }} /></div>
                  <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
                    {req.status === "pending" && (isTreasurer || isChair) && <button onClick={() => approveLoan(req)} style={{ background: "#11998e", color: "white", border: "none", padding: "10px 14px", borderRadius: "12px", fontWeight: "800" }}>{t.approve}</button>}
                    {req.status === "pending" && !isTreasurer && !isChair && <span style={{ fontSize: "13px", color: subText }}>{t.waiting}</span>}
                    {req.status === "approved" && <button onClick={() => payLoanWeek(req)} style={{ background: "linear-gradient(135deg, #f6d365, #fda085)", border: "none", padding: "10px 14px", borderRadius: "12px", fontWeight: "800" }}>{t.payLoanWeek} {req.weekly.toLocaleString()} →</button>}
                    {req.status === "finished" && <span style={{ color: "#0F7A5A", fontWeight: "800", fontSize: "13px" }}>{t.finished}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {tab === "merry" && (
          <div style={{ marginTop: "16px", background: cardBg, padding: "20px", borderRadius: "20px" }}>
            <h3 style={{ margin: "0 0 6px" }}>{t.merryTitle}</h3>
            <p style={{ color: subText, fontSize: "13px" }}>{t.merryDesc}</p>
            {merryOrder.length === 0 ? (
              <>{isTreasurer ? <button onClick={setupMerry} style={{ background: "#11998e", color: "white", border: "none", padding: "12px 16px", borderRadius: "12px", fontWeight: "800" }}>{t.startWith} {members.length} {t.membersWord}</button> : <p style={{ fontSize: "13px", color: subText }}>{t.onlyTreasurerStart}</p>}</>
            ) : (
              <>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "12px" }}>
                  {merryOrder.map((n, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "12px", borderRadius: "12px", background: i===merryIndex ? "#FFF3D6" : "#F5F5F5", fontWeight: i===merryIndex ? "800" : "400", color: "#222" }}>
                      <span>{i+1}. {n} {i===merryIndex ? t.thisWeek : ""}</span><span>KES {(members.length * settings.weeklyAmount).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
                {isTreasurer && <button onClick={nextMerry} style={{ marginTop: "14px", width: "100%", background: "#222", color: "white", border: "none", padding: "13px", borderRadius: "14px", fontWeight: "800" }}>{t.markDone}</button>}
              </>
            )}
          </div>
        )}
        {tab === "ledger" && (
          <div style={{ marginTop: "16px", background: cardBg, padding: "20px", borderRadius: "20px" }}>
            <h3 style={{ margin: "0 0 6px" }}>{t.ledgerTitle}</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "14px" }}>
              {history.length === 0 && <p style={{ color: subText }}>{t.noEntries}</p>}
              {history.map(h => (
                <div key={h.id} style={{ display: "flex", justifyContent: "space-between", background: h.type==="contribution" ? "#E8F8F0" : h.type==="loan" ? "#FFF3D6" : h.type==="repay" ? "#E8F0FF" : h.type==="fine" ? "#FFE8E8" : "#F5F5F5", color: "#222", padding: "11px 13px", borderRadius: "12px" }}>
                  <span style={{ fontSize: "14px", fontWeight: "600" }}>{h.text} 🔒</span><span style={{ fontSize: "12px", color: "#888", whiteSpace: "nowrap", marginLeft: "8px" }}>{h.time}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

// =====================================================================
//  WHO CAN DO WHAT
//  Chairperson : sees everything, approves loan requests, approves PIN resets,
//                sets monthly amount, changes roles. CANNOT confirm M-Pesa payments.
//  Treasurer   : confirms payments + loan repayments, records payments, approves PIN resets.
//                Cannot approve their own loan (the Chairperson does).
//  Secretary   : adds / edits members, changes the meeting, approves PIN resets.
//                Cannot confirm payments or approve loans.
//  Member      : submits payments, requests loans, sees only their own records.
//  (If a chama has no Secretary yet, the Chairperson can manage members and the meeting.)
// =====================================================================

const DEFAULT_PIN = '1234'

const styles = {
  page: { padding: 20, fontFamily: 'sans-serif', maxWidth: 680, margin: '0 auto' },
  input: { padding: 10, border: '1px solid #ccc', borderRadius: 6, flex: 1, minWidth: 140 },
  button: { padding: '10px 16px', border: 'none', borderRadius: 6, background: '#11998e', color: 'white', fontWeight: 600, cursor: 'pointer' },
  grey: { padding: '10px 16px', border: 'none', borderRadius: 6, background: '#999', color: 'white', fontWeight: 600, cursor: 'pointer' },
  small: { padding: '6px 12px', border: 'none', borderRadius: 6, color: 'white', fontWeight: 600, cursor: 'pointer' },
  row: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 14px', borderBottom: '1px solid #eee', flexWrap: 'wrap' },
  box: { border: '1px solid #eee', borderRadius: 10, overflow: 'hidden', marginBottom: 16 },
  card: { background: '#f7faf9', border: '1px solid #e3efec', borderRadius: 10, padding: 14, marginBottom: 16 },
}
const del = { ...styles.small, background: '#c0392b' }
const edit = { ...styles.small, background: '#2d6cdf' }
const ok = { ...styles.small, background: '#11998e' }

// ---------- roles ----------
const ROLES = [
  { value: 'chairperson', label: 'Chairperson' },
  { value: 'treasurer', label: 'Treasurer' },
  { value: 'secretary', label: 'Secretary' },
  { value: 'member', label: 'Member' },
]
const OFFICIAL = ['chairperson', 'treasurer', 'secretary']
const roleOf = (m) => (m?.role === 'chairlady' ? 'chairperson' : m?.role || 'member') // 'chairlady' = old name
const roleLabel = (r) => ROLES.find((x) => x.value === r)?.label || 'Member'

// ---------- helpers ----------
const fail = (msg) => { throw new Error(msg) }
const kes = (n) => `KES ${Number(n || 0).toLocaleString()}`
const pad = (n) => String(n).padStart(2, '0')
const monthKeyOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
const thisMonth = () => monthKeyOf(new Date())
const todayISO = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }
const monthLabel = (key) => {
  if (!key) return 'No month'
  const [y, m] = key.split('-')
  return new Date(Number(y), Number(m) - 1, 1).toLocaleString('en-GB', { month: 'long', year: 'numeric' })
}
const fmtDate = (s) =>
  new Date(String(s).length === 10 ? s + 'T00:00:00' : s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
const recentMonths = () => {
  const now = new Date()
  return Array.from({ length: 12 }, (_, i) => monthKeyOf(new Date(now.getFullYear(), now.getMonth() - i, 1)))
}
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const fmtWhen = (iso) => {
  const d = new Date(iso)
  if (isNaN(d)) return ''
  let h = d.getHours()
  const ap = h >= 12 ? 'PM' : 'AM'
  h = h % 12 || 12
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}, ${h}:${pad(d.getMinutes())} ${ap}`
}
const toInputValue = (iso) => {
  const d = new Date(iso)
  if (isNaN(d)) return ''
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// Kenyan phone -> 0712345678 (or null if invalid)
const cleanPhone = (p) => {
  const s = String(p).replace(/[\s-]/g, '')
  if (!/^(0|\+?254)[17]\d{8}$/.test(s)) return null
  const d = s.replace(/\D/g, '')
  return d.startsWith('254') ? '0' + d.slice(3) : d
}

// PINs are never stored as plain text: only a hash that is tied to the phone number.
async function hashPin(pin, phone) {
  const bytes = new TextEncoder().encode(`chama-v1|${phone}|${pin}`)
  const buf = await crypto.subtle.digest('SHA-256', bytes)
  return 'sha256:' + Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

const sess = {
  get: () => { try { return sessionStorage.getItem('chama_member_id') } catch { return null } },
  set: (v) => { try { sessionStorage.setItem('chama_member_id', v) } catch {} },
  clear: () => { try { sessionStorage.removeItem('chama_member_id') } catch {} },
}

// payment / repayment status (old rows with no status count as confirmed)
const pstatus = (p) => (p.status === 'pending' ? 'pending' : p.status === 'rejected' ? 'rejected' : 'confirmed')

// ---------- loan maths ----------
const parseISO = (s) => { const [y, m, d] = String(s).slice(0, 10).split('-').map(Number); return { y, m: m - 1, d } }
// Every month that has STARTED counts in full; the first month always counts.
const monthsOpen = (fromISO, toISO) => {
  const a = parseISO(fromISO)
  const b = parseISO(toISO)
  const diff = (b.y - a.y) * 12 + (b.m - a.m)
  const completed = Math.max(0, diff - (b.d < a.d ? 1 : 0))
  const last = new Date(a.y, a.m + completed + 1, 0).getDate()
  const anniversary = new Date(a.y, a.m + completed, Math.min(a.d, last))
  const end = new Date(b.y, b.m, b.d)
  return Math.max(1, end > anniversary ? completed + 1 : completed)
}
// reps = CONFIRMED repayments only
function loanInfo(loan, reps) {
  const principal = loan.amount
  const rate = Number(loan.interest_percent || 0)
  const monthly = loan.interest_type === 'monthly'
  const owedAt = (dateISO) => principal + Math.round(((principal * rate) / 100) * (monthly ? monthsOpen(loan.loan_date, dateISO) : 1))
  const sorted = [...reps].sort((x, y) => String(x.paid_on).localeCompare(String(y.paid_on)) || String(x.created_at).localeCompare(String(y.created_at)))
  const repaid = sorted.reduce((s, r) => s + r.amount, 0)
  let cum = 0
  let clearedOn = null
  for (const r of sorted) { cum += r.amount; if (cum >= owedAt(r.paid_on)) { clearedOn = r.paid_on; break } }
  const asOf = clearedOn || todayISO()
  const owed = owedAt(asOf)
  const balance = Math.max(owed - repaid, 0)
  return { owed, repaid, balance, cleared: balance <= 0, interest: owed - principal, months: monthly ? monthsOpen(loan.loan_date, asOf) : null, monthly, rate }
}

// =====================================================================
//  LOGIN SCREENS
// =====================================================================
function Shell({ title, children }) {
  return (
    <div style={{ ...styles.page, maxWidth: 420 }}>
      <h1 style={{ textAlign: 'center' }}>My Chama App 💰</h1>
      <div style={{ border: '1px solid #e3efec', borderRadius: 14, padding: 20, background: 'white' }}>
        <h2 style={{ marginTop: 0 }}>{title}</h2>
        {children}
      </div>
    </div>
  )
}
const full = { ...styles.input, width: '100%', boxSizing: 'border-box', marginBottom: 10, flex: 'none' }

function LoginScreen({ onLoggedIn, goForgot, goNew }) {
  const [phone, setPhone] = useState('')
  const [pin, setPin] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [choices, setChoices] = useState(null) // when the same phone + PIN exists in 2+ chamas

  async function submit(e) {
    e.preventDefault()
    setError('')
    const ph = cleanPhone(phone)
    if (!ph) return setError('Enter your phone number, e.g. 0712345678.')
    if (!/^\d{4}$/.test(pin)) return setError('PIN is 4 numbers.')
    setBusy(true)
    try {
      const { data, error } = await supabase.from('members').select('*').eq('phone', ph)
      if (error) throw error
      const hash = await hashPin(pin, ph)
      const matches = (data || []).filter((m) => m.pin_code === hash && (!m.status || m.status === 'active'))
      if (matches.length === 0) return setError('Wrong phone number or PIN. Use "Forgot PIN?" if you forgot it.')
      if (matches.length === 1) return onLoggedIn(matches[0])
      // same phone + same PIN in 2 or more chamas: let the person choose which one to open
      const { data: cs } = await supabase.from('chamas').select('id,name').in('id', matches.map((m) => m.chama_id))
      setChoices(matches.map((m) => ({ member: m, name: cs?.find((c) => c.id === m.chama_id)?.name || 'Chama', role: roleLabel(roleOf(m)) })))
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (choices) {
    return (
      <Shell title="Which chama?">
        {choices.map((c) => (
          <button key={c.member.id} onClick={() => onLoggedIn(c.member)} style={{ ...styles.button, width: '100%', marginBottom: 8 }}>{c.name} · {c.role}</button>
        ))}
      </Shell>
    )
  }

  return (
    <Shell title="Log in">
      <form onSubmit={submit}>
        <input placeholder="Phone e.g. 0712345678" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} style={full} />
        <input placeholder="PIN (4 numbers)" type="password" inputMode="numeric" maxLength={4} autoComplete="off"
          value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} style={full} />
        <button type="submit" disabled={busy} style={{ ...styles.button, width: '100%' }}>{busy ? 'Logging in...' : 'Log in'}</button>
      </form>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <p style={{ textAlign: 'center', marginBottom: 4 }}>
        <button onClick={goForgot} style={{ background: 'none', border: 'none', color: '#2d6cdf', cursor: 'pointer', fontSize: 15 }}>Forgot PIN?</button>
      </p>
      <p style={{ textAlign: 'center', margin: 0 }}>
        <button onClick={goNew} style={{ background: 'none', border: 'none', color: '#11998e', cursor: 'pointer', fontSize: 15 }}>Start a new chama</button>
      </p>
    </Shell>
  )
}

function ForgotScreen({ onBack }) {
  const [phone, setPhone] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setError('')
    const ph = cleanPhone(phone)
    if (!ph) return setError('Enter your phone number, e.g. 0712345678.')
    setBusy(true)
    try {
      const { data: ms, error } = await supabase.from('members').select('id,chama_id,phone').eq('phone', ph)
      if (error) throw error
      for (const m of ms || []) {
        const { data: open } = await supabase.from('pin_reset_requests').select('id').eq('member_id', m.id).eq('status', 'pending')
        if (!open || open.length === 0) {
          const r = await supabase.from('pin_reset_requests').insert({ chama_id: m.chama_id, member_id: m.id, phone: ph, status: 'pending' })
          if (r.error) throw r.error
        }
      }
      setSent(true) // same message whether or not the number exists
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Shell title="Forgot PIN?">
      {sent ? (
        <>
          <p>Request sent. If this number is registered, the Chairperson, Secretary or Treasurer will see it. Any one of them can approve it.</p>
          <p>After approval, log in with PIN <b>{DEFAULT_PIN}</b> and you will be asked to choose a new PIN.</p>
        </>
      ) : (
        <form onSubmit={submit}>
          <p style={{ color: '#666', marginTop: 0 }}>Enter the phone number you registered with.</p>
          <input placeholder="Phone e.g. 0712345678" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} style={full} />
          <button type="submit" disabled={busy} style={{ ...styles.button, width: '100%' }}>{busy ? 'Sending...' : 'Request PIN reset'}</button>
          {error && <p style={{ color: 'red' }}>{error}</p>}
        </form>
      )}
      <p style={{ textAlign: 'center', marginBottom: 0 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#2d6cdf', cursor: 'pointer', fontSize: 15 }}>← Back to log in</button>
      </p>
    </Shell>
  )
}

function ChangePinScreen({ member, onDone }) {
  const [pin1, setPin1] = useState('')
  const [pin2, setPin2] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(e) {
    e.preventDefault()
    setError('')
    if (!/^\d{4}$/.test(pin1)) return setError('PIN must be exactly 4 numbers.')
    if (pin1 === DEFAULT_PIN) return setError(`Please choose a PIN other than ${DEFAULT_PIN}.`)
    if (pin1 !== pin2) return setError('The two PINs do not match.')
    setBusy(true)
    try {
      const pin_code = await hashPin(pin1, member.phone)
      // one person = one PIN: save it on every chama row that has this phone number
      const { data, error } = await supabase.from('members').update({ pin_code, must_change_pin: false }).eq('phone', member.phone).select()
      if (error) throw error
      const mine = (data || []).find((r) => r.id === member.id)
      if (!mine) throw new Error('Could not save your PIN. Please try again.')
      onDone(mine)
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <Shell title="Choose a new PIN">
      <p style={{ color: '#666', marginTop: 0 }}>Hi {member.full_name}. For your safety, choose your own 4-number PIN. Only you should know it.</p>
      <form onSubmit={submit}>
        <input placeholder="New PIN" type="password" inputMode="numeric" maxLength={4} autoComplete="off" value={pin1} onChange={(e) => setPin1(e.target.value.replace(/\D/g, ''))} style={full} />
        <input placeholder="Type it again" type="password" inputMode="numeric" maxLength={4} autoComplete="off" value={pin2} onChange={(e) => setPin2(e.target.value.replace(/\D/g, ''))} style={full} />
        <button type="submit" disabled={busy} style={{ ...styles.button, width: '100%' }}>{busy ? 'Saving...' : 'Save PIN and continue'}</button>
      </form>
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </Shell>
  )
}

// ---------- where members send money (Pochi / Till / Paybill) ----------
const PAY_TYPES = [
  { value: 'Pochi', label: 'Pochi la Biashara' },
  { value: 'Till', label: 'Till Number' },
  { value: 'Paybill', label: 'Paybill Number' },
]
const payTypeLabel = (t) => PAY_TYPES.find((x) => x.value === t)?.label || t || ''
// returns { number } when valid, or { error }
function checkPayDetails(type, rawNumber, rawName) {
  const name = String(rawName || '').trim()
  let raw = String(rawNumber || '').trim()
  if (!PAY_TYPES.some((x) => x.value === type)) return { error: 'Choose Pochi la Biashara, Till Number or Paybill Number.' }
  if (!raw) return { error: 'Enter the number members will send money to.' }
  raw = raw.replace(/^(till|paybill|pochi)\s*(number|no\.?)?\s*/i, '') // allow "Till 123456"
  let number
  if (type === 'Pochi') {
    number = cleanPhone(raw)
    if (!number) return { error: 'A Pochi la Biashara number is a phone number, e.g. 0712345678.' }
  } else {
    number = raw.replace(/\s/g, '')
    if (!/^\d{5,7}$/.test(number)) return { error: `A ${type} number is 5 to 7 digits, e.g. 123456.` }
  }
  if (!name) return { error: 'Enter the name that shows on that number, e.g. Mary.' }
  return { number, name }
}
// fire-and-forget WhatsApp message (see whatsapp-server.js). Never blocks or breaks the action.
const notify = (event, id) => {
  try {
    fetch('/api/notify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event, id }) }).catch(() => {})
  } catch { /* ignore */ }
}

function PayBox({ chama, onFix }) {
  const [copied, setCopied] = useState(false)
  const green = { background: '#e6f7ee', border: '2px solid #1f9d57', borderRadius: 12, padding: '12px 14px', margin: '14px 0 0' }
  if (!chama?.payment_number) {
    return (
      <div style={{ ...green, background: '#fff8e1', border: '2px solid #e0a800' }}>
        <b>Send your contribution to:</b> not set yet.{' '}
        {onFix ? <button onClick={onFix} style={{ ...styles.small, background: '#8a5a00' }}>Add it now</button> : 'Ask the Chairperson to add it.'}
      </div>
    )
  }
  async function copy() {
    const text = chama.payment_number
    try { await navigator.clipboard.writeText(text) } catch {
      try {
        const t = document.createElement('textarea'); t.value = text; document.body.appendChild(t); t.select(); document.execCommand('copy'); document.body.removeChild(t)
      } catch { /* ignore */ }
    }
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div style={green}>
      <div style={{ fontSize: 13, color: '#14663a', fontWeight: 700 }}>Send your contribution to:</div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginTop: 6 }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: '#0f4d2b' }}>
          {chama.payment_number} - {payTypeLabel(chama.payment_type)} ({chama.payment_name})
        </div>
        <button onClick={copy} style={{ ...styles.small, background: '#1f9d57' }}>{copied ? 'Copied!' : 'Copy Number'}</button>
      </div>
    </div>
  )
}

function NewChamaScreen({ onBack, onCreated }) {
  const [chamaName, setChamaName] = useState('')
  const [payType, setPayType] = useState('Pochi')
  const [payNumber, setPayNumber] = useState('')
  const [payName, setPayName] = useState('')
  const [amount, setAmount] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [pin, setPin] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(e) {
    e.preventDefault()
    setError('')
    const ph = cleanPhone(phone)
    const amt = Number(amount)
    if (!chamaName.trim()) return setError('Enter the chama name.')
    const pay = checkPayDetails(payType, payNumber, payName)
    if (pay.error) return setError(pay.error)
    if (!Number.isInteger(amt) || amt <= 0) return setError('Enter the monthly amount as a whole number, e.g. 500.')
    if (!name.trim()) return setError('Enter your name.')
    if (!ph) return setError('Enter your phone number, e.g. 0712345678.')
    if (!/^\d{4}$/.test(pin) || pin === DEFAULT_PIN) return setError(`Choose a 4-number PIN (not ${DEFAULT_PIN}).`)
    setBusy(true)
    let chamaId = null
    try {
      const c = await supabase.from('chamas').insert({ name: chamaName.trim(), monthly_amount: amt, payment_type: payType, payment_number: pay.number, payment_name: pay.name }).select().single()
      if (c.error) throw c.error
      chamaId = c.data.id
      const pin_code = await hashPin(pin, ph)
      const m = await supabase.from('members')
        .insert({ chama_id: chamaId, full_name: name.trim(), phone: ph, pin_code, role: 'chairperson', status: 'active', must_change_pin: false })
        .select().single()
      if (m.error) throw m.error
      onCreated(m.data)
    } catch (err) {
      if (chamaId) await supabase.from('chamas').delete().eq('id', chamaId) // do not leave an empty chama behind
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <Shell title="Start a new chama">
      <p style={{ color: '#666', marginTop: 0 }}>You will be the Chairperson. You can add the other members and officials afterwards.</p>
      <form onSubmit={submit}>
        <input placeholder="Chama name" value={chamaName} onChange={(e) => setChamaName(e.target.value)} style={full} />
        <div style={{ background: '#e6f7ee', border: '1px solid #1f9d57', borderRadius: 10, padding: 12, marginBottom: 10 }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Where should members send contributions? <span style={{ color: '#c0392b' }}>*</span></div>
          <select value={payType} onChange={(e) => setPayType(e.target.value)} style={full}>
            {PAY_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <input placeholder={payType === 'Pochi' ? 'e.g. 0712345678' : 'e.g. Till 123456'} value={payNumber} onChange={(e) => setPayNumber(e.target.value)} style={full} />
          <input placeholder="Name on number e.g. Mary" value={payName} onChange={(e) => setPayName(e.target.value)} style={{ ...full, marginBottom: 0 }} />
        </div>
        <input type="number" min="1" placeholder="Monthly amount e.g. 500" value={amount} onChange={(e) => setAmount(e.target.value)} style={full} />
        <input placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} style={full} />
        <input placeholder="Your phone e.g. 0712345678" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} style={full} />
        <input placeholder="Your PIN (4 numbers)" type="password" inputMode="numeric" maxLength={4} autoComplete="off" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} style={full} />
        <button type="submit" disabled={busy} style={{ ...styles.button, width: '100%' }}>{busy ? 'Creating...' : 'Create chama'}</button>
      </form>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <p style={{ textAlign: 'center', marginBottom: 0 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#2d6cdf', cursor: 'pointer', fontSize: 15 }}>← Back to log in</button>
      </p>
    </Shell>
  )
}

// =====================================================================
//  THE CHAMA (after login)
// =====================================================================
function ChamaApp({ meId, meFallback, chamaId, onLogout }) {
  const [chama, setChama] = useState(null)
  const [members, setMembers] = useState([])
  const [payments, setPayments] = useState([])
  const [loans, setLoans] = useState([])
  const [repayments, setRepayments] = useState([])
  const [resets, setResets] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('chama')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  // forms
  const [amountInput, setAmountInput] = useState('')
  const [mWhen, setMWhen] = useState('')
  const [mPlace, setMPlace] = useState('')
  const [checkMonth, setCheckMonth] = useState(thisMonth())
  const [gName, setGName] = useState('')
  const [gType, setGType] = useState('Pochi')
  const [gNumber, setGNumber] = useState('')
  const [gPayName, setGPayName] = useState('')

  const [editPayId, setEditPayId] = useState(null)
  const [payMember, setPayMember] = useState('')
  const [payAmount, setPayAmount] = useState('')
  const [payMonth, setPayMonth] = useState(thisMonth())
  const [payDate, setPayDate] = useState(todayISO())
  const [payCode, setPayCode] = useState('')

  const [reqAmount, setReqAmount] = useState('')
  const [reqReturn, setReqReturn] = useState('')
  const [apprId, setApprId] = useState(null)
  const [apprInterest, setApprInterest] = useState('')
  const [apprType, setApprType] = useState('once')
  const [repLoanId, setRepLoanId] = useState(null)
  const [repAmount, setRepAmount] = useState('')
  const [repDate, setRepDate] = useState(todayISO())
  const [repCode, setRepCode] = useState('')

  const [nName, setNName] = useState('')
  const [nPhone, setNPhone] = useState('')
  const [nPin, setNPin] = useState('')
  const [editId, setEditId] = useState(null)
  const [eName, setEName] = useState('')
  const [ePhone, setEPhone] = useState('')

  async function reload() {
    const [c, m, p, l, r] = await Promise.all([
      supabase.from('chamas').select('*').eq('id', chamaId).single(),
      supabase.from('members').select('*').eq('chama_id', chamaId).order('created_at', { ascending: true }),
      supabase.from('payments').select('*').eq('chama_id', chamaId).order('created_at', { ascending: false }),
      supabase.from('loans').select('*').eq('chama_id', chamaId).order('created_at', { ascending: false }),
      supabase.from('pin_reset_requests').select('*').eq('chama_id', chamaId).eq('status', 'pending').order('created_at', { ascending: true }),
    ])
    const bad = c.error || m.error || p.error || l.error || r.error
    if (bad) throw bad
    setChama(c.data); setMembers(m.data); setPayments(p.data); setLoans(l.data); setResets(r.data)
    const ids = l.data.map((x) => x.id)
    if (ids.length > 0) {
      const rep = await supabase.from('loan_repayments').select('*').in('loan_id', ids).order('paid_on', { ascending: true })
      if (rep.error) throw rep.error
      setRepayments(rep.data)
    } else setRepayments([])
  }

  useEffect(() => {
    reload().catch((e) => setErr(e.message)).finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chamaId])

  useEffect(() => {
    if (chama) {
      setAmountInput(String(chama.monthly_amount || ''))
      setMWhen(chama.next_meeting_at ? toInputValue(chama.next_meeting_at) : '')
      setMPlace(chama.next_meeting_place || '')
      setGName(chama.name || '')
      setGType(chama.payment_type || 'Pochi')
      setGNumber(chama.payment_number || '')
      setGPayName(chama.payment_name || '')
    }
  }, [chama])

  // run an action, show any error at the top, then refresh the data
  async function act(fn) {
    setErr(''); setBusy(true)
    try { await fn(); await reload() } catch (e) { setErr(e.message || String(e)) }
    setBusy(false)
  }

  const me = members.find((m) => m.id === meId) || meFallback
  const role = roleOf(me)
  const isChair = role === 'chairperson'
  const isTreasurer = role === 'treasurer'
  const isSecretary = role === 'secretary'
  const isOfficial = OFFICIAL.includes(role)
  const hasSecretary = members.some((m) => roleOf(m) === 'secretary')
  const canManageMembers = isSecretary || isChair // Secretary's job; Chairperson can also do it so the chama never stops
  const canMeeting = canManageMembers

  // if I was removed from the chama, log me out
  useEffect(() => {
    if (!loading && members.length > 0 && !members.some((m) => m.id === meId)) onLogout()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [members, loading])

  if (loading || !chama) return <div style={styles.page}>{err ? <p style={{ color: 'red' }}>Error: {err}</p> : <p>Loading...</p>}</div>

  const nameOf = (id) => members.find((m) => m.id === id)?.full_name || 'Unknown member'
  const mine = (memberId) => isOfficial || memberId === me.id
  const monthlyAmount = chama.monthly_amount || 0

  // loan approval rule: nobody approves their own loan. Chairperson approves; if the borrower IS the Chairperson, the Treasurer does.
  const approverRoleFor = (loan) => (roleOf(members.find((m) => m.id === loan.member_id)) === 'chairperson' ? 'treasurer' : 'chairperson')
  const canApproveLoan = (loan) => loan.member_id !== me.id && role === approverRoleFor(loan)

  const confirmedReps = (loanId) => repayments.filter((r) => r.loan_id === loanId && pstatus(r) === 'confirmed')
  const infoOf = (l) => loanInfo(l, confirmedReps(l.id))
  const approvedLoans = loans.filter((l) => !l.status || l.status === 'approved')
  const requestedLoans = loans.filter((l) => l.status === 'requested' || l.status === 'declined')

  // ---------- chama tab actions ----------
  const saveMonthly = () => act(async () => {
    if (!isChair) fail('Only the Chairperson can change the monthly amount.')
    const v = Number(amountInput)
    if (!Number.isInteger(v) || v <= 0) fail('Enter a whole number above 0, e.g. 500.')
    const { error } = await supabase.from('chamas').update({ monthly_amount: v }).eq('id', chamaId)
    if (error) throw error
  })
  const saveMeeting = () => act(async () => {
    if (!canMeeting) fail('Only the Secretary can change the meeting.')
    if (!mWhen) fail('Pick the meeting date and time.')
    if (!mPlace.trim()) fail('Enter where the meeting will be.')
    const { error } = await supabase.from('chamas').update({ next_meeting_at: new Date(mWhen).toISOString(), next_meeting_place: mPlace.trim() }).eq('id', chamaId)
    if (error) throw error
  })
  const saveGroup = () => act(async () => {
    if (!isChair) fail('Only the Chairperson can edit the group.')
    if (!gName.trim()) fail('Enter the chama name.')
    const pay = checkPayDetails(gType, gNumber, gPayName)
    if (pay.error) fail(pay.error)
    const { error } = await supabase.from('chamas').update({ name: gName.trim(), payment_type: gType, payment_number: pay.number, payment_name: pay.name }).eq('id', chamaId)
    if (error) throw error
  })
  const approveReset = (r) => act(async () => {
    if (!isOfficial) fail('Only an official can approve PIN resets.')
    if (r.member_id === me.id) fail('Ask another official to approve your own request.')
    const target = members.find((m) => m.id === r.member_id)
    if (!target) fail('Member not found.')
    const pin_code = await hashPin(DEFAULT_PIN, target.phone)
    const a = await supabase.from('members').update({ pin_code, must_change_pin: true }).eq('id', target.id)
    if (a.error) throw a.error
    const b = await supabase.from('pin_reset_requests').update({ status: 'approved', handled_by: me.id, handled_at: new Date().toISOString() }).eq('id', r.id)
    if (b.error) throw b.error
    alert(`${target.full_name}'s PIN is now ${DEFAULT_PIN}. Tell them to log in and choose a new PIN.`)
  })
  const declineReset = (r) => act(async () => {
    if (!isOfficial) fail('Only an official can decline PIN resets.')
    const { error } = await supabase.from('pin_reset_requests').update({ status: 'rejected', handled_by: me.id, handled_at: new Date().toISOString() }).eq('id', r.id)
    if (error) throw error
  })
  const deleteChama = () => act(async () => {
    if (!isChair) fail('Only the Chairperson can delete the chama.')
    if (window.prompt(`This ERASES "${chama.name}" with all members, payments and loans.\n\nType DELETE to confirm.`) !== 'DELETE') return
    for (const q of [
      supabase.from('payments').delete().eq('chama_id', chamaId),
      supabase.from('loans').delete().eq('chama_id', chamaId),
    ]) { const r = await q; if (r.error) throw r.error }
    const m = await supabase.from('members').delete().eq('chama_id', chamaId)
    if (m.error) throw m.error
    const c = await supabase.from('chamas').delete().eq('id', chamaId)
    if (c.error) throw c.error
    onLogout()
  })

  // ---------- payments ----------
  const resetPayForm = () => { setEditPayId(null); setPayMember(''); setPayAmount(''); setPayCode(''); setPayMonth(thisMonth()); setPayDate(todayISO()) }
  const startEditPayment = (p) => {
    setEditPayId(p.id); setPayMember(p.member_id); setPayAmount(String(p.amount)); setPayMonth(p.month || thisMonth())
    setPayDate(p.paid_on || String(p.created_at).slice(0, 10)); setPayCode(p.mpesa_code || ''); setErr('')
    try { window.scrollTo({ top: 0, behavior: 'smooth' }) } catch {}
  }
  const submitPayment = () => act(async () => {
    const memberId = isTreasurer ? payMember : me.id
    const amount = Number(payAmount)
    const code = payCode.trim().toUpperCase()
    if (!memberId) fail('Pick the member who paid.')
    if (!Number.isInteger(amount) || amount <= 0) fail('Enter a valid amount, e.g. 500.')
    if (!payMonth) fail('Pick the month this payment is for.')
    if (!payDate) fail('Pick the date you paid.')
    if (!/^[A-Z0-9]{10}$/.test(code)) fail('M-Pesa code must be exactly 10 letters/numbers, e.g. QK12345678.')
    if (payments.some((p) => pstatus(p) !== 'rejected' && p.mpesa_code === code && p.id !== editPayId) ||
        repayments.some((r) => pstatus(r) !== 'rejected' && r.mpesa_code === code)) fail('This M-Pesa code was already used for another payment.')
    const row = { member_id: memberId, amount, month: payMonth, paid_on: payDate, mpesa_code: code }
    let result
    if (editPayId) {
      if (!isTreasurer) fail('Only the Treasurer can edit payments.')
      result = await supabase.from('payments').update(row).eq('id', editPayId)
    } else {
      // Treasurer records are confirmed straight away; everyone else's start as PENDING
      result = await supabase.from('payments').insert({
        ...row, chama_id: chamaId, type: 'contribution',
        status: isTreasurer ? 'confirmed' : 'pending', confirmed_by: isTreasurer ? me.id : null,
      }).select().single()
    }
    if (result.error) throw result.error
    if (!editPayId && isTreasurer && result.data?.id) notify('payment_confirmed', result.data.id)
    resetPayForm()
  })
  const confirmPayment = (p) => act(async () => {
    if (!isTreasurer) fail('Only the Treasurer can confirm payments.')
    const { error } = await supabase.from('payments').update({ status: 'confirmed', confirmed_by: me.id }).eq('id', p.id)
    if (error) throw error
    notify('payment_confirmed', p.id)
  })
  const rejectPayment = (p) => act(async () => {
    if (!isTreasurer) fail('Only the Treasurer can reject payments.')
    if (!window.confirm(`Reject ${nameOf(p.member_id)}'s payment ${p.mpesa_code || ''}? Use this when the code does not match an M-Pesa message.`)) return
    const { error } = await supabase.from('payments').update({ status: 'rejected', confirmed_by: me.id }).eq('id', p.id)
    if (error) throw error
  })
  const deletePayment = (p) => act(async () => {
    if (!isTreasurer) fail('Only the Treasurer can delete payments.')
    if (!window.confirm(`Delete ${nameOf(p.member_id)}'s payment of ${kes(p.amount)} (${p.mpesa_code || 'no code'})?`)) return
    const { error } = await supabase.from('payments').delete().eq('id', p.id)
    if (error) throw error
  })

  // ---------- loans ----------
  const requestLoan = () => act(async () => {
    const amount = Number(reqAmount)
    if (!Number.isInteger(amount) || amount <= 0) fail('Enter the amount you want to borrow, e.g. 5000.')
    if (reqReturn && reqReturn < todayISO()) fail('The return date cannot be in the past.')
    const { error } = await supabase.from('loans').insert({
      chama_id: chamaId, member_id: me.id, amount, interest_percent: 0, interest_type: 'once',
      loan_date: todayISO(), return_date: reqReturn || null, status: 'requested',
    })
    if (error) throw error
    setReqAmount(''); setReqReturn('')
  })
  const approveLoan = (l) => act(async () => {
    if (!canApproveLoan(l)) fail(l.member_id === me.id ? 'You cannot approve your own loan.' : `Only the ${roleLabel(approverRoleFor(l))} can approve this loan.`)
    const interest = apprInterest === '' ? 0 : Number(apprInterest)
    if (isNaN(interest) || interest < 0 || interest > 100) fail('Interest must be a percent between 0 and 100 (leave empty for none).')
    const { error } = await supabase.from('loans').update({
      status: 'approved', interest_percent: interest, interest_type: apprType, loan_date: todayISO(), approved_by: me.id,
    }).eq('id', l.id)
    if (error) throw error
    notify('loan_approved', l.id)
    setApprId(null); setApprInterest(''); setApprType('once')
  })
  const declineLoan = (l) => act(async () => {
    if (!canApproveLoan(l)) fail('You cannot decline this loan.')
    const { error } = await supabase.from('loans').update({ status: 'declined', approved_by: me.id }).eq('id', l.id)
    if (error) throw error
  })
  const cancelRequest = (l) => act(async () => {
    if (l.member_id !== me.id) fail('You can only cancel your own request.')
    const { error } = await supabase.from('loans').delete().eq('id', l.id)
    if (error) throw error
  })
  const deleteLoan = (l) => act(async () => {
    if (!isChair) fail('Only the Chairperson can delete loans.')
    if (!window.confirm(`Delete ${nameOf(l.member_id)}'s loan of ${kes(l.amount)} and its repayments?`)) return
    const { error } = await supabase.from('loans').delete().eq('id', l.id)
    if (error) throw error
  })
  const openRepay = (l) => { setRepLoanId(l.id); setRepAmount(''); setRepDate(todayISO()); setRepCode(''); setErr('') }
  const addRepayment = (l) => act(async () => {
    const amount = Number(repAmount)
    const code = repCode.trim().toUpperCase()
    const balance = infoOf(l).balance
    if (!Number.isInteger(amount) || amount <= 0) fail('Enter a valid amount, e.g. 1000.')
    if (amount > balance) fail(`That is more than the balance (${kes(balance)}).`)
    if (!repDate) fail('Pick the date of the repayment.')
    if (!/^[A-Z0-9]{10}$/.test(code)) fail('M-Pesa code must be exactly 10 letters/numbers, e.g. QK12345678.')
    if (repayments.some((r) => pstatus(r) !== 'rejected' && r.mpesa_code === code) ||
        payments.some((p) => pstatus(p) !== 'rejected' && p.mpesa_code === code)) fail('This M-Pesa code was already used for another payment.')
    if (!isTreasurer && l.member_id !== me.id) fail('You can only repay your own loan.')
    const { error } = await supabase.from('loan_repayments').insert({
      loan_id: l.id, amount, mpesa_code: code, paid_on: repDate,
      status: isTreasurer ? 'confirmed' : 'pending', confirmed_by: isTreasurer ? me.id : null,
    })
    if (error) throw error
    setRepLoanId(null)
  })
  const confirmRepayment = (r) => act(async () => {
    if (!isTreasurer) fail('Only the Treasurer can confirm loan repayments.')
    const { error } = await supabase.from('loan_repayments').update({ status: 'confirmed', confirmed_by: me.id }).eq('id', r.id)
    if (error) throw error
  })
  const rejectRepayment = (r) => act(async () => {
    if (!isTreasurer) fail('Only the Treasurer can reject loan repayments.')
    if (!window.confirm(`Reject this repayment ${r.mpesa_code || ''}?`)) return
    const { error } = await supabase.from('loan_repayments').update({ status: 'rejected', confirmed_by: me.id }).eq('id', r.id)
    if (error) throw error
  })
  const deleteRepayment = (r) => act(async () => {
    if (!isTreasurer) fail('Only the Treasurer can delete repayments.')
    if (!window.confirm(`Delete this repayment of ${kes(r.amount)}?`)) return
    const { error } = await supabase.from('loan_repayments').delete().eq('id', r.id)
    if (error) throw error
  })

  // ---------- members ----------
  const addMember = () => act(async () => {
    if (!canManageMembers) fail('Only the Secretary or Chairperson can add members.')
    const ph = cleanPhone(nPhone)
    if (!nName.trim()) fail('Enter the name.')
    if (!ph) fail('Enter a valid phone number, e.g. 0712345678.')
    if (!/^\d{4}$/.test(nPin)) fail('Give a temporary PIN of 4 numbers. The member will choose their own at first login.')
    if (members.some((m) => m.phone === ph)) fail('A member with this phone number already exists.')
    const pin_code = await hashPin(nPin, ph)
    const { data: added, error } = await supabase.from('members').insert({
      chama_id: chamaId, full_name: nName.trim(), phone: ph, pin_code, role: 'member', status: 'active', must_change_pin: true,
    }).select().single()
    if (error) throw error
    if (added?.id) notify('member_joined', added.id)
    setNName(''); setNPhone(''); setNPin('')
  })
  const startEdit = (m) => { setEditId(m.id); setEName(m.full_name); setEPhone(m.phone); setErr('') }
  const saveEdit = (m) => act(async () => {
    if (!canManageMembers) fail('Only the Secretary or Chairperson can edit members.')
    const ph = cleanPhone(ePhone)
    if (!eName.trim()) fail('Enter the name.')
    if (!ph) fail('Enter a valid phone number, e.g. 0712345678.')
    if (members.some((x) => x.phone === ph && x.id !== m.id)) fail('Another member already has this phone number.')
    const update = { full_name: eName.trim(), phone: ph }
    if (ph !== m.phone) {
      // the PIN is tied to the phone number, so a new number gets the reset PIN
      update.pin_code = await hashPin(DEFAULT_PIN, ph)
      update.must_change_pin = true
      alert(`Phone number changed. ${eName.trim()}'s PIN is now ${DEFAULT_PIN} and they must choose a new one at login.`)
    }
    const { error } = await supabase.from('members').update(update).eq('id', m.id)
    if (error) throw error
    setEditId(null)
  })
  const deleteMember = (m) => act(async () => {
    if (!canManageMembers) fail('Only the Secretary or Chairperson can delete members.')
    if (m.id === me.id) fail('You cannot delete yourself.')
    if (roleOf(m) !== 'member') fail(`${m.full_name} is the ${roleLabel(roleOf(m))}. The Chairperson must change their role first.`)
    if (!window.confirm(`Are you sure you want to delete ${m.full_name}?`)) return
    const { error } = await supabase.from('members').delete().eq('id', m.id)
    if (error) {
      throw new Error(error.message.includes('payments') ? `Cannot delete ${m.full_name} because they have payments recorded.`
        : error.message.includes('loans') ? `Cannot delete ${m.full_name} because they have loans recorded.` : error.message)
    }
  })
  const changeRole = (m, newRole) => act(async () => {
    if (!isChair) fail('Only the Chairperson can change roles.')
    if (newRole === roleOf(m)) return
    if (m.id === me.id) fail('To hand over the chair, open the other member and set THEIR role to Chairperson.')
    if (newRole === 'chairperson') {
      if (!window.confirm(`Make ${m.full_name} the new Chairperson? You will become a normal Member.`)) return
      const a = await supabase.from('members').update({ role: 'chairperson' }).eq('id', m.id)
      if (a.error) throw a.error
      const b = await supabase.from('members').update({ role: 'member' }).eq('id', me.id)
      if (b.error) throw b.error
      return
    }
    const holder = newRole !== 'member' && members.find((x) => roleOf(x) === newRole && x.id !== m.id)
    if (holder) fail(`${holder.full_name} is already the ${roleLabel(newRole)}. Change their role first.`)
    const { error } = await supabase.from('members').update({ role: newRole }).eq('id', m.id)
    if (error) throw error
  })

  // ---------- derived ----------
  const visiblePayments = payments.filter((p) => mine(p.member_id))
  const pendingPayments = visiblePayments.filter((p) => pstatus(p) === 'pending')
  const rejectedPayments = visiblePayments.filter((p) => pstatus(p) === 'rejected')
  const confirmedPayments = visiblePayments.filter((p) => pstatus(p) === 'confirmed')
  const groups = {}
  confirmedPayments.forEach((p) => { (groups[p.month || ''] = groups[p.month || ''] || []).push(p) })
  const monthKeys = Object.keys(groups).sort((a, b) => b.localeCompare(a))
  const monthOptions = Array.from(new Set([...recentMonths(), ...monthKeys.filter(Boolean)])).sort((a, b) => b.localeCompare(a))

  const statusList = members
    .filter((m) => mine(m.id))
    .map((m) => {
      const paid = payments.filter((p) => p.member_id === m.id && p.month === checkMonth && pstatus(p) === 'confirmed').reduce((s, p) => s + p.amount, 0)
      return { member: m, paid, isPaid: monthlyAmount > 0 && paid >= monthlyAmount }
    })
  const paidCount = statusList.filter((x) => x.isPaid).length

  const owingList = members
    .map((m) => {
      const infos = approvedLoans.filter((l) => l.member_id === m.id).map(infoOf)
      return { member: m, owed: infos.reduce((s, i) => s + i.owed, 0), repaid: infos.reduce((s, i) => s + i.repaid, 0), balance: infos.reduce((s, i) => s + i.balance, 0) }
    })
    .filter((x) => x.balance > 0)
  const totalLoansOut = owingList.reduce((s, x) => s + x.balance, 0)

  const othersResets = resets.filter((r) => r.member_id !== me.id)
  const badge = {
    chama: isOfficial ? othersResets.length : 0,
    payments: isTreasurer ? payments.filter((p) => pstatus(p) === 'pending').length : 0,
    loans: loans.filter((l) => l.status === 'requested' && canApproveLoan(l)).length + (isTreasurer ? repayments.filter((r) => pstatus(r) === 'pending').length : 0),
  }
  const tabs = [
    { id: 'chama', label: 'Chama', badge: badge.chama },
    { id: 'payments', label: 'Payments', badge: badge.payments },
    { id: 'loans', label: 'Loans', badge: badge.loans },
    ...(isOfficial ? [{ id: 'members', label: 'Members', badge: 0 }] : []),
  ]
  const pill = (bg, color, text) => (
    <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: bg, color, whiteSpace: 'nowrap' }}>{text}</span>
  )

  // =====================================================================
  return (
    <div style={styles.page}>
      {/* header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ margin: 0 }}>{chama.name}</h2>
          <div style={{ fontSize: 13, color: '#666' }}>
            {me.full_name} • {pill('#fff3d6', '#8a5a00', roleLabel(role))}
          </div>
        </div>
        <button onClick={onLogout} style={{ ...styles.small, background: '#666', padding: '8px 14px' }}>Log out</button>
      </div>

      {/* where to send money: always visible, on every tab */}
      <PayBox chama={chama} onFix={isChair ? () => { setTab('chama'); setErr('') } : null} />

      {/* tabs */}
      <div style={{ display: 'flex', gap: 6, margin: '16px 0', overflowX: 'auto' }}>
        {tabs.map((t) => (
          <button key={t.id} onClick={() => { setTab(t.id); setErr('') }}
            style={{ ...styles.small, padding: '9px 16px', background: tab === t.id ? '#11998e' : '#eee', color: tab === t.id ? 'white' : '#333', whiteSpace: 'nowrap' }}>
            {t.label}{t.badge > 0 && <span style={{ marginLeft: 6, background: '#c0392b', color: 'white', borderRadius: 10, padding: '1px 7px', fontSize: 12 }}>{t.badge}</span>}
          </button>
        ))}
      </div>

      {err && <p style={{ color: 'red', background: '#ffe8e8', padding: '8px 12px', borderRadius: 8 }}>Error: {err}</p>}

      {/* ============================ CHAMA TAB ============================ */}
      {tab === 'chama' && (
        <>
          {/* meeting */}
          <div style={{ ...styles.card, background: '#f3f0ff', border: '1px solid #ddd6fb' }}>
            <div style={{ fontWeight: 700 }}>
              📅 Next meeting: {chama.next_meeting_at ? `${fmtWhen(chama.next_meeting_at)} — ${chama.next_meeting_place || ''}` : 'not set yet'}
            </div>
            {canMeeting && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                <input type="datetime-local" value={mWhen} onChange={(e) => setMWhen(e.target.value)} style={styles.input} />
                <input placeholder="Place e.g. Mary's house, Rongai" value={mPlace} onChange={(e) => setMPlace(e.target.value)} style={styles.input} />
                <button onClick={saveMeeting} disabled={busy} style={styles.button}>Save meeting</button>
              </div>
            )}
          </div>

          {/* edit group (Chairperson) */}
          {isChair && (
            <div style={styles.card}>
              <div style={{ fontWeight: 700 }}>Edit group</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                <input placeholder="Chama name" value={gName} onChange={(e) => setGName(e.target.value)} style={styles.input} />
                <select value={gType} onChange={(e) => setGType(e.target.value)} style={styles.input}>
                  {PAY_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                <input placeholder={gType === 'Pochi' ? 'e.g. 0712345678' : 'e.g. 123456'} value={gNumber} onChange={(e) => setGNumber(e.target.value)} style={styles.input} />
                <input placeholder="Name on number" value={gPayName} onChange={(e) => setGPayName(e.target.value)} style={styles.input} />
                <button onClick={saveGroup} disabled={busy} style={styles.button}>Save group</button>
              </div>
            </div>
          )}

          {/* monthly amount */}
          <div style={styles.card}>
            <div style={{ fontWeight: 700 }}>Monthly contribution: {monthlyAmount > 0 ? kes(monthlyAmount) : 'not set'}</div>
            {isChair && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                <input type="number" min="1" value={amountInput} onChange={(e) => setAmountInput(e.target.value)} style={styles.input} />
                <button onClick={saveMonthly} disabled={busy} style={styles.button}>Save amount</button>
              </div>
            )}
          </div>

          {/* PIN reset requests — any official can handle */}
          {isOfficial && (
            <div style={{ marginBottom: 20 }}>
              <h3 style={{ marginBottom: 8 }}>PIN reset requests {resets.length > 0 && `(${resets.length})`}</h3>
              {resets.length === 0 && <p style={{ color: '#888' }}>No PIN reset requests.</p>}
              {resets.length > 0 && (
                <div style={styles.box}>
                  {resets.map((r) => (
                    <div key={r.id} style={styles.row}>
                      <span>
                        <b>{nameOf(r.member_id)}</b> <span style={{ color: '#666' }}>{r.phone}</span>
                        <div style={{ fontSize: 12, color: '#888' }}>asked {fmtDate(r.created_at)}</div>
                      </span>
                      {r.member_id === me.id ? (
                        <span style={{ fontSize: 12, color: '#888' }}>Another official must approve</span>
                      ) : (
                        <span style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => approveReset(r)} disabled={busy} style={ok}>Approve</button>
                          <button onClick={() => declineReset(r)} disabled={busy} style={del}>Decline</button>
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <p style={{ fontSize: 12, color: '#888', marginTop: -8 }}>Approving sets the member's PIN to {DEFAULT_PIN}. They must choose a new PIN when they log in.</p>
            </div>
          )}

          {/* who hasn't paid */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
              <h3 style={{ margin: 0 }}>{isOfficial ? "Who hasn't paid" : 'My status'}</h3>
              <select value={checkMonth} onChange={(e) => setCheckMonth(e.target.value)} style={{ ...styles.input, flex: 'none' }}>
                {monthOptions.map((k) => <option key={k} value={k}>{monthLabel(k)}</option>)}
              </select>
            </div>
            {monthlyAmount <= 0 && <p style={{ color: '#8a5a00', background: '#fff3d6', padding: '10px 12px', borderRadius: 8 }}>The monthly amount is not set yet.</p>}
            {isOfficial && monthlyAmount > 0 && members.length > 0 && <div style={{ fontSize: 13, color: '#555', marginBottom: 6 }}>{paidCount} of {members.length} paid for {monthLabel(checkMonth)}</div>}
            <div style={styles.box}>
              {statusList.map(({ member, paid, isPaid }) => (
                <div key={member.id} style={{ ...styles.row, padding: '9px 14px' }}>
                  <span style={{ fontWeight: 600 }}>{member.full_name}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {monthlyAmount > 0 && !isPaid && paid > 0 && <span style={{ fontSize: 12, color: '#888' }}>{kes(paid)} of {monthlyAmount.toLocaleString()}</span>}
                    {monthlyAmount > 0 ? pill(isPaid ? '#e8f8f0' : '#ffe8e8', isPaid ? '#0f7a5a' : '#c0392b', isPaid ? 'Paid ✓' : 'Not Yet') : '—'}
                  </span>
                </div>
              ))}
            </div>
            <p style={{ fontSize: 12, color: '#888', marginTop: -8 }}>Only payments the Treasurer has confirmed count as paid.</p>
          </div>

          {isChair && (
            <div style={{ border: '2px solid #ffd0d0', borderRadius: 10, padding: 14 }}>
              <b style={{ color: '#c0392b' }}>Danger zone</b>
              <div style={{ marginTop: 8 }}><button onClick={deleteChama} disabled={busy} style={del}>Delete this chama</button></div>
            </div>
          )}
        </>
      )}

      {/* ============================ PAYMENTS TAB ============================ */}
      {tab === 'payments' && (
        <>
          <h3>{editPayId ? 'Edit payment' : isTreasurer ? 'Record payment' : 'I paid — submit my payment'}</h3>
          {!isTreasurer && <p style={{ color: '#666', marginTop: 0 }}>Enter the M-Pesa code from your message. The Treasurer will check it and confirm.</p>}
          <form onSubmit={(e) => { e.preventDefault(); submitPayment() }}
            style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: editPayId ? 12 : 0, border: editPayId ? '2px solid #2d6cdf' : 'none', borderRadius: 10 }}>
            {isTreasurer && (
              <select value={payMember} onChange={(e) => setPayMember(e.target.value)} style={styles.input}>
                <option value="">Who paid?</option>
                {members.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
              </select>
            )}
            <input type="number" min="1" placeholder={monthlyAmount ? `Amount e.g. ${monthlyAmount}` : 'Amount (KES)'} value={payAmount} onChange={(e) => setPayAmount(e.target.value)} style={styles.input} />
            <label style={{ flex: 1, minWidth: 140, fontSize: 12, color: '#666' }}>For month
              <input type="month" value={payMonth} onChange={(e) => setPayMonth(e.target.value)} style={{ ...styles.input, width: '100%', boxSizing: 'border-box' }} />
            </label>
            <label style={{ flex: 1, minWidth: 140, fontSize: 12, color: '#666' }}>Date paid
              <input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} style={{ ...styles.input, width: '100%', boxSizing: 'border-box' }} />
            </label>
            <input placeholder="M-Pesa code e.g. QK12345678" maxLength={10} value={payCode}
              onChange={(e) => setPayCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} style={styles.input} />
            <button type="submit" disabled={busy} style={styles.button}>{editPayId ? 'Save changes' : isTreasurer ? 'Record payment' : 'Submit payment'}</button>
            {editPayId && <button type="button" onClick={resetPayForm} style={styles.grey}>Cancel</button>}
          </form>

          {/* waiting for confirmation */}
          {pendingPayments.length > 0 && (
            <>
              <h3 style={{ marginTop: 24 }}>Waiting for Treasurer ({pendingPayments.length})</h3>
              <div style={{ ...styles.box, border: '1px solid #f3dfa2' }}>
                {pendingPayments.map((p) => (
                  <div key={p.id} style={{ ...styles.row, background: '#fff9e8' }}>
                    <span>
                      <b>{nameOf(p.member_id)}</b> — {kes(p.amount)}
                      <div style={{ fontSize: 12, color: '#8a5a00' }}>PENDING • {p.mpesa_code} • {monthLabel(p.month)} • paid {fmtDate(p.paid_on || p.created_at)}</div>
                    </span>
                    {isTreasurer && (
                      <span style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => confirmPayment(p)} disabled={busy} style={ok}>Confirm</button>
                        <button onClick={() => rejectPayment(p)} disabled={busy} style={del}>Reject</button>
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          <h3 style={{ marginTop: 24 }}>{isOfficial ? 'Confirmed payments' : 'My payment history'}</h3>
          {confirmedPayments.length === 0 && <p style={{ color: '#888' }}>No confirmed payments yet.</p>}
          {monthKeys.map((key) => {
            const list = groups[key]
            return (
              <div key={key || 'none'} style={styles.box}>
                <div style={{ ...styles.row, background: '#e8f8f0', fontWeight: 700 }}>
                  <span>{monthLabel(key)}</span><span>{kes(list.reduce((s, p) => s + p.amount, 0))}</span>
                </div>
                {list.map((p) => (
                  <div key={p.id} style={styles.row}>
                    <span style={{ flex: 2 }}>
                      <b>{nameOf(p.member_id)}</b>
                      <div style={{ fontSize: 12, color: '#888' }}>
                        {p.mpesa_code || 'no code'} • {fmtDate(p.paid_on || p.created_at)}
                        {p.confirmed_by ? ` • confirmed by ${nameOf(p.confirmed_by)}` : ''}
                      </div>
                    </span>
                    <span style={{ fontWeight: 600 }}>{kes(p.amount)}</span>
                    {isTreasurer && (
                      <span style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => startEditPayment(p)} style={edit}>Edit</button>
                        <button onClick={() => deletePayment(p)} style={del}>Delete</button>
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )
          })}

          {rejectedPayments.length > 0 && (
            <>
              <h3 style={{ marginTop: 24 }}>Rejected</h3>
              <div style={styles.box}>
                {rejectedPayments.map((p) => (
                  <div key={p.id} style={{ ...styles.row, background: '#fff5f5' }}>
                    <span>
                      <b>{nameOf(p.member_id)}</b> — {kes(p.amount)}
                      <div style={{ fontSize: 12, color: '#c0392b' }}>Rejected • {p.mpesa_code} — the code did not match. Submit again with the right code.</div>
                    </span>
                    {isTreasurer && <button onClick={() => deletePayment(p)} style={del}>Delete</button>}
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {/* ============================ LOANS TAB ============================ */}
      {tab === 'loans' && (
        <>
          <h3>Request a loan</h3>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input type="number" min="1" placeholder="Amount you want (KES)" value={reqAmount} onChange={(e) => setReqAmount(e.target.value)} style={styles.input} />
            <label style={{ flex: 1, minWidth: 140, fontSize: 12, color: '#666' }}>I will return it by
              <input type="date" value={reqReturn} onChange={(e) => setReqReturn(e.target.value)} style={{ ...styles.input, width: '100%', boxSizing: 'border-box' }} />
            </label>
            <button onClick={requestLoan} disabled={busy} style={styles.button}>Request loan</button>
          </div>
          <p style={{ fontSize: 12, color: '#888' }}>The Chairperson reviews your request and sets any interest when approving.</p>

          {/* requests */}
          {requestedLoans.filter((l) => mine(l.member_id)).length > 0 && (
            <>
              <h3 style={{ marginTop: 24 }}>Loan requests</h3>
              <div style={styles.box}>
                {requestedLoans.filter((l) => mine(l.member_id)).map((l) => (
                  <div key={l.id} style={{ borderBottom: '1px solid #eee' }}>
                    <div style={styles.row}>
                      <span>
                        <b>{nameOf(l.member_id)}</b> — {kes(l.amount)}
                        <div style={{ fontSize: 12, color: '#888' }}>asked {fmtDate(l.created_at)}{l.return_date ? ` • wants to return by ${fmtDate(l.return_date)}` : ''}</div>
                      </span>
                      {l.status === 'declined' ? pill('#ffe8e8', '#c0392b', 'Declined') :
                        canApproveLoan(l) ? pill('#fff3d6', '#8a5a00', 'Needs your approval') :
                        pill('#fff3d6', '#8a5a00', `Waiting for ${roleLabel(approverRoleFor(l))}`)}
                    </div>
                    {l.status === 'requested' && canApproveLoan(l) && (
                      apprId === l.id ? (
                        <div style={{ padding: 12, background: '#f3f7ff', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <input type="number" min="0" max="100" step="any" placeholder="Interest % (optional)" value={apprInterest} onChange={(e) => setApprInterest(e.target.value)} style={styles.input} />
                          <select value={apprType} onChange={(e) => setApprType(e.target.value)} style={styles.input}>
                            <option value="once">Interest charged once</option>
                            <option value="monthly">Interest every month</option>
                          </select>
                          <button onClick={() => approveLoan(l)} disabled={busy} style={ok}>Approve loan</button>
                          <button onClick={() => setApprId(null)} style={styles.grey}>Cancel</button>
                        </div>
                      ) : (
                        <div style={{ padding: '0 14px 12px', display: 'flex', gap: 6 }}>
                          <button onClick={() => { setApprId(l.id); setApprInterest(''); setApprType('once') }} style={ok}>Approve…</button>
                          <button onClick={() => declineLoan(l)} disabled={busy} style={del}>Decline</button>
                        </div>
                      )
                    )}
                    {l.member_id === me.id && (
                      <div style={{ padding: '0 14px 12px' }}><button onClick={() => cancelRequest(l)} disabled={busy} style={{ ...styles.small, background: '#999' }}>{l.status === 'declined' ? 'Remove' : 'Cancel request'}</button></div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* who owes */}
          {isOfficial && (
            <>
              <h3 style={{ marginTop: 24, marginBottom: 8 }}>Who owes</h3>
              {owingList.length === 0 && <p style={{ color: '#888' }}>Nobody owes any loan right now.</p>}
              {owingList.length > 0 && (
                <div style={styles.box}>
                  {owingList.map(({ member, owed, repaid, balance }) => (
                    <div key={member.id} style={styles.row}>
                      <span><b>{member.full_name}</b><div style={{ fontSize: 12, color: '#888' }}>To repay {kes(owed)} • Repaid {kes(repaid)}</div></span>
                      <span style={{ fontWeight: 700, color: '#c0392b' }}>Owes {kes(balance)}</span>
                    </div>
                  ))}
                  <div style={{ ...styles.row, background: '#f5f5f5', fontWeight: 700 }}><span>Total loans out</span><span>{kes(totalLoansOut)}</span></div>
                </div>
              )}
            </>
          )}

          {/* approved loans */}
          <h3 style={{ marginTop: 24 }}>{isOfficial ? 'All loans' : 'My loans'}</h3>
          {approvedLoans.filter((l) => mine(l.member_id)).length === 0 && <p style={{ color: '#888' }}>No loans yet.</p>}
          {approvedLoans.filter((l) => mine(l.member_id)).map((l) => {
            const info = infoOf(l)
            const { owed, repaid, balance, cleared } = info
            const overdue = !cleared && l.return_date && l.return_date < todayISO()
            const reps = repayments.filter((r) => r.loan_id === l.id && pstatus(r) !== 'rejected')
            const canRepay = !cleared && (isTreasurer || l.member_id === me.id)
            return (
              <div key={l.id} style={{ ...styles.box, border: overdue ? '1px solid #f0b4ae' : '1px solid #eee' }}>
                <div style={{ ...styles.row, background: cleared ? '#e8f8f0' : overdue ? '#ffe8e8' : '#fffaf0' }}>
                  <span>
                    <b>{nameOf(l.member_id)}</b> — {kes(l.amount)}
                    <div style={{ fontSize: 12, color: '#666' }}>
                      Given {fmtDate(l.loan_date)}{l.return_date ? ` • Return by ${fmtDate(l.return_date)}` : ''}
                      {info.rate > 0 ? ` • ${info.rate}% ${info.monthly ? 'every month' : 'once'}` : ' • no interest'}
                    </div>
                    {info.monthly && info.rate > 0 && <div style={{ fontSize: 12, color: '#666' }}>{info.months} month{info.months === 1 ? '' : 's'} of interest {cleared ? 'when cleared' : 'so far'}: {kes(info.interest)}</div>}
                    {l.approved_by && <div style={{ fontSize: 12, color: '#888' }}>Approved by {nameOf(l.approved_by)}</div>}
                  </span>
                  {pill(cleared ? '#e8f8f0' : overdue ? '#ffe8e8' : '#fff3d6', cleared ? '#0f7a5a' : overdue ? '#c0392b' : '#8a5a00', cleared ? 'Repaid ✓' : overdue ? 'Overdue' : 'Active')}
                </div>
                <div style={{ ...styles.row, fontSize: 13 }}>
                  <span>To repay: <b>{kes(owed)}</b></span><span>Repaid: <b>{kes(repaid)}</b></span>
                  <span>Balance: <b style={{ color: cleared ? '#0f7a5a' : '#c0392b' }}>{kes(balance)}</b></span>
                </div>
                {reps.map((r) => (
                  <div key={r.id} style={{ ...styles.row, padding: '8px 14px', fontSize: 13, background: pstatus(r) === 'pending' ? '#fff9e8' : '#fafafa' }}>
                    <span>
                      ↳ {pstatus(r) === 'pending' ? 'PENDING ' : 'Repaid '}{kes(r.amount)}
                      <span style={{ color: '#888' }}> • {r.mpesa_code || 'no code'} • {fmtDate(r.paid_on)}{r.confirmed_by ? ` • confirmed by ${nameOf(r.confirmed_by)}` : ''}</span>
                    </span>
                    {isTreasurer && (
                      <span style={{ display: 'flex', gap: 6 }}>
                        {pstatus(r) === 'pending' && <button onClick={() => confirmRepayment(r)} disabled={busy} style={{ ...ok, padding: '4px 10px', fontSize: 12 }}>Confirm</button>}
                        {pstatus(r) === 'pending' && <button onClick={() => rejectRepayment(r)} disabled={busy} style={{ ...del, padding: '4px 10px', fontSize: 12 }}>Reject</button>}
                        {pstatus(r) === 'confirmed' && <button onClick={() => deleteRepayment(r)} style={{ ...del, padding: '4px 10px', fontSize: 12 }}>Delete</button>}
                      </span>
                    )}
                  </div>
                ))}
                {repLoanId === l.id && (
                  <div style={{ padding: 12, background: '#f3f7ff', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <input type="number" min="1" placeholder={`Amount (max ${balance})`} value={repAmount} onChange={(e) => setRepAmount(e.target.value)} style={styles.input} />
                    <input type="date" value={repDate} onChange={(e) => setRepDate(e.target.value)} style={styles.input} />
                    <input placeholder="M-Pesa code e.g. QK12345678" maxLength={10} value={repCode} onChange={(e) => setRepCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} style={styles.input} />
                    <button onClick={() => addRepayment(l)} disabled={busy} style={styles.button}>{isTreasurer ? 'Save repayment' : 'Submit repayment'}</button>
                    <button onClick={() => setRepLoanId(null)} style={styles.grey}>Cancel</button>
                  </div>
                )}
                <div style={{ padding: '10px 14px', display: 'flex', gap: 8 }}>
                  {canRepay && repLoanId !== l.id && <button onClick={() => openRepay(l)} style={ok}>{isTreasurer ? '+ Record repayment' : '+ I repaid'}</button>}
                  {isChair && <button onClick={() => deleteLoan(l)} disabled={busy} style={del}>Delete loan</button>}
                </div>
              </div>
            )
          })}
        </>
      )}

      {/* ============================ MEMBERS TAB (officials) ============================ */}
      {tab === 'members' && isOfficial && (
        <>
          {canManageMembers ? (
            <>
              <h3>Add member</h3>
              <p style={{ color: '#666', marginTop: 0 }}>Give a temporary PIN. The member must choose their own PIN the first time they log in.</p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <input placeholder="Name" value={nName} onChange={(e) => setNName(e.target.value)} style={styles.input} />
                <input placeholder="Phone e.g. 0712345678" inputMode="tel" value={nPhone} onChange={(e) => setNPhone(e.target.value)} style={styles.input} />
                <input placeholder="Temporary PIN (4 numbers)" type="password" inputMode="numeric" maxLength={4} autoComplete="off" value={nPin} onChange={(e) => setNPin(e.target.value.replace(/\D/g, ''))} style={styles.input} />
                <button onClick={addMember} disabled={busy} style={styles.button}>Add member</button>
              </div>
            </>
          ) : (
            <p style={{ color: '#666' }}>Only the Secretary can add or edit members. You can see everyone{isChair ? ' and change roles' : ''}.</p>
          )}

          <h3 style={{ marginTop: 24 }}>Members ({members.length})</h3>
          <div style={styles.box}>
            {members.map((m) =>
              editId === m.id ? (
                <div key={m.id} style={{ padding: 12, borderBottom: '1px solid #eee', background: '#f3f7ff' }}>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <input value={eName} onChange={(e) => setEName(e.target.value)} placeholder="Name" style={styles.input} />
                    <input value={ePhone} onChange={(e) => setEPhone(e.target.value)} placeholder="Phone" style={styles.input} />
                  </div>
                  <p style={{ fontSize: 12, color: '#888', margin: '6px 0' }}>Changing the phone number resets their PIN to {DEFAULT_PIN}.</p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => saveEdit(m)} disabled={busy} style={styles.button}>Save</button>
                    <button onClick={() => setEditId(null)} style={styles.grey}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div key={m.id} style={styles.row}>
                  <span style={{ flex: 3 }}>
                    <b>{m.full_name}</b>
                    <div style={{ fontSize: 13, color: '#666' }}>{m.phone}</div>
                    {m.must_change_pin && <div style={{ fontSize: 11, color: '#8a5a00' }}>has not chosen their own PIN yet</div>}
                  </span>
                  <span style={{ flex: 2 }}>
                    {isChair && m.id !== me.id ? (
                      <select value={roleOf(m)} onChange={(e) => changeRole(m, e.target.value)} style={{ ...styles.input, minWidth: 0, width: '100%' }}>
                        {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                      </select>
                    ) : pill(roleOf(m) === 'member' ? '#f0f0f0' : '#fff3d6', roleOf(m) === 'member' ? '#555' : '#8a5a00', roleLabel(roleOf(m)))}
                  </span>
                  {canManageMembers && (
                    <span style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => startEdit(m)} style={edit}>Edit</button>
                      <button onClick={() => deleteMember(m)} disabled={busy} style={del}>Delete</button>
                    </span>
                  )}
                </div>
              )
            )}
          </div>
        </>
      )}
    </div>
  )
}

// =====================================================================
//  APP: login / forgot PIN / new chama / forced PIN change / the chama
// =====================================================================
function App() {
  const [view, setView] = useState('loading') // loading | login | forgot | newchama | changepin | app
  const [session, setSession] = useState(null) // the logged-in member row
  const [pending, setPending] = useState(null) // member who must choose a new PIN

  // keep the user logged in across refresh (until the tab is closed)
  useEffect(() => {
    async function restore() {
      const id = sess.get()
      if (!id) return setView('login')
      const { data } = await supabase.from('members').select('*').eq('id', id).maybeSingle()
      if (data && (!data.status || data.status === 'active') && !data.must_change_pin) {
        setSession(data); setView('app')
      } else {
        sess.clear(); setView('login')
      }
    }
    restore().catch(() => setView('login'))
  }, [])

  const start = (member) => { sess.set(member.id); setSession(member); setPending(null); setView('app') }
  const loggedIn = (member) => {
    if (member.must_change_pin) { setPending(member); setView('changepin') } else start(member)
  }
  const logout = () => { sess.clear(); setSession(null); setView('login') }

  if (view === 'loading') return <div style={styles.page}><p>Loading...</p></div>
  if (view === 'forgot') return <ForgotScreen onBack={() => setView('login')} />
  if (view === 'newchama') return <NewChamaScreen onBack={() => setView('login')} onCreated={start} />
  if (view === 'changepin' && pending) return <ChangePinScreen member={pending} onDone={start} />
  if (view === 'app' && session) return <ChamaApp meId={session.id} meFallback={session} chamaId={session.chama_id} onLogout={logout} />
  return <LoginScreen onLoggedIn={loggedIn} goForgot={() => setView('forgot')} goNew={() => setView('newchama')} />
}

export default App
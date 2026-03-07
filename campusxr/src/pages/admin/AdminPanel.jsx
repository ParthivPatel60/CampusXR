import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebase';
import { getDepartments, addDepartment, deleteDepartment, getRooms, addRoom, getHotspots } from '../../services/firestoreService';
import { uploadImageToCloudinary } from '../../cloudinary';
import HotspotEditor from '../../components/admin/HotspotEditor';
import HotspotEditorPage from './HotspotEditorPage';

const T = {
  bg: '#080c14', surface: '#0e1420', surface2: '#141b28', border: 'rgba(255,255,255,0.07)',
  accent: '#4f8cff', accent2: '#00e5c0', accent3: '#ff5f6d', accent4: '#ffb347',
  text: '#e8edf5', muted: '#6b7a99', glow: 'rgba(79,140,255,0.18)',
  tnr: "'Times New Roman',Times,serif",
};

const CSS = `
@keyframes adm-slideLeft{from{transform:translateX(-30px);opacity:0}to{transform:translateX(0);opacity:1}}
@keyframes adm-fadeUp{from{transform:translateY(12px);opacity:0}to{transform:translateY(0);opacity:1}}
@keyframes adm-pulse{0%,100%{opacity:1;box-shadow:0 0 8px currentColor}50%{opacity:.5;box-shadow:0 0 2px currentColor}}
.adm-sidebar{animation:adm-slideLeft .45s ease}
.adm-main{animation:adm-fadeUp .5s ease both}
.adm-stat:hover{transform:translateY(-3px);box-shadow:0 14px 36px rgba(0,0,0,.3)}
.adm-nav:hover{background:${T.surface2};color:${T.text}}
.adm-action:hover{border-color:${T.accent};background:rgba(79,140,255,0.06);transform:translateY(-2px)}
.adm-row:hover{background:${T.surface2}}
.adm-act-item:hover{background:${T.surface2}}
.adm-ca:hover{background:rgba(79,140,255,0.1)}
.adm-pulse-dot{animation:adm-pulse 2.5s infinite}
`;

function dIcon(name = '') {
  const n = name.toLowerCase();
  if (n.includes('comput') || n.includes('cs')) return { i: '💻', bg: 'rgba(79,140,255,0.12)' };
  if (n.includes('eng')) return { i: '⚙️', bg: 'rgba(255,179,71,0.10)' };
  if (n.includes('sci')) return { i: '🧪', bg: 'rgba(0,229,192,0.10)' };
  if (n.includes('art') || n.includes('design')) return { i: '🎨', bg: 'rgba(255,95,109,0.10)' };
  return { i: '🏛', bg: 'rgba(130,110,255,0.10)' };
}

const NavItem = ({ icon, label, tab, active, onClick, badge, expandable, expanded }) => (
  <button className={active ? '' : 'adm-nav'} onClick={onClick} style={{
    display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px', borderRadius: 9, cursor: 'pointer',
    fontSize: 13, fontWeight: active ? 600 : 400, color: active ? T.accent : T.muted,
    background: active ? 'rgba(79,140,255,0.12)' : 'transparent', border: 'none', width: '100%',
    textAlign: 'left', marginBottom: 1, position: 'relative', transition: 'all .18s', fontFamily: T.tnr,
  }}>
    {active && <span style={{ position: 'absolute', left: -4, top: '50%', transform: 'translateY(-50%)', width: 3, height: '55%', background: T.accent, borderRadius: 2 }} />}
    <span style={{ fontSize: 15, width: 20, textAlign: 'center', flexShrink: 0 }}>{icon}</span>
    <span style={{ flex: 1 }}>{label}</span>
    {badge != null && <span style={{ background: typeof badge === 'string' ? T.accent2 : T.accent, color: typeof badge === 'string' ? '#000' : '#fff', fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 20 }}>{badge}</span>}
    {expandable && <span style={{ fontSize: 10, transition: 'transform .25s', display: 'inline-block', transform: expanded ? 'rotate(90deg)' : 'none' }}>›</span>}
  </button>
);

const SubItem = ({ label, active }) => (
  <div className="adm-nav" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px 7px 36px', borderRadius: 8, cursor: 'pointer', fontSize: 12, color: active ? T.accent2 : T.muted, transition: 'all .15s', fontFamily: T.tnr }}>
    <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor', flexShrink: 0 }} />
    {label}
  </div>
);

function Toast({ msg, color, border }) {
  return msg ? (
    <div style={{ position: 'fixed', bottom: 28, right: 28, background: T.surface2, border: `1px solid ${border}`, color, padding: '11px 18px', borderRadius: 11, fontSize: 13, zIndex: 2000, fontFamily: T.tnr, fontWeight: 600, animation: 'adm-fadeUp .3s ease' }}>
      {msg}
    </div>
  ) : null;
}

export default function AdminPanel() {
  const navigate = useNavigate();
  const [page, setPage] = useState('overview');
  const [deptSubOpen, setDeptSubOpen] = useState(false);
  const [roomSubOpen, setRoomSubOpen] = useState(false);
  const [hsSubOpen, setHsSubOpen] = useState(false);

  const [departments, setDepartments] = useState([]);
  const [roomsByDept, setRoomsByDept] = useState({});
  const [hotspotsByRoom, setHotspotsByRoom] = useState({});
  const [selDeptId, setSelDeptId] = useState(null);
  const [hotspotEditorRoom, setHotspotEditorRoom] = useState(null);

  const [showAddDept, setShowAddDept] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptDesc, setNewDeptDesc] = useState('');
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomFile, setNewRoomFile] = useState(null);
  const [roomUploading, setRoomUploading] = useState(false);
  const [roomUploadError, setRoomUploadError] = useState('');

  const [toast, setToast] = useState(null);

  const totalRooms = Object.values(roomsByDept).reduce((s, r) => s + r.length, 0);
  const totalHotspots = Object.values(hotspotsByRoom).reduce((s, h) => s + h.length, 0);

  const showToast = (msg, color, border) => {
    setToast({ msg, color, border });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchDepts = useCallback(async () => {
    const d = await getDepartments(); setDepartments(d); return d;
  }, []);

  const loadRooms = useCallback(async (deptId) => {
    if (!deptId) return;
    const rooms = await getRooms(deptId);
    setRoomsByDept(prev => ({ ...prev, [deptId]: rooms }));
    const hse = await Promise.all(rooms.map(async r => [r.id, await getHotspots(deptId, r.id)]));
    setHotspotsByRoom(prev => ({ ...prev, ...Object.fromEntries(hse) }));
  }, []);

  useEffect(() => {
    fetchDepts().then(async depts => {
      if (!depts.length) return;
      setSelDeptId(depts[0].id);
      const entries = await Promise.all(depts.map(async d => [d.id, await getRooms(d.id)]));
      setRoomsByDept(Object.fromEntries(entries));
    });
  }, [fetchDepts]);

  useEffect(() => { loadRooms(selDeptId); }, [selDeptId, loadRooms]);

  const handleAddDept = async () => {
    if (!newDeptName.trim()) return;
    await addDepartment({ name: newDeptName.trim(), description: newDeptDesc.trim() });
    setNewDeptName(''); setNewDeptDesc(''); setShowAddDept(false);
    const d = await fetchDepts();
    const e = await Promise.all(d.map(async x => [x.id, await getRooms(x.id)]));
    setRoomsByDept(Object.fromEntries(e));
    if (!selDeptId && d.length) setSelDeptId(d[0].id);
  };

  const handleDeleteDept = async (id) => {
    await deleteDepartment(id);
    setRoomsByDept(prev => { const n = { ...prev }; delete n[id]; return n; });
    const d = await fetchDepts();
    if (selDeptId === id) setSelDeptId(d.length ? d[0].id : null);
  };

  const handleAddRoom = async () => {
    if (!newRoomName.trim() || !newRoomFile || !selDeptId) return;
    setRoomUploading(true); setRoomUploadError('');
    try {
      const { secure_url, public_id } = await uploadImageToCloudinary(newRoomFile);
      const sortOrder = (roomsByDept[selDeptId] || []).length + 1;
      await addRoom(selDeptId, { name: newRoomName.trim(), imageURL: secure_url, imagePublicId: public_id, sortOrder });
      setNewRoomName(''); setNewRoomFile(null); setShowAddRoom(false);
      await loadRooms(selDeptId);
    } catch { setRoomUploadError('Upload failed.'); }
    finally { setRoomUploading(false); }
  };

  const inp = { background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 9, color: T.text, fontSize: 13, padding: '9px 13px', outline: 'none', fontFamily: T.tnr, width: '100%' };
  const lbl = { fontSize: 11, color: T.muted, display: 'block', marginBottom: 6, letterSpacing: '0.05em', textTransform: 'uppercase' };

  return (
    <>
      <style>{CSS}</style>
      {toast && <Toast {...toast} />}
      <div style={{ background: T.bg, minHeight: '100vh', display: 'flex', fontFamily: T.tnr, color: T.text }}>

        {/* ═══ SIDEBAR ═══ */}
        <aside className="adm-sidebar" style={{ width: 250, minHeight: '100vh', background: T.surface, borderRight: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', padding: '24px 0', position: 'fixed', left: 0, top: 0, bottom: 0, zIndex: 10, overflowY: 'auto' }}>
          {/* Logo */}
          <div style={{ padding: '0 20px 22px', borderBottom: `1px solid ${T.border}`, marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: `linear-gradient(135deg,${T.accent},${T.accent2})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, boxShadow: `0 0 20px ${T.glow}` }}>🌐</div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 17 }}>CampusXR</div>
                <div style={{ fontSize: 10, color: T.muted, letterSpacing: '1.5px', textTransform: 'uppercase', marginTop: 2 }}>Platform Admin</div>
              </div>
            </div>
          </div>

          {/* Main nav */}
          <div style={{ padding: '0 12px', marginBottom: 6 }}>
            <div style={{ fontSize: 10, letterSpacing: '1.8px', textTransform: 'uppercase', color: T.muted, padding: '0 8px', marginBottom: 4 }}>Main</div>
            <NavItem icon="⬡" label="Overview" active={page === 'overview'} onClick={() => setPage('overview')} />
            <NavItem icon="🏛" label="Departments" active={page === 'departments'} badge={departments.length}
              expandable expanded={deptSubOpen}
              onClick={() => { setPage('departments'); setDeptSubOpen(v => !v); }} />
            {deptSubOpen && departments.slice(0, 5).map(d => <SubItem key={d.id} label={d.name} />)}
            <NavItem icon="🚪" label="Rooms & Hotspots" active={page === 'rooms'} expandable expanded={roomSubOpen}
              onClick={() => { setPage('rooms'); setRoomSubOpen(v => !v); }} />
            {roomSubOpen && ['All Rooms', '360° Scenes', 'Room Map View'].map(l => <SubItem key={l} label={l} />)}
          </div>

          {/* Content nav */}
          <div style={{ padding: '0 12px', marginTop: 12, marginBottom: 6 }}>
            <div style={{ fontSize: 10, letterSpacing: '1.8px', textTransform: 'uppercase', color: T.muted, padding: '0 8px', marginBottom: 4 }}>Content</div>
            <NavItem icon="📍" label="Hotspot Editor" active={page === 'hotspots'} badge="12" expandable expanded={hsSubOpen}
              onClick={() => { setPage('hotspots'); setHsSubOpen(v => !v); }} />
            {hsSubOpen && ['Info Hotspots', 'Navigation Hotspots', 'Media Hotspots', 'Link Hotspots'].map(l => <SubItem key={l} label={l} />)}
            <NavItem icon="🎞" label="Media Library" active={false} onClick={() => { }} />
          </div>

          {/* System nav */}
          <div style={{ padding: '0 12px', marginTop: 12 }}>
            <div style={{ fontSize: 10, letterSpacing: '1.8px', textTransform: 'uppercase', color: T.muted, padding: '0 8px', marginBottom: 4 }}>System</div>
            {[['👤', 'User Access'], ['📊', 'Analytics'], ['⚙️', 'Settings']].map(([i, l]) => (
              <NavItem key={l} icon={i} label={l} active={false} onClick={() => { }} />
            ))}
            <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px', borderRadius: 9, fontSize: 13, color: T.muted, textDecoration: 'none', transition: 'all .18s' }} className="adm-nav">
              <span style={{ fontSize: 15, width: 20, textAlign: 'center' }}>🗺</span> View Tour
            </a>
          </div>

          {/* Bottom */}
          <div style={{ marginTop: 'auto', padding: '16px 12px 0', borderTop: `1px solid ${T.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, borderRadius: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: `linear-gradient(135deg,${T.accent},${T.accent2})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12, color: '#fff', flexShrink: 0 }}>AD</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>Admin</div>
                <div style={{ fontSize: 11, color: T.muted }}>Super Admin</div>
              </div>
            </div>
            <button onClick={() => signOut(auth).then(() => navigate('/admin/login'))}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 9, cursor: 'pointer', fontSize: 12.5, color: T.accent3, background: 'transparent', border: 'none', width: '100%', fontFamily: T.tnr, transition: 'background .2s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,95,109,0.08)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              ⬡ &nbsp;Log Out
            </button>
          </div>
        </aside>

        {/* ═══ MAIN ═══ */}
        <main className="adm-main" style={{ marginLeft: 250, flex: 1, padding: '32px 36px', minHeight: '100vh', overflowY: 'auto' }}>

          {/* Topbar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
            <div>
              <div style={{ fontSize: 25, fontWeight: 800, letterSpacing: '-0.5px' }}>
                {page === 'overview' ? 'Overview Dashboard' : page === 'departments' ? 'Departments' : page === 'rooms' ? 'Rooms & Hotspots' : 'Hotspot Editor'}
              </div>
              <div style={{ fontSize: 13, color: T.muted, marginTop: 3, fontStyle: 'italic' }}>
                {page === 'overview' ? "Here's what's happening with your virtual campus today."
                  : page === 'hotspots' ? 'Create, configure & manage all hotspots across your virtual campus.'
                    : 'Manage your departments, rooms and panoramas.'}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, padding: '7px 14px', width: 210, fontSize: 13, color: T.muted, cursor: 'pointer' }}>
                🔍 &nbsp;Search anything...
              </div>
              <div className="adm-ca" style={{ width: 37, height: 37, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 15, position: 'relative', transition: 'all .2s' }}>
                🔔
                <span className="adm-pulse-dot" style={{ position: 'absolute', top: 7, right: 7, width: 7, height: 7, background: T.accent3, borderRadius: '50%', border: `1.5px solid ${T.bg}` }} />
              </div>
            </div>
          </div>

          {/* ── OVERVIEW ── */}
          {page === 'overview' && (
            <div>
              {/* Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 22 }}>
                {[
                  { label: 'Total Departments', val: departments.length, color: T.accent, icon: '🏛', bar: 'blue' },
                  { label: 'Total Rooms', val: totalRooms, color: T.accent2, icon: '🚪', bar: 'teal' },
                  { label: 'Active Hotspots', val: totalHotspots, color: T.accent4, icon: '📍', bar: 'orange' },
                  { label: 'Recent Updates (7d)', val: '+5', color: T.accent3, icon: '🔄', bar: 'red' },
                ].map(({ label, val, color, icon, bar }) => (
                  <div key={label} className="adm-stat" style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: '20px 22px', position: 'relative', overflow: 'hidden', transition: 'transform .2s,box-shadow .2s' }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, borderRadius: '14px 14px 0 0', background: `linear-gradient(90deg,${color},transparent)` }} />
                    <div style={{ fontSize: 10.5, letterSpacing: '1.2px', textTransform: 'uppercase', color: T.muted, marginBottom: 10 }}>{label}</div>
                    <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-1px', lineHeight: 1, color, marginBottom: 9 }}>{val}</div>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11.5, padding: '2px 8px', borderRadius: 20, background: 'rgba(0,229,192,0.1)', color: T.accent2 }}>↑ live count</div>
                    <div style={{ position: 'absolute', right: 18, top: 18, fontSize: 26, opacity: .13 }}>{icon}</div>
                  </div>
                ))}
              </div>

              {/* Content grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 330px', gap: 18, marginBottom: 18 }}>
                {/* Activity */}
                <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, overflow: 'hidden' }}>
                  <div style={{ padding: '17px 22px 13px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 15, fontWeight: 700 }}>Recent Activity</span>
                    <button className="adm-ca" style={{ fontSize: 12, color: T.accent, cursor: 'pointer', padding: '4px 10px', borderRadius: 7, border: `1px solid rgba(79,140,255,0.25)`, background: 'transparent', fontFamily: T.tnr }}>View all →</button>
                  </div>
                  {[
                    { dot: T.accent, title: "Added 'Graphics Lab' Room", meta: 'CS Dept · 2h ago', tag: 'CS Dept', tc: T.accent, tb: 'rgba(79,140,255,0.12)' },
                    { dot: T.accent2, title: "Updated Info Hotspot in 'AI Lab'", meta: 'CS Dept · 1d ago', tag: 'CS Dept', tc: T.accent, tb: 'rgba(79,140,255,0.12)', hs: true },
                    { dot: T.accent4, title: "Uploaded 3DGS for 'Main Quad'", meta: 'Facilities · 3d ago', tag: 'Facilities', tc: T.accent2, tb: 'rgba(0,229,192,0.1)' },
                    { dot: T.accent, title: 'New Tour Route Published', meta: 'Engineering · 4d ago', tag: 'Engineering', tc: T.accent4, tb: 'rgba(255,179,71,0.1)', hs: true },
                    { dot: T.accent2, title: "Hotspot removed from 'Old Library'", meta: 'Facilities · 5d ago', tag: 'Facilities', tc: T.accent2, tb: 'rgba(0,229,192,0.1)' },
                  ].map((item, i) => (
                    <div key={i} className="adm-act-item" style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 20px', borderBottom: `1px solid ${T.border}`, cursor: 'pointer', transition: 'background .15s' }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.dot, boxShadow: `0 0 7px ${item.dot}`, marginTop: 5, flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{item.title}</div>
                        <div style={{ fontSize: 11.5, color: T.muted, fontStyle: 'italic' }}>{item.meta}</div>
                      </div>
                      {item.hs
                        ? <button onClick={() => setPage('hotspots')} style={{ fontSize: 10, padding: '3px 9px', borderRadius: 6, fontWeight: 700, background: 'rgba(79,140,255,0.1)', color: T.accent, border: `1px solid rgba(79,140,255,0.22)`, cursor: 'pointer', fontFamily: T.tnr }}>✏ Edit</button>
                        : <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, fontWeight: 600, background: item.tb, color: item.tc, flexShrink: 0 }}>{item.tag}</span>
                      }
                    </div>
                  ))}
                </div>

                {/* Departments summary */}
                <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, overflow: 'hidden' }}>
                  <div style={{ padding: '17px 22px 13px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 15, fontWeight: 700 }}>Departments</span>
                    <button className="adm-ca" onClick={() => setPage('departments')} style={{ fontSize: 12, color: T.accent, cursor: 'pointer', padding: '4px 10px', borderRadius: 7, border: `1px solid rgba(79,140,255,0.25)`, background: 'transparent', fontFamily: T.tnr }}>Manage</button>
                  </div>
                  {departments.map(d => {
                    const { i, bg } = dIcon(d.name); const di = dIcon(d.name);
                    return (
                      <div key={d.id} className="adm-row" style={{ padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: `1px solid ${T.border}`, cursor: 'pointer', transition: 'background .15s' }}>
                        <div style={{ width: 34, height: 34, borderRadius: 9, background: di.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>{di.i}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>{d.name}</div>
                          <div style={{ fontSize: 11, color: T.muted, fontStyle: 'italic' }}>{d.description || '—'}</div>
                        </div>
                        <div style={{ textAlign: 'right', color: T.muted, fontSize: 11 }}>
                          <strong style={{ display: 'block', fontSize: 15, fontWeight: 700, color: T.text }}>{(roomsByDept[d.id] || []).length}</strong>
                          rooms
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Bottom row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
                <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, overflow: 'hidden' }}>
                  <div style={{ padding: '17px 22px 13px', borderBottom: `1px solid ${T.border}` }}><span style={{ fontSize: 15, fontWeight: 700 }}>Quick Actions</span></div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, padding: 18 }}>
                    {[['➕', 'Add New Room', () => setPage('rooms')], ['📍', 'Edit Hotspots', () => setPage('hotspots')], ['🏛', 'New Department', () => setPage('departments')], ['🗺', 'View Tour', () => window.location.href = '/']].map(([ic, lb, fn]) => (
                      <button key={lb} className="adm-action" onClick={fn} style={{ background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 11, padding: 15, cursor: 'pointer', transition: 'all .2s', display: 'flex', flexDirection: 'column', gap: 7, textAlign: 'left', fontFamily: T.tnr, color: T.text }}>
                        <span style={{ fontSize: 20 }}>{ic}</span>
                        <span style={{ fontSize: 12, fontWeight: 600 }}>{lb}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, overflow: 'hidden' }}>
                  <div style={{ padding: '17px 22px 13px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 15, fontWeight: 700 }}>System Status</span>
                    <button className="adm-ca" style={{ fontSize: 12, color: T.accent, cursor: 'pointer', padding: '4px 10px', borderRadius: 7, border: `1px solid rgba(79,140,255,0.25)`, background: 'transparent', fontFamily: T.tnr }}>Details</button>
                  </div>
                  {[
                    { dot: '#22d47f', name: 'XR Render Engine', val: 'Operational', vc: '#22d47f' },
                    { dot: '#22d47f', name: 'Asset CDN', val: '99.9% uptime', vc: '#22d47f', bar: 72 },
                    { dot: T.accent4, name: '3DGS Processing Queue', val: '3 pending', vc: T.muted },
                    { dot: '#22d47f', name: 'Firebase / Firestore', val: 'Healthy', vc: '#22d47f' },
                  ].map(({ dot, name, val, vc, bar }) => (
                    <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 20px', borderBottom: `1px solid ${T.border}` }}>
                      <div className="adm-pulse-dot" style={{ width: 8, height: 8, borderRadius: '50%', background: dot, color: dot, flexShrink: 0 }} />
                      <div style={{ fontSize: 13, flex: 1 }}>
                        {name}
                        {bar && <div style={{ height: 4, background: T.border, borderRadius: 4, overflow: 'hidden', marginTop: 5, width: 100 }}>
                          <div style={{ height: '100%', width: `${bar}%`, borderRadius: 4, background: `linear-gradient(90deg,${T.accent2},${T.accent})` }} />
                        </div>}
                      </div>
                      <div style={{ fontSize: 12, color: vc, fontWeight: 500 }}>{val}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── DEPARTMENTS ── */}
          {page === 'departments' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 18 }}>
                <button onClick={() => setShowAddDept(v => !v)} style={{ background: `linear-gradient(135deg,${T.accent},rgba(79,140,255,0.8))`, color: '#fff', border: 'none', borderRadius: 10, padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: T.tnr, boxShadow: `0 4px 20px ${T.glow}` }}>
                  + Add Department
                </button>
              </div>
              {showAddDept && (
                <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: 22, marginBottom: 18 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                    <div><label style={lbl}>Name</label><input style={inp} value={newDeptName} onChange={e => setNewDeptName(e.target.value)} placeholder="e.g. Computer Science" /></div>
                    <div><label style={lbl}>Description</label><input style={inp} value={newDeptDesc} onChange={e => setNewDeptDesc(e.target.value)} placeholder="Short description" /></div>
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={handleAddDept} style={{ background: T.accent, color: '#fff', border: 'none', borderRadius: 10, padding: '9px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: T.tnr }}>Save</button>
                    <button onClick={() => setShowAddDept(false)} style={{ background: 'transparent', color: T.muted, border: `1px solid ${T.border}`, borderRadius: 10, padding: '9px 16px', fontSize: 13, cursor: 'pointer', fontFamily: T.tnr }}>Cancel</button>
                  </div>
                </div>
              )}
              <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr style={{ borderBottom: `1px solid ${T.border}` }}>
                    {['Department', 'Description', 'Rooms', 'Actions'].map((h, i) => (
                      <th key={h} style={{ padding: '14px 20px', fontSize: 10.5, letterSpacing: '1.2px', textTransform: 'uppercase', color: T.muted, textAlign: i === 3 ? 'right' : 'left', fontWeight: 500 }}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {departments.map(d => {
                      const di = dIcon(d.name);
                      return (
                        <tr key={d.id} className="adm-row" style={{ borderBottom: `1px solid ${T.border}`, transition: 'background .15s' }}>
                          <td style={{ padding: '14px 20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{ width: 32, height: 32, borderRadius: 8, background: di.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>{di.i}</div>
                              <span style={{ fontSize: 13.5, fontWeight: 600 }}>{d.name}</span>
                            </div>
                          </td>
                          <td style={{ padding: '14px 20px', fontSize: 13, color: T.muted }}>{d.description || '—'}</td>
                          <td style={{ padding: '14px 20px', fontSize: 20, fontWeight: 700, color: T.accent }}>{(roomsByDept[d.id] || []).length}</td>
                          <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                            <button onClick={() => { setSelDeptId(d.id); setPage('rooms'); }} style={{ background: 'transparent', color: T.accent, border: `1px solid rgba(79,140,255,0.3)`, borderRadius: 8, padding: '5px 12px', fontSize: 12, cursor: 'pointer', fontFamily: T.tnr, marginRight: 8 }}>Manage</button>
                            <button onClick={() => handleDeleteDept(d.id)} style={{ background: 'transparent', color: T.accent3, border: `1px solid rgba(255,95,109,0.3)`, borderRadius: 8, padding: '5px 12px', fontSize: 12, cursor: 'pointer', fontFamily: T.tnr }}>Delete</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── ROOMS ── */}
          {page === 'rooms' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, justifyContent: 'flex-end', marginBottom: 18 }}>
                <select value={selDeptId || ''} onChange={e => setSelDeptId(e.target.value)} style={{ ...inp, width: 'auto', cursor: 'pointer' }}>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
                <button onClick={() => { setShowAddRoom(v => !v); setRoomUploadError(''); }} style={{ background: `linear-gradient(135deg,${T.accent},rgba(79,140,255,0.8))`, color: '#fff', border: 'none', borderRadius: 10, padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: T.tnr, boxShadow: `0 4px 20px ${T.glow}` }}>+ Add Room</button>
              </div>
              {showAddRoom && (
                <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: 22, marginBottom: 18 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                    <div><label style={lbl}>Room Name</label><input style={inp} value={newRoomName} onChange={e => setNewRoomName(e.target.value)} placeholder="e.g. Graphics Lab" /></div>
                    <div><label style={lbl}>360° Panorama Image</label><input type="file" accept="image/*" onChange={e => setNewRoomFile(e.target.files[0] || null)} style={{ ...inp, cursor: 'pointer' }} /></div>
                  </div>
                  {roomUploadError && <div style={{ color: T.accent3, fontSize: 12, marginBottom: 12 }}>{roomUploadError}</div>}
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={handleAddRoom} disabled={roomUploading} style={{ background: roomUploading ? T.muted : T.accent, color: '#fff', border: 'none', borderRadius: 10, padding: '9px 20px', fontSize: 13, fontWeight: 600, cursor: roomUploading ? 'not-allowed' : 'pointer', fontFamily: T.tnr }}>{roomUploading ? 'Uploading…' : 'Save'}</button>
                    <button onClick={() => setShowAddRoom(false)} style={{ background: 'transparent', color: T.muted, border: `1px solid ${T.border}`, borderRadius: 10, padding: '9px 16px', fontSize: 13, cursor: 'pointer', fontFamily: T.tnr }}>Cancel</button>
                  </div>
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(290px,1fr))', gap: 18 }}>
                {(roomsByDept[selDeptId] || []).map(room => (
                  <div key={room.id} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, overflow: 'hidden', transition: 'transform .2s,box-shadow .2s' }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 14px 36px rgba(0,0,0,.3)' }}
                    onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}>
                    <div style={{ aspectRatio: '16/9', background: T.surface2, position: 'relative', overflow: 'hidden', cursor: 'pointer' }} onClick={() => setHotspotEditorRoom({ room, deptId: selDeptId })}>
                      {room.imageURL ? <img src={room.imageURL} alt={room.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.muted, fontSize: 13 }}>No image</div>}
                      <div style={{ position: 'absolute', inset: 0, background: 'rgba(8,12,20,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity .2s' }}
                        onMouseEnter={e => e.currentTarget.style.opacity = '1'} onMouseLeave={e => e.currentTarget.style.opacity = '0'}>
                        <span style={{ color: '#fff', fontSize: 13, fontWeight: 600, background: 'rgba(79,140,255,0.3)', padding: '8px 18px', borderRadius: 30, border: `1px solid ${T.accent}` }}>📍 Edit Hotspots</span>
                      </div>
                      <span style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(8,12,20,0.75)', color: T.accent2, fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 20, border: `1px solid rgba(0,229,192,0.3)` }}>360°</span>
                    </div>
                    <div style={{ padding: '14px 18px' }}>
                      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{room.name}</div>
                      <div style={{ fontSize: 12, color: T.muted, marginBottom: 12 }}>{departments.find(d => d.id === selDeptId)?.name || ''}</div>
                    <div style={{ display: 'flex', gap: 10, paddingTop: 10, borderTop: `1px solid ${T.border}` }}>
                      <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: 'rgba(79,140,255,0.12)', color: T.accent, fontWeight: 500 }}>{(hotspotsByRoom[room.id] || []).filter(h => h.type === 'info').length} Info</span>
                      <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: 'rgba(0,229,192,0.1)', color: T.accent2, fontWeight: 500 }}>{(hotspotsByRoom[room.id] || []).filter(h => h.type === 'navigation').length} Nav</span>
                      <button onClick={() => setHotspotEditorRoom({ room, deptId: selDeptId })} style={{ marginLeft: 'auto', background: 'transparent', color: T.accent, border: `1px solid rgba(79,140,255,0.3)`, borderRadius: 8, padding: '3px 12px', fontSize: 11, cursor: 'pointer', fontFamily: T.tnr }}>Edit →</button>
                    </div>
                  </div>
                  </div>
                ))}
            </div>
            </div>
          )}

      {/* ── HOTSPOT EDITOR ── */}
      {page === 'hotspots' && (
        <HotspotEditorPage departments={departments} roomsByDept={roomsByDept} showToast={showToast} />
      )}
    </main >
      </div >

    {/* Legacy modal HotspotEditor (for 360° canvas editing from Rooms page) */ }
  {
    hotspotEditorRoom && (
      <HotspotEditor
        room={hotspotEditorRoom.room}
        deptId={hotspotEditorRoom.deptId}
        departments={departments}
        allRoomsByDept={roomsByDept}
        onClose={() => setHotspotEditorRoom(null)}
      />
    )
  }
    </>
  );
}

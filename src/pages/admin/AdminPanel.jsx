import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import HotspotEditorViewer from '../../components/viewer/HotspotEditorViewer';

gsap.registerPlugin(useGSAP);
import {
  getDepartments,
  addDepartment,
  updateDepartment,
  deleteDepartment,
  getRooms,
  addRoom,
  updateRoom,
  deleteRoom,
  getHotspots,
  addHotspot,
  deleteHotspot,
} from '../../services/firestoreService';
import { uploadImageToCloudinary } from '../../services/cloudinaryService';

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState('overview');
  const [departments, setDepartments] = useState([]);
  const [roomsByDept, setRoomsByDept] = useState({});   // lazy cache: { deptId: Room[] }
  const [selectedRoomsDeptId, setSelectedRoomsDeptId] = useState(null);
  const [hotspotsByRoom, setHotspotsByRoom] = useState({});   // { roomId: Hotspot[] }

  // Add-department inline form
  const [showAddDept, setShowAddDept] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptDesc, setNewDeptDesc] = useState('');

  // Add-room inline form
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomFile, setNewRoomFile] = useState(null);
  const [roomUploading, setRoomUploading] = useState(false);
  const [roomUploadError, setRoomUploadError] = useState('');

  // Hotspot editor
  const [editingRoom, setEditingRoom] = useState(null);      // { room, deptId }
  const [pendingPos, setPendingPos] = useState(null);        // { pitch, yaw } – click before saving
  const [newHsType, setNewHsType] = useState('info');
  const [newHsText, setNewHsText] = useState('');
  const [newHsDesc, setNewHsDesc] = useState('');
  const [newHsTargetDeptId, setNewHsTargetDeptId] = useState('');
  const [newHsTargetRoomId, setNewHsTargetRoomId] = useState('');
  const [hsSaving, setHsSaving] = useState(false);
  const [editorView, setEditorView] = useState({ yaw: 0, pitch: 0, fov: 75 });
  const [viewSaving, setViewSaving] = useState(false);
  const [editorSidebarOpen, setEditorSidebarOpen] = useState(false);

  // Inline dept editing
  const [editingDeptId, setEditingDeptId] = useState(null);
  const [editDeptName, setEditDeptName] = useState('');
  const [editDeptDesc, setEditDeptDesc] = useState('');
  const [deptSearch, setDeptSearch] = useState('');
  const [deletingRoomIds, setDeletingRoomIds] = useState(new Set());

  // Derived totals for overview — memoised so they only recompute when data changes
  const totalRooms = useMemo(
    () => Object.values(roomsByDept).reduce((sum, r) => sum + r.length, 0),
    [roomsByDept],
  );
  const totalHotspots = useMemo(
    () => Object.values(hotspotsByRoom).reduce((sum, hs) => sum + hs.length, 0),
    [hotspotsByRoom],
  );
  const infoHotspots = useMemo(
    () => Object.values(hotspotsByRoom).reduce((sum, hs) => sum + hs.filter(h => h.type === 'info').length, 0),
    [hotspotsByRoom],
  );
  const navHotspots = useMemo(() => totalHotspots - infoHotspots, [totalHotspots, infoHotspots]);
  const filteredDepts = useMemo(
    () => departments.filter(d =>
      d.name.toLowerCase().includes(deptSearch.toLowerCase()) ||
      (d.description || '').toLowerCase().includes(deptSearch.toLowerCase())
    ),
    [departments, deptSearch],
  );
  /* ── GSAP ────────────────────────────────────────────────────────────── */
  const sidebarRef       = useRef(null);
  const mainRef          = useRef(null);
  const isFirstRender    = useRef(true); // skip tab-change anim on initial mount

  // Mount animation — sidebar slides in from left, main area from right
  useGSAP(() => {
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    if (sidebarRef.current) tl.from(sidebarRef.current, { x: -20, opacity: 0, duration: 0.45 });
    if (mainRef.current)    tl.from(mainRef.current,    { x: 16,  opacity: 0, duration: 0.40 }, '-=0.25');
  }, []);

  // Tab-change animation — content slides up when switching tabs (skips on mount)
  useGSAP(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    if (!mainRef.current) return;
    gsap.from(mainRef.current, { y: 6, opacity: 0, duration: 0.22, ease: 'power2.out' });
  }, [activeTab]);
  // ── Helpers ───────────────────────────────────────────────────────────────
  const fetchDepartments = useCallback(async () => {
    const depts = await getDepartments();
    setDepartments(depts);
    return depts;
  }, []);

  const loadRoomsForDept = useCallback(async (deptId) => {
    if (!deptId) return;
    const rooms = await getRooms(deptId);
    setRoomsByDept(prev => ({ ...prev, [deptId]: rooms }));
    const hsEntries = await Promise.all(
      rooms.map(async (r) => [r.id, await getHotspots(deptId, r.id)])
    );
    setHotspotsByRoom(prev => ({ ...prev, ...Object.fromEntries(hsEntries) }));
  }, []);

  // ── On mount ──────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchDepartments().then(async (depts) => {
      if (depts.length === 0) return;
      setSelectedRoomsDeptId(depts[0].id);
      // Pre-populate room counts for all depts (overview + departments tab)
      const entries = await Promise.all(
        depts.map(async (d) => [d.id, await getRooms(d.id)])
      );
      setRoomsByDept(Object.fromEntries(entries));
    });
  }, [fetchDepartments]);

  // ── Load rooms when selected dept changes in Rooms tab ────────────────────
  useEffect(() => {
    loadRoomsForDept(selectedRoomsDeptId);
  }, [selectedRoomsDeptId, loadRoomsForDept]);

  // ── Add / Delete handlers ─────────────────────────────────────────────────
  const handleAddDept = async () => {
    if (!newDeptName.trim()) return;
    await addDepartment({ name: newDeptName.trim(), description: newDeptDesc.trim() });
    setNewDeptName('');
    setNewDeptDesc('');
    setShowAddDept(false);
    const depts = await fetchDepartments();
    const entries = await Promise.all(depts.map(async (d) => [d.id, await getRooms(d.id)]));
    setRoomsByDept(Object.fromEntries(entries));
    if (!selectedRoomsDeptId && depts.length > 0) setSelectedRoomsDeptId(depts[0].id);
  };

  const handleDeleteDept = async (deptId) => {
    await deleteDepartment(deptId);
    setRoomsByDept(prev => { const next = { ...prev }; delete next[deptId]; return next; });
    const depts = await fetchDepartments();
    if (selectedRoomsDeptId === deptId) {
      setSelectedRoomsDeptId(depts.length > 0 ? depts[0].id : null);
    }
  };

  const handleUpdateDept = async (deptId) => {
    if (!editDeptName.trim()) return;
    await updateDepartment(deptId, { name: editDeptName.trim(), description: editDeptDesc.trim() });
    setEditingDeptId(null);
    const depts = await fetchDepartments();
    const entries = await Promise.all(depts.map(async (d) => [d.id, await getRooms(d.id)]));
    setRoomsByDept(Object.fromEntries(entries));
  };

  const handleDeleteRoom = async (deptId, roomId) => {
    setDeletingRoomIds(prev => new Set([...prev, roomId]));
    try {
      await deleteRoom(deptId, roomId);
      await loadRoomsForDept(deptId);
    } finally {
      setDeletingRoomIds(prev => { const next = new Set(prev); next.delete(roomId); return next; });
    }
  };

  const handleAddRoom = async () => {
    if (!newRoomName.trim() || !newRoomFile || !selectedRoomsDeptId) return;
    setRoomUploading(true);
    setRoomUploadError('');
    try {
      const { secure_url, public_id } = await uploadImageToCloudinary(newRoomFile);
      const sortOrder = (roomsByDept[selectedRoomsDeptId] || []).length + 1;
      await addRoom(selectedRoomsDeptId, {
        name: newRoomName.trim(),
        imageURL: secure_url,
        imagePublicId: public_id,
        sortOrder,
      });
      setNewRoomName('');
      setNewRoomFile(null);
      setShowAddRoom(false);
      await loadRoomsForDept(selectedRoomsDeptId);
    } catch {
      setRoomUploadError('Upload failed. Please try again.');
    } finally {
      setRoomUploading(false);
    }
  };

  // ── Hotspot editor ────────────────────────────────────────────────────────
  const handleOpenEditor = (room) => {
    setEditingRoom({ room, deptId: selectedRoomsDeptId });
    setEditorSidebarOpen(false);
    setEditorView({
      yaw: Number.isFinite(room?.defaultView?.yaw) ? room.defaultView.yaw : 0,
      pitch: Number.isFinite(room?.defaultView?.pitch) ? room.defaultView.pitch : 0,
      fov: Number.isFinite(room?.defaultView?.fov) ? room.defaultView.fov : 75,
    });
    setPendingPos(null);
    setNewHsText(''); setNewHsDesc(''); setNewHsType('info');
    setNewHsTargetDeptId(''); setNewHsTargetRoomId('');
  };

  const handleSaveDefaultView = async () => {
    if (!editingRoom) return;
    setViewSaving(true);
    try {
      const payload = {
        yaw: Math.round((editorView?.yaw ?? 0) * 10) / 10,
        pitch: Math.round((editorView?.pitch ?? 0) * 10) / 10,
        fov: Math.round((editorView?.fov ?? 75) * 10) / 10,
      };
      await updateRoom(editingRoom.deptId, editingRoom.room.id, { defaultView: payload });

      setRoomsByDept(prev => ({
        ...prev,
        [editingRoom.deptId]: (prev[editingRoom.deptId] || []).map(r => (
          r.id === editingRoom.room.id ? { ...r, defaultView: payload } : r
        )),
      }));
      setEditingRoom(prev => prev ? { ...prev, room: { ...prev.room, defaultView: payload } } : prev);
    } finally {
      setViewSaving(false);
    }
  };

  const handleResetDefaultView = async () => {
    if (!editingRoom) return;
    setViewSaving(true);
    try {
      const payload = { yaw: 0, pitch: 0, fov: 75 };
      await updateRoom(editingRoom.deptId, editingRoom.room.id, { defaultView: payload });
      setEditorView(payload);

      setRoomsByDept(prev => ({
        ...prev,
        [editingRoom.deptId]: (prev[editingRoom.deptId] || []).map(r => (
          r.id === editingRoom.room.id ? { ...r, defaultView: payload } : r
        )),
      }));
      setEditingRoom(prev => prev ? { ...prev, room: { ...prev.room, defaultView: payload } } : prev);
    } finally {
      setViewSaving(false);
    }
  };

  const handlePlaceHotspot = ({ pitch, yaw }) => {
    setPendingPos({ pitch, yaw });
    setEditorSidebarOpen(true);
    setNewHsText(''); setNewHsDesc(''); setNewHsType('info');
    setNewHsTargetDeptId(''); setNewHsTargetRoomId('');
  };

  const handleSaveHotspot = async () => {
    if (!pendingPos || !newHsText.trim() || !editingRoom) return;
    if (newHsType === 'navigation' && !newHsTargetRoomId) return;
    setHsSaving(true);
    try {
      const data = {
        type: newHsType,
        text: newHsText.trim(),
        pitch: pendingPos.pitch,
        yaw: pendingPos.yaw,
        ...(newHsType === 'info'
          ? { description: newHsDesc.trim() }
          : { targetRoomId: newHsTargetRoomId, targetDeptId: newHsTargetDeptId || editingRoom.deptId }),
      };
      await addHotspot(editingRoom.deptId, editingRoom.room.id, data);
      const updated = await getHotspots(editingRoom.deptId, editingRoom.room.id);
      setHotspotsByRoom(prev => ({ ...prev, [editingRoom.room.id]: updated }));
      setPendingPos(null);
    } finally {
      setHsSaving(false);
    }
  };

  const handleDeleteHotspot = async (hsId) => {
    if (!editingRoom) return;
    await deleteHotspot(editingRoom.deptId, editingRoom.room.id, hsId);
    const updated = await getHotspots(editingRoom.deptId, editingRoom.room.id);
    setHotspotsByRoom(prev => ({ ...prev, [editingRoom.room.id]: updated }));
  };

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#f1f5f9', fontFamily: "'Inter', system-ui, sans-serif", overflow: 'hidden' }}>

      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <div ref={sidebarRef} style={{ width: 220, background: '#0f172a', display: 'flex', flexDirection: 'column', flexShrink: 0, zIndex: 10 }}>
        {/* Logo */}
        <div style={{ padding: '18px 16px 14px', borderBottom: '1px solid #1e293b', display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/logo.png" alt="CampusXR" style={{ height: 38, width: 'auto', objectFit: 'contain' }} onError={e => { e.currentTarget.style.display = 'none'; }} />
          <div>
            <p style={{ color: '#f8fafc', fontSize: 14, fontWeight: 700, margin: 0, lineHeight: 1.2 }}>CampusXR</p>
            <p style={{ color: '#475569', fontSize: 10, margin: 0, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Admin Panel</p>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '10px 0' }}>
          {[
            { id: 'overview',     label: 'Dashboard',        icon: '⊞' },
            { id: 'departments',  label: 'Departments',       icon: '◫' },
            { id: 'rooms',        label: 'Rooms & Hotspots',  icon: '⊡' },
          ].map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id)} style={{
              display: 'flex', alignItems: 'center', gap: 10, width: '100%',
              padding: '10px 16px', border: 'none', cursor: 'pointer', textAlign: 'left',
              background: activeTab === item.id ? '#1e3a5f' : 'transparent',
              borderLeft: activeTab === item.id ? '3px solid #3b82f6' : '3px solid transparent',
              color: activeTab === item.id ? '#93c5fd' : '#64748b',
              fontSize: 13, fontWeight: 600, transition: 'all 0.15s',
            }}>
              <span style={{ fontSize: 15 }}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div style={{ padding: '14px 16px', borderTop: '1px solid #1e293b' }}>
          <a href="/" style={{ display: 'block', color: '#3b82f6', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>← Back to Tour</a>
        </div>
      </div>

      {/* ── Main area ────────────────────────────────────────────────────── */}
      <div ref={mainRef} style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* ════════════════════ DASHBOARD ════════════════════════════════ */}
        {activeTab === 'overview' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
            <div style={{ marginBottom: 24 }}>
              <h2 style={{ color: '#0f172a', fontSize: 24, fontWeight: 800, margin: 0 }}>Dashboard</h2>
              <p style={{ color: '#64748b', fontSize: 13, margin: '4px 0 0' }}>
                {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>

            {/* Stat cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
              {[
                { label: 'Departments',        value: departments.length,                          accent: '#3b82f6', bg: '#eff6ff' },
                { label: 'Total Rooms',         value: totalRooms,                                  accent: '#8b5cf6', bg: '#f5f3ff' },
                { label: 'Total Hotspots',      value: totalHotspots,                               accent: '#0891b2', bg: '#ecfeff' },
                { label: 'Info / Nav Split',    value: `${infoHotspots} / ${navHotspots}`,          accent: '#059669', bg: '#ecfdf5' },
              ].map(card => (
                <div key={card.label} style={{ background: '#fff', borderRadius: 12, padding: '20px 22px', boxShadow: '0 1px 3px rgba(0,0,0,0.07)', border: '1px solid #e2e8f0' }}>
                  <p style={{ color: '#94a3b8', fontSize: 11, fontWeight: 700, margin: '0 0 8px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{card.label}</p>
                  <p style={{ color: card.accent, fontSize: 34, fontWeight: 800, margin: 0 }}>{card.value}</p>
                </div>
              ))}
            </div>

            {/* Departments overview table */}
            <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.07)', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              <div style={{ padding: '16px 22px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 style={{ color: '#0f172a', fontSize: 16, fontWeight: 700, margin: 0 }}>Departments Overview</h3>
                <button onClick={() => setActiveTab('departments')} style={{ background: 'none', border: '1px solid #e2e8f0', padding: '6px 14px', borderRadius: 8, color: '#3b82f6', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  Manage →
                </button>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    {['Department', 'Description', 'Rooms', ''].map(h => (
                      <th key={h} style={{ padding: '10px 18px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {departments.length === 0 ? (
                    <tr><td colSpan={4} style={{ padding: '28px 18px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>No departments yet. Add one in the Departments tab.</td></tr>
                  ) : departments.map((dept, i) => (
                    <tr key={dept.id} style={{ borderTop: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                      <td style={{ padding: '12px 18px', fontSize: 14, fontWeight: 600, color: '#1e293b' }}>{dept.name}</td>
                      <td style={{ padding: '12px 18px', fontSize: 13, color: '#64748b' }}>{dept.description || '—'}</td>
                      <td style={{ padding: '12px 18px' }}>
                        <span style={{ background: '#eff6ff', color: '#3b82f6', borderRadius: 6, padding: '2px 10px', fontSize: 12, fontWeight: 700 }}>{(roomsByDept[dept.id] || []).length}</span>
                      </td>
                      <td style={{ padding: '12px 18px' }}>
                        <button onClick={() => { setSelectedRoomsDeptId(dept.id); setActiveTab('rooms'); }} style={{ background: 'none', border: 'none', color: '#3b82f6', fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: '4px 8px', borderRadius: 6 }}>
                          View Rooms →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ════════════════════ DEPARTMENTS ══════════════════════════════ */}
        {activeTab === 'departments' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
              <h2 style={{ color: '#0f172a', fontSize: 24, fontWeight: 800, margin: 0 }}>Departments</h2>
              <button onClick={() => setShowAddDept(v => !v)} style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '9px 18px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                + Add Department
              </button>
            </div>

            {/* Add dept form */}
            {showAddDept && (
              <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #bfdbfe', padding: '16px 18px', marginBottom: 18, display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 5 }}>Name *</label>
                  <input value={newDeptName} onChange={e => setNewDeptName(e.target.value)} placeholder="e.g. Computer Science"
                    style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 12px', fontSize: 13, outline: 'none' }} />
                </div>
                <div style={{ flex: 2, minWidth: 200 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 5 }}>Description</label>
                  <input value={newDeptDesc} onChange={e => setNewDeptDesc(e.target.value)} placeholder="Short description"
                    style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 12px', fontSize: 13, outline: 'none' }} />
                </div>
                <button onClick={handleAddDept} style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Save</button>
                <button onClick={() => setShowAddDept(false)} style={{ background: 'transparent', border: '1px solid #e2e8f0', color: '#64748b', padding: '8px 14px', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
              </div>
            )}

            {/* Search */}
            <div style={{ marginBottom: 14 }}>
              <input value={deptSearch} onChange={e => setDeptSearch(e.target.value)} placeholder="Search departments…"
                style={{ width: '100%', maxWidth: 360, boxSizing: 'border-box', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 14px', fontSize: 13, outline: 'none', background: '#fff' }} />
            </div>

            {/* Table */}
            <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.07)', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    {['Department Name', 'Description', 'Rooms', 'Actions'].map(h => (
                      <th key={h} style={{ padding: '11px 18px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.07em', textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredDepts.length === 0 ? (
                    <tr><td colSpan={4} style={{ padding: '30px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>{deptSearch ? 'No matching departments.' : 'No departments yet.'}</td></tr>
                  ) : filteredDepts.map(dept => (
                    <tr key={dept.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '11px 18px', minWidth: 160 }}>
                        {editingDeptId === dept.id
                          ? <input value={editDeptName} onChange={e => setEditDeptName(e.target.value)} autoFocus
                              style={{ border: '1px solid #3b82f6', borderRadius: 7, padding: '6px 10px', fontSize: 13, width: '100%', boxSizing: 'border-box', outline: 'none' }} />
                          : <span style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>{dept.name}</span>
                        }
                      </td>
                      <td style={{ padding: '11px 18px' }}>
                        {editingDeptId === dept.id
                          ? <input value={editDeptDesc} onChange={e => setEditDeptDesc(e.target.value)}
                              style={{ border: '1px solid #3b82f6', borderRadius: 7, padding: '6px 10px', fontSize: 13, width: '100%', boxSizing: 'border-box', outline: 'none' }} />
                          : <span style={{ fontSize: 13, color: '#64748b' }}>{dept.description || '—'}</span>
                        }
                      </td>
                      <td style={{ padding: '11px 18px' }}>
                        <span style={{ background: '#eff6ff', color: '#3b82f6', borderRadius: 5, padding: '2px 9px', fontSize: 12, fontWeight: 700 }}>{(roomsByDept[dept.id] || []).length}</span>
                      </td>
                      <td style={{ padding: '11px 18px' }}>
                        {editingDeptId === dept.id ? (
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button onClick={() => handleUpdateDept(dept.id)} style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 7, padding: '6px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Save</button>
                            <button onClick={() => setEditingDeptId(null)} style={{ background: 'transparent', border: '1px solid #e2e8f0', borderRadius: 7, padding: '6px 12px', fontSize: 12, color: '#64748b', cursor: 'pointer' }}>Cancel</button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', gap: 10 }}>
                            <button onClick={() => { setEditingDeptId(dept.id); setEditDeptName(dept.name); setEditDeptDesc(dept.description || ''); }}
                              style={{ background: 'none', border: 'none', color: '#3b82f6', fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: '4px 6px' }}>Edit</button>
                            <button onClick={() => handleDeleteDept(dept.id)}
                              style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: '4px 6px' }}>Delete</button>
                            <button onClick={() => { setSelectedRoomsDeptId(dept.id); setActiveTab('rooms'); }}
                              style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: '4px 6px' }}>Rooms →</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ════════════════════ ROOMS & HOTSPOTS ═════════════════════════ */}
        {activeTab === 'rooms' && (
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
            {/* Dept sidebar */}
            <div style={{ width: 220, background: '#fff', borderRight: '1px solid #e2e8f0', overflowY: 'auto', flexShrink: 0 }}>
              <div style={{ padding: '14px 14px 10px', borderBottom: '1px solid #f1f5f9' }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.08em', textTransform: 'uppercase', margin: 0 }}>Departments</p>
              </div>
              {departments.length === 0
                ? <p style={{ padding: '18px 14px', color: '#94a3b8', fontSize: 13 }}>No departments yet.</p>
                : departments.map(dept => (
                  <button key={dept.id} onClick={() => setSelectedRoomsDeptId(dept.id)} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    width: '100%', padding: '11px 14px', border: 'none', cursor: 'pointer', textAlign: 'left',
                    background: selectedRoomsDeptId === dept.id ? '#eff6ff' : 'transparent',
                    borderLeft: selectedRoomsDeptId === dept.id ? '3px solid #3b82f6' : '3px solid transparent',
                    color: selectedRoomsDeptId === dept.id ? '#1d4ed8' : '#475569',
                    fontSize: 13, fontWeight: selectedRoomsDeptId === dept.id ? 700 : 500, transition: 'all 0.12s',
                  }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{dept.name}</span>
                    <span style={{ background: selectedRoomsDeptId === dept.id ? '#dbeafe' : '#f1f5f9', color: selectedRoomsDeptId === dept.id ? '#3b82f6' : '#94a3b8', borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 700, marginLeft: 6, flexShrink: 0 }}>
                      {(roomsByDept[dept.id] || []).length}
                    </span>
                  </button>
                ))
              }
            </div>

            {/* Rooms grid */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '22px 26px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#0f172a' }}>
                    {departments.find(d => d.id === selectedRoomsDeptId)?.name || 'Select a Department'}
                  </h2>
                  <p style={{ margin: '3px 0 0', fontSize: 12, color: '#64748b' }}>
                    {(roomsByDept[selectedRoomsDeptId] || []).length} room{(roomsByDept[selectedRoomsDeptId] || []).length !== 1 ? 's' : ''}
                  </p>
                </div>
                <button onClick={() => { setShowAddRoom(v => !v); setRoomUploadError(''); }} style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '9px 18px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                  + Add Room
                </button>
              </div>

              {/* Add room form */}
              {showAddRoom && (
                <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #bfdbfe', padding: '14px 16px', marginBottom: 18, display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 150 }}>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 5 }}>Room Name *</label>
                    <input value={newRoomName} onChange={e => setNewRoomName(e.target.value)} placeholder="e.g. Graphics Lab"
                      style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 12px', fontSize: 13, outline: 'none' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 5 }}>360° Image</label>
                    <input type="file" accept="image/*" onChange={e => setNewRoomFile(e.target.files[0] || null)}
                      style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #cbd5e1', borderRadius: 8, padding: '7px 10px', fontSize: 12, background: '#fafafa', cursor: 'pointer' }} />
                  </div>
                  {roomUploadError && <p style={{ width: '100%', color: '#ef4444', fontSize: 12, margin: 0 }}>{roomUploadError}</p>}
                  <button onClick={handleAddRoom} disabled={roomUploading}
                    style={{ background: roomUploading ? '#93c5fd' : '#3b82f6', color: '#fff', border: 'none', padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: roomUploading ? 'not-allowed' : 'pointer' }}>
                    {roomUploading ? 'Uploading…' : 'Save'}
                  </button>
                  <button onClick={() => setShowAddRoom(false)} style={{ background: 'transparent', border: '1px solid #e2e8f0', color: '#64748b', padding: '8px 14px', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
                </div>
              )}

              {/* Cards */}
              {!selectedRoomsDeptId
                ? <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8', fontSize: 14 }}>Select a department to see its rooms.</div>
                : (roomsByDept[selectedRoomsDeptId] || []).length === 0
                  ? <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8', fontSize: 14 }}>No rooms yet. Click "+ Add Room" to get started.</div>
                  : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: 18 }}>
                      {(roomsByDept[selectedRoomsDeptId] || []).map(room => {
                        const hs = hotspotsByRoom[room.id] || [];
                        const infoCount = hs.filter(h => h.type === 'info').length;
                        const navCount  = hs.filter(h => h.type === 'navigation').length;
                        const isDeleting = deletingRoomIds.has(room.id);
                        return (
                          <div key={room.id} style={{ background: '#fff', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', opacity: isDeleting ? 0.5 : 1, transition: 'opacity 0.2s' }}>
                            {/* Thumbnail */}
                            <div style={{ position: 'relative', aspectRatio: '16/9', background: '#e2e8f0', overflow: 'hidden', cursor: 'pointer' }}
                              onClick={() => handleOpenEditor(room)}
                              onMouseEnter={e => { const overlay = e.currentTarget.querySelector('.room-overlay'); if (overlay) overlay.style.opacity = 1; }}
                              onMouseLeave={e => { const overlay = e.currentTarget.querySelector('.room-overlay'); if (overlay) overlay.style.opacity = 0; }}>
                              {room.imageURL
                                ? <img src={room.imageURL} alt={room.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                                : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 13 }}>No image</div>
                              }
                              <div className="room-overlay" style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.18s' }}>
                                <span style={{ color: '#fff', fontSize: 13, fontWeight: 700, background: 'rgba(0,0,0,0.35)', padding: '6px 16px', borderRadius: 8 }}>Edit Hotspots</span>
                              </div>
                            </div>
                            {/* Info */}
                            <div style={{ padding: '14px 16px', flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#1e293b' }}>{room.name}</h3>
                              <div style={{ display: 'flex', gap: 8 }}>
                                <span style={{ background: '#eff6ff', color: '#3b82f6', borderRadius: 5, padding: '2px 9px', fontSize: 11, fontWeight: 700 }}>{infoCount} Info</span>
                                <span style={{ background: '#f0fdf4', color: '#059669', borderRadius: 5, padding: '2px 9px', fontSize: 11, fontWeight: 700 }}>{navCount} Nav</span>
                              </div>
                              <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
                                <button onClick={() => handleOpenEditor(room)} style={{ flex: 1, background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                                  Edit Hotspots
                                </button>
                                <button onClick={() => handleDeleteRoom(selectedRoomsDeptId, room.id)} disabled={isDeleting}
                                  style={{ background: '#fff', color: '#ef4444', border: '1px solid #fecaca', borderRadius: 8, padding: '8px 12px', fontSize: 12, fontWeight: 700, cursor: isDeleting ? 'not-allowed' : 'pointer' }}>
                                  {isDeleting ? '…' : 'Delete'}
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )
              }
            </div>
          </div>
        )}
      </div>

      {/* ── Hotspot Editor Modal ──────────────────────────────────────────── */}
      {editingRoom && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(5,8,22,0.93)', display: 'flex', flexDirection: 'column', fontFamily: 'sans-serif' }}>
          {/* Header */}
          <div style={{ padding: '14px 24px', background: '#0f172a', borderBottom: '1px solid #1e293b', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <span style={{ color: '#fff', fontSize: 17, fontWeight: 700 }}>Hotspot Editor — {editingRoom.room.name}</span>
              <span style={{ color: '#64748b', fontSize: 13, marginLeft: 12 }}>
                {pendingPos ? 'Fill in details and save' : 'Click anywhere on the panorama to place a hotspot'}
              </span>
            </div>
            <button onClick={() => { setEditingRoom(null); setPendingPos(null); }} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 24, cursor: 'pointer', lineHeight: 1 }}>✕</button>
          </div>

          {/* Body */}
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
            {/* 360° panorama viewer */}
            <div style={{ flex: 1, position: 'relative', overflow: 'hidden', background: '#0a0a14' }}>
              {editingRoom.room.imageURL ? (
                <HotspotEditorViewer
                  imageURL={editingRoom.room.imageURL}
                  hotspots={hotspotsByRoom[editingRoom.room.id] || []}
                  pendingPos={pendingPos}
                  onPlaceHotspot={handlePlaceHotspot}
                  onDeleteHotspot={handleDeleteHotspot}
                  initialView={editingRoom.room.defaultView}
                  onViewChange={setEditorView}
                />
              ) : (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#334155', fontSize: 15 }}>No panorama image</div>
              )}
              <div style={{ position: 'absolute', bottom: 12, left: 12, background: 'rgba(0,0,0,0.65)', color: '#94a3b8', padding: '4px 12px', borderRadius: 6, fontSize: 12, pointerEvents: 'none', zIndex: 20 }}>
                {(hotspotsByRoom[editingRoom.room.id] || []).length} hotspot{(hotspotsByRoom[editingRoom.room.id] || []).length !== 1 ? 's' : ''} · drag to pan · click to place
              </div>

              <button
                onClick={() => setEditorSidebarOpen(v => !v)}
                style={{
                  position: 'absolute',
                  top: 12,
                  right: 12,
                  zIndex: 25,
                  background: 'rgba(15,23,42,0.86)',
                  border: '1px solid rgba(148,163,184,0.35)',
                  color: '#e2e8f0',
                  borderRadius: 10,
                  padding: '7px 12px',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
                title={editorSidebarOpen ? 'Hide editor panel' : 'Show editor panel'}
              >
                {editorSidebarOpen ? 'Hide Panel' : `Show Panel (${(hotspotsByRoom[editingRoom.room.id] || []).length})`}
              </button>
            </div>

            {/* Sidebar */}
            <div style={{
              width: editorSidebarOpen ? 'clamp(290px, 24vw, 360px)' : 0,
              background: '#0f172a',
              borderLeft: editorSidebarOpen ? '1px solid #1e293b' : 'none',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              opacity: editorSidebarOpen ? 1 : 0,
              pointerEvents: editorSidebarOpen ? 'auto' : 'none',
              transition: 'width 0.24s ease, opacity 0.2s ease',
            }}>
              {pendingPos ? (
                <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
                  <div style={{ marginBottom: 16, padding: '10px 12px', borderRadius: 10, border: '1px solid #334155', background: '#111827' }}>
                    <p style={{ color: '#e2e8f0', fontSize: 12, fontWeight: 700, margin: '0 0 8px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                      Default Start View
                    </p>
                    <p style={{ color: '#94a3b8', fontSize: 12, margin: '0 0 10px' }}>
                      Current view: yaw {Math.round((editorView?.yaw ?? 0) * 10) / 10}° · pitch {Math.round((editorView?.pitch ?? 0) * 10) / 10}° · fov {Math.round((editorView?.fov ?? 75) * 10) / 10}°
                    </p>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={handleSaveDefaultView}
                        disabled={viewSaving}
                        style={{
                          flex: 1,
                          padding: '8px 0',
                          borderRadius: 8,
                          border: 'none',
                          cursor: viewSaving ? 'not-allowed' : 'pointer',
                          fontSize: 12,
                          fontWeight: 700,
                          background: viewSaving ? '#1e293b' : '#1d4ed8',
                          color: viewSaving ? '#64748b' : '#fff',
                        }}
                      >
                        {viewSaving ? 'Saving…' : 'Set Current as Default'}
                      </button>
                      <button
                        onClick={handleResetDefaultView}
                        disabled={viewSaving}
                        style={{
                          padding: '8px 10px',
                          borderRadius: 8,
                          border: '1px solid #334155',
                          cursor: viewSaving ? 'not-allowed' : 'pointer',
                          fontSize: 12,
                          background: '#1e293b',
                          color: '#cbd5e1',
                        }}
                      >
                        Center
                      </button>
                    </div>
                  </div>

                  <h3 style={{ color: '#f1f5f9', fontSize: 15, fontWeight: 700, margin: '0 0 4px' }}>New Hotspot</h3>
                  <p style={{ color: '#475569', fontSize: 12, margin: '0 0 20px' }}>Yaw: {pendingPos.yaw}° · Pitch: {pendingPos.pitch}°</p>

                  <div style={{ marginBottom: 16 }}>
                    <label style={{ color: '#94a3b8', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>Type</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {['info', 'navigation'].map(t => (
                        <button key={t} onClick={() => setNewHsType(t)} style={{
                          flex: 1, padding: '8px 0', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                          background: newHsType === t ? (t === 'info' ? '#0369a1' : '#047857') : '#1e293b',
                          color: newHsType === t ? '#fff' : '#64748b', transition: 'all 0.15s',
                        }}>{t === 'info' ? 'ℹ Info' : '› Navigation'}</button>
                      ))}
                    </div>
                  </div>

                  <div style={{ marginBottom: 14 }}>
                    <label style={{ color: '#94a3b8', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>Label *</label>
                    <input value={newHsText} onChange={e => setNewHsText(e.target.value)} placeholder="e.g. AI Research Lab"
                      style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', borderRadius: 8, padding: '8px 12px', color: '#f1f5f9', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
                  </div>

                  {newHsType === 'info' && (
                    <div style={{ marginBottom: 14 }}>
                      <label style={{ color: '#94a3b8', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>Description</label>
                      <textarea value={newHsDesc} onChange={e => setNewHsDesc(e.target.value)} placeholder="Short description shown in the info panel" rows={3}
                        style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', borderRadius: 8, padding: '8px 12px', color: '#f1f5f9', fontSize: 13, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
                    </div>
                  )}

                  {newHsType === 'navigation' && (
                    <>
                      <div style={{ marginBottom: 14 }}>
                        <label style={{ color: '#94a3b8', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>Target Department</label>
                        <select value={newHsTargetDeptId || editingRoom.deptId}
                          onChange={async e => {
                            const dId = e.target.value;
                            setNewHsTargetDeptId(dId);
                            setNewHsTargetRoomId('');
                            if (!roomsByDept[dId]) {
                              const rs = await getRooms(dId);
                              setRoomsByDept(prev => ({ ...prev, [dId]: rs }));
                            }
                          }}
                          style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', borderRadius: 8, padding: '8px 12px', color: '#f1f5f9', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}>
                          {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                      </div>
                      <div style={{ marginBottom: 14 }}>
                        <label style={{ color: '#94a3b8', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>Target Room *</label>
                        <select value={newHsTargetRoomId} onChange={e => setNewHsTargetRoomId(e.target.value)}
                          style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', borderRadius: 8, padding: '8px 12px', color: '#f1f5f9', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}>
                          <option value="">— select room —</option>
                          {(roomsByDept[newHsTargetDeptId || editingRoom.deptId] || []).map(r => (
                            <option key={r.id} value={r.id}>{r.name}</option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}

                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <button onClick={handleSaveHotspot}
                      disabled={hsSaving || !newHsText.trim() || (newHsType === 'navigation' && !newHsTargetRoomId)}
                      style={{
                        flex: 1, padding: '9px 0', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700,
                        background: (hsSaving || !newHsText.trim() || (newHsType === 'navigation' && !newHsTargetRoomId)) ? '#1e293b' : '#2563eb',
                        color: (hsSaving || !newHsText.trim() || (newHsType === 'navigation' && !newHsTargetRoomId)) ? '#475569' : '#fff',
                        transition: 'all 0.15s',
                      }}>{hsSaving ? 'Saving…' : 'Save Hotspot'}</button>
                    <button onClick={() => setPendingPos(null)}
                      style={{ padding: '9px 14px', borderRadius: 8, border: '1px solid #334155', cursor: 'pointer', fontSize: 13, background: '#1e293b', color: '#94a3b8' }}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
                  <div style={{ marginBottom: 16, padding: '10px 12px', borderRadius: 10, border: '1px solid #334155', background: '#111827' }}>
                    <p style={{ color: '#e2e8f0', fontSize: 12, fontWeight: 700, margin: '0 0 8px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                      Default Start View
                    </p>
                    <p style={{ color: '#94a3b8', fontSize: 12, margin: '0 0 10px' }}>
                      Current view: yaw {Math.round((editorView?.yaw ?? 0) * 10) / 10}° · pitch {Math.round((editorView?.pitch ?? 0) * 10) / 10}° · fov {Math.round((editorView?.fov ?? 75) * 10) / 10}°
                    </p>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={handleSaveDefaultView}
                        disabled={viewSaving}
                        style={{
                          flex: 1,
                          padding: '8px 0',
                          borderRadius: 8,
                          border: 'none',
                          cursor: viewSaving ? 'not-allowed' : 'pointer',
                          fontSize: 12,
                          fontWeight: 700,
                          background: viewSaving ? '#1e293b' : '#1d4ed8',
                          color: viewSaving ? '#64748b' : '#fff',
                        }}
                      >
                        {viewSaving ? 'Saving…' : 'Set Current as Default'}
                      </button>
                      <button
                        onClick={handleResetDefaultView}
                        disabled={viewSaving}
                        style={{
                          padding: '8px 10px',
                          borderRadius: 8,
                          border: '1px solid #334155',
                          cursor: viewSaving ? 'not-allowed' : 'pointer',
                          fontSize: 12,
                          background: '#1e293b',
                          color: '#cbd5e1',
                        }}
                      >
                        Center
                      </button>
                    </div>
                  </div>

                  <h3 style={{ color: '#f1f5f9', fontSize: 15, fontWeight: 700, margin: '0 0 16px' }}>
                    Hotspots ({(hotspotsByRoom[editingRoom.room.id] || []).length})
                  </h3>
                  {(hotspotsByRoom[editingRoom.room.id] || []).length === 0 ? (
                    <p style={{ color: '#475569', fontSize: 13 }}>No hotspots yet. Click anywhere on the panorama to place one.</p>
                  ) : (
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {(hotspotsByRoom[editingRoom.room.id] || []).map(hs => (
                        <li key={hs.id} style={{ background: '#1e293b', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ width: 20, height: 20, borderRadius: '50%', flexShrink: 0, background: hs.type === 'info' ? '#0EA5E9' : '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#fff', fontWeight: 700 }}>
                              {hs.type === 'info' ? 'ℹ' : '›'}
                            </span>
                            <div>
                              <p style={{ color: '#f1f5f9', fontSize: 13, fontWeight: 600, margin: 0 }}>{hs.text}</p>
                              <p style={{ color: '#64748b', fontSize: 11, margin: 0 }}>{hs.type} · yaw {hs.yaw}° pitch {hs.pitch}°</p>
                            </div>
                          </div>
                          <button onClick={() => handleDeleteHotspot(hs.id)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: 20, lineHeight: 1, padding: '2px 4px', borderRadius: 4 }}
                            title="Delete hotspot">×</button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

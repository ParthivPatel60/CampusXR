import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { getHotspots, addHotspot, deleteHotspot } from '../../services/firestoreService';
import { uploadImageToCloudinary } from '../../cloudinary';

const TYPE_STYLES = {
  info:       { ring: '#38BDF8', dot: '#0EA5E9', glow: 'rgba(56,189,248,0.60)',  icon: 'ℹ', label: 'Info' },
  navigation: { ring: '#34D399', dot: '#10B981', glow: 'rgba(52,211,153,0.60)', icon: '›', label: 'Navigation' },
};

const labelStyle = {
  display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4,
};

const inputStyle = {
  width: '100%', padding: '8px 10px', borderRadius: 8,
  border: '1px solid #e2e8f0', fontSize: 13, color: '#1e293b',
  outline: 'none', background: '#fff', fontFamily: 'inherit',
  boxSizing: 'border-box',
};

export default function HotspotEditor({ room, deptId, departments, allRoomsByDept, onClose }) {
  const [hotspots, setHotspots]           = useState([]);
  const [placing, setPlacing]             = useState(false);
  const [pendingPos, setPendingPos]       = useState(null); // { pitch, yaw }
  const [formText, setFormText]           = useState('');
  const [formType, setFormType]           = useState('info');
  const [formDesc, setFormDesc]           = useState('');
  const [formImageFile, setFormImageFile] = useState(null);
  const [formTargetDeptId, setFormTargetDeptId] = useState(deptId);
  const [formTargetRoomId, setFormTargetRoomId] = useState('');
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');

  const mountRef             = useRef(null);
  const cameraRef            = useRef(null);
  const markersContainerRef  = useRef(null);
  const placingRef           = useRef(false);
  const hotspotsRef          = useRef([]);

  // keep refs in sync
  useEffect(() => { placingRef.current = placing; }, [placing]);
  useEffect(() => { hotspotsRef.current = hotspots; }, [hotspots]);

  // Load existing hotspots
  useEffect(() => {
    if (deptId && room?.id) {
      getHotspots(deptId, room.id).then(setHotspots);
    }
  }, [deptId, room?.id]);

  // Rebuild DOM marker elements whenever hotspot list changes
  useEffect(() => {
    const container = markersContainerRef.current;
    if (!container) return;
    while (container.firstChild) container.removeChild(container.firstChild);
    hotspotsRef.current.forEach(hs => {
      const c = TYPE_STYLES[hs.type] ?? TYPE_STYLES.info;
      const el = document.createElement('div');
      Object.assign(el.style, {
        position: 'absolute',
        transform: 'translate(-50%, -50%)',
        display: 'none',
        pointerEvents: 'none',
      });
      el.dataset.hsId = hs.id;
      el.innerHTML = `
        <span style="display:flex;align-items:center;justify-content:center;
          width:32px;height:32px;border-radius:50%;
          border:2.5px solid ${c.ring};
          background:rgba(255,255,255,0.12);
          box-shadow:0 0 12px ${c.glow};">
          <span style="width:12px;height:12px;border-radius:50%;
            background:${c.dot};color:#fff;font-size:8px;font-weight:800;
            display:flex;align-items:center;justify-content:center;">
            ${c.icon}
          </span>
        </span>`;
      container.appendChild(el);
    });
  }, [hotspots]);

  // Three.js panorama viewer
  useEffect(() => {
    if (!room?.imageURL || !mountRef.current) return;
    const mount = mountRef.current;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    mount.appendChild(renderer.domElement);

    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, mount.clientWidth / mount.clientHeight, 0.1, 1000);
    camera.position.set(0, 0, 0.001);
    cameraRef.current = camera;

    const geo = new THREE.SphereGeometry(500, 60, 40);
    geo.scale(-1, 1, 1);
    const texture = new THREE.TextureLoader().load(room.imageURL);
    texture.colorSpace = THREE.SRGBColorSpace;
    scene.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: texture })));

    // Drag-to-look
    let isDown = false, prevX = 0, prevY = 0, dragDist = 0;
    let lon = 0, lat = 0, lonTarget = 0, latTarget = 0;

    const onPointerDown = (e) => {
      isDown = true; dragDist = 0;
      prevX = e.clientX; prevY = e.clientY;
    };
    const onPointerMove = (e) => {
      if (!isDown) return;
      const dx = e.clientX - prevX, dy = e.clientY - prevY;
      dragDist += Math.abs(dx) + Math.abs(dy);
      if (!placingRef.current) {
        lonTarget -= dx * 0.2;
        latTarget  = Math.max(-85, Math.min(85, latTarget + dy * 0.2));
      }
      prevX = e.clientX; prevY = e.clientY;
    };
    const onPointerUp = (e) => {
      if (!isDown) return;
      isDown = false;
      if (placingRef.current && dragDist < 5 && cameraRef.current) {
        const rect   = mount.getBoundingClientRect();
        const ndcX   = ((e.clientX - rect.left) / rect.width)  * 2 - 1;
        const ndcY   = -((e.clientY - rect.top)  / rect.height) * 2 + 1;
        const rc     = new THREE.Raycaster();
        rc.setFromCamera({ x: ndcX, y: ndcY }, cameraRef.current);
        const dir    = rc.ray.direction;
        const pitch  = 90 - Math.acos(Math.max(-1, Math.min(1, dir.y))) * (180 / Math.PI);
        const yaw    = Math.atan2(dir.z, dir.x) * (180 / Math.PI);
        setPendingPos({ pitch, yaw });
        setPlacing(false);
      }
    };
    const onWheel = (e) => {
      camera.fov = Math.max(30, Math.min(100, camera.fov + e.deltaY * 0.05));
      camera.updateProjectionMatrix();
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerup',   onPointerUp);
    renderer.domElement.addEventListener('wheel',       onWheel, { passive: true });

    const onResize = () => {
      const nw = mount.clientWidth, nh = mount.clientHeight;
      renderer.setSize(nw, nh);
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', onResize);

    const _pv = new THREE.Vector3();
    let animId;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      lon += (lonTarget - lon) * 0.08;
      lat += (latTarget - lat) * 0.08;
      const phi   = THREE.MathUtils.degToRad(90 - lat);
      const theta = THREE.MathUtils.degToRad(lon);
      camera.lookAt(
        500 * Math.sin(phi) * Math.cos(theta),
        500 * Math.cos(phi),
        500 * Math.sin(phi) * Math.sin(theta),
      );
      renderer.render(scene, camera);

      // Project hotspot markers into screen space
      const container = markersContainerRef.current;
      if (container) {
        const cw = mount.clientWidth, ch = mount.clientHeight;
        const hsList = hotspotsRef.current;
        const elList = container.children;
        for (let i = 0; i < elList.length && i < hsList.length; i++) {
          const hs = hsList[i];
          const el = elList[i];
          const hsPhi   = THREE.MathUtils.degToRad(90 - (hs.pitch ?? 0));
          const hsTheta = THREE.MathUtils.degToRad(hs.yaw ?? 0);
          _pv.set(
            500 * Math.sin(hsPhi) * Math.cos(hsTheta),
            500 * Math.cos(hsPhi),
            500 * Math.sin(hsPhi) * Math.sin(hsTheta),
          );
          _pv.project(camera);
          if (_pv.z <= 1 && Math.abs(_pv.x) <= 1.05 && Math.abs(_pv.y) <= 1.05) {
            el.style.left    = `${(_pv.x  + 1) / 2 * cw}px`;
            el.style.top     = `${(1 - _pv.y) / 2 * ch}px`;
            el.style.display = '';
          } else {
            el.style.display = 'none';
          }
        }
      }
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', onResize);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerup',   onPointerUp);
      renderer.domElement.removeEventListener('wheel',       onWheel);
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, [room?.imageURL]);

  // Save a new hotspot
  const handleSave = async () => {
    if (!formText.trim()) { setError('Hotspot label is required.'); return; }
    if (formType === 'navigation' && !formTargetRoomId) { setError('Please select a target room.'); return; }
    if (!pendingPos) return;
    setSaving(true); setError('');
    try {
      let imageUrl = '';
      if (formImageFile) {
        const { secure_url } = await uploadImageToCloudinary(formImageFile);
        imageUrl = secure_url;
      }
      const data = {
        text:        formText.trim(),
        type:        formType,
        description: formDesc.trim(),
        pitch:       pendingPos.pitch,
        yaw:         pendingPos.yaw,
        ...(imageUrl ? { imageUrl } : {}),
        ...(formType === 'navigation' ? {
          targetDeptId: formTargetDeptId || deptId,
          targetRoomId: formTargetRoomId,
        } : {}),
      };
      await addHotspot(deptId, room.id, data);
      setHotspots(await getHotspots(deptId, room.id));
      // reset form
      setPendingPos(null); setFormText(''); setFormDesc('');
      setFormImageFile(null); setFormType('info');
      setFormTargetDeptId(deptId); setFormTargetRoomId('');
    } catch {
      setError('Failed to save hotspot. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (hsId) => {
    await deleteHotspot(deptId, room.id, hsId);
    setHotspots(prev => prev.filter(h => h.id !== hsId));
  };

  const targetDeptRooms = allRoomsByDept[formTargetDeptId] || [];

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', background: '#0f0f1a' }}>

      {/* ── LEFT SIDEBAR: hotspot list ───────────────────────────────────── */}
      <div style={{
        width: 280, background: '#fff', display: 'flex', flexDirection: 'column',
        boxShadow: '2px 0 8px rgba(0,0,0,0.15)', zIndex: 10, overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid #f1f5f9' }}>
          <button
            onClick={onClose}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              color: '#64748b', fontSize: 13, fontWeight: 600,
              background: 'none', border: 'none', cursor: 'pointer',
              padding: 0, marginBottom: 12,
            }}
          >
            ← Back to Rooms
          </button>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', margin: 0 }}>{room.name}</h2>
          <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>Hotspot Editor</p>
        </div>

        {/* Place button */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9' }}>
          <button
            onClick={() => { setPlacing(v => !v); setPendingPos(null); }}
            style={{
              width: '100%', padding: '10px 0', borderRadius: 8,
              background: placing ? '#4f46e5' : '#3b82f6',
              color: '#fff', fontWeight: 700, fontSize: 13,
              border: 'none', cursor: 'pointer', transition: 'background 0.15s',
            }}
          >
            {placing ? '🎯 Click panorama to place…' : '+ Place Hotspot'}
          </button>
          {placing && (
            <p style={{ textAlign: 'center', fontSize: 11, color: '#64748b', marginTop: 6 }}>
              Pan to look around, then click
            </p>
          )}
        </div>

        {/* Hotspot list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
            Hotspots ({hotspots.length})
          </p>
          {hotspots.length === 0 && (
            <p style={{ fontSize: 12, color: '#cbd5e1', textAlign: 'center', marginTop: 24 }}>
              No hotspots yet.<br />Click &ldquo;Place Hotspot&rdquo; to add one.
            </p>
          )}
          {hotspots.map(hs => {
            const c = TYPE_STYLES[hs.type] ?? TYPE_STYLES.info;
            return (
              <div key={hs.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', borderRadius: 8,
                background: '#f8fafc', border: '1px solid #e2e8f0', marginBottom: 8,
              }}>
                <span style={{
                  width: 26, height: 26, borderRadius: '50%', background: c.dot,
                  color: '#fff', fontSize: 10, fontWeight: 800,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  {c.icon}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {hs.text}
                  </p>
                  <p style={{ fontSize: 10, color: '#94a3b8', margin: 0 }}>
                    {c.label} · p:{hs.pitch?.toFixed(1)}° y:{hs.yaw?.toFixed(1)}°
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(hs.id)}
                  style={{ color: '#ef4444', fontSize: 11, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px', borderRadius: 4, flexShrink: 0 }}
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── CENTRE: PANORAMA VIEWER ──────────────────────────────────────── */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {placing && (
          <div style={{
            position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)',
            background: 'rgba(79,70,229,0.90)', backdropFilter: 'blur(8px)',
            color: '#fff', padding: '8px 20px', borderRadius: 30,
            fontSize: 13, fontWeight: 600, pointerEvents: 'none', zIndex: 20,
            border: '1px solid rgba(255,255,255,0.25)',
          }}>
            🎯 Click anywhere on the panorama to place a hotspot
          </div>
        )}

        {/* Three.js canvas mount */}
        <div
          ref={mountRef}
          style={{ position: 'absolute', inset: 0, cursor: placing ? 'crosshair' : 'grab' }}
        >
          {/* Hotspot marker overlay */}
          <div
            ref={markersContainerRef}
            style={{ position: 'absolute', inset: 0, zIndex: 10, pointerEvents: 'none' }}
          />
        </div>

        {!room?.imageURL && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 14 }}>
            No panorama image for this room.
          </div>
        )}
      </div>

      {/* ── RIGHT PANEL: new-hotspot form ───────────────────────────────── */}
      {pendingPos && (
        <div style={{
          width: 310, background: '#fff', boxShadow: '-2px 0 8px rgba(0,0,0,0.12)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden', zIndex: 10,
        }}>
          <div style={{ padding: '20px 20px 14px', borderBottom: '1px solid #f1f5f9' }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', margin: 0 }}>New Hotspot</h3>
            <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
              pitch {pendingPos.pitch.toFixed(1)}° · yaw {pendingPos.yaw.toFixed(1)}°
            </p>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Type toggle */}
            <div>
              <label style={labelStyle}>Type</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {['info', 'navigation'].map(t => {
                  const c     = TYPE_STYLES[t];
                  const sel   = formType === t;
                  const bdr   = sel ? c.dot : '#e2e8f0';
                  const bg    = sel ? (t === 'info' ? '#e0f2fe' : '#d1fae5') : '#fff';
                  const color = sel ? (t === 'info' ? '#0369a1' : '#065f46') : '#64748b';
                  return (
                    <button key={t} onClick={() => setFormType(t)} style={{
                      flex: 1, padding: '9px 4px', borderRadius: 8,
                      fontSize: 12, fontWeight: 600,
                      border: `2px solid ${bdr}`, background: bg, color,
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}>
                      {t === 'info' ? 'ℹ Info' : '› Navigation'}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Label */}
            <div>
              <label style={labelStyle}>Label *</label>
              <input
                type="text"
                placeholder="e.g. MakerBot Replicator+"
                value={formText}
                onChange={e => setFormText(e.target.value)}
                style={inputStyle}
              />
            </div>

            {/* Description (info only) */}
            {formType === 'info' && (
              <div>
                <label style={labelStyle}>Description</label>
                <textarea
                  placeholder="Equipment details, location info…"
                  value={formDesc}
                  onChange={e => setFormDesc(e.target.value)}
                  rows={3}
                  style={{ ...inputStyle, resize: 'vertical' }}
                />
              </div>
            )}

            {/* Navigation target (navigation only) */}
            {formType === 'navigation' && (
              <>
                <div>
                  <label style={labelStyle}>Target Department</label>
                  <select
                    value={formTargetDeptId}
                    onChange={e => { setFormTargetDeptId(e.target.value); setFormTargetRoomId(''); }}
                    style={inputStyle}
                  >
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Target Room</label>
                  <select
                    value={formTargetRoomId}
                    onChange={e => setFormTargetRoomId(e.target.value)}
                    style={inputStyle}
                  >
                    <option value="">— select room —</option>
                    {targetDeptRooms.map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {/* Optional image (info only) */}
            {formType === 'info' && (
              <div>
                <label style={labelStyle}>Image (optional)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={e => setFormImageFile(e.target.files[0] || null)}
                  style={{ fontSize: 12, color: '#475569' }}
                />
              </div>
            )}

            {error && <p style={{ color: '#ef4444', fontSize: 12, margin: 0 }}>{error}</p>}
          </div>

          {/* Save / Cancel */}
          <div style={{ padding: '12px 20px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: 8 }}>
            <button
              onClick={() => { setPendingPos(null); setError(''); }}
              style={{ flex: 1, padding: '10px', borderRadius: 8, fontSize: 13, fontWeight: 600, border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{ flex: 2, padding: '10px', borderRadius: 8, fontSize: 13, fontWeight: 700, border: 'none', background: '#3b82f6', color: '#fff', cursor: 'pointer', opacity: saving ? 0.6 : 1 }}
            >
              {saving ? 'Saving…' : 'Save Hotspot'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

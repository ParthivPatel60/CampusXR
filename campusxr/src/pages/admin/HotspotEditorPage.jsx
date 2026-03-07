import React, { useState, useEffect, useCallback } from 'react';
import { getHotspots, updateHotspot, deleteHotspot } from '../../services/firestoreService';

const T = {
    accent: '#4f8cff', accent2: '#00e5c0', accent3: '#ff5f6d', accent4: '#ffb347',
    surface: '#0e1420', surface2: '#141b28', border: 'rgba(255,255,255,0.07)', text: '#e8edf5', muted: '#6b7a99', bg: '#080c14'
};

const TYPE_COLOR = { info: T.accent, navigation: T.accent2, media: T.accent4, link: T.accent3 };
const TYPE_ICON = { info: 'ℹ️', navigation: '➡️', media: '🎬', link: '🔗' };
const TYPE_LABEL = { info: 'Info', navigation: 'Nav', media: 'Media', link: 'Link' };

const inp = {
    width: '100%', background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 9,
    padding: '9px 13px', color: T.text, fontSize: 13.5, fontFamily: 'Times New Roman,serif', outline: 'none'
};
const lbl = { fontSize: 10.5, letterSpacing: '1.2px', textTransform: 'uppercase', color: T.muted, display: 'block', marginBottom: 6 };

export default function HotspotEditorPage({ departments, roomsByDept, showToast }) {
    const [allHotspots, setAllHotspots] = useState([]);
    const [filter, setFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState(null);
    const [activeTab, setActiveTab] = useState('general');
    const [form, setForm] = useState({ label: '', type: 'info', status: 'live', yaw: 0, pitch: 0, scale: 1, title: '', description: '', destRoom: '', url: '', btnLabel: '' });
    const [saving, setSaving] = useState(false);

    const loadAll = useCallback(async () => {
        const list = [];
        for (const dept of departments) {
            const rooms = roomsByDept[dept.id] || [];
            for (const room of rooms) {
                try {
                    const hs = await getHotspots(dept.id, room.id);
                    hs.forEach(h => list.push({ ...h, deptId: dept.id, deptName: dept.name, roomId: room.id, roomName: room.name }));
                } catch { }
            }
        }
        setAllHotspots(list);
    }, [departments, roomsByDept]);

    useEffect(() => { if (departments.length) loadAll(); }, [loadAll, departments]);

    const filtered = allHotspots.filter(h => {
        const typeMatch = filter === 'all' || h.type === filter;
        const q = search.toLowerCase();
        const textMatch = !q || (h.text || '').toLowerCase().includes(q) || (h.roomName || '').toLowerCase().includes(q);
        return typeMatch && textMatch;
    });

    const selectHS = (h) => {
        setSelected(h);
        setActiveTab('general');
        setForm({
            label: h.text || '', type: h.type || 'info', status: h.status || 'live',
            yaw: h.yaw || 0, pitch: h.pitch || 0, scale: h.scale || 1,
            title: h.title || '', description: h.description || '',
            destRoom: h.destRoom || '', url: h.url || '', btnLabel: h.btnLabel || '',
        });
    };

    const save = async () => {
        if (!selected) return;
        setSaving(true);
        try {
            await updateHotspot(selected.deptId, selected.roomId, selected.id, {
                text: form.label, type: form.type, status: form.status,
                yaw: parseFloat(form.yaw), pitch: parseFloat(form.pitch), scale: parseFloat(form.scale),
                title: form.title, description: form.description,
                destRoom: form.destRoom, url: form.url, btnLabel: form.btnLabel,
            });
            setAllHotspots(prev => prev.map(h => h.id === selected.id ? { ...h, text: form.label, type: form.type } : h));
            showToast('✓ Hotspot saved', T.accent2, 'rgba(0,229,192,0.3)');
        } catch { showToast('✗ Save failed', T.accent3, 'rgba(255,95,109,0.3)'); }
        setSaving(false);
    };

    const doDelete = async () => {
        if (!selected || !window.confirm('Delete this hotspot?')) return;
        try {
            await deleteHotspot(selected.deptId, selected.roomId, selected.id);
            setAllHotspots(prev => prev.filter(h => h.id !== selected.id));
            setSelected(null);
            showToast('🗑 Deleted', T.accent3, 'rgba(255,95,109,0.3)');
        } catch { showToast('✗ Delete failed', T.accent3, 'rgba(255,95,109,0.3)'); }
    };

    const upd = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

    const chipStyle = active => ({
        fontSize: 10.5, padding: '3px 9px', borderRadius: 20, cursor: 'pointer',
        border: `1px solid ${active ? 'rgba(79,140,255,0.3)' : T.border}`,
        color: active ? T.accent : T.muted,
        background: active ? 'rgba(79,140,255,0.12)' : 'transparent',
        fontFamily: 'Times New Roman,serif',
    });

    const TABS = ['general', 'position', 'content', 'style', 'behavior'];

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '290px 1fr', gap: 18 }}>
            {/* ─── LEFT: hotspot list ─── */}
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, overflow: 'hidden' }}>
                <div style={{ padding: '15px 18px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontFamily: 'Times New Roman,serif', fontSize: 14, fontWeight: 700 }}>
                        All Hotspots <span style={{ color: T.muted, fontWeight: 400, fontSize: 12 }}>({allHotspots.length})</span>
                    </span>
                </div>
                <div style={{ padding: '10px 14px', borderBottom: `1px solid ${T.border}` }}>
                    <input value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="🔍  Search by name or room..."
                        style={{ ...inp, padding: '7px 12px', fontSize: 12.5 }} />
                </div>
                <div style={{ display: 'flex', gap: 6, padding: '8px 14px', borderBottom: `1px solid ${T.border}`, flexWrap: 'wrap' }}>
                    {['all', 'info', 'navigation', 'media', 'link'].map(f => (
                        <button key={f} onClick={() => setFilter(f)} style={chipStyle(filter === f)}>
                            {f === 'all' ? 'All' : f === 'navigation' ? '➡ Nav' : f === 'info' ? 'ℹ Info' : f === 'media' ? '🎬 Media' : '🔗 Link'}
                        </button>
                    ))}
                </div>
                <div style={{ maxHeight: 'calc(100vh - 340px)', overflowY: 'auto' }}>
                    {filtered.length === 0
                        ? <div style={{ padding: 30, textAlign: 'center', color: T.muted, fontStyle: 'italic', fontSize: 13 }}>No hotspots found</div>
                        : filtered.map(h => {
                            const isSel = selected?.id === h.id && selected?.roomId === h.roomId;
                            const col = TYPE_COLOR[h.type] || T.accent;
                            return (
                                <div key={h.id + h.roomId} onClick={() => selectHS(h)}
                                    style={{
                                        padding: '12px 16px', borderBottom: `1px solid ${T.border}`, cursor: 'pointer',
                                        background: isSel ? 'rgba(79,140,255,0.08)' : 'transparent',
                                        borderLeft: isSel ? `3px solid ${T.accent}` : '3px solid transparent',
                                        display: 'flex', alignItems: 'center', gap: 10, transition: 'background .15s'
                                    }}>
                                    <div style={{ width: 32, height: 32, borderRadius: 8, background: col + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>{TYPE_ICON[h.type] || '📍'}</div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: 12.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.text || '(untitled)'}</div>
                                        <div style={{ fontSize: 11, color: T.muted, fontStyle: 'italic' }}>{h.roomName}</div>
                                    </div>
                                    <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, fontWeight: 600, background: col + '22', color: col, flexShrink: 0 }}>{TYPE_LABEL[h.type] || '?'}</span>
                                </div>
                            );
                        })}
                </div>
            </div>

            {/* ─── RIGHT: editor ─── */}
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, overflow: 'hidden' }}>
                {/* Header */}
                <div style={{ padding: '16px 22px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                        <div style={{ fontFamily: 'Times New Roman,serif', fontSize: 15, fontWeight: 700 }}>
                            {selected ? (selected.text || '(untitled)') : 'Select a hotspot to edit'}
                        </div>
                        <div style={{ fontSize: 12, color: T.muted, fontStyle: 'italic' }}>
                            {selected ? `${selected.roomName} — ${TYPE_LABEL[selected.type] || ''} Hotspot` : 'Click any item from the list ←'}
                        </div>
                    </div>
                    {selected && (
                        <span style={{ fontSize: 10, padding: '3px 9px', borderRadius: 20, background: 'rgba(34,212,127,0.12)', color: '#22d47f', fontWeight: 700, border: '1px solid rgba(34,212,127,0.2)' }}>● Live</span>
                    )}
                </div>

                {!selected ? (
                    <div style={{ padding: '60px 30px', textAlign: 'center', color: T.muted }}>
                        <div style={{ fontSize: 42, marginBottom: 14 }}>📍</div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: T.text, marginBottom: 7, fontFamily: 'Times New Roman,serif' }}>No Hotspot Selected</div>
                        <div style={{ fontSize: 13, fontStyle: 'italic' }}>Select a hotspot from the left panel to begin editing.</div>
                    </div>
                ) : (
                    <>
                        {/* Preview strip */}
                        <div style={{ margin: '15px 22px', background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
                            <div style={{ width: 44, height: 44, borderRadius: '50%', background: (TYPE_COLOR[form.type] || T.accent) + '22', color: TYPE_COLOR[form.type] || T.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
                                {TYPE_ICON[form.type] || '📍'}
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 14, fontWeight: 700 }}>{form.label || '(untitled)'}</div>
                                <div style={{ fontSize: 12, color: T.muted, fontStyle: 'italic' }}>{selected.roomName}</div>
                            </div>
                        </div>

                        {/* Tabs */}
                        <div style={{ display: 'flex', gap: 5, padding: '0 22px 14px', flexWrap: 'wrap' }}>
                            {TABS.map(t => (
                                <button key={t} onClick={() => setActiveTab(t)} style={{
                                    padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                                    border: `1px solid ${activeTab === t ? 'rgba(79,140,255,0.3)' : T.border}`,
                                    background: activeTab === t ? 'rgba(79,140,255,0.12)' : 'transparent',
                                    color: activeTab === t ? T.accent : T.muted,
                                    fontFamily: 'Times New Roman,serif', textTransform: 'capitalize',
                                }}>{t}</button>
                            ))}
                        </div>

                        {/* Tab content */}
                        <div style={{ padding: '0 22px 14px' }}>
                            {activeTab === 'general' && (
                                <div>
                                    <div style={{ marginBottom: 15 }}>
                                        <label style={lbl}>Hotspot Label</label>
                                        <input style={inp} value={form.label} onChange={upd('label')} placeholder="e.g. AI Lab Info" />
                                    </div>
                                    <div style={{ marginBottom: 15 }}>
                                        <label style={lbl}>Type</label>
                                        <select style={{ ...inp, cursor: 'pointer', appearance: 'none' }} value={form.type} onChange={upd('type')}>
                                            <option value="info">ℹ️ Info — Show popup description</option>
                                            <option value="navigation">➡️ Navigation — Jump to another room</option>
                                            <option value="media">🎬 Media — Open image or video</option>
                                            <option value="link">🔗 Link — Open external URL</option>
                                        </select>
                                    </div>
                                    <div style={{ marginBottom: 15 }}>
                                        <label style={lbl}>Room</label>
                                        <input style={{ ...inp, opacity: .6, cursor: 'default' }} value={selected.roomName} readOnly />
                                    </div>
                                    <div>
                                        <label style={lbl}>Status</label>
                                        <div style={{ display: 'flex', gap: 14 }}>
                                            {['live', 'draft', 'hidden'].map(s => (
                                                <label key={s} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                                                    <input type="radio" name="hs-status" value={s} checked={form.status === s} onChange={upd('status')} style={{ accentColor: T.accent }} />
                                                    {s.charAt(0).toUpperCase() + s.slice(1)}
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'position' && (
                                <div>
                                    <div style={{ background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 10, padding: '12px 14px', marginBottom: 14, fontSize: 12.5, color: T.muted }}>
                                        📐 Coordinates in <strong style={{ color: T.text }}>degrees (°)</strong> within the 360° scene.
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 15 }}>
                                        {[['yaw', 'Yaw (X)', '°'], ['pitch', 'Pitch (Y)', '°'], ['scale', 'Scale', '×']].map(([k, l, u]) => (
                                            <div key={k}>
                                                <label style={lbl}>{l}</label>
                                                <div style={{ position: 'relative' }}>
                                                    <input type="number" style={{ ...inp, paddingRight: 28 }} value={form[k]} onChange={upd(k)} step={k === 'scale' ? 0.05 : 0.1} />
                                                    <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: T.muted }}>{u}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'content' && (
                                <div>
                                    {(form.type === 'info' || form.type === 'media') && (
                                        <>
                                            <div style={{ marginBottom: 15 }}>
                                                <label style={lbl}>Title</label>
                                                <input style={inp} value={form.title} onChange={upd('title')} placeholder="e.g. About the AI Lab" />
                                            </div>
                                            <div style={{ marginBottom: 15 }}>
                                                <label style={lbl}>Description</label>
                                                <textarea style={{ ...inp, resize: 'vertical', minHeight: 72 }} value={form.description} onChange={upd('description')} placeholder="Text shown when user clicks this hotspot..." />
                                            </div>
                                        </>
                                    )}
                                    {form.type === 'navigation' && (
                                        <>
                                            <div style={{ marginBottom: 15 }}>
                                                <label style={lbl}>Destination Room</label>
                                                <input style={inp} value={form.destRoom} onChange={upd('destRoom')} placeholder="e.g. AI Lab" />
                                            </div>
                                            <div style={{ marginBottom: 15 }}>
                                                <label style={lbl}>Arrow Label</label>
                                                <input style={inp} value={form.btnLabel} onChange={upd('btnLabel')} placeholder="e.g. Go to AI Lab →" />
                                            </div>
                                        </>
                                    )}
                                    {form.type === 'link' && (
                                        <>
                                            <div style={{ marginBottom: 15 }}>
                                                <label style={lbl}>URL</label>
                                                <input type="url" style={inp} value={form.url} onChange={upd('url')} placeholder="https://..." />
                                            </div>
                                            <div style={{ marginBottom: 15 }}>
                                                <label style={lbl}>Button Label</label>
                                                <input style={inp} value={form.btnLabel} onChange={upd('btnLabel')} placeholder="e.g. Learn More" />
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}

                            {activeTab === 'style' && (
                                <div>
                                    <div style={{ marginBottom: 15 }}>
                                        <label style={lbl}>Type Colour</label>
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            {[T.accent, T.accent2, T.accent3, T.accent4, '#a78bfa', '#34d399'].map(c => (
                                                <div key={c} style={{ width: 26, height: 26, borderRadius: '50%', background: c, cursor: 'pointer', border: `2px solid ${c === (TYPE_COLOR[form.type] || T.accent) ? '#fff' : 'transparent'}` }} />
                                            ))}
                                        </div>
                                    </div>
                                    <div style={{ marginBottom: 15 }}>
                                        <label style={lbl}>Pulse Animation</label>
                                        <div style={{ display: 'flex', gap: 14 }}>
                                            {['on', 'off'].map(v => (
                                                <label key={v} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                                                    <input type="radio" name="hs-pulse" defaultChecked={v === 'on'} style={{ accentColor: T.accent }} /> {v.charAt(0).toUpperCase() + v.slice(1)}
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                    <div style={{ marginBottom: 15 }}>
                                        <label style={lbl}>Opacity</label>
                                        <input type="range" min={10} max={100} defaultValue={100} style={{ width: '100%', accentColor: T.accent }} />
                                    </div>
                                </div>
                            )}

                            {activeTab === 'behavior' && (
                                <div>
                                    <div style={{ marginBottom: 15 }}>
                                        <label style={lbl}>Visibility</label>
                                        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                                            {['Always visible', 'On hover only', 'Hidden'].map(v => (
                                                <label key={v} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                                                    <input type="radio" name="hs-vis" defaultChecked={v === 'Always visible'} style={{ accentColor: T.accent }} /> {v}
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                    <div style={{ marginBottom: 15 }}>
                                        <label style={lbl}>Trigger</label>
                                        <select style={{ ...inp, cursor: 'pointer', appearance: 'none' }}>
                                            <option>Click</option><option>Hover (dwell)</option><option>Auto-open on scene load</option>
                                        </select>
                                    </div>
                                    <div style={{ marginBottom: 15 }}>
                                        <label style={lbl}>Show on Auto Tour</label>
                                        <div style={{ display: 'flex', gap: 14 }}>
                                            {['Yes', 'No'].map(v => (
                                                <label key={v} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                                                    <input type="radio" name="hs-autotour" defaultChecked={v === 'Yes'} style={{ accentColor: T.accent }} /> {v}
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div style={{ padding: '14px 22px 18px', borderTop: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <button onClick={doDelete} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: T.accent3, cursor: 'pointer', padding: '7px 13px', borderRadius: 8, border: `1px solid rgba(255,95,109,0.2)`, background: 'transparent', fontFamily: 'Times New Roman,serif' }}>
                                🗑 Delete Hotspot
                            </button>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button onClick={() => setSelected(null)} style={{ padding: '8px 18px', borderRadius: 9, fontSize: 13, cursor: 'pointer', border: `1px solid rgba(255,255,255,0.1)`, color: T.muted, background: 'transparent', fontFamily: 'Times New Roman,serif' }}>
                                    Cancel
                                </button>
                                <button onClick={save} disabled={saving} style={{ padding: '8px 20px', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: 'pointer', background: 'linear-gradient(135deg,#4f8cff,#00bfff)', color: '#fff', boxShadow: '0 4px 14px rgba(79,140,255,0.28)', border: 'none', fontFamily: 'Times New Roman,serif', opacity: saving ? 0.7 : 1 }}>
                                    {saving ? 'Saving…' : 'Save Changes'}
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

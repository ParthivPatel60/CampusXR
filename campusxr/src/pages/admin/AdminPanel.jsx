import React, { useState, useEffect, useCallback } from 'react';
import {
  getDepartments,
  addDepartment,
  deleteDepartment,
  getRooms,
  addRoom,
  getHotspots,
} from '../../services/firestoreService';
import { uploadImageToCloudinary } from '../../cloudinary';

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

  // Derived totals for overview
  const totalRooms = Object.values(roomsByDept).reduce((sum, r) => sum + r.length, 0);

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
    } catch (err) {
      setRoomUploadError('Upload failed. Please try again.');
    } finally {
      setRoomUploading(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 font-sans text-navy">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-xl flex flex-col">
        <div className="p-6 border-b border-gray-100">
          <h1 className="text-2xl font-bold text-blue-900">CampusXR Admin</h1>
          <p className="text-sm text-gray-500 mt-1">Platform Management</p>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <button 
            className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-colors ${activeTab === 'overview' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview Dashboard
          </button>
          <button 
            className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-colors ${activeTab === 'departments' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}
            onClick={() => setActiveTab('departments')}
          >
            Departments
          </button>
          <button 
            className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-colors ${activeTab === 'rooms' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}
            onClick={() => setActiveTab('rooms')}
          >
            Rooms & Hotspots
          </button>
        </nav>
        <div className="p-4 border-t border-gray-100">
          <button className="w-full text-left px-4 py-2 font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors">
            Log Out
          </button>
          <a href="/" className="block mt-4 text-center text-sm font-semibold text-blue-600 hover:underline">
            Back to User Tour
          </a>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-10 overflow-y-auto">
        {activeTab === 'overview' && (
          <div className="space-y-8 animate-fade-in">
            <header className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900">Welcome back, Admin</h2>
              <p className="text-gray-500 mt-2">Here's what's happening with your virtual tour today.</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Stat Cards */}
              <div className="glass !bg-white/80 p-6 flex flex-col border border-gray-200">
                <span className="text-gray-500 font-medium text-sm">Total Departments</span>
                <span className="text-4xl font-bold text-blue-900 mt-2">{departments.length}</span>
              </div>
              <div className="glass !bg-white/80 p-6 flex flex-col border border-gray-200">
                <span className="text-gray-500 font-medium text-sm">Total Rooms</span>
                <span className="text-4xl font-bold text-blue-900 mt-2">{totalRooms}</span>
              </div>
              <div className="glass !bg-white/80 p-6 flex flex-col border border-gray-200">
                <span className="text-gray-500 font-medium text-sm">Recent Updates (7 Days)</span>
                <span className="text-4xl font-bold text-emerald-600 mt-2">+5</span>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mt-8">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Recent Updates</h3>
              <ul className="space-y-4">
                <li className="flex items-start gap-4 pb-4 border-b border-gray-50">
                  <div className="w-2 h-2 rounded-full bg-blue-500 mt-2"></div>
                  <div>
                    <p className="font-semibold text-gray-800">Added 'Graphics Lab' Room</p>
                    <p className="text-sm text-gray-500">Computer Science Department • 2 hours ago</p>
                  </div>
                </li>
                <li className="flex items-start gap-4 pb-4 border-b border-gray-50">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 mt-2"></div>
                  <div>
                    <p className="font-semibold text-gray-800">Updated Info Hotspot in 'AI Lab'</p>
                    <p className="text-sm text-gray-500">Computer Science Department • 1 day ago</p>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <div className="w-2 h-2 rounded-full bg-amber-500 mt-2"></div>
                  <div>
                    <p className="font-semibold text-gray-800">Uploaded 3DGS file for 'Main Quad'</p>
                    <p className="text-sm text-gray-500">Campus Facilities • 3 days ago</p>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        )}

        {activeTab === 'departments' && (
          <div className="animate-fade-in">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900">Departments</h2>
              <button
                className="bg-blue-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition"
                onClick={() => setShowAddDept(v => !v)}
              >
                + Add Department
              </button>
            </div>

            {showAddDept && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6 flex gap-4 items-end">
                <div className="flex flex-col flex-1">
                  <label className="text-sm font-semibold text-gray-600 mb-1">Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Computer Science"
                    value={newDeptName}
                    onChange={e => setNewDeptName(e.target.value)}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
                  />
                </div>
                <div className="flex flex-col flex-1">
                  <label className="text-sm font-semibold text-gray-600 mb-1">Description</label>
                  <input
                    type="text"
                    placeholder="Short description"
                    value={newDeptDesc}
                    onChange={e => setNewDeptDesc(e.target.value)}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
                  />
                </div>
                <button
                  onClick={handleAddDept}
                  className="bg-blue-600 text-white px-5 py-2 rounded-lg font-medium hover:bg-blue-700 transition"
                >
                  Save
                </button>
                <button
                  onClick={() => setShowAddDept(false)}
                  className="px-4 py-2 rounded-lg font-medium text-gray-500 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
              </div>
            )}
            
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="p-4 font-semibold text-gray-600">Name</th>
                    <th className="p-4 font-semibold text-gray-600">Description</th>
                    <th className="p-4 font-semibold text-gray-600">Rooms</th>
                    <th className="p-4 font-semibold text-gray-600 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {departments.map(dept => (
                    <tr key={dept.id}>
                      <td className="p-4 font-medium text-gray-900">{dept.name}</td>
                      <td className="p-4 text-gray-600 text-sm">{dept.description}</td>
                      <td className="p-4 text-gray-600">{(roomsByDept[dept.id] || []).length}</td>
                      <td className="p-4 text-right space-x-3">
                        <button className="text-blue-600 hover:text-blue-800 font-medium">Edit</button>
                        <button
                          className="text-red-500 hover:text-red-700 font-medium"
                          onClick={() => handleDeleteDept(dept.id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'rooms' && (
          <div className="animate-fade-in">
             <div className="flex justify-between items-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900">Rooms & Hotspots</h2>
              <div className="flex items-center gap-4">
                <select
                  value={selectedRoomsDeptId || ''}
                  onChange={e => setSelectedRoomsDeptId(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-blue-400"
                >
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
                <button
                  className="bg-blue-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition"
                  onClick={() => { setShowAddRoom(v => !v); setRoomUploadError(''); }}
                >
                  + Add Room
                </button>
              </div>
            </div>

            {showAddRoom && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6 flex gap-4 items-end flex-wrap">
                <div className="flex flex-col flex-1 min-w-[160px]">
                  <label className="text-sm font-semibold text-gray-600 mb-1">Room Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Graphics Lab"
                    value={newRoomName}
                    onChange={e => setNewRoomName(e.target.value)}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
                  />
                </div>
                <div className="flex flex-col flex-1 min-w-[200px]">
                  <label className="text-sm font-semibold text-gray-600 mb-1">360° Image</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={e => setNewRoomFile(e.target.files[0] || null)}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
                  />
                </div>
                {roomUploadError && (
                  <p className="w-full text-red-500 text-sm">{roomUploadError}</p>
                )}
                <button
                  onClick={handleAddRoom}
                  disabled={roomUploading}
                  className="bg-blue-600 text-white px-5 py-2 rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {roomUploading ? 'Uploading…' : 'Save'}
                </button>
                <button
                  onClick={() => setShowAddRoom(false)}
                  className="px-4 py-2 rounded-lg font-medium text-gray-500 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {(roomsByDept[selectedRoomsDeptId] || []).map(room => (
                <div key={room.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col">
                  <div className="aspect-video bg-gray-200 rounded-lg mb-4 flex items-center justify-center relative overflow-hidden group">
                    {room.imageURL
                      ? <img src={room.imageURL} alt={room.name} className="object-cover w-full h-full" />
                      : <span className="text-gray-400 text-sm">No image uploaded</span>
                    }
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white font-semibold">
                      Open Hotspot Editor (Pannellum)
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">{room.name}</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    {departments.find(d => d.id === selectedRoomsDeptId)?.name || ''}
                  </p>
                  <div className="mt-auto pt-4 border-t border-gray-100 flex gap-4">
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded font-medium">
                      {(hotspotsByRoom[room.id] || []).filter(h => h.type === 'info').length} Info Hotspots
                    </span>
                    <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded font-medium">
                      {(hotspotsByRoom[room.id] || []).filter(h => h.type === 'navigation').length} Nav Hotspots
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

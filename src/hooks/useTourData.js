import { useState, useEffect } from 'react';
import { getDepartments, getRooms, getHotspots } from '../services/firestoreService';

export function useTourData() {
  const [departments, setDepartments] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [hotspots, setHotspots] = useState([]);
  const [activeDeptId, setActiveDeptId] = useState(null);
  const [activeRoom, setActiveRoom] = useState(null);

  useEffect(() => {
    getDepartments().then(setDepartments);
  }, []);

  useEffect(() => {
    if (activeDeptId === null) {
      if (departments.length === 0) return;
      Promise.all(
        departments.map(d =>
          getRooms(d.id).then(rs => rs.map(r => ({ ...r, deptId: d.id, deptName: d.name })))
        )
      ).then(allRooms => {
        const flat = allRooms.flat();
        setRooms(flat);
        setActiveRoom(flat.length > 0 ? flat[0] : null);
      });
      return;
    }
    getRooms(activeDeptId).then(r => {
      setRooms(r);
      setActiveRoom(r.length > 0 ? r[0] : null);
    });
  }, [activeDeptId, departments]);

  useEffect(() => {
    const deptId = activeDeptId ?? activeRoom?.deptId;
    if (!activeRoom?.id || !deptId) { setHotspots([]); return; }
    getHotspots(deptId, activeRoom.id).then(setHotspots);
  }, [activeRoom, activeDeptId]);

  return { departments, rooms, hotspots, activeDeptId, setActiveDeptId, activeRoom, setActiveRoom };
}

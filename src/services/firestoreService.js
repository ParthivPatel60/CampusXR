import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  addDoc,
  deleteDoc,
  updateDoc,
  setDoc,
  getDoc,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../config/firebase';

export const getDepartments = async () => {
  const snap = await getDocs(collection(db, 'departments'));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const addDepartment = async (dept) => {
  const ref = await addDoc(collection(db, 'departments'), dept);
  return ref.id;
};

export const updateDepartment = async (deptId, data) => {
  await updateDoc(doc(db, 'departments', deptId), data);
};

export const deleteDepartment = async (deptId) => {
  const roomsSnap = await getDocs(collection(db, 'departments', deptId, 'rooms'));
  await Promise.all(
    roomsSnap.docs.map(async (r) => {
      const hotspotsSnap = await getDocs(collection(db, 'departments', deptId, 'rooms', r.id, 'hotspots'));
      await Promise.all(
        hotspotsSnap.docs.map((h) =>
          deleteDoc(doc(db, 'departments', deptId, 'rooms', r.id, 'hotspots', h.id))
        )
      );
      await deleteDoc(doc(db, 'departments', deptId, 'rooms', r.id));
    })
  );
  await deleteDoc(doc(db, 'departments', deptId));
};

export const getRooms = async (deptId) => {
  const snap = await getDocs(collection(db, 'departments', deptId, 'rooms'));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const addRoom = async (deptId, roomData) => {
  const ref = await addDoc(collection(db, 'departments', deptId, 'rooms'), roomData);
  return ref.id;
};

export const updateRoom = async (deptId, roomId, roomData) => {
  await updateDoc(doc(db, 'departments', deptId, 'rooms', roomId), roomData);
};

export const deleteRoom = async (deptId, roomId) => {
  const hotspotsSnap = await getDocs(collection(db, 'departments', deptId, 'rooms', roomId, 'hotspots'));
  await Promise.all(
    hotspotsSnap.docs.map((h) =>
      deleteDoc(doc(db, 'departments', deptId, 'rooms', roomId, 'hotspots', h.id))
    )
  );
  await deleteDoc(doc(db, 'departments', deptId, 'rooms', roomId));
};

export const getHotspots = async (deptId, roomId) => {
  const snap = await getDocs(collection(db, 'departments', deptId, 'rooms', roomId, 'hotspots'));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const addHotspot = async (deptId, roomId, hotspotData) => {
  const ref = await addDoc(collection(db, 'departments', deptId, 'rooms', roomId, 'hotspots'), {
    ...hotspotData,
    createdAt: serverTimestamp(),
  });
  return ref.id;
};

export const updateHotspot = async (deptId, roomId, hotspotId, hotspotData) => {
  await updateDoc(doc(db, 'departments', deptId, 'rooms', roomId, 'hotspots', hotspotId), hotspotData);
};

export const deleteHotspot = async (deptId, roomId, hotspotId) => {
  await deleteDoc(doc(db, 'departments', deptId, 'rooms', roomId, 'hotspots', hotspotId));
};

export const checkAdminEmailAllowed = async (email) => {
  if (!email) return false;
  const id = email.trim().toLowerCase();
  const snap = await getDoc(doc(db, 'adminEmails', id));
  return snap.exists() && snap.data()?.allowed === true;
};

export const recordAdminLoginAudit = async ({ email, uid }) => {
  await addDoc(collection(db, 'auditLogs'), {
    event: 'admin_login',
    email: (email || '').toLowerCase(),
    uid: uid || '',
    at: serverTimestamp(),
  });
};

// ---------------------------------------------------------------------------
// Tour Sequence — single doc: tours/campus_tour
// Item schema: { order, deptId, deptName, roomId, roomName, imageURL }
// ---------------------------------------------------------------------------

export const getTourSequence = async () => {
  const snap = await getDoc(doc(db, "tours", "campus_tour"));
  if (!snap.exists()) return [];
  const items = snap.data().items || [];
  return [...items].sort((a, b) => a.order - b.order);
};

export const saveTourSequence = async (items) => {
  await setDoc(doc(db, "tours", "campus_tour"), { items });
};

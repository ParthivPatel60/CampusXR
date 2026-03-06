import {
  collection,
  doc,
  getDocs,
  addDoc,
  deleteDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";

// ---------------------------------------------------------------------------
// Departments — top-level collection: departments/{deptId}
// ---------------------------------------------------------------------------

export const getDepartments = async () => {
  const snap = await getDocs(collection(db, "departments"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const addDepartment = async (dept) => {
  const ref = await addDoc(collection(db, "departments"), dept);
  return ref.id;
};

export const deleteDepartment = async (deptId) => {
  const roomsSnap = await getDocs(
    collection(db, "departments", deptId, "rooms")
  );
  await Promise.all(
    roomsSnap.docs.map(async (r) => {
      const hotspotsSnap = await getDocs(
        collection(db, "departments", deptId, "rooms", r.id, "hotspots")
      );
      await Promise.all(
        hotspotsSnap.docs.map((h) =>
          deleteDoc(doc(db, "departments", deptId, "rooms", r.id, "hotspots", h.id))
        )
      );
      await deleteDoc(doc(db, "departments", deptId, "rooms", r.id));
    })
  );
  await deleteDoc(doc(db, "departments", deptId));
};

// ---------------------------------------------------------------------------
// Rooms — subcollection: departments/{deptId}/rooms/{roomId}
// ---------------------------------------------------------------------------

export const getRooms = async (deptId) => {
  const snap = await getDocs(
    collection(db, "departments", deptId, "rooms")
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const addRoom = async (deptId, roomData) => {
  const ref = await addDoc(
    collection(db, "departments", deptId, "rooms"),
    roomData
  );
  return ref.id;
};

export const deleteRoom = async (deptId, roomId) => {
  const hotspotsSnap = await getDocs(
    collection(db, "departments", deptId, "rooms", roomId, "hotspots")
  );
  await Promise.all(
    hotspotsSnap.docs.map((h) =>
      deleteDoc(doc(db, "departments", deptId, "rooms", roomId, "hotspots", h.id))
    )
  );
  await deleteDoc(doc(db, "departments", deptId, "rooms", roomId));
};

// ---------------------------------------------------------------------------
// Hotspots — subcollection: departments/{deptId}/rooms/{roomId}/hotspots/{hotspotId}
// ---------------------------------------------------------------------------

export const getHotspots = async (deptId, roomId) => {
  const snap = await getDocs(
    collection(db, "departments", deptId, "rooms", roomId, "hotspots")
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const addHotspot = async (deptId, roomId, hotspotData) => {
  const ref = await addDoc(
    collection(db, "departments", deptId, "rooms", roomId, "hotspots"),
    { ...hotspotData, createdAt: serverTimestamp() }
  );
  return ref.id;
};

export const updateHotspot = async (deptId, roomId, hotspotId, hotspotData) => {
  await updateDoc(
    doc(db, "departments", deptId, "rooms", roomId, "hotspots", hotspotId),
    hotspotData
  );
};

export const deleteHotspot = async (deptId, roomId, hotspotId) => {
  await deleteDoc(
    doc(db, "departments", deptId, "rooms", roomId, "hotspots", hotspotId)
  );
};

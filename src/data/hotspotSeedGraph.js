/**
 * Campus hotspot seed graph.
 *
 * Each entry maps a department name + room name to a list of hotspots to seed.
 * Extend this array to cover all campus rooms.
 *
 * dept  — must match the department's `name` field in Firestore exactly.
 * room  — must match the room's `name` field in Firestore exactly.
 * hotspots — list of hotspot objects to create (duplicates by label are skipped).
 */
export const HOTSPOT_GRAPH = [
  {
    dept: 'Admin Building',
    room: 'admin-1',
    hotspots: [
      {
        type: 'info',
        label: 'Admin Block – Ground Floor',
        description:
          'The main administrative hub of the campus. Houses the principal office, accounts, and student services. Open weekdays 9 AM – 5 PM.',
      },
      {
        type: 'navigation',
        label: 'Go to Canteen',
        description: 'Walk straight ahead to reach the campus canteen.',
        targetDept: 'Canteen & Common Areas',
        targetRoom: 'Canteen',
      },
    ],
  },
  {
    dept: 'Canteen & Common Areas',
    room: 'Canteen',
    hotspots: [
      {
        type: 'info',
        label: 'Campus Canteen',
        description:
          'The central dining area serving breakfast, lunch and snacks. Seats ~200 students. Open 8 AM – 6 PM on all working days.',
      },
      {
        type: 'navigation',
        label: 'Exit to Admin Building',
        description: 'Head towards Admin Block.',
        targetDept: 'Admin Building',
        targetRoom: 'admin-1',
      },
      {
        type: 'navigation',
        label: 'Exit to Architecture Block',
        description: 'Follow the path to the Architecture department.',
        targetDept: 'Architecture Department',
        targetRoom: 'architecture',
      },
    ],
  },
  // Add more campus rooms here to extend the full campus tour.
];

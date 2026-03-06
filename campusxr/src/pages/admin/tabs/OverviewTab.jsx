import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Loader2, Database, Building2, DoorOpen, Hash } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { getDepartments, getRooms, getHotspots, addHotspot } from '@/services/firestoreService';

// ── Campus hotspot seed graph ─────────────────────────────────────────────────
const HOTSPOT_GRAPH = [
  { dept: 'Admin Building', room: 'admin-1', hotspots: [
    { type: 'info', label: 'Admin Block – Ground Floor', description: 'The main administrative hub of the campus. Houses the principal office, accounts, and student services. Open weekdays 9 AM – 5 PM.' },
    { type: 'navigation', label: 'Go to Canteen', description: 'Walk straight ahead to reach the campus canteen.', targetDept: 'Canteen & Common Areas', targetRoom: 'Canteen' },
  ]},
  { dept: 'Canteen & Common Areas', room: 'Canteen', hotspots: [
    { type: 'info', label: 'Campus Canteen', description: 'The central dining area serving breakfast, lunch and snacks. Seats ~200 students. Open 8 AM – 6 PM on all working days.' },
    { type: 'navigation', label: 'Exit to Admin Building', description: 'Head towards Admin Block.', targetDept: 'Admin Building', targetRoom: 'admin-1' },
    { type: 'navigation', label: 'Exit to Architecture Block', description: 'Follow the path to the Architecture department.', targetDept: 'Architecture Department', targetRoom: 'architecture' },
  ]},
];

export default function OverviewTab({ departments, roomsByDept }) {
  const [hotspotCounts, setHotspotCounts] = useState({});
  const [totalHotspots, setTotalHotspots] = useState(0);
  const [loadingHotspots, setLoadingHotspots] = useState(false);
  const [seedState, setSeedState]   = useState('idle');
  const [seedLog, setSeedLog]       = useState([]);
  const [seedSummary, setSeedSummary] = useState('');

  const totalRooms = Object.values(roomsByDept).reduce((s, r) => s + r.length, 0);

  useEffect(() => {
    if (departments.length === 0) return;
    let cancelled = false;
    (async () => {
      setLoadingHotspots(true);
      let total = 0;
      const counts = {};
      for (const dept of departments) {
        const rooms = roomsByDept[dept.id] || [];
        let deptCount = 0;
        for (const room of rooms) {
          const hs = await getHotspots(dept.id, room.id);
          deptCount += hs.length;
        }
        counts[dept.id] = deptCount;
        total += deptCount;
      }
      if (!cancelled) {
        setHotspotCounts(counts);
        setTotalHotspots(total);
        setLoadingHotspots(false);
      }
    })();
    return () => { cancelled = true; };
  }, [departments, roomsByDept]);

  const runSeedHotspots = async () => {
    setSeedState('running');
    setSeedLog([]);
    setSeedSummary('');
    const appendLog = msg => setSeedLog(prev => [...prev, msg]);

    appendLog('🔍 Fetching departments…');
    let allDepts;
    try { allDepts = await getDepartments(); }
    catch (e) {
      appendLog(`❌ Failed: ${e.message}`);
      setSeedState('done'); setSeedSummary('Aborted — could not fetch departments.');
      return;
    }
    const deptMap = Object.fromEntries(allDepts.map(d => [d.name, d.id]));

    appendLog('🔍 Fetching all rooms…');
    const roomMap = {};
    for (const d of allDepts) {
      try {
        const rooms = await getRooms(d.id);
        rooms.forEach(r => { roomMap[`${d.id}:${r.name}`] = r.id; });
      } catch (e) { appendLog(`⚠️  Rooms for "${d.name}": ${e.message}`); }
    }

    let added = 0, skipped = 0, errors = 0;
    for (const entry of HOTSPOT_GRAPH) {
      const deptId = deptMap[entry.dept];
      if (!deptId) { appendLog(`⚠️  Dept not found: "${entry.dept}"`); errors++; continue; }
      const roomId = roomMap[`${deptId}:${entry.room}`];
      if (!roomId) { appendLog(`⚠️  Room not found: "${entry.room}" in "${entry.dept}"`); errors++; continue; }

      let existing = [];
      try { existing = await getHotspots(deptId, roomId); } catch (_) {}
      const existingLabels = new Set(existing.map(h => h.label));

      for (const hs of entry.hotspots) {
        if (existingLabels.has(hs.label)) { appendLog(`⏭  Exists: "${hs.label}"`); skipped++; continue; }
        const hsData = {
          type: hs.type, label: hs.label,
          description: hs.description || '',
          pitch: hs.type === 'info' ? 10 : -5,
          yaw: (added * 25) % 360,
        };
        if (hs.type === 'navigation') {
          const tDeptId = deptMap[hs.targetDept];
          const tRoomId = tDeptId ? roomMap[`${tDeptId}:${hs.targetRoom}`] : null;
          if (!tDeptId || !tRoomId) { appendLog(`⚠️  Target not found: "${hs.targetDept}" / "${hs.targetRoom}"`); errors++; continue; }
          hsData.targetDeptId = tDeptId;
          hsData.targetRoomId = tRoomId;
        }
        try { await addHotspot(deptId, roomId, hsData); appendLog(`✅ [${hs.type}] "${hs.label}"`); added++; }
        catch (e) { appendLog(`❌ "${hs.label}": ${e.message}`); errors++; }
      }
    }

    setSeedSummary(`Done — ${added} added, ${skipped} skipped, ${errors} errors.`);
    setSeedState('done');
    if (added > 0) toast.success(`Seeded ${added} hotspots successfully`);
    else if (skipped > 0) toast.info('All hotspots already exist — nothing to seed');
  };

  return (
    <div className="space-y-8">

      {/* Page heading */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Platform summary and quick statistics across all departments.
        </p>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <Card className="relative overflow-hidden">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide">
              <Building2 size={13} className="text-primary" /> Departments
            </CardDescription>
            <CardTitle className="text-5xl font-bold tabular-nums pt-1">{departments.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Total departments on campus</p>
          </CardContent>
          <div className="absolute right-4 top-4 opacity-5">
            <Building2 size={64} />
          </div>
        </Card>

        <Card className="relative overflow-hidden">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide">
              <DoorOpen size={13} className="text-primary" /> Rooms
            </CardDescription>
            <CardTitle className="text-5xl font-bold tabular-nums pt-1">{totalRooms}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">360° panorama rooms total</p>
          </CardContent>
          <div className="absolute right-4 top-4 opacity-5">
            <DoorOpen size={64} />
          </div>
        </Card>

        <Card className="relative overflow-hidden">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide">
              <Hash size={13} className="text-primary" /> Hotspots
            </CardDescription>
            <CardTitle className="text-5xl font-bold tabular-nums pt-1">
              {loadingHotspots
                ? <Loader2 size={28} className="animate-spin text-muted-foreground mt-1" />
                : totalHotspots}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Interactive points across all rooms</p>
          </CardContent>
          <div className="absolute right-4 top-4 opacity-5">
            <Database size={64} />
          </div>
        </Card>
      </div>

      {/* ── Department breakdown table ── */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">Department Breakdown</CardTitle>
              <CardDescription className="text-sm mt-0.5">
                Rooms and hotspot distribution across all departments
              </CardDescription>
            </div>
            <Badge variant="secondary" className="text-xs">
              {departments.length} dept{departments.length !== 1 ? 's' : ''}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="pl-6 font-semibold">Department</TableHead>
                <TableHead className="font-semibold">Description</TableHead>
                <TableHead className="text-right w-24 font-semibold">Rooms</TableHead>
                <TableHead className="text-right w-28 pr-6 font-semibold">Hotspots</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {departments.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="py-16 text-center text-muted-foreground">
                    No departments yet.
                  </TableCell>
                </TableRow>
              )}
              {departments.map(d => (
                <TableRow key={d.id} className="group">
                  <TableCell className="pl-6 font-medium">{d.name}</TableCell>
                  <TableCell className="text-muted-foreground text-sm max-w-xs truncate">
                    {d.description || <span className="text-muted-foreground/50 italic">No description</span>}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-medium">
                    {(roomsByDept[d.id] || []).length}
                  </TableCell>
                  <TableCell className="text-right tabular-nums pr-6 font-medium">
                    {loadingHotspots
                      ? <span className="text-muted-foreground">…</span>
                      : (hotspotCounts[d.id] ?? 0)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ── Seed card ── */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="text-base font-semibold">Seed Campus Hotspots</CardTitle>
              <CardDescription className="text-sm mt-1 max-w-xl">
                Pre-populate all rooms with info &amp; navigation hotspots for the full campus tour.
                Duplicate hotspot labels are skipped. Pitch/yaw are placeholder values — reposition in the Hotspot Editor after seeding.
              </CardDescription>
            </div>
            {seedState === 'idle' && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="shrink-0">
                    <Database size={14} className="mr-2" />
                    Seed All Hotspots
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Seed campus hotspots?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will write hotspot documents to Firestore for every room in the campus graph.
                      Rooms already containing matching hotspot labels will be skipped (idempotent).
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={runSeedHotspots}>Yes, seed now</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </CardHeader>

        {(seedState === 'running' || seedState === 'done') && (
          <CardContent className="space-y-4">
            {seedState === 'running' && (
              <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                <Loader2 size={14} className="animate-spin" />
                <span>Seeding in progress…</span>
              </div>
            )}

            {seedLog.length > 0 && (
              <ScrollArea className="h-48 rounded-lg border bg-muted/30 p-4 text-xs font-mono">
                <div className="space-y-1">
                  {seedLog.map((line, i) => (
                    <p
                      key={i}
                      className={
                        line.startsWith('✅') ? 'text-emerald-600 dark:text-emerald-400' :
                        line.startsWith('❌') ? 'text-destructive' :
                        line.startsWith('⚠️') ? 'text-amber-500' :
                        line.startsWith('⏭') ? 'text-muted-foreground/70' :
                        'text-foreground'
                      }
                    >
                      {line}
                    </p>
                  ))}
                </div>
              </ScrollArea>
            )}

            {seedState === 'done' && (
              <div className="flex items-center justify-between pt-1">
                <p className="text-sm font-medium text-foreground">{seedSummary}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setSeedState('idle'); setSeedLog([]); setSeedSummary(''); }}
                >
                  Reset
                </Button>
              </div>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
}

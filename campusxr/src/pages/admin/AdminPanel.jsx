import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '@/firebase';
import { getDepartments, getRooms } from '@/services/firestoreService';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { LayoutDashboard, Building2, DoorOpen, LogOut, ArrowLeft, ChevronRight } from 'lucide-react';
import OverviewTab from './tabs/OverviewTab';
import DepartmentsTab from './tabs/DepartmentsTab';
import RoomsTab from './tabs/RoomsTab';
import HotspotEditor from '@/components/admin/HotspotEditor';

const NAV = [
  { id: 'overview',     label: 'Overview',          Icon: LayoutDashboard },
  { id: 'departments',  label: 'Departments',        Icon: Building2 },
  { id: 'rooms',        label: 'Rooms & Hotspots',   Icon: DoorOpen },
];

export default function AdminPanel() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab]                 = useState('overview');
  const [departments, setDepartments]             = useState([]);
  const [roomsByDept, setRoomsByDept]             = useState({});
  const [hotspotEditorRoom, setHotspotEditorRoom] = useState(null);

  const refreshAll = useCallback(async () => {
    try {
      const depts = await getDepartments();
      setDepartments(depts);
      const entries = await Promise.all(depts.map(async d => [d.id, await getRooms(d.id)]));
      setRoomsByDept(Object.fromEntries(entries));
    } catch (e) {
      toast.error(`Failed to load data: ${e.message}`);
    }
  }, []);

  useEffect(() => { refreshAll(); }, [refreshAll]);

  const activeNav = NAV.find(n => n.id === activeTab);

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">

      {/* ── Sidebar ── */}
      <aside className="w-60 shrink-0 border-r border-border flex flex-col bg-card">
        {/* Brand */}
        <div className="h-16 flex items-center px-5 border-b border-border shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center shrink-0">
              <LayoutDashboard size={14} className="text-primary-foreground" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground leading-tight">CampusXR</p>
              <p className="text-[10px] text-muted-foreground tracking-wide uppercase">Admin Console</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
          <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
            Navigation
          </p>
          {NAV.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                activeTab === id
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <Icon size={15} className="shrink-0" />
              <span className="flex-1 text-left">{label}</span>
              {activeTab === id && <ChevronRight size={12} className="opacity-60" />}
            </button>
          ))}
        </nav>

        {/* Footer actions */}
        <div className="border-t border-border py-3 px-3 space-y-0.5 shrink-0">
          <a
            href="/"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-all duration-150"
          >
            <ArrowLeft size={15} className="shrink-0" />
            Back to Tour
          </a>
          <button
            onClick={() => signOut(auth).then(() => navigate('/admin/login'))}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-all duration-150"
          >
            <LogOut size={15} className="shrink-0" />
            Log Out
          </button>
        </div>
      </aside>

      {/* ── Main area ── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Top header */}
        <header className="h-16 border-b border-border px-8 flex items-center justify-between shrink-0 bg-background/80 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Admin</span>
            <ChevronRight size={13} className="text-muted-foreground/50" />
            <span className="font-semibold text-foreground">{activeNav?.label}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs text-muted-foreground">Live</span>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto bg-muted/20">
          <div className="p-8">
            {activeTab === 'overview' && (
              <OverviewTab departments={departments} roomsByDept={roomsByDept} />
            )}
            {activeTab === 'departments' && (
              <DepartmentsTab
                departments={departments}
                roomsByDept={roomsByDept}
                onRefresh={refreshAll}
              />
            )}
            {activeTab === 'rooms' && (
              <RoomsTab
                departments={departments}
                onOpenHotspotEditor={(room, deptId) => setHotspotEditorRoom({ room, deptId })}
                onRoomsChanged={refreshAll}
              />
            )}
          </div>
        </main>
      </div>

      {hotspotEditorRoom && (
        <HotspotEditor
          room={hotspotEditorRoom.room}
          deptId={hotspotEditorRoom.deptId}
          departments={departments}
          onClose={() => setHotspotEditorRoom(null)}
        />
      )}

      <Toaster richColors position="bottom-right" />
    </div>
  );
}

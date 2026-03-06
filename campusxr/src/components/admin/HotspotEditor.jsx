import { useState, useEffect, useRef, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Plus, Pencil, Trash2, Loader2, MapPin, X, Navigation, Info, Target, ArrowLeft } from 'lucide-react';
import { getHotspots, addHotspot, updateHotspot, deleteHotspot, getRooms } from '@/services/firestoreService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Dialog, DialogContent,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

// ── Zod schema ────────────────────────────────────────────────────────────────
const hotspotSchema = z.object({
  label:        z.string().min(2, 'Label must be at least 2 characters').max(100, 'Too long'),
  type:         z.enum(['info', 'navigation']),
  description:  z.string().max(1000, 'Too long'),
  targetDeptId: z.string().optional(),
  targetRoomId: z.string().optional(),
}).refine(
  d => d.type !== 'navigation' || (d.targetDeptId && d.targetRoomId),
  { message: 'Navigation hotspot requires a target room', path: ['targetRoomId'] }
);

function pitchYawToXYZ(pitch, yaw, r = 490) {
  const p = (pitch * Math.PI) / 180;
  const y = (yaw   * Math.PI) / 180;
  return new THREE.Vector3(
    r * Math.cos(p) * Math.sin(y),
    r * Math.sin(p),
    r * Math.cos(p) * Math.cos(y),
  );
}

export default function HotspotEditor({ room, deptId, departments, onClose }) {
  const mountRef    = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef    = useRef(null);
  const cameraRef   = useRef(null);
  const controlsRef = useRef(null);
  const markersRef  = useRef([]);
  const rafRef      = useRef(null);

  const [hotspots, setHotspots]               = useState([]);
  const [loading, setLoading]                 = useState(true);
  const [placing, setPlacing]                 = useState(false);
  const [pendingPitch, setPendingPitch]       = useState(null);
  const [pendingYaw, setPendingYaw]           = useState(null);
  const [formOpen, setFormOpen]               = useState(false);
  const [editingHs, setEditingHs]             = useState(null);
  const [deletingHs, setDeletingHs]           = useState(null);
  const [deleting, setDeleting]               = useState(false);
  const [targetDeptRooms, setTargetDeptRooms] = useState([]);

  const {
    register, handleSubmit, control, watch, reset,
    setValue, formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(hotspotSchema),
    defaultValues: { label: '', type: 'info', description: '', targetDeptId: '', targetRoomId: '' },
  });

  const watchType       = watch('type');
  const watchTargetDept = watch('targetDeptId');

  useEffect(() => {
    if (!watchTargetDept) { setTargetDeptRooms([]); return; }
    getRooms(watchTargetDept).then(setTargetDeptRooms).catch(() => setTargetDeptRooms([]));
  }, [watchTargetDept]);

  const fetchHotspots = useCallback(async () => {
    setLoading(true);
    try {
      const hs = await getHotspots(deptId, room.id);
      setHotspots(hs);
    } catch (e) {
      toast.error('Failed to load hotspots: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, [deptId, room.id]);

  useEffect(() => { fetchHotspots(); }, [fetchHotspots]);

  // ── Three.js setup ────────────────────────────────────────────────────────
  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    const initW = el.clientWidth  || 800;
    const initH = el.clientHeight || 450;

    const scene    = new THREE.Scene();
    const camera   = new THREE.PerspectiveCamera(75, initW / initH, 1, 1100);
    camera.position.set(0, 0, 0.001);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(initW, initH);
    el.appendChild(renderer.domElement);

    const geo    = new THREE.SphereGeometry(500, 60, 40);
    const loader = new THREE.TextureLoader();
    loader.crossOrigin = 'anonymous';
    const texture = loader.load(
      room.imageURL || '',
      undefined, undefined,
      () => toast.error("Could not load panorama image."),
    );
    texture.colorSpace = THREE.SRGBColorSpace;
    const mat    = new THREE.MeshBasicMaterial({ map: texture, side: THREE.BackSide });
    const sphere = new THREE.Mesh(geo, mat);
    scene.add(sphere);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableZoom  = false;
    controls.enablePan   = false;
    controls.rotateSpeed = -0.3;
    controls.target.set(0, 0, 0);
    controls.update();

    sceneRef.current    = scene;
    cameraRef.current   = camera;
    rendererRef.current = renderer;
    controlsRef.current = controls;

    const animate = () => {
      rafRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // ResizeObserver correctly handles Dialog animation completion (no 0×0 bug)
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) {
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
      }
    });
    ro.observe(el);

    return () => {
      ro.disconnect();
      cancelAnimationFrame(rafRef.current);
      controls.dispose();
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, [room.imageURL]);

  // ── Sync markers ──────────────────────────────────────────────────────────
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    markersRef.current.forEach(m => scene.remove(m));
    markersRef.current = [];

    hotspots.forEach(hs => {
      const canvas  = document.createElement('canvas');
      canvas.width  = 64;
      canvas.height = 64;
      const ctx = canvas.getContext('2d');
      ctx.beginPath();
      ctx.arc(32, 32, 28, 0, Math.PI * 2);
      ctx.fillStyle = hs.type === 'navigation' ? '#22c55e' : '#3b82f6';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 5;
      ctx.stroke();

      const tex    = new THREE.CanvasTexture(canvas);
      const mat    = new THREE.SpriteMaterial({ map: tex, depthTest: false });
      const sprite = new THREE.Sprite(mat);
      sprite.scale.set(22, 22, 1);
      sprite.position.copy(pitchYawToXYZ(hs.pitch ?? 0, hs.yaw ?? 0));
      sprite.userData.hsId = hs.id;
      scene.add(sprite);
      markersRef.current.push(sprite);
    });
  }, [hotspots]);

  // ── Click to place ────────────────────────────────────────────────────────
  const handleCanvasClick = (e) => {
    if (!placing) return;
    const el   = mountRef.current;
    const rect = el.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width)  * 2 - 1;
    const my = -((e.clientY - rect.top)  / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera({ x: mx, y: my }, cameraRef.current);
    const hits = raycaster.intersectObjects(sceneRef.current.children, false);
    const hit  = hits.find(h => h.object.geometry instanceof THREE.SphereGeometry);
    if (!hit) return;

    const { x, y, z } = hit.point;
    const r     = Math.sqrt(x * x + y * y + z * z);
    const pitch = Math.round((Math.asin(y / r) * 180) / Math.PI);
    const yaw   = Math.round((Math.atan2(x, z) * 180) / Math.PI);
    setPendingPitch(pitch);
    setPendingYaw(yaw);
    setPlacing(false);
    toast.success(`Position set — pitch ${pitch}°, yaw ${yaw}°`);
  };

  // ── Form helpers ──────────────────────────────────────────────────────────
  const openAdd = () => {
    setEditingHs(null);
    setPendingPitch(null);
    setPendingYaw(null);
    reset({ label: '', type: 'info', description: '', targetDeptId: '', targetRoomId: '' });
    setFormOpen(true);
  };

  const openEdit = (hs) => {
    setEditingHs(hs);
    setPendingPitch(hs.pitch ?? 0);
    setPendingYaw(hs.yaw   ?? 0);
    reset({
      label:        hs.label,
      type:         hs.type,
      description:  hs.description ?? '',
      targetDeptId: hs.targetDeptId ?? '',
      targetRoomId: hs.targetRoomId ?? '',
    });
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingHs(null);
    setPlacing(false);
    setPendingPitch(null);
    setPendingYaw(null);
    reset({ label: '', type: 'info', description: '', targetDeptId: '', targetRoomId: '' });
  };

  const onSubmit = async (data) => {
    if (pendingPitch === null || pendingYaw === null) {
      toast.error('Please set a position on the panorama first.');
      return;
    }
    const payload = {
      label:       data.label.trim(),
      type:        data.type,
      description: data.description.trim(),
      pitch:       pendingPitch,
      yaw:         pendingYaw,
      ...(data.type === 'navigation' ? {
        targetDeptId: data.targetDeptId,
        targetRoomId: data.targetRoomId,
      } : {}),
    };
    try {
      if (editingHs) {
        await updateHotspot(deptId, room.id, editingHs.id, payload);
        toast.success('Hotspot updated');
      } else {
        await addHotspot(deptId, room.id, payload);
        toast.success('Hotspot added');
      }
      closeForm();
      fetchHotspots();
    } catch (e) {
      toast.error(e.message || 'Save failed');
    }
  };

  const handleDelete = async () => {
    if (!deletingHs) return;
    setDeleting(true);
    try {
      await deleteHotspot(deptId, room.id, deletingHs.id);
      toast.success('Hotspot deleted');
      setDeletingHs(null);
      fetchHotspots();
    } catch (e) {
      toast.error(e.message || 'Delete failed');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
      {/*
        CRITICAL LAYOUT NOTES:
        - w-[95vw] max-w-7xl → large dialog that fills most of viewport
        - h-[92vh] → tall enough for panorama to be meaningful
        - flex flex-col → header on top, body fills remaining height
        - overflow-hidden → clips Three.js canvas at dialog boundary
        - The panorama div (mountRef) uses flex-1 min-w-0 so it takes all
          available horizontal space after the 340px side panel.
        - The side panel NEVER unmounts — only its inner content switches
          between the list and the form. This keeps the panorama always visible.
      */}
      <DialogContent
        className="w-[95vw] max-w-7xl h-[92vh] flex flex-col p-0 gap-0 overflow-hidden"
        hideCloseButton
      >
        {/* ── Top header — always visible ── */}
        <div className="h-14 px-5 flex items-center justify-between border-b shrink-0 bg-card z-10">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <MapPin size={15} className="text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-tight">Hotspot Editor</p>
              <p className="text-xs text-muted-foreground truncate">{room.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-4">
            {placing && (
              <Badge className="text-xs bg-amber-100 text-amber-700 border border-amber-300 animate-pulse select-none">
                Click on panorama to place
              </Badge>
            )}
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
              <X size={15} />
            </Button>
          </div>
        </div>

        {/* ── Body: panorama + side panel side by side ── */}
        <div className="flex flex-1 min-h-0 overflow-hidden">

          {/* ── Panorama — always mounted, always fills left column ── */}
          <div
            ref={mountRef}
            onClick={handleCanvasClick}
            className={cn(
              'flex-1 min-w-0 bg-black relative overflow-hidden',
              placing && 'cursor-crosshair ring-2 ring-inset ring-amber-400'
            )}
          >
            {/* Place-mode overlay banner */}
            {placing && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
                <div className="bg-black/75 backdrop-blur-sm text-white text-xs px-4 py-2 rounded-full flex items-center gap-2 shadow-xl">
                  <Target size={12} className="text-amber-400" />
                  Click anywhere on the panorama to place the hotspot
                </div>
              </div>
            )}

            {/* Subtle hint when form is open but not yet placing */}
            {formOpen && !placing && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
                <div className="bg-black/55 backdrop-blur-sm text-white/80 text-[11px] px-3 py-1.5 rounded-full flex items-center gap-1.5">
                  <MapPin size={11} />
                  Drag to explore · use &ldquo;Place on Panorama&rdquo; in the panel to pin a position
                </div>
              </div>
            )}
          </div>

          {/* ── Right side panel — fixed width, always rendered ── */}
          <div className="w-[340px] shrink-0 border-l flex flex-col bg-card overflow-hidden">

            {/* ━━ PANEL VIEW A: Hotspot list ━━ */}
            {!formOpen && (
              <>
                <div className="h-14 px-5 flex items-center justify-between border-b shrink-0">
                  <div>
                    <p className="text-sm font-semibold">Hotspots</p>
                    <p className="text-xs text-muted-foreground">
                      {loading
                        ? 'Loading…'
                        : `${hotspots.length} hotspot${hotspots.length !== 1 ? 's' : ''}`}
                    </p>
                  </div>
                  <Button size="sm" onClick={openAdd} className="h-8 gap-1.5 shrink-0">
                    <Plus size={13} /> Add
                  </Button>
                </div>

                <ScrollArea className="flex-1">
                  {loading && (
                    <div className="flex items-center gap-2.5 p-5 text-sm text-muted-foreground">
                      <Loader2 size={14} className="animate-spin" /> Loading hotspots…
                    </div>
                  )}

                  {!loading && hotspots.length === 0 && (
                    <div className="flex flex-col items-center justify-center gap-3 py-16 px-6 text-center">
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                        <MapPin size={20} className="text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">No hotspots yet</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Click &ldquo;Add&rdquo; to place your first hotspot on the panorama.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="divide-y">
                    {hotspots.map(hs => (
                      <div
                        key={hs.id}
                        className="px-5 py-4 flex items-start gap-3 group hover:bg-muted/30 transition-colors"
                      >
                        <div className={cn(
                          'w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5',
                          hs.type === 'navigation'
                            ? 'bg-green-100 dark:bg-green-950'
                            : 'bg-blue-100 dark:bg-blue-950'
                        )}>
                          {hs.type === 'navigation'
                            ? <Navigation size={12} className="text-green-600 dark:text-green-400" />
                            : <Info size={12} className="text-blue-600 dark:text-blue-400" />
                          }
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate leading-tight">{hs.label}</p>
                          <Badge
                            variant={hs.type === 'navigation' ? 'default' : 'secondary'}
                            className="text-[10px] mt-1 px-1.5 py-0"
                          >
                            {hs.type}
                          </Badge>
                          {hs.description && (
                            <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">
                              {hs.description}
                            </p>
                          )}
                          <p className="text-[10px] text-muted-foreground/60 font-mono mt-1.5">
                            {Number(hs.pitch ?? 0).toFixed(1)}° / {Number(hs.yaw ?? 0).toFixed(1)}°
                          </p>
                        </div>

                        <div className="flex gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost" size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            onClick={() => openEdit(hs)}
                          >
                            <Pencil size={12} />
                          </Button>
                          <Button
                            variant="ghost" size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => setDeletingHs(hs)}
                          >
                            <Trash2 size={12} />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </>
            )}

            {/* ━━ PANEL VIEW B: Add / Edit form ━━ */}
            {formOpen && (
              <>
                {/* Form sub-header */}
                <div className="h-14 px-4 flex items-center gap-3 border-b shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={closeForm}
                    title="Back to list"
                  >
                    <ArrowLeft size={15} />
                  </Button>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold leading-tight">
                      {editingHs ? 'Edit Hotspot' : 'New Hotspot'}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {editingHs
                        ? 'Update details then click Update'
                        : 'Fill details, then place on panorama'}
                    </p>
                  </div>
                </div>

                <ScrollArea className="flex-1">
                  <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-5">

                    {/* Label */}
                    <div className="space-y-2">
                      <Label htmlFor="hs-label" className="text-sm font-medium">
                        Label <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="hs-label"
                        placeholder="e.g. IT Lab 1"
                        className="h-10"
                        {...register('label')}
                      />
                      {errors.label && (
                        <p className="text-xs text-destructive">{errors.label.message}</p>
                      )}
                    </div>

                    {/* Type */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Type</Label>
                      <Controller
                        name="type"
                        control={control}
                        render={({ field }) => (
                          <Select
                            value={field.value}
                            onValueChange={v => {
                              field.onChange(v);
                              setValue('targetDeptId', '');
                              setValue('targetRoomId', '');
                            }}
                          >
                            <SelectTrigger className="h-10">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="info">
                                <span className="flex items-center gap-2">
                                  <Info size={13} className="text-blue-500" /> Info
                                </span>
                              </SelectItem>
                              <SelectItem value="navigation">
                                <span className="flex items-center gap-2">
                                  <Navigation size={13} className="text-green-500" /> Navigation
                                </span>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                      <Label htmlFor="hs-desc" className="text-sm font-medium">Description</Label>
                      <Textarea
                        id="hs-desc"
                        rows={3}
                        placeholder="Describe this location or what this hotspot leads to…"
                        className="resize-none text-sm"
                        {...register('description')}
                      />
                      {errors.description && (
                        <p className="text-xs text-destructive">{errors.description.message}</p>
                      )}
                    </div>

                    {/* Navigation targets */}
                    {watchType === 'navigation' && (
                      <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                          Navigation Target
                        </p>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">
                            Department <span className="text-destructive">*</span>
                          </Label>
                          <Controller
                            name="targetDeptId"
                            control={control}
                            render={({ field }) => (
                              <Select
                                value={field.value}
                                onValueChange={v => { field.onChange(v); setValue('targetRoomId', ''); }}
                              >
                                <SelectTrigger className="h-10 bg-background">
                                  <SelectValue placeholder="Select department…" />
                                </SelectTrigger>
                                <SelectContent>
                                  {departments.map(d => (
                                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm font-medium">
                            Room <span className="text-destructive">*</span>
                          </Label>
                          <Controller
                            name="targetRoomId"
                            control={control}
                            render={({ field }) => (
                              <Select
                                value={field.value}
                                onValueChange={field.onChange}
                                disabled={!watchTargetDept}
                              >
                                <SelectTrigger className="h-10 bg-background">
                                  <SelectValue placeholder="Select room…" />
                                </SelectTrigger>
                                <SelectContent>
                                  {targetDeptRooms.map(r => (
                                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          />
                          {errors.targetRoomId && (
                            <p className="text-xs text-destructive">{errors.targetRoomId.message}</p>
                          )}
                        </div>
                      </div>
                    )}

                    <Separator />

                    {/* ── Position section ── */}
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Position on Panorama</Label>

                      {pendingPitch !== null && pendingYaw !== null ? (
                        <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 p-3">
                          <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-0.5 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                            Position set ✓
                          </p>
                          <p className="text-xs text-emerald-600 dark:text-emerald-500 font-mono">
                            pitch {Number(pendingPitch).toFixed(1)}° / yaw {Number(pendingYaw).toFixed(1)}°
                          </p>
                        </div>
                      ) : (
                        <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 p-3">
                          <p className="text-xs text-amber-700 dark:text-amber-400">
                            No position set. Click the button below, then click on the panorama to the left.
                          </p>
                        </div>
                      )}

                      <Button
                        type="button"
                        variant={placing ? 'default' : 'outline'}
                        className={cn(
                          'w-full h-10 gap-2 transition-colors',
                          placing && 'bg-amber-500 hover:bg-amber-600 text-white border-transparent'
                        )}
                        onClick={() => setPlacing(p => !p)}
                      >
                        <MapPin size={14} />
                        {placing
                          ? 'Cancel — click panorama to place'
                          : pendingPitch !== null
                            ? 'Reposition on Panorama'
                            : 'Place on Panorama'}
                      </Button>
                    </div>

                    <Separator />

                    {/* Actions */}
                    <div className="flex gap-2 pb-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1 h-10"
                        onClick={closeForm}
                        disabled={isSubmitting}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        className="flex-1 h-10"
                        disabled={isSubmitting}
                      >
                        {isSubmitting && <Loader2 size={13} className="mr-1.5 animate-spin" />}
                        {editingHs ? 'Update' : 'Add Hotspot'}
                      </Button>
                    </div>
                  </form>
                </ScrollArea>
              </>
            )}

          </div>{/* /side panel */}
        </div>{/* /body */}
      </DialogContent>

      {/* ── Delete confirmation ── */}
      <AlertDialog open={!!deletingHs} onOpenChange={v => { if (!v) setDeletingHs(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                <Trash2 size={16} className="text-destructive" />
              </div>
              <AlertDialogTitle className="text-base">
                Delete &ldquo;{deletingHs?.label}&rdquo;?
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-sm leading-relaxed">
              This hotspot will be permanently removed. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 mt-2">
            <AlertDialogCancel disabled={deleting} className="min-w-[80px]">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 min-w-[100px]"
            >
              {deleting && <Loader2 size={14} className="mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}

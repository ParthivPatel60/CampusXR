import { useState, useEffect, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Loader2, MapPin, DoorOpen, ImageIcon, Upload } from 'lucide-react';
import { uploadImageToCloudinary } from '@/cloudinary';
import { getRooms, addRoom, updateRoom, deleteRoom, getHotspots } from '@/services/firestoreService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

// ── Schemas ───────────────────────────────────────────────────────────────────
const addRoomSchema = z.object({
  name: z.string().min(2, 'At least 2 characters').max(100, 'At most 100 characters'),
  imageFile: z
    .any()
    .refine(f => f instanceof File, 'Please select an image')
    .refine(f => f?.type?.startsWith('image/'), 'File must be an image')
    .refine(f => f?.size <= 10 * 1024 * 1024, 'Max file size is 10 MB'),
});

const editRoomSchema = z.object({
  name: z.string().min(2, 'At least 2 characters').max(100, 'At most 100 characters'),
  imageFile: z
    .any()
    .optional()
    .nullable()
    .refine(f => !f || f.type?.startsWith('image/'), 'File must be an image')
    .refine(f => !f || f.size <= 10 * 1024 * 1024, 'Max file size is 10 MB'),
});

// ── Room dialog ───────────────────────────────────────────────────────────────
function RoomDialog({ open, onOpenChange, editingRoom, deptId, roomCount, onSaved }) {
  const isEdit = !!editingRoom;
  const {
    register, handleSubmit, control, reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(isEdit ? editRoomSchema : addRoomSchema),
    defaultValues: { name: '', imageFile: null },
  });

  useEffect(() => {
    reset({ name: editingRoom?.name ?? '', imageFile: null });
  }, [editingRoom, reset, open]);

  const close = () => { reset(); onOpenChange(false); };

  const onSubmit = async ({ name, imageFile }) => {
    try {
      if (isEdit) {
        const updates = { name: name.trim() };
        if (imageFile) {
          const { secure_url, public_id } = await uploadImageToCloudinary(imageFile);
          updates.imageURL      = secure_url;
          updates.imagePublicId = public_id;
        }
        await updateRoom(deptId, editingRoom.id, updates);
        toast.success('Room updated');
      } else {
        const { secure_url, public_id } = await uploadImageToCloudinary(imageFile);
        await addRoom(deptId, {
          name:          name.trim(),
          imageURL:      secure_url,
          imagePublicId: public_id,
          sortOrder:     roomCount + 1,
        });
        toast.success('Room added');
      }
      close();
      onSaved();
    } catch (e) {
      toast.error(e.message || 'Something went wrong');
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) close(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="pb-2">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <DoorOpen size={16} className="text-primary" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold">
                {isEdit ? 'Edit Room' : 'Add Room'}
              </DialogTitle>
              <DialogDescription className="text-xs mt-0.5">
                {isEdit
                  ? 'Update the room name or upload a new 360° panorama.'
                  : 'Enter a name and upload a 360° panorama image.'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Separator />

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 pt-2">
          {/* Room name */}
          <div className="space-y-2">
            <Label htmlFor="room-name" className="text-sm font-medium">
              Room Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="room-name"
              placeholder="e.g. Graphics Lab"
              className="h-10"
              {...register('name')}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Image upload */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              360° Panorama {!isEdit && <span className="text-destructive">*</span>}
              {isEdit && <span className="ml-1.5 text-xs text-muted-foreground font-normal">(optional — leave empty to keep current)</span>}
            </Label>

            {isEdit && editingRoom?.imageURL && (
              <div className="relative aspect-video overflow-hidden rounded-lg border bg-muted">
                <img
                  src={editingRoom.imageURL}
                  alt="Current panorama"
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                <Badge className="absolute bottom-2 left-2 text-[10px] bg-black/60 text-white border-0">
                  Current image
                </Badge>
              </div>
            )}

            <Controller
              name="imageFile"
              control={control}
              render={({ field }) => (
                <label className="flex flex-col items-center gap-3 w-full cursor-pointer rounded-lg border-2 border-dashed border-border hover:border-primary/50 hover:bg-muted/30 transition-colors p-6 text-center">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                    <Upload size={16} className="text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {field.value?.name ?? 'Click to upload panorama'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      PNG, JPG, WEBP up to 10 MB
                    </p>
                  </div>
                  <input
                    id="room-image"
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={e => field.onChange(e.target.files?.[0] ?? null)}
                  />
                </label>
              )}
            />
            {errors.imageFile && (
              <p className="text-xs text-destructive">{errors.imageFile.message}</p>
            )}
          </div>

          <Separator />

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={close}
              disabled={isSubmitting}
              className="min-w-[80px]"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="min-w-[120px]">
              {isSubmitting && <Loader2 size={14} className="mr-2 animate-spin" />}
              {isSubmitting
                ? (isEdit ? 'Saving…' : 'Uploading…')
                : (isEdit ? 'Save Changes' : 'Add Room')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Main tab ──────────────────────────────────────────────────────────────────
export default function RoomsTab({ departments, onOpenHotspotEditor }) {
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [rooms, setRooms]                   = useState([]);
  const [hotspotCounts, setHotspotCounts]   = useState({});
  const [loading, setLoading]               = useState(false);
  const [addOpen, setAddOpen]               = useState(false);
  const [editingRoom, setEditingRoom]        = useState(null);
  const [deletingRoom, setDeletingRoom]      = useState(null);
  const [deleting, setDeleting]             = useState(false);

  useEffect(() => {
    if (departments.length > 0 && !selectedDeptId) {
      setSelectedDeptId(departments[0].id);
    }
  }, [departments, selectedDeptId]);

  const fetchRooms = useCallback(async (deptId) => {
    if (!deptId) return;
    setLoading(true);
    setRooms([]);
    setHotspotCounts({});
    try {
      const fetched = await getRooms(deptId);
      setRooms(fetched);
      const counts = await Promise.all(
        fetched.map(r => getHotspots(deptId, r.id).then(hs => [r.id, hs.length]))
      );
      setHotspotCounts(Object.fromEntries(counts));
    } catch (e) {
      toast.error('Failed to load rooms: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedDeptId) fetchRooms(selectedDeptId);
  }, [selectedDeptId, fetchRooms]);

  const handleSaved  = () => fetchRooms(selectedDeptId);

  const handleDelete = async () => {
    if (!deletingRoom) return;
    setDeleting(true);
    try {
      await deleteRoom(selectedDeptId, deletingRoom.id);
      toast.success(`"${deletingRoom.name}" deleted`);
      setDeletingRoom(null);
      fetchRooms(selectedDeptId);
    } catch (e) {
      toast.error(e.message || 'Delete failed');
    } finally {
      setDeleting(false);
    }
  };

  const selectedDeptName = departments.find(d => d.id === selectedDeptId)?.name ?? '';

  return (
    <div className="space-y-8">

      {/* Page heading */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Rooms &amp; Hotspots</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage 360° panorama rooms and their interactive hotspots.
          </p>
        </div>
        {selectedDeptId && (
          <Button onClick={() => setAddOpen(true)} className="shrink-0">
            <Plus size={14} className="mr-2" /> Add Room
          </Button>
        )}
      </div>

      {/* Controls: department selector + room count */}
      <div className="flex items-center gap-4">
        <Select value={selectedDeptId} onValueChange={setSelectedDeptId}>
          <SelectTrigger className="w-64 h-10">
            <SelectValue placeholder="Select a department" />
          </SelectTrigger>
          <SelectContent>
            {departments.map(d => (
              <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedDeptId && !loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="font-semibold text-foreground tabular-nums">{rooms.length}</span>
            <span>room{rooms.length !== 1 ? 's' : ''} in</span>
            <span className="font-medium text-foreground">{selectedDeptName}</span>
          </div>
        )}
      </div>

      {/* Empty state: no departments */}
      {departments.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
            <DoorOpen size={24} className="text-muted-foreground" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">No departments found</p>
            <p className="text-xs text-muted-foreground mt-1">Add a department first to manage rooms.</p>
          </div>
        </div>
      )}

      {/* Loading state */}
      {selectedDeptId && loading && (
        <div className="flex items-center gap-3 text-sm text-muted-foreground py-16 justify-center">
          <Loader2 size={18} className="animate-spin" /> Loading rooms…
        </div>
      )}

      {/* Empty rooms state */}
      {selectedDeptId && !loading && rooms.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
            <ImageIcon size={24} className="text-muted-foreground" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">No rooms in {selectedDeptName}</p>
            <p className="text-xs text-muted-foreground mt-1">Click &ldquo;Add Room&rdquo; to upload a panorama.</p>
          </div>
        </div>
      )}

      {/* Room cards grid */}
      {!loading && rooms.length > 0 && (
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {rooms.map(room => (
            <div
              key={room.id}
              className="group rounded-xl border bg-card overflow-hidden shadow-sm hover:shadow-md transition-all duration-200"
            >
              {/* Thumbnail */}
              <div className="aspect-video bg-muted relative overflow-hidden">
                {room.imageURL ? (
                  <img
                    src={room.imageURL}
                    alt={room.name}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="h-full w-full flex flex-col items-center justify-center gap-1.5 text-muted-foreground/50">
                    <ImageIcon size={24} />
                    <span className="text-[10px]">No image</span>
                  </div>
                )}

                {/* Hover overlay */}
                <button
                  onClick={() => onOpenHotspotEditor(room, selectedDeptId)}
                  className="absolute inset-0 bg-black/65 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-all duration-200 flex flex-col items-center justify-center gap-1.5 text-white"
                >
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center mb-0.5">
                    <MapPin size={18} />
                  </div>
                  <span className="text-xs font-semibold tracking-wide">Hotspot Editor</span>
                </button>
              </div>

              {/* Card body */}
              <div className="p-3 space-y-2">
                <p className="text-sm font-medium leading-tight truncate" title={room.name}>
                  {room.name}
                </p>
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 font-medium">
                    {hotspotCounts[room.id] ?? 0} hotspot{hotspotCounts[room.id] !== 1 ? 's' : ''}
                  </Badge>

                  <div className="flex gap-0.5 -mr-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-foreground"
                      title="Edit room"
                      onClick={() => setEditingRoom(room)}
                    >
                      <Pencil size={12} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      title="Delete room"
                      onClick={() => setDeletingRoom(room)}
                    >
                      <Trash2 size={12} />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add dialog */}
      <RoomDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        editingRoom={null}
        deptId={selectedDeptId}
        roomCount={rooms.length}
        onSaved={() => { setAddOpen(false); handleSaved(); }}
      />

      {/* Edit dialog */}
      <RoomDialog
        open={!!editingRoom}
        onOpenChange={v => { if (!v) setEditingRoom(null); }}
        editingRoom={editingRoom}
        deptId={selectedDeptId}
        roomCount={rooms.length}
        onSaved={() => { setEditingRoom(null); handleSaved(); }}
      />

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deletingRoom}
        onOpenChange={v => { if (!v) setDeletingRoom(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                <Trash2 size={16} className="text-destructive" />
              </div>
              <AlertDialogTitle className="text-base">
                Delete &ldquo;{deletingRoom?.name}&rdquo;?
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-sm leading-relaxed">
              This will permanently delete the room and{' '}
              <strong className="text-foreground">all hotspots</strong> inside it. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 mt-2">
            <AlertDialogCancel disabled={deleting} className="min-w-[80px]">Cancel</AlertDialogCancel>
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
    </div>
  );
}

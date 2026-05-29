import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Loader2, Building2 } from 'lucide-react';
import { addDepartment, updateDepartment, deleteDepartment } from '@/services/firestoreService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';

// ── Zod schema ────────────────────────────────────────────────────────────────
const deptSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name must be at most 100 characters'),
  description: z.string().max(500, 'Description must be at most 500 characters'),
});

// ── Add / Edit dialog ─────────────────────────────────────────────────────────
function DeptDialog({ open, onOpenChange, editingDept, onSaved }) {
  const isEdit = !!editingDept;
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm({
    resolver: zodResolver(deptSchema),
    values: {
      name:        editingDept?.name        ?? '',
      description: editingDept?.description ?? '',
    },
  });

  const close = () => { reset(); onOpenChange(false); };

  const onSubmit = async (data) => {
    try {
      if (isEdit) {
        await updateDepartment(editingDept.id, data);
        toast.success('Department updated');
      } else {
        await addDepartment(data);
        toast.success('Department added');
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
              <Building2 size={16} className="text-primary" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold">
                {isEdit ? 'Edit Department' : 'Add Department'}
              </DialogTitle>
              <DialogDescription className="text-xs mt-0.5">
                {isEdit
                  ? 'Update the department name and description.'
                  : 'Fill in the details to create a new department.'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Separator />

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 pt-2">
          <div className="space-y-2">
            <Label htmlFor="dept-name" className="text-sm font-medium">
              Department Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="dept-name"
              placeholder="e.g. Computer Science"
              className="h-10"
              {...register('name')}
            />
            {errors.name && (
              <p className="text-xs text-destructive flex items-center gap-1">
                {errors.name.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="dept-desc" className="text-sm font-medium">
              Description
              <span className="ml-1.5 text-xs text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Textarea
              id="dept-desc"
              placeholder="Briefly describe this department's facilities and purpose…"
              rows={3}
              className="resize-none"
              {...register('description')}
            />
            {errors.description && (
              <p className="text-xs text-destructive">{errors.description.message}</p>
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
              {isEdit ? 'Save Changes' : 'Add Department'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Main tab ──────────────────────────────────────────────────────────────────
export default function DepartmentsTab({ departments, roomsByDept, onRefresh }) {
  const [dialogOpen, setDialogOpen]     = useState(false);
  const [editingDept, setEditingDept]   = useState(null);
  const [deletingDept, setDeletingDept] = useState(null);
  const [deleting, setDeleting]         = useState(false);

  const openAdd  = () => { setEditingDept(null); setDialogOpen(true); };
  const openEdit = (dept) => { setEditingDept(dept); setDialogOpen(true); };

  const handleDeleteConfirm = async () => {
    if (!deletingDept) return;
    setDeleting(true);
    try {
      await deleteDepartment(deletingDept.id);
      toast.success(`"${deletingDept.name}" deleted`);
      setDeletingDept(null);
      onRefresh();
    } catch (e) {
      toast.error(e.message || 'Delete failed');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-8">

      {/* Page heading */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Departments</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage campus departments and their metadata.
          </p>
        </div>
        <Button onClick={openAdd} className="shrink-0">
          <Plus size={14} className="mr-2" /> Add Department
        </Button>
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-6 px-1">
        <div className="flex items-center gap-2">
          <span className="text-3xl font-bold tabular-nums">{departments.length}</span>
          <span className="text-sm text-muted-foreground">
            department{departments.length !== 1 ? 's' : ''}
          </span>
        </div>
        <Separator orientation="vertical" className="h-6" />
        <div className="flex items-center gap-2">
          <span className="text-3xl font-bold tabular-nums">
            {Object.values(roomsByDept).reduce((s, r) => s + r.length, 0)}
          </span>
          <span className="text-sm text-muted-foreground">total rooms</span>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="pl-6 w-56 font-semibold text-foreground">Name</TableHead>
              <TableHead className="font-semibold text-foreground">Description</TableHead>
              <TableHead className="text-right w-24 font-semibold text-foreground">Rooms</TableHead>
              <TableHead className="text-right w-32 pr-6 font-semibold text-foreground">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {departments.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="py-20 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                      <Building2 size={20} className="text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">No departments yet</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Click &ldquo;Add Department&rdquo; to get started.
                      </p>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            )}
            {departments.map(dept => (
              <TableRow key={dept.id} className="group">
                <TableCell className="pl-6">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                      <Building2 size={13} className="text-primary" />
                    </div>
                    <span className="font-medium text-sm">{dept.name}</span>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm max-w-sm">
                  <span className="line-clamp-1">
                    {dept.description || <span className="italic text-muted-foreground/50">No description</span>}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <Badge variant="secondary" className="tabular-nums">
                    {(roomsByDept[dept.id] || []).length}
                  </Badge>
                </TableCell>
                <TableCell className="pr-6">
                  <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-accent"
                      title="Edit"
                      onClick={() => openEdit(dept)}
                    >
                      <Pencil size={14} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      title="Delete"
                      onClick={() => setDeletingDept(dept)}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Add / Edit dialog */}
      <DeptDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editingDept={editingDept}
        onSaved={() => { setDialogOpen(false); setEditingDept(null); onRefresh(); }}
      />

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deletingDept}
        onOpenChange={v => { if (!v) setDeletingDept(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                <Trash2 size={16} className="text-destructive" />
              </div>
              <AlertDialogTitle className="text-base">
                Delete &ldquo;{deletingDept?.name}&rdquo;?
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-sm leading-relaxed pl-13">
              This will permanently delete the department and{' '}
              <strong className="text-foreground">all rooms and hotspots</strong> inside it.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 mt-2">
            <AlertDialogCancel disabled={deleting} className="min-w-[80px]">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
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

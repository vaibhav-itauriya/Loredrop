import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button.tsx";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { eventsAPI } from "@/lib/api";
import { toast } from "sonner";
import { Edit2 } from "lucide-react";

type EventEditDialogProps = {
  event: any;
  canEdit: boolean;
  triggerClassName?: string;
  triggerLabel?: string;
  compact?: boolean;
  onUpdated?: (event: any) => void;
};

export default function EventEditDialog({
  event,
  canEdit,
  triggerClassName,
  triggerLabel = "Edit Event",
  compact = false,
  onUpdated,
}: EventEditDialogProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    venue: "",
    dateTime: "",
    endDateTime: "",
    mode: "offline",
    capacity: "",
    tags: "",
    registrationLink: "",
  });
  const [timeError, setTimeError] = useState("");

  useEffect(() => {
    if (!event) return;
    setForm({
      title: event.title || "",
      description: event.description || "",
      venue: event.venue || "",
      dateTime: event.dateTime ? new Date(event.dateTime).toISOString().slice(0, 16) : "",
      endDateTime: event.endDateTime ? new Date(event.endDateTime).toISOString().slice(0, 16) : "",
      mode: event.mode || "offline",
      capacity: event.capacity ? String(event.capacity) : "",
      tags: Array.isArray(event.tags) ? event.tags.join(", ") : "",
      registrationLink: event.registrationLink || "",
    });
    setTimeError("");
  }, [event, open]);

  if (!canEdit) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const startTime = form.dateTime ? new Date(form.dateTime) : null;
    const endTime = form.endDateTime ? new Date(form.endDateTime) : null;

    if (startTime && Number.isNaN(startTime.getTime())) {
      setTimeError("Start time is invalid.");
      return;
    }
    if (endTime && Number.isNaN(endTime.getTime())) {
      setTimeError("End time is invalid.");
      return;
    }
    if (startTime && endTime && endTime <= startTime) {
      setTimeError("End time must be after start time.");
      return;
    }

    try {
      setSaving(true);
      setTimeError("");
      const updated = await eventsAPI.updateEvent(event._id, {
        title: form.title,
        description: form.description,
        venue: form.venue,
        dateTime: form.dateTime ? new Date(form.dateTime).toISOString() : undefined,
        endDateTime: form.endDateTime ? new Date(form.endDateTime).toISOString() : undefined,
        mode: form.mode,
        capacity: form.capacity ? Number(form.capacity) : undefined,
        tags: form.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
        registrationLink: form.registrationLink || undefined,
      });
      toast.success("Event updated successfully");
      onUpdated?.(updated);
      setOpen(false);
    } catch (error: any) {
      toast.error(error?.message || "Failed to update event");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {compact ? (
          <Button variant="ghost" size="sm" className={triggerClassName}>
            <Edit2 className="w-4 h-4 mr-2" />
            {triggerLabel}
          </Button>
        ) : (
          <Button variant="outline" className={triggerClassName}>
            <Edit2 className="w-4 h-4 mr-2" />
            {triggerLabel}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Event</DialogTitle>
          <DialogDescription>Update the event details visible on the feed.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor={`title-${event._id}`}>Title</Label>
            <Input id={`title-${event._id}`} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div>
            <Label htmlFor={`description-${event._id}`}>Description</Label>
            <Textarea id={`description-${event._id}`} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="min-h-28" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor={`venue-${event._id}`}>Venue</Label>
              <Input id={`venue-${event._id}`} value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} />
            </div>
            <div>
              <Label htmlFor={`capacity-${event._id}`}>Capacity</Label>
              <Input id={`capacity-${event._id}`} type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor={`date-${event._id}`}>Start Time</Label>
              <Input id={`date-${event._id}`} type="datetime-local" value={form.dateTime} onChange={(e) => {
                setForm({ ...form, dateTime: e.target.value });
                setTimeError("");
              }} />
            </div>
            <div>
              <Label htmlFor={`endDate-${event._id}`}>End Time</Label>
              <Input id={`endDate-${event._id}`} type="datetime-local" min={form.dateTime || undefined} value={form.endDateTime} onChange={(e) => {
                setForm({ ...form, endDateTime: e.target.value });
                setTimeError("");
              }} />
            </div>
          </div>
          {timeError ? <p className="text-sm text-destructive">{timeError}</p> : null}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor={`mode-${event._id}`}>Mode</Label>
              <select
                id={`mode-${event._id}`}
                value={form.mode}
                onChange={(e) => setForm({ ...form, mode: e.target.value })}
                className="w-full px-3 py-2 border border-input rounded-md bg-background"
              >
                <option value="offline">Offline</option>
                <option value="online">Online</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </div>
            <div>
              <Label htmlFor={`tags-${event._id}`}>Tags</Label>
              <Input id={`tags-${event._id}`} value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="tech, robotics, workshop" />
            </div>
          </div>
          <div>
            <Label htmlFor={`reg-${event._id}`}>Registration Link</Label>
            <Input id={`reg-${event._id}`} value={form.registrationLink} onChange={(e) => setForm({ ...form, registrationLink: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export const ACADEMIC_TIMETABLE_STORAGE_KEY = "loredrop-academic-timetable-v1";

export type AcademicTimetableSlot = {
  id: string;
  title: string;
  day: number;
  startTime: string;
  endTime: string;
  location?: string;
};

function isValidTimeString(value: string) {
  return /^\d{2}:\d{2}$/.test(value);
}

export function toMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

export function sortAcademicTimetable(slots: AcademicTimetableSlot[]) {
  return [...slots].sort((a, b) =>
    a.day !== b.day ? a.day - b.day : toMinutes(a.startTime) - toMinutes(b.startTime),
  );
}

function isAcademicTimetableSlot(slot: AcademicTimetableSlot | null): slot is AcademicTimetableSlot {
  return slot !== null;
}

export function normalizeAcademicTimetable(input: unknown): AcademicTimetableSlot[] {
  if (!Array.isArray(input)) return [];

  const normalizedSlots = input
    .map((slot, index): AcademicTimetableSlot | null => {
      if (!slot || typeof slot !== "object") return null;
      const raw = slot as Partial<AcademicTimetableSlot>;
      const title = typeof raw.title === "string" ? raw.title.trim() : "";
      const location = typeof raw.location === "string" ? raw.location.trim() : "";
      const day = typeof raw.day === "number" ? raw.day : Number(raw.day);
      const startTime = typeof raw.startTime === "string" ? raw.startTime.trim() : "";
      const endTime = typeof raw.endTime === "string" ? raw.endTime.trim() : "";
      const id = typeof raw.id === "string" && raw.id.trim() ? raw.id.trim() : `slot-${index}`;

      if (!title || !Number.isInteger(day) || day < 0 || day > 6) return null;
      if (!isValidTimeString(startTime) || !isValidTimeString(endTime)) return null;
      if (toMinutes(endTime) <= toMinutes(startTime)) return null;

      return {
        id,
        title,
        day,
        startTime,
        endTime,
        location: location || undefined,
      };
    })
    .filter(isAcademicTimetableSlot);

  return sortAcademicTimetable(normalizedSlots);
}

export function readLocalAcademicTimetable() {
  try {
    const stored = localStorage.getItem(ACADEMIC_TIMETABLE_STORAGE_KEY);
    if (!stored) return [];
    return normalizeAcademicTimetable(JSON.parse(stored));
  } catch {
    return [];
  }
}

export function writeLocalAcademicTimetable(slots: AcademicTimetableSlot[]) {
  localStorage.setItem(ACADEMIC_TIMETABLE_STORAGE_KEY, JSON.stringify(sortAcademicTimetable(slots)));
}

function getSlotSignature(slot: AcademicTimetableSlot) {
  return [
    slot.title.trim().toLowerCase(),
    slot.day,
    slot.startTime,
    slot.endTime,
    slot.location?.trim().toLowerCase() || "",
  ].join("|");
}

export function mergeAcademicTimetables(
  primary: AcademicTimetableSlot[],
  secondary: AcademicTimetableSlot[],
) {
  const merged = [...primary];
  const seen = new Set(primary.map(getSlotSignature));

  secondary.forEach((slot) => {
    const signature = getSlotSignature(slot);
    if (seen.has(signature)) return;
    seen.add(signature);
    merged.push(slot);
  });

  return sortAcademicTimetable(merged);
}

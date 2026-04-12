import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { authAPI } from "@/lib/api";
import {
  type AcademicTimetableSlot,
  mergeAcademicTimetables,
  normalizeAcademicTimetable,
  readLocalAcademicTimetable,
  sortAcademicTimetable,
  writeLocalAcademicTimetable,
} from "@/lib/planner.ts";
import { useAuth } from "@/hooks/use-auth.ts";

export function useAcademicTimetable() {
  const { isAuthenticated } = useAuth();
  const [slots, setSlots] = useState<AcademicTimetableSlot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const hasLoadedRef = useRef(false);
  const hydratedAuthRef = useRef(false);

  useEffect(() => {
    let isCancelled = false;

    const load = async () => {
      setIsLoading(true);

      if (!isAuthenticated) {
        const localSlots = readLocalAcademicTimetable();
        if (!isCancelled) {
          hydratedAuthRef.current = false;
          setSlots(localSlots);
          setIsLoading(false);
          hasLoadedRef.current = true;
        }
        return;
      }

      try {
        const localSlots = readLocalAcademicTimetable();
        const response = await authAPI.getAcademicTimetable();
        const remoteSlots = normalizeAcademicTimetable(response?.slots);
        const mergedSlots = mergeAcademicTimetables(remoteSlots, localSlots);

        if (mergedSlots.length !== remoteSlots.length) {
          await authAPI.updateAcademicTimetable(mergedSlots);
        }

        writeLocalAcademicTimetable(mergedSlots);

        if (!isCancelled) {
          hydratedAuthRef.current = true;
          setSlots(mergedSlots);
        }
      } catch (error) {
        console.error("Failed to load academic timetable:", error);
        const fallbackSlots = readLocalAcademicTimetable();
        if (!isCancelled) {
          hydratedAuthRef.current = false;
          setSlots(fallbackSlots);
          toast.error("Failed to load saved timetable from your account");
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
          hasLoadedRef.current = true;
        }
      }
    };

    load();
    return () => {
      isCancelled = true;
    };
  }, [isAuthenticated]);

  useEffect(() => {
    if (!hasLoadedRef.current) return;

    const normalized = sortAcademicTimetable(slots);
    writeLocalAcademicTimetable(normalized);

    if (!isAuthenticated || !hydratedAuthRef.current) return;

    const timeoutId = window.setTimeout(async () => {
      try {
        await authAPI.updateAcademicTimetable(normalized);
      } catch (error) {
        console.error("Failed to save academic timetable:", error);
        toast.error("Failed to save timetable changes");
      }
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [isAuthenticated, slots]);

  return {
    slots,
    setSlots,
    isLoading,
  };
}

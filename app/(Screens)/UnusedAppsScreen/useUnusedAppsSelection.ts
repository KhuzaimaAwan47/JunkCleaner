import { useCallback, useMemo } from "react";
import { useDispatch } from "react-redux";
import { clearSelections, setSelectedItems, toggleItemSelection as toggleItemSelectionAction } from "../../../redux-code/action";
import type { UnusedAppInfo } from "./UnusedAppsScanner";

export const useUnusedAppsSelection = (
  apps: UnusedAppInfo[],
  selectedPackageNames: Set<string>
) => {
  const dispatch = useDispatch();

  const selectedStats = useMemo(() => {
    return {
      items: selectedPackageNames.size,
    };
  }, [selectedPackageNames]);

  const isAllSelected = useMemo(() => {
    return apps.length > 0 && apps.every((app) => selectedPackageNames.has(app.packageName));
  }, [apps, selectedPackageNames]);

  const toggleAppSelection = useCallback((packageName: string) => {
    dispatch(toggleItemSelectionAction("unused", packageName));
  }, [dispatch]);

  const toggleSelectAll = useCallback(() => {
    if (isAllSelected) {
      dispatch(clearSelections("unused"));
    } else {
      const allPackageNames = apps.map((app) => app.packageName);
      dispatch(setSelectedItems("unused", allPackageNames));
    }
  }, [isAllSelected, apps, dispatch]);

  return { selectedStats, isAllSelected, toggleAppSelection, toggleSelectAll };
};


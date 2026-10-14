import React from "react";
import { Link as RouterLink } from "react-router-dom";
import { Button, Tooltip } from "@mui/material";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import { useOptionalStoretApp } from "../context/StoretAppContext";
import { buildEditListingPath, getListingEditLock } from "../utils/listingEditingUtils";

export default function ListingEditActions({ listing }) {
  const app = useOptionalStoretApp();
  const lock = getListingEditLock(listing, app?.hostBookingRequests);
  const isChecking = Boolean(app?.activityIsLoading);
  const disabled = isChecking || lock.isLocked;
  const reason = isChecking ? "Checking booking status..." : lock.message;
  return (
    <Tooltip title={reason}>
        <span>
          <Button component={disabled ? "button" : RouterLink}
            to={disabled ? undefined : buildEditListingPath(listing.id)}
            variant="outlined" size="small" disabled={disabled} startIcon={<EditRoundedIcon />}>
            Edit
          </Button>
        </span>
    </Tooltip>
  );
}

import React from "react";
import { Dialog as MuiDialog } from "@mui/material";

function Dialog({
  open,
  onOpenChange,
  children,
  maxWidth = "md",
  fullWidth = true,
  paperSx,
}) {
  return (
    <MuiDialog
      open={Boolean(open)}
      onClose={() => onOpenChange?.(false)}
      fullWidth={fullWidth}
      maxWidth={maxWidth}
      PaperProps={{
        sx: {
          borderRadius: 4,
          overflow: "hidden",
          border: "1px solid",
          borderColor: "divider",
          boxShadow: "0 24px 90px rgba(15, 23, 42, 0.34)",
          ...paperSx,
        },
      }}
    >
      {children}
    </MuiDialog>
  );
}

export default Dialog;

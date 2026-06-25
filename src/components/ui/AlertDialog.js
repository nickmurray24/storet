import React from "react";
import {
  Box,
  Button,
  Dialog as MuiDialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from "@mui/material";

function AlertDialog({
  open,
  onOpenChange,
  title,
  description,
  cancelText = "Cancel",
  actionText = "Continue",
  actionColor = "primary",
  onAction,
  children,
}) {
  function handleClose() {
    onOpenChange?.(false);
  }

  function handleAction() {
    onAction?.();
    onOpenChange?.(false);
  }

  return (
    <MuiDialog
      open={Boolean(open)}
      onClose={handleClose}
      fullWidth
      maxWidth="xs"
      PaperProps={{
        sx: {
          borderRadius: 4,
          border: "1px solid",
          borderColor: "divider",
          boxShadow: "0 24px 80px rgba(15, 23, 42, 0.28)",
        },
      }}
    >
      <Box sx={{ p: 0.5 }}>
        <DialogTitle sx={{ pb: 1, fontWeight: 950, letterSpacing: "-0.03em" }}>
          {title}
        </DialogTitle>

        <DialogContent sx={{ pt: "0 !important" }}>
          <Stack spacing={1.5}>
            {description && (
              <Typography color="text.secondary" lineHeight={1.7}>
                {description}
              </Typography>
            )}
            {children}
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2.5, pt: 1, gap: 1 }}>
          <Button
            variant="outlined"
            color="inherit"
            onClick={handleClose}
            sx={{ borderRadius: 999, fontWeight: 800 }}
          >
            {cancelText}
          </Button>
          <Button
            variant="contained"
            color={actionColor}
            onClick={handleAction}
            sx={{ borderRadius: 999, fontWeight: 900 }}
          >
            {actionText}
          </Button>
        </DialogActions>
      </Box>
    </MuiDialog>
  );
}

export default AlertDialog;

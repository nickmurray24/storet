import React, { useState } from "react";
import { Alert, Box, Button, Chip, Stack, Typography } from "@mui/material";

function PhotoRow({ url, label, index, count, disabled, onMove, onRemove }) {
  const [dimensions, setDimensions] = useState(null);
  const [failed, setFailed] = useState(false);
  const isSmall = dimensions && dimensions.width < 1200;

  return (
    <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 3, p: 1.5 }}>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
        <Box component="img" src={url} alt={label || `Listing photo ${index + 1}`}
          onLoad={(event) => {
            setFailed(false);
            setDimensions({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight });
          }}
          onError={() => setFailed(true)}
          sx={{ width: { xs: "100%", sm: 140 }, height: 100, objectFit: "contain", bgcolor: "background.default", borderRadius: 2 }}
        />
        <Stack spacing={0.75} sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography fontWeight={800}>Photo {index + 1}</Typography>
            {index === 0 && <Chip label="Cover photo" color="primary" size="small" />}
          </Stack>
          {label && <Typography variant="body2" sx={{ overflowWrap: "anywhere" }}>{label}</Typography>}
          {dimensions && <Typography variant="caption" color="text.secondary">{dimensions.width} × {dimensions.height} pixels</Typography>}
          {failed && <Typography variant="caption" color="error">Photo preview could not load.</Typography>}
          {isSmall && <Typography variant="caption" color="warning.main">This photo may look soft in the listing header. Use a larger original for a sharper cover.</Typography>}
          <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
            <Button size="small" variant="outlined" disabled={disabled || index === 0}
              aria-label={`Move photo ${index + 1} earlier`} onClick={() => onMove(index, index - 1)}>Move earlier</Button>
            <Button size="small" variant="outlined" disabled={disabled || index === count - 1}
              aria-label={`Move photo ${index + 1} later`} onClick={() => onMove(index, index + 1)}>Move later</Button>
            <Button size="small" disabled={disabled || index === 0}
              aria-label={`Use photo ${index + 1} as cover`} onClick={() => onMove(index, 0)}>Make cover</Button>
            {onRemove && <Button size="small" color="error" disabled={disabled}
              aria-label={`Remove photo ${index + 1}`} onClick={() => onRemove(index)}>Remove</Button>}
          </Stack>
        </Stack>
      </Stack>
    </Box>
  );
}

export default function ListingPhotoOrderEditor({ imageUrls = [], labels = [], onMove, onRemove, disabled = false }) {
  if (!imageUrls.length) return null;
  return (
    <Stack spacing={1.25}>
      <Alert severity="info">The first photo is the cover shown in Explore and the listing header. Move photos to choose their gallery order. Original files are preserved; a photo at least 1600 pixels wide is recommended for the cover.</Alert>
      {imageUrls.map((url, index) => <PhotoRow key={url} url={url} label={labels[index]} index={index}
        count={imageUrls.length} disabled={disabled} onMove={onMove} onRemove={onRemove} />)}
    </Stack>
  );
}

import fs from "node:fs";
import path from "node:path";

// Run from the Storet project root. Validate every edit before writing any file.
const root = process.cwd();
const patches = JSON.parse(fs.readFileSync(new URL("./listing-edit-edits.json", import.meta.url), "utf8"));
const candidates = [];
try {
  if (!fs.existsSync(path.join(root, "src/context/StoretAppContext.js"))) {
    throw new Error("Run this command from your Storet project root (the folder containing package.json and src).");
  }
  for (const file of ["src/pages/EditListingPage.js", "src/components/ListingEditActions.js",
    "src/services/listingEditingService.js", "src/utils/listingEditingUtils.js"]) {
    if (!fs.existsSync(path.join(root, file))) throw new Error(`Missing ${file}. Extract the entire listing-edit patch before running this installer.`);
  }
  for (const patch of patches) {
    const file = path.join(root, patch.file);
    const original = fs.readFileSync(file, "utf8");
    const usesCRLF = original.includes("\r\n");
    let updated = original.replace(/\r\n/g, "\n");
    for (const edit of patch.edits) {
      if (edit.after && updated.includes(edit.after)) continue;
      if (!edit.after && !updated.includes(edit.before)) continue;
      const count = updated.split(edit.before).length - 1;
      if (count !== 1) {
        throw new Error(`${patch.file}: cannot safely apply '${edit.name}' (found ${count} matching sections). No source files were changed. Please provide your current project zip.`);
      }
      updated = updated.replace(edit.before, edit.after);
    }
    if (usesCRLF) updated = updated.replace(/\n/g, "\r\n");
    if (updated !== original) candidates.push({ file, original, updated, name: patch.file });
  }
  if (!candidates.length) {
    console.log("These listing edit updates are already applied.");
    process.exit(0);
  }
  // Keep exact originals outside src so Create React App doesn't compile backups.
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupRoot = path.join(root, "storet-patch-backups", stamp);
  for (const item of candidates) {
    const backup = path.join(backupRoot, item.name);
    fs.mkdirSync(path.dirname(backup), { recursive: true });
    fs.writeFileSync(backup, item.original);
  }
  const written = [];
  try {
    for (const item of candidates) {
      written.push(item);
      fs.writeFileSync(item.file, item.updated);
    }
  } catch (error) {
    for (const item of written) fs.writeFileSync(item.file, item.original);
    throw error;
  }
  for (const item of candidates) console.log(`Updated ${item.name}`);
  console.log(`Backups: ${path.relative(root, backupRoot)}`);
  console.log("Done. Run database/20261007_listing_edit_booking_guard.sql in Supabase SQL Editor, then restart Storet.");
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}

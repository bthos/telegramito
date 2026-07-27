# Co-reading bookmarks — export and import

The Desk's co-reading section lets you save messages to discuss later — "Discuss at dinner" bookmarks
shared between family members. If you have Telegramito on more than one phone, you can move those
bookmarks from one device to the other using an encrypted file you transfer yourself.

This feature is available in **parent mode only**. Children never see the export or import controls.

---

## How it works

Transfer happens in two steps: you export a file on the source phone, move it to the other phone
however you like (AirDrop, cable, messaging app, email, USB drive — anything), and then import it on
the destination phone. Telegramito is not involved in the transfer; the file travels the same way any
other file would.

The file is encrypted with a passphrase you choose. Without that passphrase the file is unreadable,
even to you. **The passphrase is not stored anywhere in the app and cannot be recovered.** Write it
down or keep it somewhere safe.

---

## Step 1 — Export on the source phone

1. Open the **Desk** and scroll to the co-reading section.
2. Tap **Export bookmarks**.
3. Enter a passphrase. You will be asked to type it twice to confirm.
   A short warning appears if the passphrase is fewer than 8 characters — you can proceed anyway,
   but a longer passphrase is safer.
4. Confirm and your device will offer to save or share the file. The file name follows the pattern
   `telegramito-co-reading-YYYY-MM-DD.tgito-cr`.

> **Export is disabled when your bookmark list is empty.** Add at least one bookmark before trying
> to export.

---

## Step 2 — Transfer the file

Move the `.tgito-cr` file from the source phone to the destination phone using any method you
prefer — AirDrop, a messaging app, cable, email, or a USB drive. Telegramito has no server involved
in this step.

---

## Step 3 — Import on the destination phone

1. Open the **Desk** and scroll to the co-reading section.
2. Tap **Import bookmarks**.
3. Your device's file picker opens — locate the `.tgito-cr` file you transferred.
4. Enter the same passphrase you used when exporting.
5. If the passphrase is correct, a summary appears: how many bookmarks were added, how many were
   already present and updated, and how many were unchanged.

After a successful import, the hint shown in the co-reading section on the Desk updates to reflect
that transfer has been used on this device.

---

## What happens if bookmarks overlap

Import never deletes your existing bookmarks. When the file contains a bookmark for the same message
that already exists locally, the newer version (by date saved) is kept. If both copies have the same
date, the local copy wins.

---

## What if something goes wrong

| Situation | What happens |
|---|---|
| Wrong passphrase | An error message appears. Your local bookmarks are not changed. |
| Corrupt or incomplete file | An error message appears. Your local bookmarks are not changed. |
| File created by a future version of the app | An error message appears; update the app and try again. |

You can dismiss any of these errors and try again or cancel without any side effects.

---

## Privacy

The `.tgito-cr` file contains only your co-reading bookmarks (chat names, message previews, and
the dates you saved them). The contents are encrypted; without the passphrase the file cannot be
read. Telegramito does not transmit the file or its contents to any server — it stays on your
devices and travels only the path you choose.

The export passphrase is **separate from your parent PIN**. Knowing one does not give access to the
other.

---

## What is not included

**Automatic cloud sync and WebDAV sync are not part of this release.** Bookmarks do not sync
automatically between devices. Each transfer is a deliberate manual action: export → move file →
import. Automatic background sync may be added in a future update.

---

*Implemented in `src/util/lettersRitualsStorage.ts` (or sibling `coReadingExport.ts` — merge helper,
import flag, encrypt/decrypt envelope) and `src/ui/LettersDeskSheet.tsx` (Export / Import actions,
passphrase dialogs). Encryption uses the Web Crypto API (PBKDF2-SHA-256). If export, import, or
hint behaviour changes, update this page to match.*

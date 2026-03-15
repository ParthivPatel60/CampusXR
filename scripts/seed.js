'use strict';

/**
 * CampusXR — One-time bulk seeding script
 * ─────────────────────────────────────────────────────────────────────────────
 * SETUP (run once inside the scripts/ folder):
 *
 *   npm install
 *
 *   Firebase service-account key:
 *     Firebase Console → Project Settings → Service Accounts
 *     → Generate new private key → save as  scripts/serviceAccount.json
 *     (already excluded from git by scripts/.gitignore)
 *
 *   Copy all 27 panorama .jpg files into:  scripts/images/
 *
 * USAGE:
 *   node seed.js --dry-run    ← validates manifest + checks files, no uploads
 *   node seed.js              ← uploads all images + writes Firestore docs
 *
 * IDEMPOTENT:
 *   • Firestore writes use setDoc() with deterministic IDs (deptKey / roomKey),
 *     so re-running overwrites docs safely — no duplicates created.
 *   • Cloudinary URLs are cached in  scripts/room-url-cache.json  after each
 *     successful upload.  On subsequent runs, cached rooms are skipped entirely
 *     — no re-uploads, no Cloudinary quota waste.
 *
 * OUTPUT:
 *   Firestore path pattern:
 *     departments/{deptKey}/rooms/{roomKey}
 *
 *   Room fields written:
 *     name, imageURL, imagePublicId, sortOrder, roomKey, deptKey,
 *     splat3DUrl (empty string — fill later via Admin panel)
 * ─────────────────────────────────────────────────────────────────────────────
 */

const path = require('path');
const fs   = require('fs');

// ── Paths ────────────────────────────────────────────────────────────────────
const SA_PATH       = path.join(__dirname, 'serviceAccount.json');
const MANIFEST_PATH = path.join(__dirname, 'seed-manifest.json');
const IMAGES_DIR    = path.join(__dirname, 'images');
const CACHE_PATH    = path.join(__dirname, 'room-url-cache.json');

const DRY_RUN = process.argv.includes('--dry-run');

// ── Pre-flight checks ─────────────────────────────────────────────────────────
if (!DRY_RUN && !fs.existsSync(SA_PATH)) {
  console.error([
    '',
    '❌  serviceAccount.json not found.',
    '    Firebase Console → Project Settings → Service Accounts',
    '    → Generate new private key → save as: ' + SA_PATH,
    '',
  ].join('\n'));
  process.exit(1);
}

if (!fs.existsSync(IMAGES_DIR)) {
  console.error([
    '',
    '❌  images/ folder not found at: ' + IMAGES_DIR,
    '    Create it and copy all 27 panorama .jpg files there.',
    '',
  ].join('\n'));
  process.exit(1);
}

if (!fs.existsSync(MANIFEST_PATH)) {
  console.error('\n❌  seed-manifest.json not found at: ' + MANIFEST_PATH + '\n');
  process.exit(1);
}

// ── Lazy-load heavy deps (only after pre-flight passes) ───────────────────────
let admin = null;
let cloudinary = null;
let db = null;

// ── Cloudinary config (unsigned upload — no API secret needed) ────────────────
const CLOUD_NAME    = 'dsdll4n92';
const UPLOAD_PRESET = 'campusxr_unsigned';

if (!DRY_RUN) {
  admin = require('firebase-admin');
  cloudinary = require('cloudinary').v2;
  cloudinary.config({ cloud_name: CLOUD_NAME });

  // ── Firebase Admin init ─────────────────────────────────────────────────────
  admin.initializeApp({
    credential: admin.credential.cert(require(SA_PATH)),
  });
  db = admin.firestore();
}

// ── Cloudinary URL cache ──────────────────────────────────────────────────────
let urlCache = {};
if (fs.existsSync(CACHE_PATH)) {
  urlCache = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf-8'));
  console.log(`📦  URL cache loaded — ${Object.keys(urlCache).length} room(s) already uploaded.`);
}

function saveCache() {
  fs.writeFileSync(CACHE_PATH, JSON.stringify(urlCache, null, 2), 'utf-8');
}

// ── Cloudinary upload (skips if already cached) ───────────────────────────────
async function uploadImage(roomKey, absoluteImagePath) {
  if (urlCache[roomKey]) {
    console.log(`      ⚡ Already uploaded (cached): ${roomKey}`);
    return urlCache[roomKey]; // { secure_url, public_id }
  }

  if (!fs.existsSync(absoluteImagePath)) {
    throw new Error(`Image file not found: ${absoluteImagePath}`);
  }

  const filename = path.basename(absoluteImagePath);
  console.log(`      ☁️  Uploading to Cloudinary: ${filename} …`);

  const result = await cloudinary.uploader.unsigned_upload(
    absoluteImagePath,
    UPLOAD_PRESET,
    {
      resource_type : 'image',
      tags          : ['campusxr', roomKey],
      // folder not set — unsigned preset controls the folder
    }
  );

  const entry = { secure_url: result.secure_url, public_id: result.public_id };
  urlCache[roomKey] = entry;
  saveCache(); // write after every successful upload so crashes don't lose progress
  return entry;
}

// ── Resolve absolute image path from manifest's relative path ────────────────
function resolveImagePath(manifestImagePath) {
  const cleaned = manifestImagePath.replace(/^\.\//, '');
  return path.join(IMAGES_DIR, path.basename(cleaned));
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function seed() {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));

  if (DRY_RUN) {
    console.log('\n🟡  DRY RUN — validating manifest and checking image files.\n');
  } else {
    console.log('\n🚀  CampusXR seed starting …\n');
  }

  let deptsDone = 0;
  let roomsDone = 0;
  const errors  = [];

  for (const dept of manifest.departments) {
    const { deptKey, name, description, rooms } = dept;

    console.log(`\n🏢  [${deptKey}]  ${name}`);

    if (!DRY_RUN) {
      await db.collection('departments').doc(deptKey).set(
        {
          name,
          description : description ?? '',
          updatedAt   : admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }   // preserve any existing fields (e.g. manually added ones)
      );
    }
    deptsDone++;

    for (const room of rooms) {
      const { roomKey, name: roomName, imagePath, sortOrder, splat3DUrl } = room;

      // Skip internal manifest comment fields
      if (roomKey === undefined) continue;

      const absoluteImagePath = resolveImagePath(imagePath);

      console.log(`   📷  [${sortOrder}] ${roomName}  (id: ${roomKey})`);

      try {
        let imageURL      = '';
        let imagePublicId = '';

        if (DRY_RUN) {
          if (!fs.existsSync(absoluteImagePath)) {
            console.warn(`         ⚠️  MISSING image: ${absoluteImagePath}`);
            errors.push(`Missing image for "${roomKey}": ${absoluteImagePath}`);
          } else {
            const bytes = fs.statSync(absoluteImagePath).size;
            const kb    = (bytes / 1024).toFixed(0);
            console.log(`         ✅  Found: ${path.basename(absoluteImagePath)}  (${kb} KB)`);
          }
        } else {
          const uploaded = await uploadImage(roomKey, absoluteImagePath);
          imageURL      = uploaded.secure_url;
          imagePublicId = uploaded.public_id;

          await db
            .collection('departments').doc(deptKey)
            .collection('rooms').doc(roomKey)
            .set(
              {
                name         : roomName,
                imageURL,
                imagePublicId,
                sortOrder,
                roomKey,          // stored for easy cross-reference in the app
                deptKey,          // stored for easy cross-reference in the app
                splat3DUrl   : splat3DUrl ?? '',
                updatedAt    : admin.firestore.FieldValue.serverTimestamp(),
              },
              { merge: true }
            );

          console.log(`         ✅  Firestore: departments/${deptKey}/rooms/${roomKey}`);
          console.log(`         🔗  ${imageURL}`);
        }

        roomsDone++;
      } catch (err) {
        const msg = `[${deptKey}/${roomKey}] ${err.message}`;
        console.error(`         ❌  ${msg}`);
        errors.push(msg);
      }
    }
  }

  // ── Summary ─────────────────────────────────────────────────────────────────
  console.log('\n' + '─'.repeat(64));

  if (DRY_RUN) {
    console.log(
      `🟡  Dry run complete.\n` +
      `    ${deptsDone} departments · ${roomsDone} rooms validated.`
    );
  } else {
    console.log(
      `✅  Seed complete.\n` +
      `    ${deptsDone} departments · ${roomsDone} rooms written to Firestore.\n`
    );
    console.log('📝  Next steps:');
    console.log('    1. Verify images load in your app (npm run dev in campusxr/)');
    console.log('    2. Open Admin Panel → use the Hotspot Editor to place navigation');
    console.log('       and info hotspots — follow the tour graph in seed-manifest.json');
    console.log('       under "navigationGraph" → "edges".');
    console.log('    3. Refer to the _tourFlow comments in seed-manifest.json for');
    console.log('       the intended Entrance → Lab/Classroom navigation order.\n');
  }

  if (errors.length > 0) {
    console.log(`\n⚠️  ${errors.length} error(s):`);
    errors.forEach(e => console.log('   •', e));
    process.exit(1);
  }
}

seed().catch(err => {
  console.error('\n💥  Unexpected error:', err.message);
  process.exit(1);
});

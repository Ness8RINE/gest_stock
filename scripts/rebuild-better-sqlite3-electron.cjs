/**
 * Recompile better-sqlite3 dans .next/standalone pour l'ABI Node d'Electron.
 * Le fork Next côté app packagée utilise le runtime Electron (pas le Node du dev),
 * sinon : NODE_MODULE_VERSION mismatch au login Prisma.
 *
 * Utilise @electron/rebuild (prebuilds quand disponibles — pas besoin de VS C++).
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const root = path.join(__dirname, "..");
const standaloneRoot = path.join(root, ".next", "standalone");
const electronPkg = path.join(root, "node_modules", "electron", "package.json");

function main() {
  if (!fs.existsSync(standaloneRoot)) {
    console.error("Absent:", standaloneRoot, "— exécute next build avant ce script.");
    process.exit(1);
  }
  if (!fs.existsSync(electronPkg)) {
    console.error("Absent:", electronPkg);
    process.exit(1);
  }

  const version = JSON.parse(fs.readFileSync(electronPkg, "utf8")).version;

  // 1. Rebuild l'instance principale dans standalone/node_modules
  const mainModuleDir = path.join(standaloneRoot, "node_modules", "better-sqlite3");
  
  if (!fs.existsSync(mainModuleDir)) {
    console.error("Erreur: Instance principale absente dans", mainModuleDir);
    process.exit(1);
  }

  console.log("Étape 1: Recompilation de l'instance principale pour Electron", version);
  try {
    execSync(
      `npx electron-rebuild -f -w better-sqlite3 -m "${standaloneRoot}" -v "${version}" -s`,
      { cwd: root, stdio: "inherit", shell: true }
    );
  } catch (err) {
    console.error("Échec du rebuild electron-rebuild.");
    process.exit(1);
  }

  const rebuiltBinary = path.join(mainModuleDir, "build", "Release", "better_sqlite3.node");
  if (!fs.existsSync(rebuiltBinary)) {
    console.error("Erreur: Binaire recompilé non trouvé à", rebuiltBinary);
    process.exit(1);
  }

  // 2. Propagation aux instances "hachées" créées par Next.js dans .next
  console.log("Étape 2: Propagation du binaire aux copies secondaires...");
  
  function propagate(startPath) {
    if (!fs.existsSync(startPath)) return;
    const files = fs.readdirSync(startPath);
    for (const file of files) {
      const fullPath = path.join(startPath, file);
      if (fs.lstatSync(fullPath).isDirectory()) {
        if (file.startsWith("better-sqlite3") && fullPath !== mainModuleDir) {
          const targetBinaryDir = path.join(fullPath, "build", "Release");
          const targetBinary = path.join(targetBinaryDir, "better_sqlite3.node");
          
          console.log("Mise à jour du binaire dans:", fullPath);
          if (!fs.existsSync(targetBinaryDir)) {
            fs.mkdirSync(targetBinaryDir, { recursive: true });
          }
          fs.copyFileSync(rebuiltBinary, targetBinary);
        } else {
          // On ne descend que dans .next pour gagner du temps
          if (file === ".next") {
            propagate(fullPath);
          } else if (startPath.endsWith(".next")) {
            propagate(fullPath);
          }
        }
      }
    }
  }

  propagate(standaloneRoot);
  console.log("✅ Terminé avec succès !");
}

main();

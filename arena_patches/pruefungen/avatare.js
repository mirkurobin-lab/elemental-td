/* Avatar-Auswahl: fuenf zur Wahl, Helden am Besitz.
   Oertlich ohne CDN faellt jedes Portrait aufs Emoji zurueck — geprueft
   wird deshalb der ZUSTAND und die Geometrie, nicht das Bild. */
const { chromium } = require("playwright-core");
let ok = 0, fehl = 0;
const pruef = (n, w, z) => { if (w) ok++; else { fehl++; console.log("  FEHL " + n + (z ? " -> " + z : "")); } };
(async () => {
  const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const jsF = []; p.on("pageerror", e => jsF.push(String(e).slice(0, 110)));
  await p.goto("file:///home/user/elemental-td/arena_patches/ui_prototype.html", { waitUntil: "load", timeout: 40000 });
  await p.waitForTimeout(2200);

  const kat = await p.evaluate(() => {
    const A = window.ArenaAvatars; A.reset();
    const frei = A.list().filter(a => !a.locked);
    const helden = A.list().filter(a => a.unlockText && /im Besitz/.test(a.unlockText));
    return { freiN: frei.length, frei: frei.map(a => a.key),
             heldenN: helden.length, helden: helden.map(a => a.key),
             heldenGesperrt: helden.every(a => a.locked) };
  });
  pruef("fuenf Avatare stehen sofort zur Wahl", kat.freiN === 5, kat.freiN + ": " + kat.frei.join(","));
  pruef("zwei Helden-Avatare im Katalog", kat.heldenN === 2, kat.helden.join(","));
  pruef("Helden-Avatare sind ohne Besitz gesperrt", kat.heldenGesperrt);

  const bes = await p.evaluate(() => {
    const A = window.ArenaAvatars;
    A.syncUnlocks({ trophaeen: 99999, arena: 8, liga: 9 });
    const ohne = A.list().filter(a => !a.locked).map(a => a.key);
    const r = A.syncUnlocks({ helden: ["solara"] });
    const mit = A.list().filter(a => !a.locked).map(a => a.key);
    return { ohneSolara: ohne.indexOf("solara") < 0, mitSolara: mit.indexOf("solara") >= 0,
             magmorNoch: mit.indexOf("magmor") < 0, gefeiert: r.neu.map(e => e.key) };
  });
  pruef("Trophaeen allein oeffnen keinen Helden-Avatar", bes.ohneSolara);
  pruef("Besitz oeffnet genau diesen Helden", bes.mitSolara && bes.magmorNoch);
  pruef("der neue Helden-Avatar wird gefeiert", bes.gefeiert.indexOf("solara") >= 0, bes.gefeiert.join(","));

  // Auswahl im Profil-Bearbeiten-View
  await p.evaluate(() => window.__proto.show("navEditProfile"));
  await p.waitForTimeout(500);
  const g = await p.evaluate(() => {
    const k = [...document.querySelectorAll("#avGrid [data-avpick]")];
    const waehlbar = k.filter(e => !e.classList.contains("locked"));
    return { n: k.length, waehlbar: waehlbar.length,
             ersteId: waehlbar[0] ? waehlbar[0].getAttribute("data-avpick") : null };
  });
  pruef("das Raster zeigt alle Avatare, auch gesperrte", g.n >= 12, g.n + " Kacheln");
  pruef("mindestens fuenf davon sind waehlbar", g.waehlbar >= 5, g.waehlbar + " waehlbar");

  const w = await p.evaluate(() => {
    const A = window.ArenaAvatars;
    const ziel = A.list().filter(a => !a.locked && a.key !== A.active().avatar.key)[0];
    document.querySelector('#avGrid [data-avpick="' + ziel.key + '"]').click();
    return { gewuenscht: ziel.key, jetzt: A.active().avatar.key };
  });
  pruef("ein Klick im Raster wechselt den Avatar", w.jetzt === w.gewuenscht,
        w.gewuenscht + " -> " + w.jetzt);

  await p.evaluate(() => window.__proto.show("navHome"));
  await p.waitForTimeout(400);
  const oben = await p.evaluate(() => {
    const e = document.getElementById("profAvatar");
    const r = e.getBoundingClientRect();
    return { da: !!e, links: r.left < 120, oben: r.top < 120,
             titel: e.title, breite: Math.round(r.width) };
  });
  pruef("der Avatar steht links oben auf dem Hauptbildschirm",
        oben.da && oben.links && oben.oben, JSON.stringify(oben));
  pruef("er nennt den gewaehlten Avatar", /./.test(oben.titel || ""), oben.titel);
  pruef("keine JS-Fehler", jsF.length === 0, jsF[0]);
  console.log(ok + " ok, " + fehl + " fehlgeschlagen");
  await b.close(); process.exit(fehl ? 1 : 0);
})();

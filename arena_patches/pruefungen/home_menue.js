/* Prueft die zwei Punkte aus IMG_3387/3388:
   1. Kein Ziel des Aufklapp-Menues hat auf der Startseite noch eine
      zweite Kachel — und der KAMPF-Knopf steht trotzdem mittig.
   2. Jeder Menueeintrag traegt ein Bild vor seinem Text, gross genug. */
const { chromium } = require("playwright-core");
let ok = 0, fehl = 0;
const pruef = (name, wahr, zusatz) => {
  if (wahr) { ok++; } else { fehl++; console.log("  FEHL " + name + (zusatz ? " -> " + zusatz : "")); }
};
(async () => {
  const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const jsFehler = [];
  p.on("pageerror", e => jsFehler.push(String(e).slice(0, 100)));
  await p.goto("file:///home/user/elemental-td/arena_patches/ui_prototype.html", { waitUntil: "load", timeout: 40000 });
  await p.waitForTimeout(2000);

  const weg = await p.evaluate(() => ["icoBoard","icoMail","icoVault","icoPack","tileGuide"]
    .filter(id => document.getElementById(id)));
  pruef("keine doppelten Hub-Kacheln mehr", weg.length === 0, weg.join(","));

  const mitte = await p.evaluate(() => {
    const b = document.getElementById("btnBattle").getBoundingClientRect();
    return { versatz: Math.abs((b.left + b.right) / 2 - 390 / 2), breite: Math.round(b.width) };
  });
  pruef("KAMPF steht mittig (<=2 px)", mitte.versatz <= 2, "Versatz " + mitte.versatz.toFixed(1) + " px");

  // Der Menueknopf muss den Zaehler tragen, den die geloeschten Kacheln hatten.
  const z = await p.evaluate(() => {
    window.UIBadge.set("mail", 2); window.UIBadge.set("guide", 1);
    const e = document.getElementById("badgeMenu");
    return e ? { txt: e.textContent, sichtbar: getComputedStyle(e).display !== "none" } : null;
  });
  pruef("Menueknopf traegt Post+Guide als Sammelzaehler", !!z && z.sichtbar && z.txt === "3",
        z ? z.txt + " sichtbar=" + z.sichtbar : "kein #badgeMenu");

  await p.evaluate(() => document.getElementById("tbMenu").click());
  await p.waitForTimeout(500);
  const m = await p.evaluate(() => [...document.querySelectorAll(".tbmi")].map(e => {
    const i = e.querySelector(".ico"); const r = i ? i.getBoundingClientRect() : null;
    const t = e.querySelector(".tbmtx");
    return { txt: (t ? t.firstChild.textContent : "").trim(),
             hatBild: !!i, w: r ? Math.round(r.width) : 0, h: r ? Math.round(r.height) : 0,
             vorText: !!(i && t && i.getBoundingClientRect().right <= t.getBoundingClientRect().left + 1) };
  }));
  // Angepasst 27.07.: fuenf seit dem Community-Eintrag. Die Aussage der
  // Datei ist nicht die Zahl, sondern dass JEDER Eintrag ein lesbares
  // Bild vor seinem Text traegt — das prueft die Schleife darunter.
  pruef("fuenf Menueeintraege", m.length === 5, "sind " + m.length);
  m.forEach(e => {
    pruef("„" + e.txt + "“ hat ein Bild", e.hatBild);
    pruef("„" + e.txt + "“ Bild >= 20 px", e.w >= 20 && e.h >= 20, e.w + "x" + e.h);
    pruef("„" + e.txt + "“ Bild steht VOR dem Text", e.vorText);
  });
  console.log(m.map(e => "  " + e.txt.padEnd(15) + e.w + "x" + e.h).join("\n"));
  pruef("keine JS-Fehler", jsFehler.length === 0, jsFehler[0]);
  console.log(ok + " ok, " + fehl + " fehlgeschlagen");
  await b.close();
  process.exit(fehl ? 1 : 0);
})();

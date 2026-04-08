import { useState, useEffect, useRef } from "react";
import * as THREE from "three";

const F = "'Figtree',sans-serif";

const TIPS = [
  { u: "@adhd_alien", t: "Your brain isn't broken. It just needs the right stimulation to pay attention.", l: "12.4K" },
  { u: "@connordewolfe", t: "ADHD in meetings: my body is here but my brain left to think about dinner.", l: "89.2K" },
  { u: "@daboradoodles", t: "Doodling in meetings isn't rude — it's how some brains stay focused.", l: "34.1K" },
  { u: "@blkgirllostkeys", t: "Fidgeting isn't disrespect. My brain is working overtime to stay present.", l: "45.8K" },
  { u: "@dustyweb", t: "Meetings need mandatory movement breaks every 20 min. For all brains.", l: "67.3K" },
];

const PROMPTS = [
  { t: 0, text: "Watch your companion hop.\nMatch your breathing to its rhythm." },
  { t: 45, text: "Who's speaking right now?\nWhat do they need?" },
  { t: 150, text: "Follow the jumps.\nLet the rhythm anchor you." },
  { t: 300, text: "One deep breath.\nYour companion keeps going." },
  { t: 480, text: "What's one thing worth\nremembering?" },
  { t: 720, text: "You're still here.\nThat's everything." },
];

function buildShadow(mats) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.42, 48, 48), mats.char);
  body.scale.set(0.92, 1.12, 0.88); body.castShadow = true; g.add(body);
  const eG = new THREE.SphereGeometry(0.065, 16, 16);
  const eL = new THREE.Mesh(eG, mats.eye); eL.position.set(-0.11, 0.16, 0.36); g.add(eL);
  const eR = new THREE.Mesh(eG, mats.eye); eR.position.set(0.11, 0.16, 0.36); g.add(eR);
  const wisp = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.004, 0.28, 8), mats.char);
  wisp.position.set(0, 0.58, 0); g.add(wisp);
  const fG = new THREE.SphereGeometry(0.08, 12, 12);
  const fL = new THREE.Mesh(fG, mats.char); fL.position.set(-0.13, -0.5, 0.03); fL.scale.y = 0.55; g.add(fL);
  const fR = new THREE.Mesh(fG, mats.char); fR.position.set(0.13, -0.5, 0.03); fR.scale.y = 0.55; g.add(fR);
  g.userData = { body, wisp, fL, fR, type: "shadow" };
  return g;
}

function buildCat(mats) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.36, 48, 48), mats.char);
  body.scale.set(1, 0.85, 0.82); body.castShadow = true; g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.34, 48, 48), mats.char);
  head.position.set(0, 0.46, 0.05); head.castShadow = true; g.add(head);
  const earG = new THREE.CylinderGeometry(0.004, 0.085, 0.2, 6);
  const earL = new THREE.Mesh(earG, mats.char); earL.position.set(-0.17, 0.78, 0.03); earL.rotation.z = 0.15; g.add(earL);
  const earR = new THREE.Mesh(earG, mats.char); earR.position.set(0.17, 0.78, 0.03); earR.rotation.z = -0.25; g.add(earR);
  const eL = new THREE.Mesh(new THREE.SphereGeometry(0.065, 16, 16), mats.eye); eL.position.set(-0.11, 0.52, 0.28); g.add(eL);
  const eR = new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 16), mats.eye); eR.position.set(0.12, 0.5, 0.28); g.add(eR);
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.018, 0.6, 8), mats.char);
  tail.position.set(-0.18, 0.04, -0.16); tail.rotation.z = 0.7; tail.rotation.x = -0.2; g.add(tail);
  const fG = new THREE.SphereGeometry(0.065, 12, 12);
  const fL = new THREE.Mesh(fG, mats.char); fL.position.set(-0.13, -0.38, 0.05); fL.scale.y = 0.5; g.add(fL);
  const fR = new THREE.Mesh(fG, mats.char); fR.position.set(0.13, -0.38, 0.05); fR.scale.y = 0.5; g.add(fR);
  g.userData = { body, head, tail, fL, fR, type: "cat" };
  return g;
}

function Scene3D({ charId, speed, randomness, dark, paused }) {
  const ref = useRef(null);
  const pausedRef = useRef(paused);
  useEffect(() => { pausedRef.current = paused; }, [paused]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const W = el.clientWidth, H = el.clientHeight;
    const bg = dark ? 0x1c1a17 : 0xf0ebe5;
    const charColor = dark ? 0xc8c0b4 : 0x302c28;
    const eyeColor = dark ? 0x302c28 : 0xf0ebe5;
    const pCols = dark ? [0xb0a898, 0x7a7268, 0x504a44] : [0x302c28, 0x8a8278, 0xc8c0b4];
    const gndCol = dark ? 0x242220 : 0xe0d9d0;

    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = dark ? 0.95 : 1.0;
    renderer.setClearColor(bg);
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(bg, 16, 45);
    const camera = new THREE.PerspectiveCamera(28, W / H, 0.1, 100);
    camera.position.set(0, 5.5, 18);

    scene.add(new THREE.HemisphereLight(dark ? 0x2a2826 : 0xf0ebe4, dark ? 0x151311 : 0xd0c8be, dark ? 0.5 : 0.7));
    const keyL = new THREE.DirectionalLight(dark ? 0xffe8d0 : 0xfff5ea, dark ? 1.2 : 1.4);
    keyL.position.set(5, 14, 8);
    keyL.castShadow = true;
    keyL.shadow.mapSize.set(2048, 2048);
    keyL.shadow.radius = 16;
    keyL.shadow.bias = -0.0008;
    keyL.shadow.camera.left = -20;
    keyL.shadow.camera.right = 20;
    keyL.shadow.camera.top = 10;
    keyL.shadow.camera.bottom = -10;
    keyL.shadow.camera.far = 40;
    scene.add(keyL);
    const fl = new THREE.DirectionalLight(dark ? 0x28242a : 0xe0dcd8, 0.3);
    fl.position.set(-6, 5, -3);
    scene.add(fl);

    const mats = {
      char: new THREE.MeshStandardMaterial({ color: charColor, roughness: 0.88, metalness: 0 }),
      eye: new THREE.MeshStandardMaterial({ color: eyeColor, roughness: 0.4, emissive: eyeColor, emissiveIntensity: dark ? 0.2 : 0.4 }),
      ground: new THREE.MeshStandardMaterial({ color: gndCol, roughness: 1, metalness: 0 }),
    };
    const pMats = pCols.map(function(c) { return new THREE.MeshStandardMaterial({ color: c, roughness: 0.9, metalness: 0 }); });

    const gnd = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), mats.ground);
    gnd.rotation.x = -Math.PI / 2;
    gnd.position.y = -0.5;
    gnd.receiveShadow = true;
    scene.add(gnd);

    const pillars = [];
    const PC = 16, SP = 3.0, SX = -10;
    const seed = Array.from({ length: PC }, function() { return Math.random(); });
    for (let i = 0; i < PC; i++) {
      const h = 0.4 + Math.abs(Math.sin(i * 0.7)) * 1.8 + seed[i] * randomness * 1.5;
      const w = 0.2 + seed[i] * 0.12;
      const m = new THREE.Mesh(new THREE.CylinderGeometry(w, w, h, 20), pMats[i % 3]);
      m.position.set(SX + i * SP, h / 2 - 0.5, 0);
      m.castShadow = true;
      m.receiveShadow = true;
      scene.add(m);
      pillars.push({ mesh: m, height: h, baseX: SX + i * SP });
    }

    const charGroup = charId === "cat" ? buildCat(mats) : buildShadow(mats);
    charGroup.position.set(SX, 0.5, 0);
    charGroup.traverse(function(c) { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
    scene.add(charGroup);

    const clock = new THREE.Clock();
    const BPM = 50 + speed * 50;
    const beatSec = 60 / BPM;
    let charBaseY = 0.5, charX = SX, frameId;

    const animate = function() {
      frameId = requestAnimationFrame(animate);
      if (pausedRef.current) { renderer.render(scene, camera); return; }
      const t = clock.getElapsedTime();
      const beat = Math.floor(t / beatSec);
      const bp = (t / beatSec) % 1;
      const tIdx = beat % PC;
      const tX = pillars[tIdx].baseX;
      const tTopY = pillars[tIdx].height - 0.5 + 0.5;
      charX += (tX - charX) * (0.06 + speed * 0.04);
      charBaseY += (tTopY - charBaseY) * 0.1;
      const arc = Math.sin(bp * Math.PI);
      charGroup.position.x = charX;
      charGroup.position.y = charBaseY + arc * (1.4 + randomness * 0.8);
      const ud = charGroup.userData;
      const st = 1 + arc * 0.14;
      ud.body.scale.y = (ud.type === "shadow" ? 1.12 : 0.85) * st;
      if (ud.type === "shadow") {
        ud.wisp.rotation.z = Math.sin(t * 3) * 0.25;
        ud.fL.position.y = -0.5 + Math.sin(t * 8) * 0.04;
        ud.fR.position.y = -0.5 - Math.sin(t * 8) * 0.04;
      } else {
        if (ud.head) ud.head.position.y = 0.46 + arc * 0.07;
        if (ud.tail) ud.tail.rotation.z = 0.7 + Math.sin(t * 4) * 0.3;
        ud.fL.position.y = -0.38 + Math.sin(t * 8) * 0.04;
        ud.fR.position.y = -0.38 - Math.sin(t * 8) * 0.04;
      }
      camera.position.x += (charX - camera.position.x) * 0.025;
      camera.lookAt(camera.position.x, 1.3, 0);
      keyL.position.x = camera.position.x + 5;
      keyL.target.position.x = camera.position.x;
      keyL.target.updateMatrixWorld();
      pillars.forEach(function(p) {
        if (p.mesh.position.x - camera.position.x < -PC * SP * 0.4) {
          p.mesh.position.x += PC * SP;
          p.baseX += PC * SP;
        }
      });
      renderer.render(scene, camera);
    };
    animate();

    const onResize = function() {
      const nw = el.clientWidth, nh = el.clientHeight;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    };
    window.addEventListener("resize", onResize);
    return function() {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, [charId, speed, randomness, dark]);

  return <div ref={ref} data-esi-scene="true" style={{ position: "absolute", inset: 0 }} />;
}

function GrainOverlay({ dark }) {
  const ref = useRef(null);
  useEffect(function() {
    const c = ref.current;
    const ctx = c.getContext("2d");
    c.width = 200;
    c.height = 200;
    let f, last = 0;
    const draw = function(now) {
      f = requestAnimationFrame(draw);
      if (now - last < 90) return;
      last = now;
      const img = ctx.createImageData(200, 200);
      for (let i = 0; i < img.data.length; i += 4) {
        const v = Math.random() * 255;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
        img.data[i + 3] = dark ? 5 : 8;
      }
      ctx.putImageData(img, 0, 0);
    };
    f = requestAnimationFrame(draw);
    return function() { cancelAnimationFrame(f); };
  }, [dark]);
  return (
    <canvas ref={ref} style={{
      position: "absolute", inset: 0, width: "100%", height: "100%",
      pointerEvents: "none", zIndex: 3,
      opacity: dark ? 0.12 : 0.18,
      mixBlendMode: dark ? "screen" : "multiply",
    }} />
  );
}

function GridBg({ dark }) {
  const c = dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)";
  return (
    <div style={{
      position: "fixed", inset: 14, zIndex: 8, pointerEvents: "none",
      border: "1px solid " + c,
      borderRadius: 22,
    }} />
  );
}

function Breath({ active, dark }) {
  const [p, setP] = useState(0);
  const lbl = ["in", "hold", "out", "hold"];
  useEffect(function() {
    if (!active) return;
    const iv = setInterval(function() { setP(function(v) { return (v + 1) % 4; }); }, 4000);
    return function() { clearInterval(iv); };
  }, [active, p]);
  if (!active) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, justifyContent: "center", padding: "4px 0 10px" }}>
      <div style={{
        width: 28, height: 28, borderRadius: "50%",
        background: dark ? "#c8c0b4" : "#302c28",
        transform: "scale(" + (p === 0 || p === 1 ? 1.35 : 0.7) + ")",
        transition: "transform 4s cubic-bezier(0.4,0,0.2,1)",
      }} />
      <span style={{ fontSize: 11, color: dark ? "#666" : "#999", letterSpacing: 3, fontWeight: 300 }}>{lbl[p]}</span>
    </div>
  );
}

function PipButton({ dark }) {
  const [active, setActive] = useState(false);

  const handlePip = async function() {
    // Close existing PiP
    if (active && window.documentPictureInPicture && window.documentPictureInPicture.window) {
      window.documentPictureInPicture.window.close();
      setActive(false);
      return;
    }

    // Try Document PiP first (persists across tab switches)
    if (window.documentPictureInPicture) {
      try {
        const pipWindow = await window.documentPictureInPicture.requestWindow({
          width: 400, height: 300,
        });
        pipWindow.document.head.insertAdjacentHTML("beforeend",
          '<link href="https://fonts.googleapis.com/css2?family=Figtree:wght@300;400;500;600&display=swap" rel="stylesheet" />'
        );
        pipWindow.document.body.style.margin = "0";
        pipWindow.document.body.style.overflow = "hidden";
        pipWindow.document.body.style.background = dark ? "#1c1a17" : "#f0ebe5";

        const sceneContainer = document.querySelector("[data-esi-scene]");
        const canvas = sceneContainer ? sceneContainer.querySelector("canvas") : null;
        if (canvas) {
          const wrapper = pipWindow.document.createElement("div");
          wrapper.style.cssText = "width:100%;height:100%;position:relative;";
          wrapper.appendChild(canvas);
          pipWindow.document.body.appendChild(wrapper);
        }

        setActive(true);

        pipWindow.addEventListener("pagehide", function() {
          if (canvas && sceneContainer) {
            sceneContainer.appendChild(canvas);
          }
          setActive(false);
        });
        return;
      } catch (e) {
        console.log("Document PiP failed, trying video PiP:", e.message);
      }
    }

    // Fallback: canvas stream PiP
    try {
      const canvas = document.querySelector("canvas");
      if (!canvas) return;
      const stream = canvas.captureStream(30);
      let video = document.getElementById("esi-pip-video");
      if (!video) {
        video = document.createElement("video");
        video.id = "esi-pip-video";
        video.style.display = "none";
        document.body.appendChild(video);
      }
      video.srcObject = stream;
      video.muted = true;
      await video.play();
      await video.requestPictureInPicture();
      setActive(true);
      video.addEventListener("leavepictureinpicture", function() { setActive(false); }, { once: true });
    } catch (e) {
      console.log("PiP not available:", e.message);
    }
  };

  return (
    <button onClick={handlePip} style={{
      background: "none",
      border: "1px solid " + (dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"),
      borderRadius: 10, padding: "8px 14px", cursor: "pointer", fontSize: 11,
      color: active ? (dark ? "#e8e3dd" : "#302c28") : (dark ? "#bbb" : "#888"),
      fontFamily: F, fontWeight: 400, letterSpacing: 0.5,
      display: "flex", alignItems: "center", gap: 6, transition: "all 0.3s ease",
    }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <rect x="12" y="10" width="8" height="6" rx="1" />
      </svg>
      {active ? "close PiP" : "pop out"}
    </button>
  );
}

function SliderInput({ value, onChange, label, dark }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ fontSize: 11, color: dark ? "#555" : "#aaa", width: 72, textAlign: "right", fontWeight: 400, fontFamily: F }}>{label}</span>
      <input type="range" min="0" max="100" value={Math.round(value * 100)}
        onChange={function(e) { onChange(e.target.value / 100); }}
        style={{ flex: 1, height: 2, appearance: "none", background: dark ? "#333" : "#d4cfc8", borderRadius: 1, outline: "none", cursor: "pointer", accentColor: dark ? "#888" : "#2a2724" }}
      />
    </div>
  );
}

export default function App() {
  const [on, setOn] = useState(false);
  const [sec, setSec] = useState(0);
  const [run, setRun] = useState(false);
  const [notes, setNotes] = useState([]);
  const [ni, setNi] = useState("");
  const [br, setBr] = useState(false);
  const [sn, setSn] = useState(false);
  const [ti, setTi] = useState(0);
  const [fade, setFade] = useState(false);
  const [charId, setCharId] = useState("shadow");
  const [speed, setSpeed] = useState(0.44);
  const [rnd, setRnd] = useState(0.3);
  const [dark, setDark] = useState(false);
  const iv = useRef(null);

  useEffect(function() {
    if (run) iv.current = setInterval(function() { setSec(function(s) { return s + 1; }); }, 1000);
    return function() { clearInterval(iv.current); };
  }, [run]);

  useEffect(function() {
    const t = setInterval(function() {
      setFade(true);
      setTimeout(function() {
        setTi(function(i) { return (i + 1) % TIPS.length; });
        setFade(false);
      }, 350);
    }, 14000);
    return function() { clearInterval(t); };
  }, []);

  const mm = String(Math.floor(sec / 60)).padStart(2, "0");
  const ss = String(sec % 60).padStart(2, "0");
  const prompt = PROMPTS.slice().reverse().find(function(p) { return sec >= p.t; });
  const promptText = prompt ? prompt.text : PROMPTS[0].text;

  const addNote = function() {
    if (!ni.trim()) return;
    const ts = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setNotes(function(n) { return n.concat([{ t: ni.trim(), ts: ts }]); });
    setNi("");
  };
  const reset = function() { setOn(false); setRun(false); setSec(0); setNotes([]); setBr(false); setSn(false); };

  const bg = dark ? "#1c1a17" : "#f0ebe5";
  const fg = dark ? "#c8c0b4" : "#302c28";
  const sub = dark ? "#706860" : "#8a8278";
  const faint = dark ? "#3a3630" : "#c0b8ae";
  const cardBg = dark ? "rgba(28,26,23,0.85)" : "rgba(240,235,229,0.82)";
  const cardBd = dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.06)";

  const card = {
    background: cardBg, borderRadius: 18,
    border: "1px solid " + cardBd,
    backdropFilter: "blur(40px)", WebkitBackdropFilter: "blur(40px)",
  };

  const pillBtn = function(act) {
    return {
      background: act ? (dark ? "rgba(255,255,255,0.07)" : "rgba(48,44,40,0.06)") : "transparent",
      border: "1px solid " + (act ? (dark ? "rgba(255,255,255,0.12)" : "rgba(48,44,40,0.12)") : cardBd),
      borderRadius: 50, padding: "10px 22px", fontSize: 12,
      color: act ? fg : sub, cursor: "pointer", fontWeight: 400,
      letterSpacing: 0.5, transition: "all 0.3s ease", fontFamily: F,
    };
  };

  const sceneProps = { charId: charId, speed: speed, randomness: rnd, dark: dark, paused: !run };

  // ── HOME ──
  if (!on) {
    return (
      <div style={{ minHeight: "100vh", position: "relative", overflow: "hidden", fontFamily: F, color: fg }}>
        <Scene3D charId={sceneProps.charId} speed={sceneProps.speed} randomness={sceneProps.randomness} dark={sceneProps.dark} paused={sceneProps.paused} />
        <GrainOverlay dark={dark} />
        <GridBg dark={dark} />

        <div style={{ position: "relative", zIndex: 10, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: 20 }}>
          <div style={Object.assign({}, card, { padding: "32px 28px", textAlign: "center", maxWidth: 380, width: "100%" })}>
            <p style={{ fontSize: 10, color: faint, letterSpacing: 5, fontWeight: 400, margin: "0 0 4px" }}>RHYTHMIC FOCUS</p>
            <h1 style={{ fontSize: 34, fontWeight: 300, color: fg, margin: 0, letterSpacing: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
              <img src="/logo.png" alt="Esi" style={{ width: 36, height: 36, objectFit: "contain" }}
                onError={function(e) { e.target.style.display = "none"; }} />
              Esi
            </h1>
            <p style={{ color: sub, fontSize: 13, lineHeight: 1.8, margin: "12px 0 20px", fontWeight: 300 }}>
              Your companion hops in a steady rhythm —<br />a visual anchor for your ADHD brain.
            </p>

            {/* Character select */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
              {[{ id: "shadow", n: "Shadow", d: "mysterious & calm" }, { id: "cat", n: "Odd Cat", d: "weird & curious" }].map(function(c) {
                var isActive = charId === c.id;
                return (
                  <button key={c.id} onClick={function() { setCharId(c.id); }} style={{
                    padding: "14px 10px", borderRadius: 14, cursor: "pointer", fontFamily: F,
                    background: isActive ? (dark ? "rgba(255,255,255,0.06)" : "rgba(48,44,40,0.05)") : "transparent",
                    border: "1px solid " + (isActive ? (dark ? "rgba(255,255,255,0.1)" : "rgba(48,44,40,0.1)") : cardBd),
                    transition: "all 0.3s ease", textAlign: "center", color: fg,
                  }}>
                    <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>{c.n}</div>
                    <div style={{ fontSize: 10, color: sub, fontWeight: 300 }}>{c.d}</div>
                  </button>
                );
              })}
            </div>

            {/* Sliders */}
            <div style={{ display: "grid", gap: 6, marginBottom: 14 }}>
              <SliderInput value={speed} onChange={setSpeed} label="speed" dark={dark} />
              <SliderInput value={rnd} onChange={setRnd} label="chaos" dark={dark} />
            </div>

            {/* Toggles */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 18 }}>
              <button onClick={function() { setDark(!dark); }} style={pillBtn(dark)}>{dark ? "● dark" : "○ dark"}</button>
              <button disabled style={Object.assign({}, pillBtn(false), { opacity: 0.4, cursor: "not-allowed" })}>2d · soon</button>
            </div>

            {/* X tip */}
            <div style={{
              background: dark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)",
              borderRadius: 12, padding: "10px 13px", marginBottom: 18, textAlign: "left",
              border: "1px solid " + cardBd,
              opacity: fade ? 0 : 1, transition: "opacity 0.35s ease",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: fg }}>&#x1D54F;</span>
                <span style={{ fontSize: 10, color: sub }}>{TIPS[ti].u}</span>
                <span style={{ fontSize: 9, color: faint, marginLeft: "auto" }}>&#9825; {TIPS[ti].l}</span>
              </div>
              <p style={{ fontSize: 12, color: sub, lineHeight: 1.6, margin: 0, fontWeight: 300 }}>{TIPS[ti].t}</p>
            </div>

            {/* Begin button */}
            <button onClick={function() { setOn(true); setRun(true); }} style={{
              background: fg, border: "none", color: bg,
              padding: "14px 0", borderRadius: 50, fontSize: 13,
              cursor: "pointer", letterSpacing: 2, fontWeight: 400,
              width: "100%", fontFamily: F, transition: "opacity 0.3s ease",
            }}
            onMouseOver={function(e) { e.currentTarget.style.opacity = "0.85"; }}
            onMouseOut={function(e) { e.currentTarget.style.opacity = "1"; }}
            >begin session</button>

            {/* Footer links */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginTop: 16 }}>
              <a href="https://x.com/Meworkees" target="_blank" rel="noopener noreferrer"
                style={{ fontSize: 11, color: sub, textDecoration: "none", fontWeight: 400, display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ fontWeight: 600, fontSize: 12 }}>&#x1D54F;</span> say hi
              </a>
              <span style={{ color: faint, fontSize: 8 }}>·</span>
              <a href="https://buymeacoffee.com/meworkeesS" target="_blank" rel="noopener noreferrer"
                style={{ fontSize: 11, color: sub, textDecoration: "none", fontWeight: 300 }}>&#9749; support</a>
            </div>
            <p style={{ marginTop: 10, fontSize: 9, color: faint, letterSpacing: 1.5 }}>built on rhythmic attention research</p>
          </div>
        </div>
      </div>
    );
  }

  // ── SESSION ──
  return (
    <div style={{ minHeight: "100vh", position: "relative", overflow: "hidden", fontFamily: F, color: fg }}>
      <Scene3D charId={sceneProps.charId} speed={sceneProps.speed} randomness={sceneProps.randomness} dark={sceneProps.dark} paused={sceneProps.paused} />
      <GrainOverlay dark={dark} />
      <GridBg dark={dark} />

      <div style={{ position: "relative", zIndex: 10, maxWidth: 440, margin: "0 auto", padding: "14px 20px 210px" }}>
        {/* Top bar */}
        <div style={Object.assign({}, card, { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 14px", marginBottom: 20 })}>
          <button onClick={reset} style={{ background: "none", border: "none", color: sub, fontSize: 12, cursor: "pointer", fontWeight: 300, fontFamily: F }}>&#8592; end</button>
          <span style={{ fontSize: 20, fontWeight: 300, color: fg, fontVariantNumeric: "tabular-nums", letterSpacing: 4 }}>{mm}:{ss}</span>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <PipButton dark={dark} />
            <button onClick={function() { setRun(!run); }} style={{ background: "none", border: "none", color: sub, fontSize: 12, cursor: "pointer", fontWeight: 300, fontFamily: F }}>{run ? "pause" : "play"}</button>
          </div>
        </div>

        {/* Prompt */}
        <div style={{ textAlign: "center", marginBottom: 14 }}>
          <p style={{ fontSize: 18, fontWeight: 300, color: fg, lineHeight: 1.85, margin: 0, whiteSpace: "pre-line", opacity: 0.85 }}>{promptText}</p>
        </div>

        <Breath active={br} dark={dark} />

        {/* X tip */}
        <div style={Object.assign({}, card, { padding: "10px 13px", marginTop: 6, opacity: fade ? 0 : 1, transition: "opacity 0.35s ease" })}>
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: fg }}>&#x1D54F;</span>
            <span style={{ fontSize: 10, color: sub }}>{TIPS[ti].u}</span>
            <span style={{ fontSize: 9, color: faint, marginLeft: "auto" }}>&#9825; {TIPS[ti].l}</span>
          </div>
          <p style={{ fontSize: 12, color: sub, lineHeight: 1.55, margin: 0, fontWeight: 300 }}>{TIPS[ti].t}</p>
        </div>
      </div>

      {/* Bottom bar */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 30,
        background: dark ? "rgba(26,24,22,0.75)" : "rgba(234,229,223,0.7)",
        backdropFilter: "blur(44px) saturate(1.4)", WebkitBackdropFilter: "blur(44px) saturate(1.4)",
        borderTop: "1px solid " + cardBd, padding: "12px 20px 26px",
      }}>
        <div style={{ maxWidth: 440, margin: "0 auto" }}>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", marginBottom: sn ? 12 : 0 }}>
            <button onClick={function() { setBr(!br); }} style={pillBtn(br)}>{br ? "● breathing" : "breathe"}</button>
            <button onClick={function() { setSn(!sn); }} style={pillBtn(sn)}>{notes.length > 0 ? notes.length + " note" + (notes.length > 1 ? "s" : "") : "jot"}</button>
          </div>

          {sn && (
            <div style={Object.assign({}, card, { padding: 12 })}>
              <div style={{ display: "flex", gap: 8, marginBottom: notes.length ? 8 : 0 }}>
                <input value={ni} onChange={function(e) { setNi(e.target.value); }}
                  onKeyDown={function(e) { if (e.key === "Enter") addNote(); }}
                  placeholder="capture a thought..."
                  style={{
                    flex: 1, background: dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
                    border: "none", borderRadius: 12, padding: "11px 14px",
                    color: fg, fontSize: 13, outline: "none", fontWeight: 300, fontFamily: F,
                  }}
                />
                <button onClick={addNote} style={{
                  background: fg, border: "none", color: bg,
                  borderRadius: 12, width: 42, height: 42, fontSize: 17, cursor: "pointer",
                }}>+</button>
              </div>
              <div style={{ maxHeight: 100, overflowY: "auto" }}>
                {notes.map(function(n, i) {
                  return (
                    <div key={i} style={{
                      padding: "6px 0", fontSize: 12, color: sub, fontWeight: 300,
                      borderBottom: i < notes.length - 1 ? "1px solid " + cardBd : "none",
                      display: "flex", gap: 8,
                    }}>
                      <span style={{ color: faint, fontSize: 10, flexShrink: 0, marginTop: 1 }}>{n.ts}</span>
                      <span>{n.t}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginTop: 10 }}>
            <a href="https://x.com/Meworkees" target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 10, color: faint, textDecoration: "none" }}>&#x1D54F; @Meworkees</a>
            <span style={{ color: faint, fontSize: 8 }}>·</span>
            <a href="https://buymeacoffee.com/meworkeesS" target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 10, color: faint, textDecoration: "none" }}>&#9749; support</a>
          </div>
        </div>
      </div>
    </div>
  );
}
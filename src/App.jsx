import { useState, useEffect, useRef } from "react";
import * as THREE from "three";

var F = "'Figtree',sans-serif";

var TIPS = [
  { u: "@adhd_alien", t: "Your brain isn't broken. It just needs the right stimulation to pay attention.", l: "12.4K" },
  { u: "@connordewolfe", t: "ADHD in meetings: my body is here but my brain left to think about dinner.", l: "89.2K" },
  { u: "@daboradoodles", t: "Doodling in meetings isn't rude \u2014 it's how some brains stay focused.", l: "34.1K" },
  { u: "@blkgirllostkeys", t: "Fidgeting isn't disrespect. My brain is working overtime to stay present.", l: "45.8K" },
  { u: "@dustyweb", t: "Meetings need mandatory movement breaks every 20 min. For all brains.", l: "67.3K" },
];

var PROMPTS = [
  { t: 0, text: "Watch your companion hop.\nMatch your breathing to its rhythm." },
  { t: 45, text: "Who's speaking right now?\nWhat do they need?" },
  { t: 150, text: "Follow the jumps.\nLet the rhythm anchor you." },
  { t: 300, text: "One deep breath.\nYour companion keeps going." },
  { t: 480, text: "What's one thing worth\nremembering?" },
  { t: 720, text: "You're still here.\nThat's everything." },
];

function buildShadow(mats) {
  var g = new THREE.Group();
  var body = new THREE.Mesh(new THREE.SphereGeometry(0.42, 48, 48), mats.char);
  body.scale.set(0.92, 1.12, 0.88);
  body.castShadow = true;
  g.add(body);
  var eG = new THREE.SphereGeometry(0.065, 16, 16);
  var eL = new THREE.Mesh(eG, mats.eye);
  eL.position.set(-0.11, 0.16, 0.36);
  g.add(eL);
  var eR = new THREE.Mesh(eG, mats.eye);
  eR.position.set(0.11, 0.16, 0.36);
  g.add(eR);
  var wisp = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.004, 0.28, 8), mats.char);
  wisp.position.set(0, 0.58, 0);
  g.add(wisp);
  var fG = new THREE.SphereGeometry(0.08, 12, 12);
  var fL = new THREE.Mesh(fG, mats.char);
  fL.position.set(-0.13, -0.5, 0.03);
  fL.scale.y = 0.55;
  g.add(fL);
  var fR = new THREE.Mesh(fG, mats.char);
  fR.position.set(0.13, -0.5, 0.03);
  fR.scale.y = 0.55;
  g.add(fR);
  g.userData = { body: body, wisp: wisp, fL: fL, fR: fR, type: "shadow" };
  return g;
}

function buildCat(mats) {
  var g = new THREE.Group();
  var body = new THREE.Mesh(new THREE.SphereGeometry(0.36, 48, 48), mats.char);
  body.scale.set(1, 0.85, 0.82);
  body.castShadow = true;
  g.add(body);
  var head = new THREE.Mesh(new THREE.SphereGeometry(0.34, 48, 48), mats.char);
  head.position.set(0, 0.46, 0.05);
  head.castShadow = true;
  g.add(head);
  var earG = new THREE.CylinderGeometry(0.004, 0.085, 0.2, 6);
  var earL = new THREE.Mesh(earG, mats.char);
  earL.position.set(-0.17, 0.78, 0.03);
  earL.rotation.z = 0.15;
  g.add(earL);
  var earR = new THREE.Mesh(earG, mats.char);
  earR.position.set(0.17, 0.78, 0.03);
  earR.rotation.z = -0.25;
  g.add(earR);
  var eL = new THREE.Mesh(new THREE.SphereGeometry(0.065, 16, 16), mats.eye);
  eL.position.set(-0.11, 0.52, 0.28);
  g.add(eL);
  var eR = new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 16), mats.eye);
  eR.position.set(0.12, 0.5, 0.28);
  g.add(eR);
  var tail = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.018, 0.6, 8), mats.char);
  tail.position.set(-0.18, 0.04, -0.16);
  tail.rotation.z = 0.7;
  tail.rotation.x = -0.2;
  g.add(tail);
  var fG = new THREE.SphereGeometry(0.065, 12, 12);
  var fL = new THREE.Mesh(fG, mats.char);
  fL.position.set(-0.13, -0.38, 0.05);
  fL.scale.y = 0.5;
  g.add(fL);
  var fR = new THREE.Mesh(fG, mats.char);
  fR.position.set(0.13, -0.38, 0.05);
  fR.scale.y = 0.5;
  g.add(fR);
  g.userData = { body: body, head: head, tail: tail, fL: fL, fR: fR, type: "cat" };
  return g;
}

// Global ref so PiP can access the renderer
var sceneState = { renderer: null, scene: null, camera: null, clock: null, charGroup: null, pillars: null, keyL: null, pausedRef: null, props: null, charX: 0, charBaseY: 0.5, PC: 16, SP: 3.0 };

function Scene3D(props) {
  var ref = useRef(null);
  var pausedRef = useRef(props.paused);
  useEffect(function() { pausedRef.current = props.paused; }, [props.paused]);

  useEffect(function() {
    var el = ref.current;
    if (!el) return;
    var W = el.clientWidth;
    var H = el.clientHeight;
    var bg = props.dark ? 0x1c1a17 : 0xf0ebe5;
    var charColor = props.dark ? 0xc8c0b4 : 0x302c28;
    var eyeColor = props.dark ? 0x302c28 : 0xf0ebe5;
    var pCols = props.dark ? [0xb0a898, 0x7a7268, 0x504a44] : [0x302c28, 0x8a8278, 0xc8c0b4];
    var gndCol = props.dark ? 0x242220 : 0xe0d9d0;

    var renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = props.dark ? 0.95 : 1.0;
    renderer.setClearColor(bg);
    el.appendChild(renderer.domElement);

    var scene = new THREE.Scene();
    scene.fog = new THREE.Fog(bg, 16, 45);
    var camera = new THREE.PerspectiveCamera(28, W / H, 0.1, 100);
    camera.position.set(0, 5.5, 18);

    scene.add(new THREE.HemisphereLight(props.dark ? 0x2a2826 : 0xf0ebe4, props.dark ? 0x151311 : 0xd0c8be, props.dark ? 0.5 : 0.7));
    var keyL = new THREE.DirectionalLight(props.dark ? 0xffe8d0 : 0xfff5ea, props.dark ? 1.2 : 1.4);
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
    var fl = new THREE.DirectionalLight(props.dark ? 0x28242a : 0xe0dcd8, 0.3);
    fl.position.set(-6, 5, -3);
    scene.add(fl);

    var mats = {
      char: new THREE.MeshStandardMaterial({ color: charColor, roughness: 0.88, metalness: 0 }),
      eye: new THREE.MeshStandardMaterial({ color: eyeColor, roughness: 0.4, emissive: eyeColor, emissiveIntensity: props.dark ? 0.2 : 0.4 }),
      ground: new THREE.MeshStandardMaterial({ color: gndCol, roughness: 1, metalness: 0 }),
    };
    var pMats = pCols.map(function(c) {
      return new THREE.MeshStandardMaterial({ color: c, roughness: 0.9, metalness: 0 });
    });

    var gnd = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), mats.ground);
    gnd.rotation.x = -Math.PI / 2;
    gnd.position.y = -0.5;
    gnd.receiveShadow = true;
    scene.add(gnd);

    var pillars = [];
    var PC = 16;
    var SP = 3.0;
    var SX = -10;
    var seed = [];
    for (var s = 0; s < PC; s++) { seed.push(Math.random()); }

    for (var i = 0; i < PC; i++) {
      var h = 0.4 + Math.abs(Math.sin(i * 0.7)) * 1.8 + seed[i] * props.randomness * 1.5;
      var w = 0.2 + seed[i] * 0.12;
      var m = new THREE.Mesh(new THREE.CylinderGeometry(w, w, h, 20), pMats[i % 3]);
      m.position.set(SX + i * SP, h / 2 - 0.5, 0);
      m.castShadow = true;
      m.receiveShadow = true;
      scene.add(m);
      pillars.push({ mesh: m, height: h, baseX: SX + i * SP });
    }

    var charGroup = props.charId === "cat" ? buildCat(mats) : buildShadow(mats);
    charGroup.position.set(SX, 0.5, 0);
    charGroup.traverse(function(c) {
      if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; }
    });
    scene.add(charGroup);

    var clock = new THREE.Clock();
    var BPM = 50 + props.speed * 50;
    var beatSec = 60 / BPM;
    var charBaseY = 0.5;
    var charX = SX;
    var frameId;
    var bgInterval = null;

    // Store in global ref for PiP access
    sceneState.renderer = renderer;
    sceneState.scene = scene;
    sceneState.camera = camera;
    sceneState.clock = clock;
    sceneState.charGroup = charGroup;
    sceneState.pillars = pillars;
    sceneState.keyL = keyL;
    sceneState.pausedRef = pausedRef;
    sceneState.props = props;
    sceneState.charX = charX;
    sceneState.charBaseY = charBaseY;

    var doFrame = function() {
      if (pausedRef.current) {
        renderer.render(scene, camera);
        return;
      }
      var t = clock.getElapsedTime();
      var beat = Math.floor(t / beatSec);
      var bp = (t / beatSec) % 1;
      var tIdx = beat % PC;
      var tXp = pillars[tIdx].baseX;
      var tTopY = pillars[tIdx].height - 0.5 + 0.5;
      sceneState.charX += (tXp - sceneState.charX) * (0.06 + props.speed * 0.04);
      sceneState.charBaseY += (tTopY - sceneState.charBaseY) * 0.1;
      var arc = Math.sin(bp * Math.PI);
      charGroup.position.x = sceneState.charX;
      charGroup.position.y = sceneState.charBaseY + arc * (1.4 + props.randomness * 0.8);
      var ud = charGroup.userData;
      var st = 1 + arc * 0.14;
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
      camera.position.x += (sceneState.charX - camera.position.x) * 0.025;
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

    var animate = function() {
      frameId = requestAnimationFrame(animate);
      doFrame();
    };
    animate();

    // Background interval keeps rendering when tab is hidden (for PiP)
    bgInterval = setInterval(function() {
      if (document.hidden) {
        doFrame();
      }
    }, 1000 / 30);

    var onResize = function() {
      var nw = el.clientWidth;
      var nh = el.clientHeight;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    };
    window.addEventListener("resize", onResize);

    return function() {
      cancelAnimationFrame(frameId);
      clearInterval(bgInterval);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      sceneState.renderer = null;
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, [props.charId, props.speed, props.randomness, props.dark]);

  return <div ref={ref} data-esi-scene="true" style={{ position: "absolute", inset: 0 }} />;
}

function GrainOverlay(props) {
  var ref = useRef(null);
  useEffect(function() {
    var c = ref.current;
    var ctx = c.getContext("2d");
    c.width = 200;
    c.height = 200;
    var f;
    var last = 0;
    var draw = function(now) {
      f = requestAnimationFrame(draw);
      if (now - last < 90) return;
      last = now;
      var img = ctx.createImageData(200, 200);
      for (var i = 0; i < img.data.length; i += 4) {
        var v = Math.random() * 255;
        img.data[i] = v;
        img.data[i + 1] = v;
        img.data[i + 2] = v;
        img.data[i + 3] = props.dark ? 5 : 8;
      }
      ctx.putImageData(img, 0, 0);
    };
    f = requestAnimationFrame(draw);
    return function() { cancelAnimationFrame(f); };
  }, [props.dark]);
  return (
    <canvas ref={ref} style={{
      position: "absolute", inset: 0, width: "100%", height: "100%",
      pointerEvents: "none", zIndex: 3,
      opacity: props.dark ? 0.12 : 0.18,
      mixBlendMode: props.dark ? "screen" : "multiply",
    }} />
  );
}

function GridBg(props) {
  var inset = typeof window !== "undefined" && window.innerWidth < 500 ? 8 : 14;
  var c = props.dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)";
  return (
    <div style={{
      position: "fixed", inset: inset, zIndex: 8, pointerEvents: "none",
      border: "1px solid " + c,
      borderRadius: inset === 8 ? 16 : 22,
    }} />
  );
}

function Breath(props) {
  var _s = useState(0);
  var p = _s[0];
  var setP = _s[1];
  var lbl = ["in", "hold", "out", "hold"];
  useEffect(function() {
    if (!props.active) return;
    var iv = setInterval(function() {
      setP(function(v) { return (v + 1) % 4; });
    }, 4000);
    return function() { clearInterval(iv); };
  }, [props.active, p]);
  if (!props.active) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, justifyContent: "center", padding: "4px 0 10px" }}>
      <div style={{
        width: 28, height: 28, borderRadius: "50%",
        background: props.dark ? "#c8c0b4" : "#302c28",
        transform: "scale(" + (p === 0 || p === 1 ? 1.35 : 0.7) + ")",
        transition: "transform 4s cubic-bezier(0.4,0,0.2,1)",
      }} />
      <span style={{ fontSize: 11, color: props.dark ? "#666" : "#999", letterSpacing: 3, fontWeight: 300 }}>{lbl[p]}</span>
    </div>
  );
}

function PipButton(props) {
  var _s = useState(false);
  var active = _s[0];
  var setActive = _s[1];
  var popupRef = useRef(null);

  var handlePip = function() {
    // Close existing
    if (active && popupRef.current && !popupRef.current.closed) {
      popupRef.current.close();
      popupRef.current = null;
      setActive(false);
      return;
    }

    // Build the HTML as a blob URL — this makes it a standalone page
    // that Arc and other browsers treat as a real independent window
    var isDark = props.dark;
    var bgHex = isDark ? "#1c1a17" : "#f0ebe5";
    var charHex = isDark ? "0xc8c0b4" : "0x302c28";
    var eyeHex = isDark ? "0x302c28" : "0xf0ebe5";
    var gndHex = isDark ? "0x242220" : "0xe0d9d0";
    var p1 = isDark ? "0xb0a898" : "0x302c28";
    var p2 = isDark ? "0x7a7268" : "0x8a8278";
    var p3 = isDark ? "0x504a44" : "0xc8c0b4";
    var bgVal = isDark ? "0x1c1a17" : "0xf0ebe5";
    var hemiA = isDark ? "0x2a2826" : "0xf0ebe4";
    var hemiB = isDark ? "0x151311" : "0xd0c8be";
    var hemiI = isDark ? "0.5" : "0.7";
    var keyCol = isDark ? "0xffe8d0" : "0xfff5ea";
    var keyI = isDark ? "1.2" : "1.4";
    var toneExp = isDark ? "0.95" : "1.0";

    var html = [
      '<!DOCTYPE html>',
      '<html><head><meta charset="utf-8"><title>Esi \u2014 Focus Companion</title>',
      '<style>*{margin:0;padding:0}body{overflow:hidden;background:' + bgHex + ';width:100vw;height:100vh}</style>',
      '</head><body>',
      '<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"><\/script>',
      '<script>',
      'var W=window.innerWidth,H=window.innerHeight;',
      'var r=new THREE.WebGLRenderer({antialias:true});r.setSize(W,H);r.setPixelRatio(Math.min(window.devicePixelRatio,2));',
      'r.shadowMap.enabled=true;r.shadowMap.type=THREE.PCFSoftShadowMap;',
      'r.toneMapping=THREE.ACESFilmicToneMapping;r.toneMappingExposure=' + toneExp + ';',
      'r.setClearColor(' + bgVal + ');document.body.appendChild(r.domElement);',
      'var s=new THREE.Scene();s.fog=new THREE.Fog(' + bgVal + ',16,45);',
      'var cam=new THREE.PerspectiveCamera(28,W/H,0.1,100);cam.position.set(0,5.5,18);',
      's.add(new THREE.HemisphereLight(' + hemiA + ',' + hemiB + ',' + hemiI + '));',
      'var kL=new THREE.DirectionalLight(' + keyCol + ',' + keyI + ');',
      'kL.position.set(5,14,8);kL.castShadow=true;kL.shadow.mapSize.set(1024,1024);kL.shadow.radius=12;kL.shadow.bias=-0.001;',
      'kL.shadow.camera.left=-20;kL.shadow.camera.right=20;kL.shadow.camera.top=10;kL.shadow.camera.bottom=-10;s.add(kL);',
      'var cM=new THREE.MeshStandardMaterial({color:' + charHex + ',roughness:0.88,metalness:0});',
      'var eM=new THREE.MeshStandardMaterial({color:' + eyeHex + ',roughness:0.4,emissive:' + eyeHex + ',emissiveIntensity:0.3});',
      'var gn=new THREE.Mesh(new THREE.PlaneGeometry(80,80),new THREE.MeshStandardMaterial({color:' + gndHex + ',roughness:1}));',
      'gn.rotation.x=-Math.PI/2;gn.position.y=-0.5;gn.receiveShadow=true;s.add(gn);',
      'var pM=[new THREE.MeshStandardMaterial({color:' + p1 + ',roughness:0.9}),new THREE.MeshStandardMaterial({color:' + p2 + ',roughness:0.9}),new THREE.MeshStandardMaterial({color:' + p3 + ',roughness:0.9})];',
      'var pl=[],PC=16,SP=3,SX=-10,sd=[];for(var i=0;i<PC;i++)sd.push(Math.random());',
      'for(var i=0;i<PC;i++){var h=0.4+Math.abs(Math.sin(i*0.7))*1.8+sd[i]*0.45;var w=0.2+sd[i]*0.12;',
      'var m=new THREE.Mesh(new THREE.CylinderGeometry(w,w,h,16),pM[i%3]);m.position.set(SX+i*SP,h/2-0.5,0);m.castShadow=true;m.receiveShadow=true;s.add(m);',
      'pl.push({mesh:m,height:h,baseX:SX+i*SP});}',
      'var cG=new THREE.Group();',
      'var bd=new THREE.Mesh(new THREE.SphereGeometry(0.42,32,32),cM);bd.scale.set(0.92,1.12,0.88);bd.castShadow=true;cG.add(bd);',
      'var eg=new THREE.SphereGeometry(0.065,12,12);',
      'var el=new THREE.Mesh(eg,eM);el.position.set(-0.11,0.16,0.36);cG.add(el);',
      'var er=new THREE.Mesh(eg,eM);er.position.set(0.11,0.16,0.36);cG.add(er);',
      'var wi=new THREE.Mesh(new THREE.CylinderGeometry(0.018,0.004,0.28,8),cM);wi.position.set(0,0.58,0);cG.add(wi);',
      'var fg=new THREE.SphereGeometry(0.08,8,8);',
      'var fl=new THREE.Mesh(fg,cM);fl.position.set(-0.13,-0.5,0.03);fl.scale.y=0.55;cG.add(fl);',
      'var fr=new THREE.Mesh(fg,cM);fr.position.set(0.13,-0.5,0.03);fr.scale.y=0.55;cG.add(fr);',
      'cG.position.set(SX,0.5,0);cG.traverse(function(c){if(c.isMesh)c.castShadow=true;});s.add(cG);',
      'var ck=new THREE.Clock(),cX=SX,cY=0.5,bs=60/72;',
      'function anim(){requestAnimationFrame(anim);var t=ck.getElapsedTime();',
      'var bt=Math.floor(t/bs),bp=(t/bs)%1,ti=bt%PC;',
      'var tX=pl[ti].baseX,tY=pl[ti].height-0.5+0.5;',
      'cX+=(tX-cX)*0.08;cY+=(tY-cY)*0.1;var a=Math.sin(bp*Math.PI);',
      'cG.position.x=cX;cG.position.y=cY+a*1.6;',
      'bd.scale.y=1.12*(1+a*0.14);wi.rotation.z=Math.sin(t*3)*0.25;',
      'fl.position.y=-0.5+Math.sin(t*8)*0.04;fr.position.y=-0.5-Math.sin(t*8)*0.04;',
      'cam.position.x+=(cX-cam.position.x)*0.025;cam.lookAt(cam.position.x,1.3,0);',
      'kL.position.x=cam.position.x+5;kL.target.position.x=cam.position.x;kL.target.updateMatrixWorld();',
      'pl.forEach(function(p){if(p.mesh.position.x-cam.position.x<-PC*SP*0.4){p.mesh.position.x+=PC*SP;p.baseX+=PC*SP;}});',
      'r.render(s,cam);}anim();',
      'window.addEventListener("resize",function(){W=window.innerWidth;H=window.innerHeight;cam.aspect=W/H;cam.updateProjectionMatrix();r.setSize(W,H);});',
      '<\/script></body></html>'
    ].join("\n");

    var blob = new Blob([html], { type: "text/html" });
    var url = URL.createObjectURL(blob);

    var w = 420;
    var h = 300;
    var left = window.screen.width - w - 30;
    var top = 30;
    var popup = window.open(url, "_blank", "width=" + w + ",height=" + h + ",left=" + left + ",top=" + top + ",resizable=yes,scrollbars=no,toolbar=no,menubar=no,location=no,status=no");

    if (!popup) {
      URL.revokeObjectURL(url);
      alert("Please allow popups for this site to use pop-out.");
      return;
    }

    popupRef.current = popup;
    setActive(true);

    var checkClosed = setInterval(function() {
      if (!popup || popup.closed) {
        clearInterval(checkClosed);
        URL.revokeObjectURL(url);
        popupRef.current = null;
        setActive(false);
      }
    }, 500);
  };

  return (
    <button onClick={handlePip} style={{
      background: "none",
      border: "1px solid " + (props.dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"),
      borderRadius: 10, padding: "8px 14px", cursor: "pointer", fontSize: 11,
      color: active ? (props.dark ? "#e8e3dd" : "#302c28") : (props.dark ? "#bbb" : "#888"),
      fontFamily: F, fontWeight: 400, letterSpacing: 0.5,
      display: "flex", alignItems: "center", gap: 6, transition: "all 0.3s ease",
    }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <rect x="12" y="10" width="8" height="6" rx="1" />
      </svg>
      {active ? "close" : "pop out"}
    </button>
  );
}

function SliderInput(props) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ fontSize: 11, color: props.dark ? "#555" : "#aaa", width: 72, textAlign: "right", fontWeight: 400, fontFamily: F }}>{props.label}</span>
      <input type="range" min="0" max="100" value={Math.round(props.value * 100)}
        onChange={function(e) { props.onChange(e.target.value / 100); }}
        style={{ flex: 1, height: 2, appearance: "none", background: props.dark ? "#333" : "#d4cfc8", borderRadius: 1, outline: "none", cursor: "pointer", accentColor: props.dark ? "#888" : "#2a2724" }}
      />
    </div>
  );
}

export default function App() {
  var _on = useState(false); var on = _on[0]; var setOn = _on[1];
  var _sec = useState(0); var sec = _sec[0]; var setSec = _sec[1];
  var _run = useState(false); var run = _run[0]; var setRun = _run[1];
  var _notes = useState([]); var notes = _notes[0]; var setNotes = _notes[1];
  var _ni = useState(""); var ni = _ni[0]; var setNi = _ni[1];
  var _br = useState(false); var br = _br[0]; var setBr = _br[1];
  var _sn = useState(false); var sn = _sn[0]; var setSn = _sn[1];
  var _ti = useState(0); var ti = _ti[0]; var setTi = _ti[1];
  var _fade = useState(false); var fade = _fade[0]; var setFade = _fade[1];
  var _charId = useState("shadow"); var charId = _charId[0]; var setCharId = _charId[1];
  var _speed = useState(0.44); var speed = _speed[0]; var setSpeed = _speed[1];
  var _rnd = useState(0.3); var rnd = _rnd[0]; var setRnd = _rnd[1];
  var _dark = useState(false); var dark = _dark[0]; var setDark = _dark[1];
  var iv = useRef(null);

  useEffect(function() {
    if (run) {
      iv.current = setInterval(function() {
        setSec(function(s) { return s + 1; });
      }, 1000);
    }
    return function() { clearInterval(iv.current); };
  }, [run]);

  useEffect(function() {
    var t = setInterval(function() {
      setFade(true);
      setTimeout(function() {
        setTi(function(i) { return (i + 1) % TIPS.length; });
        setFade(false);
      }, 350);
    }, 14000);
    return function() { clearInterval(t); };
  }, []);

  var mm = String(Math.floor(sec / 60)).padStart(2, "0");
  var ss = String(sec % 60).padStart(2, "0");
  var prompt = PROMPTS.slice().reverse().find(function(p) { return sec >= p.t; });
  var promptText = prompt ? prompt.text : PROMPTS[0].text;

  var addNote = function() {
    if (!ni.trim()) return;
    var ts = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setNotes(function(n) { return n.concat([{ t: ni.trim(), ts: ts }]); });
    setNi("");
  };
  var reset = function() { setOn(false); setRun(false); setSec(0); setNotes([]); setBr(false); setSn(false); };

  var bg = dark ? "#1c1a17" : "#f0ebe5";
  var fg = dark ? "#c8c0b4" : "#302c28";
  var sub = dark ? "#706860" : "#8a8278";
  var faint = dark ? "#3a3630" : "#c0b8ae";
  var cardBg = dark ? "rgba(28,26,23,0.85)" : "rgba(240,235,229,0.82)";
  var cardBd = dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.06)";
  var isMobile = typeof window !== "undefined" && window.innerWidth < 500;
  var card = {
    background: cardBg, borderRadius: 18,
    border: "1px solid " + cardBd,
    backdropFilter: "blur(40px)", WebkitBackdropFilter: "blur(40px)",
  };
  var pillBtn = function(act) {
    return {
      background: act ? (dark ? "rgba(255,255,255,0.07)" : "rgba(48,44,40,0.06)") : "transparent",
      border: "1px solid " + (act ? (dark ? "rgba(255,255,255,0.12)" : "rgba(48,44,40,0.12)") : cardBd),
      borderRadius: 50, padding: "10px 22px", fontSize: 12,
      color: act ? fg : sub, cursor: "pointer", fontWeight: 400,
      letterSpacing: 0.5, transition: "all 0.3s ease", fontFamily: F,
    };
  };

  // HOME
  if (!on) {
    return (
      <div style={{ minHeight: "100vh", position: "relative", overflow: "hidden", fontFamily: F, color: fg }}>
        <Scene3D charId={charId} speed={speed} randomness={rnd} dark={dark} paused={false} />
        <GrainOverlay dark={dark} />
        <GridBg dark={dark} />
        <div style={{ position: "relative", zIndex: 10, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: isMobile ? 12 : 20 }}>
          <div style={Object.assign({}, card, { padding: isMobile ? "24px 18px" : "32px 28px", textAlign: "center", maxWidth: 380, width: "100%" })}>
            <p style={{ fontSize: isMobile ? 9 : 10, color: faint, letterSpacing: 5, fontWeight: 400, margin: "0 0 4px" }}>RHYTHMIC FOCUS</p>
            <h1 style={{ fontSize: isMobile ? 28 : 34, fontWeight: 300, color: fg, margin: 0, letterSpacing: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: isMobile ? 8 : 12 }}>
              <img src="/logo.png" alt="Esi" style={{ width: isMobile ? 28 : 36, height: isMobile ? 28 : 36, objectFit: "contain" }} onError={function(e) { e.target.style.display = "none"; }} />
              Esi
            </h1>
            <p style={{ color: sub, fontSize: 13, lineHeight: 1.8, margin: "12px 0 20px", fontWeight: 300 }}>
              Your companion hops in a steady rhythm {"\u2014"}<br />a visual anchor for your ADHD brain.
            </p>
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
            <div style={{ display: "grid", gap: 6, marginBottom: 14 }}>
              <SliderInput value={speed} onChange={setSpeed} label="speed" dark={dark} />
              <SliderInput value={rnd} onChange={setRnd} label="chaos" dark={dark} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 18 }}>
              <button onClick={function() { setDark(!dark); }} style={pillBtn(dark)}>{dark ? "\u25CF dark" : "\u25CB dark"}</button>
              <button disabled={true} style={Object.assign({}, pillBtn(false), { opacity: 0.4, cursor: "not-allowed" })}>2d \u00B7 soon</button>
            </div>
            <div style={{
              background: dark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)",
              borderRadius: 12, padding: "10px 13px", marginBottom: 18, textAlign: "left",
              border: "1px solid " + cardBd,
              opacity: fade ? 0 : 1, transition: "opacity 0.35s ease",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: fg }}>{"\uD835\uDD4F"}</span>
                <span style={{ fontSize: 10, color: sub }}>{TIPS[ti].u}</span>
                <span style={{ fontSize: 9, color: faint, marginLeft: "auto" }}>{"\u2661"} {TIPS[ti].l}</span>
              </div>
              <p style={{ fontSize: 12, color: sub, lineHeight: 1.6, margin: 0, fontWeight: 300 }}>{TIPS[ti].t}</p>
            </div>
            <button onClick={function() { setOn(true); setRun(true); }} style={{
              background: fg, border: "none", color: bg,
              padding: "14px 0", borderRadius: 50, fontSize: 13,
              cursor: "pointer", letterSpacing: 2, fontWeight: 400,
              width: "100%", fontFamily: F, transition: "opacity 0.3s ease",
            }}
            onMouseOver={function(e) { e.currentTarget.style.opacity = "0.85"; }}
            onMouseOut={function(e) { e.currentTarget.style.opacity = "1"; }}
            >begin session</button>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginTop: 16 }}>
              <a href="https://x.com/Meworkees" target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: sub, textDecoration: "none", fontWeight: 400, display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ fontWeight: 600, fontSize: 12 }}>{"\uD835\uDD4F"}</span> say hi
              </a>
              <span style={{ color: faint, fontSize: 8 }}>{"\u00B7"}</span>
              <a href="https://buymeacoffee.com/meworkeesS" target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: sub, textDecoration: "none", fontWeight: 300 }}>{"\u2615"} support</a>
            </div>
            <p style={{ marginTop: 10, fontSize: 9, color: faint, letterSpacing: 1.5 }}>built on rhythmic attention research</p>
          </div>
        </div>
      </div>
    );
  }

  // SESSION
  return (
    <div style={{ minHeight: "100vh", position: "relative", overflow: "hidden", fontFamily: F, color: fg }}>
      <Scene3D charId={charId} speed={speed} randomness={rnd} dark={dark} paused={!run} />
      <GrainOverlay dark={dark} />
      <GridBg dark={dark} />
      <div style={{ position: "relative", zIndex: 10, maxWidth: 440, margin: "0 auto", padding: isMobile ? "12px 14px 200px" : "14px 20px 210px" }}>
        <div style={Object.assign({}, card, { display: "flex", justifyContent: "space-between", alignItems: "center", padding: isMobile ? "8px 10px" : "9px 14px", marginBottom: isMobile ? 14 : 20 })}>
          <button onClick={reset} style={{ background: "none", border: "none", color: sub, fontSize: isMobile ? 11 : 12, cursor: "pointer", fontWeight: 300, fontFamily: F }}>{"\u2190"} end</button>
          <span style={{ fontSize: isMobile ? 18 : 20, fontWeight: 300, color: fg, fontVariantNumeric: "tabular-nums", letterSpacing: isMobile ? 2 : 4 }}>{mm}:{ss}</span>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {!isMobile ? <PipButton dark={dark} /> : null}
            <button onClick={function() { setRun(!run); }} style={{ background: "none", border: "none", color: sub, fontSize: isMobile ? 11 : 12, cursor: "pointer", fontWeight: 300, fontFamily: F }}>{run ? "pause" : "play"}</button>
          </div>
        </div>
        <div style={{ textAlign: "center", marginBottom: isMobile ? 10 : 14 }}>
          <p style={{ fontSize: isMobile ? 16 : 18, fontWeight: 300, color: fg, lineHeight: 1.85, margin: 0, whiteSpace: "pre-line", opacity: 0.85 }}>{promptText}</p>
        </div>
        <Breath active={br} dark={dark} />
        <div style={Object.assign({}, card, { padding: "10px 13px", marginTop: 6, opacity: fade ? 0 : 1, transition: "opacity 0.35s ease" })}>
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: fg }}>{"\uD835\uDD4F"}</span>
            <span style={{ fontSize: 10, color: sub }}>{TIPS[ti].u}</span>
            <span style={{ fontSize: 9, color: faint, marginLeft: "auto" }}>{"\u2661"} {TIPS[ti].l}</span>
          </div>
          <p style={{ fontSize: 12, color: sub, lineHeight: 1.55, margin: 0, fontWeight: 300 }}>{TIPS[ti].t}</p>
        </div>
      </div>
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 30,
        background: dark ? "rgba(26,24,22,0.75)" : "rgba(234,229,223,0.7)",
        backdropFilter: "blur(44px) saturate(1.4)", WebkitBackdropFilter: "blur(44px) saturate(1.4)",
        borderTop: "1px solid " + cardBd, padding: isMobile ? "10px 14px 22px" : "12px 20px 26px",
      }}>
        <div style={{ maxWidth: 440, margin: "0 auto" }}>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", marginBottom: sn ? 12 : 0 }}>
            <button onClick={function() { setBr(!br); }} style={pillBtn(br)}>{br ? "\u25CF breathing" : "breathe"}</button>
            <button onClick={function() { setSn(!sn); }} style={pillBtn(sn)}>{notes.length > 0 ? notes.length + " note" + (notes.length > 1 ? "s" : "") : "jot"}</button>
          </div>
          {sn ? (
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
          ) : null}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginTop: 10 }}>
            <a href="https://x.com/Meworkees" target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, color: faint, textDecoration: "none" }}>{"\uD835\uDD4F"} @Meworkees</a>
            <span style={{ color: faint, fontSize: 8 }}>{"\u00B7"}</span>
            <a href="https://buymeacoffee.com/meworkeesS" target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, color: faint, textDecoration: "none" }}>{"\u2615"} support</a>
          </div>
        </div>
      </div>
    </div>
  );
}
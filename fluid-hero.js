'use strict';
/* =============================================================
   SENA LAB — 3D Fluid Hero
   Ported from LivingFluidHero (21st.dev / Jesse Vincent)
   Same GLSL simplex-noise displacement + fresnel fragment shader,
   same mouse-reactive deformation, letter-by-letter headline reveal.
   Requires: Three.js loaded via CDN before this script.
   ============================================================= */

(function initFluidHero() {
  // Defer if THREE isn't ready yet
  if (typeof THREE === 'undefined') {
    document.addEventListener('DOMContentLoaded', initFluidHero);
    return;
  }

  const heroSection = document.getElementById('home');
  const canvas      = document.getElementById('fluidCanvas');
  if (!canvas || !heroSection) return;

  // ── 1. Letter-by-letter headline split ───────────────────
  // Splits each <span> inside .hero-h1 into individual .letter spans
  // so CSS --i delay can stagger each character.
  const h1 = heroSection.querySelector('.hero-h1');
  if (h1) {
    let charIdx = 0;
    h1.querySelectorAll(':scope > span').forEach(lineSpan => {
      const text = lineSpan.textContent;
      lineSpan.textContent = '';
      [...text].forEach(char => {
        const s      = document.createElement('span');
        s.className  = 'letter';
        s.style.setProperty('--i', charIdx++);
        s.textContent = char === ' ' ? ' ' : char;
        lineSpan.appendChild(s);
      });
    });
  }

  // ── 2. Renderer ───────────────────────────────────────────
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);

  // ── 3. Scene & camera ─────────────────────────────────────
  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 100);
  camera.position.z = 4;

  function resize() {
    const wrap = canvas.parentElement;
    const w = wrap.offsetWidth  || 400;
    const h = wrap.offsetHeight || 400;
    renderer.setSize(w, h, false);   // false = don't overwrite CSS size
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  // ── 4. GLSL shaders (identical to the React component) ───
  //    Vertex: simplex-noise displacement driven by time + mouse
  //    Fragment: fresnel-mixed colour between two accent colours
  const vertexShader = /* glsl */`
    uniform float uTime;
    uniform vec2  uMouse;
    varying vec3  vNormal;

    vec3 mod289v3(vec3 x){return x-floor(x*(1./289.))*289.;}
    vec4 mod289v4(vec4 x){return x-floor(x*(1./289.))*289.;}
    vec4 permute(vec4 x){return mod289v4(((x*34.)+1.)*x);}
    vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}

    float snoise(vec3 v){
      const vec2 C=vec2(1./6.,1./3.);
      const vec4 D=vec4(0.,.5,1.,2.);
      vec3 i=floor(v+dot(v,C.yyy));
      vec3 x0=v-i+dot(i,C.xxx);
      vec3 g=step(x0.yzx,x0.xyz);
      vec3 l=1.-g;
      vec3 i1=min(g.xyz,l.zxy);
      vec3 i2=max(g.xyz,l.zxy);
      vec3 x1=x0-i1+C.xxx;
      vec3 x2=x0-i2+C.yyy;
      vec3 x3=x0-D.yyy;
      i=mod289v3(i);
      vec4 p=permute(permute(permute(
        i.z+vec4(0.,i1.z,i2.z,1.))
        +i.y+vec4(0.,i1.y,i2.y,1.))
        +i.x+vec4(0.,i1.x,i2.x,1.));
      float n_=0.142857142857;
      vec3 ns=n_*D.wyz-D.xzx;
      vec4 j=p-49.*floor(p*ns.z*ns.z);
      vec4 x_=floor(j*ns.z);
      vec4 y_=floor(j-7.*x_);
      vec4 x=x_*ns.x+ns.yyyy;
      vec4 y=y_*ns.x+ns.yyyy;
      vec4 h=1.-abs(x)-abs(y);
      vec4 b0=vec4(x.xy,y.xy);
      vec4 b1=vec4(x.zw,y.zw);
      vec4 s0=floor(b0)*2.+1.;
      vec4 s1=floor(b1)*2.+1.;
      vec4 sh=-step(h,vec4(0.));
      vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;
      vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
      vec3 p0=vec3(a0.xy,h.x);
      vec3 p1=vec3(a0.zw,h.y);
      vec3 p2=vec3(a1.xy,h.z);
      vec3 p3=vec3(a1.zw,h.w);
      vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
      p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
      vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.);
      m=m*m;
      return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
    }

    void main(){
      vNormal = normalize(normalMatrix * normal);
      float mouseDist = distance(position.xy, uMouse * 2.0);
      float d = snoise(position * 2.5 + uTime * 0.2) * 0.3;
      d -= smoothstep(0.0, 1.5, mouseDist) * 0.5;
      vec3 newPos = position + normal * d;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(newPos, 1.0);
    }
  `;

  const fragmentShader = /* glsl */`
    uniform vec3 uColorA;
    uniform vec3 uColorB;
    varying vec3 vNormal;
    void main(){
      float fresnel = pow(1.0 + dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
      vec3 color = mix(uColorA, uColorB, vNormal.y * 0.5 + 0.5);
      gl_FragColor = vec4(color + fresnel * 0.25, 0.92);
    }
  `;

  // ── 5. Shader material ────────────────────────────────────
  // Sena Lab palette: cyan-400 → violet-700 (matches site accent)
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime:   { value: 0 },
      uMouse:  { value: new THREE.Vector2(0, 0) },
      uColorA: { value: new THREE.Color('#22d3ee') },   // cyan-400
      uColorB: { value: new THREE.Color('#7c3aed') },   // violet-700
    },
    vertexShader,
    fragmentShader,
    blending:     THREE.AdditiveBlending,
    transparent:  true,
    depthWrite:   false,
  });

  // ── 6. Icosahedron mesh ───────────────────────────────────
  // detail=32 — smooth enough, significantly fewer vertices than 64
  const mesh = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.5, 32),
    material
  );
  scene.add(mesh);

  // ── 7. Mouse tracking (lerped for smooth follow) ──────────
  const mouseTarget  = new THREE.Vector2(0, 0);
  const mouseCurrent = new THREE.Vector2(0, 0);

  window.addEventListener('mousemove', e => {
    mouseTarget.x =  (e.clientX / window.innerWidth)  * 2 - 1;
    mouseTarget.y = -(e.clientY / window.innerHeight) * 2 + 1;
  });

  // Reset mouse when pointer leaves the window
  window.addEventListener('mouseleave', () => mouseTarget.set(0, 0));

  // ── 8. Render loop ────────────────────────────────────────
  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);
    // Skip rendering when the hero section is hidden (staff workspace view)
    if (heroSection.classList.contains('route-hidden')) return;

    material.uniforms.uTime.value = clock.getElapsedTime();
    mouseCurrent.lerp(mouseTarget, 0.05);
    material.uniforms.uMouse.value.copy(mouseCurrent);

    renderer.render(scene, camera);
  }

  animate();
})();

import { OrbitControls } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import * as THREE from "three";
import type { Group, Mesh, Texture } from "three";
import { Brush, Evaluator, SUBTRACTION } from "three-bvh-csg";

// Orbital parameters
const SUN_SEMI_MAJOR = 15;
const SUN_SEMI_MINOR = 10;
const LOATHING_ORBIT_SPEED = 0.1;
const MOON_ORBIT_RADIUS = 3;
const RONALD_ORBIT_SPEED = 0.3; // 16-phase cycle (slower)
const GRIMACE_ORBIT_SPEED = 0.6; // 8-phase cycle (2x Ronald)
const HAMBURGLAR_CYCLE_SPEED = 0.15; // speed of one 11-phase cycle

function Sun() {
  const ref = useRef<Group>(null);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime() * LOATHING_ORBIT_SPEED;
    ref.current.position.x = Math.cos(t) * SUN_SEMI_MAJOR;
    ref.current.position.z = Math.sin(t) * SUN_SEMI_MINOR;
  });

  return (
    <group ref={ref}>
      <mesh>
        <sphereGeometry args={[1.5, 32, 32]} />
        <meshBasicMaterial color="#ffdd44" />
      </mesh>
      <directionalLight
        intensity={2}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-near={0.5}
        shadow-camera-far={30}
        shadow-camera-left={-5}
        shadow-camera-right={5}
        shadow-camera-top={5}
        shadow-camera-bottom={-5}
      />
    </group>
  );
}

function OrbitRing({
  radiusX,
  radiusZ,
  color,
}: {
  radiusX: number;
  radiusZ?: number;
  color: string;
}) {
  const rz = radiusZ ?? radiusX;
  const geometry = useMemo(() => {
    const points: THREE.Vector3[] = [];
    for (let i = 0; i <= 64; i++) {
      const angle = (i / 64) * Math.PI * 2;
      points.push(
        new THREE.Vector3(Math.cos(angle) * radiusX, 0, Math.sin(angle) * rz),
      );
    }
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [radiusX, rz]);

  const material = useMemo(
    () =>
      new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.3 }),
    [color],
  );

  const line = useMemo(
    () => new THREE.Line(geometry, material),
    [geometry, material],
  );

  return <primitive object={line} />;
}

const GrimaceMoon = forwardRef<Group>(function GrimaceMoon(_, ref) {
  const geometry = useMemo(() => {
    const moonBrush = new Brush(new THREE.SphereGeometry(0.35, 32, 32));
    moonBrush.updateMatrixWorld();

    const craterBrush = new Brush(new THREE.SphereGeometry(0.2, 32, 32));
    craterBrush.position.set(0.18, 0.14, 0.21);
    craterBrush.updateMatrixWorld();

    const evaluator = new Evaluator();
    const result = evaluator.evaluate(moonBrush, craterBrush, SUBTRACTION);
    return result.geometry;
  }, []);

  const [texture, setTexture] = useState<Texture | null>(null);
  useEffect(() => {
    new THREE.TextureLoader().load("/grimace.png", (tex) => {
      tex.repeat.set(2, 1);
      tex.wrapS = THREE.RepeatWrapping;
      tex.needsUpdate = true;
      setTexture(tex);
    });
  }, []);

  return (
    <group ref={ref}>
      <mesh
        geometry={geometry}
        key={texture ? "textured" : "plain"}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial
          color="#ffffff"
          map={texture}
          roughness={0.8}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
});

interface OrbitalPositions {
  sunAngle: number;
  ronaldAngle: number;
  grimaceAngle: number;
  /** Hamburglar phase 0-10 (continuous, fractional) */
  hamburglarPhase: number;
  /** Ronald illumination phase 0-7 (continuous) */
  ronaldPhase: number;
  /** Grimace illumination phase 0-7 (continuous) */
  grimacePhase: number;
}

function LoathingSystem({
  positionsRef,
}: {
  positionsRef: React.MutableRefObject<OrbitalPositions>;
}) {
  const ronaldRef = useRef<Mesh>(null);
  const grimaceRef = useRef<Group>(null);
  const hamburglarRef = useRef<Group>(null);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();

    const sunAngle = t * LOATHING_ORBIT_SPEED;
    // Ronald orbits Loathing (upper band)
    const ronaldAngle = t * RONALD_ORBIT_SPEED;
    if (ronaldRef.current) {
      ronaldRef.current.position.x = Math.cos(ronaldAngle) * MOON_ORBIT_RADIUS;
      ronaldRef.current.position.z = Math.sin(ronaldAngle) * MOON_ORBIT_RADIUS;
      ronaldRef.current.position.y = 0.4;
    }

    // Grimace orbits Loathing (lower band)
    const grimaceAngle = t * GRIMACE_ORBIT_SPEED;
    if (grimaceRef.current) {
      grimaceRef.current.position.x =
        Math.cos(grimaceAngle) * MOON_ORBIT_RADIUS;
      grimaceRef.current.position.z =
        Math.sin(grimaceAngle) * MOON_ORBIT_RADIUS;
      grimaceRef.current.position.y = -0.4;
    }

    // Hamburglar continuous phase: 0→11 repeating
    const cycleT = t * HAMBURGLAR_CYCLE_SPEED;
    const rawPhase = ((cycleT % 11) + 11) % 11;

    // Compute illumination phases (0-7) from elongation
    // Elongation 0 = new (phase 0), π = full (phase 4)
    // Normalize the angle to 0→2π then map to 0→8
    const ronaldElong =
      (((ronaldAngle - sunAngle) % (Math.PI * 2)) + Math.PI * 2) %
      (Math.PI * 2);
    const grimaceElong =
      (((grimaceAngle - sunAngle) % (Math.PI * 2)) + Math.PI * 2) %
      (Math.PI * 2);
    const ronaldPhase = (ronaldElong / (Math.PI * 2)) * 8;
    const grimacePhase = (grimaceElong / (Math.PI * 2)) * 8;

    // Update shared positions for the phase overlay
    positionsRef.current = {
      sunAngle,
      ronaldAngle,
      grimaceAngle,
      hamburglarPhase: rawPhase,
      ronaldPhase,
      grimacePhase,
    };

    // Hamburglar: keyframed to match the 11 phase descriptions
    if (hamburglarRef.current) {
      const c = 0.6; // clearance from moon center
      // Phase keyframes: [target, radial, tangential, vertical]
      const keyframes: [string, number, number, number][] = [
        ["g", -c, -0.3, 0], // 0: in front of Grimace's left side
        ["g", -c, 0.3, 0], // 1: in front of Grimace's right side
        ["g", 0, 0.5, 0.1], // 2: heading behind Grimace
        ["g", c, 0, 0.2], // 3: hidden behind Grimace
        ["g", 0, -0.5, 0.1], // 4: appearing from behind Grimace
        ["r", 0, -0.5, -0.1], // 5: disappearing behind Ronald
        ["r", c, 0, -0.2], // 6: hidden behind Ronald
        ["r", 0, 0.5, -0.1], // 7: returning from behind Ronald
        ["r", -c, -0.3, 0], // 8: in front of Ronald's left side
        ["r", -c, 0.3, 0], // 9: in front of Ronald's right side
        ["m", -c * 0.8, 0, 0], // 10: front and center
      ];
      const phaseIndex = Math.floor(rawPhase);
      const phaseFrac = rawPhase - phaseIndex;
      const nextIndex = (phaseIndex + 1) % 11;

      const from = keyframes[phaseIndex];
      const to = keyframes[nextIndex];

      // Smooth interpolation (ease in/out)
      const smooth = phaseFrac * phaseFrac * (3 - 2 * phaseFrac);

      // Interpolate offsets
      const radial = from[1] + (to[1] - from[1]) * smooth;
      const tangential = from[2] + (to[2] - from[2]) * smooth;
      const vertical = from[3] + (to[3] - from[3]) * smooth;

      // Determine which target we're relative to
      // Blend the target too when transitioning between moons
      const fromTarget = from[0];
      const toTarget = to[0];

      function getTargetPos(target: string): [number, number, number] {
        if (target === "r") {
          return [
            Math.cos(ronaldAngle) * MOON_ORBIT_RADIUS,
            0.4,
            Math.sin(ronaldAngle) * MOON_ORBIT_RADIUS,
          ];
        } else if (target === "g") {
          return [
            Math.cos(grimaceAngle) * MOON_ORBIT_RADIUS,
            -0.4,
            Math.sin(grimaceAngle) * MOON_ORBIT_RADIUS,
          ];
        } else {
          // Midpoint between both moons
          return [
            ((Math.cos(ronaldAngle) + Math.cos(grimaceAngle)) *
              MOON_ORBIT_RADIUS) /
              2,
            0,
            ((Math.sin(ronaldAngle) + Math.sin(grimaceAngle)) *
              MOON_ORBIT_RADIUS) /
              2,
          ];
        }
      }

      const fromPos = getTargetPos(fromTarget);
      const toPos = getTargetPos(toTarget);
      const cx = fromPos[0] + (toPos[0] - fromPos[0]) * smooth;
      const cy = fromPos[1] + (toPos[1] - fromPos[1]) * smooth;
      const cz = fromPos[2] + (toPos[2] - fromPos[2]) * smooth;

      // Radial direction (outward from Loathing) at center position
      const dist = Math.sqrt(cx * cx + cz * cz) || 1;
      const radX = cx / dist;
      const radZ = cz / dist;
      // Tangential direction (along orbit)
      const tanX = -radZ;
      const tanZ = radX;

      hamburglarRef.current.position.x = cx + radX * radial + tanX * tangential;
      hamburglarRef.current.position.y = cy + vertical;
      hamburglarRef.current.position.z = cz + radZ * radial + tanZ * tangential;
    }
  });

  const [ronaldTexture, setRonaldTexture] = useState<Texture | null>(null);
  useEffect(() => {
    new THREE.TextureLoader().load("/ronald.png", (tex) => {
      tex.repeat.set(2, 1);
      tex.wrapS = THREE.RepeatWrapping;
      tex.needsUpdate = true;
      setRonaldTexture(tex);
    });
  }, []);

  return (
    <group>
      {/* Loathing */}
      <mesh castShadow>
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial color="#4a90d9" roughness={0.7} />
      </mesh>

      <OrbitRing radiusX={MOON_ORBIT_RADIUS} color="#4488ff" />

      {/* Ronald */}
      <mesh
        ref={ronaldRef}
        key={ronaldTexture ? "textured" : "plain"}
        castShadow
        receiveShadow
      >
        <sphereGeometry args={[0.35, 32, 32]} />
        <meshStandardMaterial
          color="#ffffff"
          map={ronaldTexture}
          roughness={0.8}
        />
      </mesh>

      {/* Grimace — with comet impact chunk subtracted */}
      <GrimaceMoon ref={grimaceRef} />

      {/* Hamburglar */}
      <group ref={hamburglarRef}>
        <mesh castShadow receiveShadow>
          <sphereGeometry args={[0.12, 16, 16]} />
          <meshStandardMaterial
            color="#ffffff"
            emissive="#ffffff"
            emissiveIntensity={0.3}
          />
        </mesh>
      </group>
    </group>
  );
}

function Starfield({ count = 500 }: { count?: number }) {
  const geometry = useMemo(() => {
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 30 + Math.random() * 70;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return geo;
  }, [count]);

  return (
    <points geometry={geometry}>
      <pointsMaterial color="#ffffff" size={0.15} sizeAttenuation />
    </points>
  );
}

/**
 * Draws a moon phase as an SVG.
 * elongation: angle between sun and moon as seen from Loathing.
 * 0 = new moon (dark), π = full moon (lit).
 * The lit side faces the sun direction.
 */
// Hamburglar position relative to a moon in the overlay
// x: position relative to moon, y: vertical offset
// light: -1 = shadow on moon, 0 = not visible, 1 = illuminated
interface HamburglarOverlay {
  x: number;
  y: number;
  light: -1 | 0 | 1;
}

function MoonPhaseSvg({
  elongation,
  size = 48,
  label,
  hamburglar,
}: {
  elongation: number;
  size?: number;
  label: string;
  hamburglar?: HamburglarOverlay | null;
}) {
  const r = size / 2 - 2;
  const cx = size / 2;
  const cy = size / 2;

  // How much of the visible face is lit (0 = new, 1 = full)
  const illum = (1 - Math.cos(elongation)) / 2;

  // The terminator is an ellipse whose x-radius depends on illumination
  // terminatorX: r = full, 0 = quarter, -r = new
  const terminatorX = r * (1 - 2 * illum);

  // Determine if we're waxing (right side lit) or waning (left side lit)
  // based on the sign of sin(elongation)
  const waxing = Math.sin(elongation) >= 0;

  // Draw: dark circle background, then lit area
  // Lit area = one semicircle + one terminator arc
  const litSide = waxing ? 1 : -1;

  // Path for the lit portion:
  // Semicircle on the lit side + terminator ellipse arc
  const d = [
    `M ${cx} ${cy - r}`,
    // Semicircle on the lit side
    `A ${r} ${r} 0 0 ${waxing ? 1 : 0} ${cx} ${cy + r}`,
    // Terminator arc back to top (elliptical)
    `A ${Math.abs(terminatorX)} ${r} 0 0 ${terminatorX * litSide > 0 ? 1 : 0} ${cx} ${cy - r}`,
    "Z",
  ].join(" ");

  return (
    <div style={{ textAlign: "center" }}>
      <svg
        width={size * 1.6}
        height={size}
        viewBox={`${-size * 0.3} 0 ${size * 1.6} ${size}`}
      >
        {/* Dark base (unlit moon) */}
        <circle cx={cx} cy={cy} r={r} fill="#222" />
        {/* Lit portion */}
        <path d={d} fill="#ddd" />
        {/* Moon outline */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="#555"
          strokeWidth={0.5}
        />
        {/* Hamburglar: white when illuminated, dark when casting shadow */}
        {hamburglar && hamburglar.light !== 0 && (
          <circle
            cx={cx + hamburglar.x * r}
            cy={cy + hamburglar.y * r}
            r={3}
            fill={hamburglar.light === 1 ? "#fff" : "#111"}
            stroke="#888"
            strokeWidth={0.8}
          />
        )}
      </svg>
      <div style={{ fontSize: 11, color: "#aaa", marginTop: 2 }}>{label}</div>
    </div>
  );
}

function PhaseOverlay({
  positionsRef,
}: {
  positionsRef: React.RefObject<OrbitalPositions>;
}) {
  const [ronaldElong, setRonaldElong] = useState(0);
  const [grimaceElong, setGrimaceElong] = useState(0);
  const [grimaceHamb, setGrimaceHamb] = useState<HamburglarOverlay | null>(
    null,
  );
  const [ronaldHamb, setRonaldHamb] = useState<HamburglarOverlay | null>(null);

  const updatePhases = useCallback(() => {
    const pos = positionsRef.current;
    if (!pos) return;

    const re = pos.ronaldAngle - pos.sunAngle;
    const ge = pos.grimaceAngle - pos.sunAngle;

    setRonaldElong(re);
    setGrimaceElong(ge);

    // Hamburglar overlay: show on the moon it's in front of
    const hp = pos.hamburglarPhase;
    const phaseInt = Math.floor(hp);
    const frac = hp - phaseInt;

    // Compute Hamburglar visibility and position for each moon
    // Phases where Hamburglar is visible near Grimace:
    //   0: left side, 1: right side, 2: heading behind (fading), 4: appearing (fading in)
    // Phases where Hamburglar is visible near Ronald:
    //   5: disappearing (fading), 7: returning (fading in), 8: left side, 9: right side
    // Phase 10: front and center (visible between both)
    let gH: HamburglarOverlay | null = null;
    let rH: HamburglarOverlay | null = null;

    const g = Math.floor(pos.grimacePhase) % 8;
    const r = Math.floor(pos.ronaldPhase) % 8;

    // Compute Hamburglar light using same logic as getHamburglarLight()
    // Returns -1 (shadow), 0 (not visible), or 1 (illuminated)
    function hambLight(): -1 | 0 | 1 {
      switch (phaseInt) {
        case 0:
          return g > 0 && g < 5 ? -1 : 1;
        case 1:
          return g < 4 ? 1 : -1;
        case 2:
          return g > 3 ? 1 : 0;
        case 4:
          return g > 0 && g < 5 ? 1 : 0;
        case 5:
          return r > 3 ? 1 : 0;
        case 7:
          return r > 0 && r < 5 ? 1 : 0;
        case 8:
          return r > 0 && r < 5 ? -1 : 1;
        case 9:
          return r < 4 ? 1 : -1;
        case 10:
          return Math.min((r > 3 ? 1 : 0) + (g > 0 && g < 5 ? 1 : 0), 1) as
            | 0
            | 1;
        default:
          return 0;
      }
    }

    const light = hambLight();

    // Grimace phases — frac tweens the x position smoothly across each phase.
    // The full visible journey across Grimace is:
    //   phase 4 (appearing): slides in from left edge
    //   phase 0 (left side): slides from left toward center
    //   phase 1 (right side): slides from center toward right
    //   phase 2 (heading behind): slides off right edge
    if (phaseInt === 4 && light !== 0) {
      gH = frac > 0.3 ? { x: -1.4 + (frac - 0.3) * 0.6, y: 0, light } : null;
    } else if (phaseInt === 0) {
      gH = { x: -1.0 + frac * 1.0, y: 0, light };
    } else if (phaseInt === 1) {
      gH = { x: 0.0 + frac * 1.0, y: 0, light };
    } else if (phaseInt === 2 && light !== 0) {
      gH = frac < 0.7 ? { x: 1.0 + frac * 0.6, y: 0, light } : null;
    }

    // Ronald phases — same pattern:
    //   phase 7 (returning): slides in from right edge
    //   phase 8 (left side): slides from left toward center
    //   phase 9 (right side): slides from center toward right
    //   phase 5 (disappearing): slides off left edge
    if (phaseInt === 7 && light !== 0) {
      rH = frac > 0.3 ? { x: 1.4 - (frac - 0.3) * 0.6, y: 0, light } : null;
    } else if (phaseInt === 8) {
      rH = { x: -1.0 + frac * 1.0, y: 0, light };
    } else if (phaseInt === 9) {
      rH = { x: 0.0 + frac * 1.0, y: 0, light };
    } else if (phaseInt === 5 && light !== 0) {
      rH = frac < 0.7 ? { x: -1.0 - frac * 0.6, y: 0, light } : null;
    }

    setGrimaceHamb(gH);
    setRonaldHamb(rH);
  }, [positionsRef]);

  useEffect(() => {
    let raf: number;
    function loop() {
      updatePhases();
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [updatePhases]);

  return (
    <div
      style={{
        position: "absolute",
        top: 48,
        left: 16,
        display: "flex",
        gap: 12,
        background: "rgba(0,0,0,0.5)",
        borderRadius: 8,
        padding: "8px 12px",
      }}
    >
      <MoonPhaseSvg
        elongation={ronaldElong}
        label="Ronald"
        hamburglar={ronaldHamb}
      />
      <MoonPhaseSvg
        elongation={grimaceElong}
        label="Grimace"
        hamburglar={grimaceHamb}
      />
    </div>
  );
}

export default function MoonOrbits({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const positionsRef = useRef<OrbitalPositions>({
    sunAngle: 0,
    ronaldAngle: 0,
    grimaceAngle: 0,
    hamburglarPhase: 0,
    ronaldPhase: 0,
    grimacePhase: 0,
  });

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.85)",
        zIndex: 1000,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "12px 16px",
          color: "white",
        }}
      >
        <span style={{ fontSize: "12px", opacity: 0.5, maxWidth: "60%" }}>
          Work in progress — not accurate or lore-accurate. Drag to rotate,
          scroll to zoom.
        </span>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "1px solid #666",
            color: "white",
            padding: "4px 12px",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Close
        </button>
      </div>
      <div style={{ position: "relative", flex: 1 }}>
        <Canvas
          shadows
          camera={{ position: [0, 8, 12], fov: 50 }}
          style={{ position: "absolute", inset: 0 }}
        >
          <ambientLight intensity={0.05} />
          <Starfield />
          <OrbitControls enablePan={false} />
          <OrbitRing
            radiusX={SUN_SEMI_MAJOR}
            radiusZ={SUN_SEMI_MINOR}
            color="#ffdd44"
          />
          <Sun />
          <LoathingSystem positionsRef={positionsRef} />
        </Canvas>
        <PhaseOverlay positionsRef={positionsRef} />
      </div>
    </div>
  );
}

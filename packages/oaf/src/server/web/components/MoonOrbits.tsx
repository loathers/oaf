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
import { Brush, Evaluator, SUBTRACTION } from "three-bvh-csg";
import type { Group, Mesh, Texture } from "three";

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
    () => new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.3 }),
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
      grimaceRef.current.position.x = Math.cos(grimaceAngle) * MOON_ORBIT_RADIUS;
      grimaceRef.current.position.z = Math.sin(grimaceAngle) * MOON_ORBIT_RADIUS;
      grimaceRef.current.position.y = -0.4;
    }

    // Update shared positions for the phase overlay
    positionsRef.current = { sunAngle, ronaldAngle, grimaceAngle };

    // Hamburglar: keyframed to match the 11 phase descriptions
    // Each phase defines an offset relative to a moon or the midpoint:
    //   [target, radial, tangential, vertical]
    //   target: "g" = grimace, "r" = ronald, "m" = midpoint
    //   radial: negative = toward Loathing (in front), positive = away (behind)
    //   tangential: offset along orbit direction (left/right)
    //   vertical: y offset
    if (hamburglarRef.current) {
      const c = 0.6; // clearance from moon center
      // Phase keyframes: [target, radial, tangential, vertical]
      const keyframes: [string, number, number, number][] = [
        ["g", -c, -0.3, 0],    // 0: in front of Grimace's left side
        ["g", -c, 0.3, 0],     // 1: in front of Grimace's right side
        ["g", 0, 0.5, 0.1],    // 2: heading behind Grimace
        ["g", c, 0, 0.2],      // 3: hidden behind Grimace
        ["g", 0, -0.5, 0.1],   // 4: appearing from behind Grimace
        ["r", 0, -0.5, -0.1],  // 5: disappearing behind Ronald
        ["r", c, 0, -0.2],     // 6: hidden behind Ronald
        ["r", 0, 0.5, -0.1],   // 7: returning from behind Ronald
        ["r", -c, -0.3, 0],    // 8: in front of Ronald's left side
        ["r", -c, 0.3, 0],     // 9: in front of Ronald's right side
        ["m", -c * 0.8, 0, 0], // 10: front and center
      ];

      // Continuous phase: 0→11 repeating
      const cycleT = t * HAMBURGLAR_CYCLE_SPEED;
      const rawPhase = ((cycleT % 11) + 11) % 11;
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
            (Math.cos(ronaldAngle) + Math.cos(grimaceAngle)) * MOON_ORBIT_RADIUS / 2,
            0,
            (Math.sin(ronaldAngle) + Math.sin(grimaceAngle)) * MOON_ORBIT_RADIUS / 2,
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
            color="#ff6347"
            emissive="#ff6347"
            emissiveIntensity={0.3}
          />
        </mesh>
      </group>
    </group>
  );
}

/**
 * Draws a moon phase as an SVG.
 * elongation: angle between sun and moon as seen from Loathing.
 * 0 = new moon (dark), π = full moon (lit).
 * The lit side faces the sun direction.
 */
function MoonPhaseSvg({
  elongation,
  size = 48,
  label,
}: {
  elongation: number;
  size?: number;
  label: string;
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
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Dark base (unlit moon) */}
        <circle cx={cx} cy={cy} r={r} fill="#222" />
        {/* Lit portion */}
        <path d={d} fill="#ddd" />
        {/* Moon outline */}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#555" strokeWidth={0.5} />
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
  const ronaldRef = useRef<HTMLDivElement>(null);
  const grimaceRef = useRef<HTMLDivElement>(null);
  const [ronaldElong, setRonaldElong] = useState(0);
  const [grimaceElong, setGrimaceElong] = useState(0);

  const updatePhases = useCallback(() => {
    const pos = positionsRef.current;
    if (!pos) return;

    // Elongation = angle between sun and moon as seen from Loathing (origin)
    // Sun angle is the direction TO the sun from Loathing
    // Moon angle is the direction TO the moon from Loathing
    // elongation = moonAngle - sunAngle (the angular separation)
    const re = pos.ronaldAngle - pos.sunAngle;
    const ge = pos.grimaceAngle - pos.sunAngle;

    setRonaldElong(re);
    setGrimaceElong(ge);
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
      <MoonPhaseSvg elongation={ronaldElong} label="Ronald" />
      <MoonPhaseSvg elongation={grimaceElong} label="Grimace" />
    </div>
  );
}

export default function MoonOrbits({ onClose }: { onClose: () => void }) {
  const positionsRef = useRef<OrbitalPositions>({
    sunAngle: 0,
    ronaldAngle: 0,
    grimaceAngle: 0,
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
        <span style={{ fontSize: "14px", opacity: 0.6 }}>
          Drag to rotate · Scroll to zoom
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
          <OrbitControls enablePan={false} />
          <OrbitRing radiusX={SUN_SEMI_MAJOR} radiusZ={SUN_SEMI_MINOR} color="#ffdd44" />
          <Sun />
          <LoathingSystem positionsRef={positionsRef} />
        </Canvas>
        <PhaseOverlay positionsRef={positionsRef} />
      </div>
    </div>
  );
}

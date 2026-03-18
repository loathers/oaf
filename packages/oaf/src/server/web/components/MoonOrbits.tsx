import { OrbitControls } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { forwardRef, useEffect, useMemo, useRef, useState } from "react";
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
const HAMBURGLAR_SPEED = 0.8;

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
      <pointLight intensity={3} distance={50} decay={0.5} />
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
      <mesh geometry={geometry} key={texture ? "textured" : "plain"}>
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

function LoathingSystem() {
  const ronaldRef = useRef<Mesh>(null);
  const grimaceRef = useRef<Group>(null);
  const hamburglarRef = useRef<Group>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();

    if (ronaldRef.current) {
      const rt = t * RONALD_ORBIT_SPEED;
      ronaldRef.current.position.x = Math.cos(rt) * MOON_ORBIT_RADIUS;
      ronaldRef.current.position.z = Math.sin(rt) * MOON_ORBIT_RADIUS;
    }

    if (grimaceRef.current) {
      const gt = t * GRIMACE_ORBIT_SPEED;
      grimaceRef.current.position.x = Math.cos(gt) * MOON_ORBIT_RADIUS;
      grimaceRef.current.position.z = Math.sin(gt) * MOON_ORBIT_RADIUS;
    }

    if (hamburglarRef.current && ronaldRef.current && grimaceRef.current) {
      const ht = t * HAMBURGLAR_SPEED;
      const clearance = 0.6;

      // Actual moon positions
      const rx = ronaldRef.current.position.x;
      const rz = ronaldRef.current.position.z;
      const gx = grimaceRef.current.position.x;
      const gz = grimaceRef.current.position.z;

      // Phase within one figure-8 cycle
      const phase = ((ht % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);

      // Blend 0→1→0: 0 = at Ronald, 1 = at Grimace
      const blend = (1 - Math.cos(phase)) / 2;

      // Center of the loop: the actual moon position we're orbiting
      const cx = rx + (gx - rx) * blend;
      const cz = rz + (gz - rz) * blend;

      // Radial and tangential directions at this point on the orbit
      const dist = Math.sqrt(cx * cx + cz * cz) || 1;
      const radX = cx / dist;
      const radZ = cz / dist;
      const tanX = -radZ;
      const tanZ = radX;

      // Local loop: two full circles per figure-8 period
      const loopAngle = phase * 2;
      const offRadial = Math.cos(loopAngle) * clearance;
      const offTangential = Math.sin(loopAngle) * clearance;

      hamburglarRef.current.position.x = cx + radX * offRadial + tanX * offTangential;
      hamburglarRef.current.position.z = cz + radZ * offRadial + tanZ * offTangential;
      hamburglarRef.current.position.y = Math.sin(phase) * 0.15;
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
      <mesh>
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial color="#4a90d9" roughness={0.7} />
      </mesh>

      <OrbitRing radiusX={MOON_ORBIT_RADIUS} color="#4488ff" />

      {/* Ronald */}
      <mesh ref={ronaldRef} key={ronaldTexture ? "textured" : "plain"}>
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
        <mesh>
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

export default function MoonOrbits({ onClose }: { onClose: () => void }) {
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
      <Canvas
        camera={{ position: [0, 8, 12], fov: 50 }}
        style={{ flex: 1 }}
      >
        <ambientLight intensity={0.08} />
        <OrbitControls enablePan={false} />
        <OrbitRing radiusX={SUN_SEMI_MAJOR} radiusZ={SUN_SEMI_MINOR} color="#ffdd44" />
        <Sun />
        <LoathingSystem />
      </Canvas>
    </div>
  );
}

import { Canvas } from "@react-three/fiber";
import { ContactShadows, Environment, OrbitControls } from "@react-three/drei";
import { useCustomizerStore } from "./store";

function SneakerModel() {
  const { upperColor, soleColor, laceColor, heelColor } = useCustomizerStore();
  return (
    <group rotation={[0.12, Math.PI / 6, 0]}>
      <mesh position={[0, -0.18, 0]}>
        <boxGeometry args={[1.55, 0.22, 0.85]} />
        <meshStandardMaterial color={soleColor} roughness={0.7} metalness={0.05} />
      </mesh>
      <mesh position={[0.04, 0.1, 0]}>
        <boxGeometry args={[1.35, 0.55, 0.74]} />
        <meshStandardMaterial color={upperColor} roughness={0.45} metalness={0.08} />
      </mesh>
      <mesh position={[-0.62, 0.04, 0]}>
        <boxGeometry args={[0.28, 0.5, 0.55]} />
        <meshStandardMaterial color={heelColor} roughness={0.4} metalness={0.15} />
      </mesh>
      <mesh position={[0.08, 0.46, 0]}>
        <boxGeometry args={[1.2, 0.08, 0.16]} />
        <meshStandardMaterial color={laceColor} roughness={0.35} />
      </mesh>
      <mesh position={[0.52, 0.1, 0.38]} rotation={[0.45, 0, 0]}>
        <boxGeometry args={[0.66, 0.42, 0.08]} />
        <meshStandardMaterial color={upperColor} roughness={0.5} />
      </mesh>
    </group>
  );
}

export default function SneakerPreview() {
  return (
    <div className="customizer-canvas" aria-label="3D sneaker preview — procedurally generated, not a licensed product scan">
      <Canvas camera={{ position: [2.2, 1.1, 2.2], fov: 42 }} dpr={[1, 1.75]}>
        <ambientLight intensity={0.55} />
        <directionalLight position={[3, 5, 2]} intensity={1.1} />
        <SneakerModel />
        <ContactShadows opacity={0.28} scale={6} blur={2.2} far={3} />
        <Environment preset="city" />
        <OrbitControls enablePan={false} minDistance={1.4} maxDistance={4} />
      </Canvas>
      <p className="customizer-canvas-note">Procedural studio preview — rotate and zoom to inspect colors and materials.</p>
    </div>
  );
}
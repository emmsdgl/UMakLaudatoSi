"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import { useRef, useState, useEffect, useMemo } from "react";
import * as THREE from "three";
import { AnimatePresence, motion } from "framer-motion";

interface Contributor {
  id: string;
  name: string;
  message?: string;
}

export type Season = "Spring" | "Summer" | "Autumn" | "Winter";

interface ThreePlantProps {
  stage: "seed" | "sprout" | "plant" | "tree";
  contributors: Contributor[];
  contributions: number;
  timeOfDay?: number;
  season?: Season;
}

// --- Utils ---

function hashRandom(seed: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return ((h >>> 0) / 4294967296);
}

// --- Custom Geometries ---

// 1. Lush Grass Geometry (Fern-like Blade)
const grassGeometry = (() => {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.quadraticCurveTo(-0.1, 0.2, -0.05, 0.5); // Left curve
  shape.quadraticCurveTo(0, 0.8, 0.05, 0.5);     // Tip to right curve
  shape.quadraticCurveTo(0.1, 0.2, 0, 0);        // Base
  return new THREE.ShapeGeometry(shape);
})();

// 2. Realistic Leaf Geometry
const leafGeometry = (() => {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.bezierCurveTo(0.1, 0.1, 0.1, 0.3, 0, 0.4); 
  shape.bezierCurveTo(-0.1, 0.3, -0.1, 0.1, 0, 0); 
  return new THREE.ShapeGeometry(shape);
})();

// 3. 3D Flower Geometry (5 Petals) - Head only
const flowerGeometry = (() => {
  const shape = new THREE.Shape();
  // Create 5 petals
  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2;
    const nextAngle = ((i + 1) / 5) * Math.PI * 2;
    const midAngle = (angle + nextAngle) / 2;
    
    if (i === 0) shape.moveTo(0, 0);
    
    const cp1x = Math.cos(angle) * 0.15;
    const cp1z = Math.sin(angle) * 0.15;
    
    const tipX = Math.cos(midAngle) * 0.4;
    const tipZ = Math.sin(midAngle) * 0.4;
    
    const cp2x = Math.cos(nextAngle) * 0.15;
    const cp2z = Math.sin(nextAngle) * 0.15;
    
    shape.bezierCurveTo(cp1x, cp1z, tipX, tipZ, cp2x, cp2z);
    shape.lineTo(0, 0);
  }
  return new THREE.ShapeGeometry(shape);
})();


// --- Constants & Season Logic ---

const getSeasonProgress = (season: Season) => {
  switch(season) {
    case "Spring": return 0.125;
    case "Summer": return 0.375;
    case "Autumn": return 0.625;
    case "Winter": return 0.875;
    default: return 0.125;
  }
};

// Helper to get current season data based on time
const useSeasonData = () => {
  const data = useMemo(() => ({
    leafColor: new THREE.Color(),
    groundColor: new THREE.Color(),
    seasonName: "Spring"
  }), []);
  return data;
}

// --- Animated Components ---

function GrassField({ count = 8000, radius = 18, season = "Spring" }: { count?: number, radius?: number, season?: Season }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const currentProgress = useRef(getSeasonProgress(season));
  
  // Colors for interpolation
  const cSpring = useMemo(() => new THREE.Color("#81C784"), []); // Light Green
  const cSummer = useMemo(() => new THREE.Color("#43A047"), []); // Deep Green
  const cFall = useMemo(() => new THREE.Color("#D84315"), []);   // Orange/Red
  const cWinter = useMemo(() => new THREE.Color("#5D4037"), []); // Brown/Gone

  useEffect(() => {
    if (!meshRef.current) return;
    
    for (let i = 0; i < count; i++) {
      const r = Math.sqrt(Math.random()) * radius;
      const theta = Math.random() * Math.PI * 2;
      const x = r * Math.cos(theta);
      const z = r * Math.sin(theta);
      
      if (r < 2.5) { i--; continue; }

      dummy.position.set(x, 0, z);
      
      const rotY = Math.random() * Math.PI * 2;
      const rotX = (Math.random() - 0.5) * 0.5; 
      const rotZ = (Math.random() - 0.5) * 0.5; 
      dummy.rotation.set(rotX, rotY, rotZ);
      
      dummy.scale.setScalar(0.6 + Math.random() * 0.5);
      
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
      meshRef.current.setColorAt(i, cSpring);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  }, [count, radius, dummy, cSpring]);

  useFrame((state, delta) => {
    if (!meshRef.current || !meshRef.current.instanceColor) return;

    const targetProgress = getSeasonProgress(season);
    currentProgress.current = THREE.MathUtils.lerp(currentProgress.current, targetProgress, delta * 0.5);
    const progress = currentProgress.current;

    let targetColor = cSpring;

    // --- Season State Machine ---
    if (progress < 0.25) { 
      // Spring (0.0 - 0.25)
      targetColor.copy(cSpring);
    } else if (progress < 0.5) { 
      // Summer
      const p = (progress - 0.25) / 0.25;
      targetColor.copy(cSpring).lerp(cSummer, p);
    } else if (progress < 0.75) { 
      // Fall
      const p = (progress - 0.5) / 0.25;
      targetColor.copy(cSummer).lerp(cFall, p);
    } else { 
      // Winter
      const p = (progress - 0.75) / 0.25;
      targetColor.copy(cFall).lerp(cWinter, p);
    }

    const currentColor = new THREE.Color();
    meshRef.current.getColorAt(0, currentColor);
    
    if (progress < 0.05) {
        currentColor.copy(targetColor);
    } else {
        currentColor.lerp(targetColor, delta * 3);
    }
    
    for (let i = 0; i < count; i++) {
        meshRef.current.setColorAt(i, currentColor);
    }
    meshRef.current.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <primitive object={grassGeometry} />
      <meshStandardMaterial 
        roughness={0.8} 
        flatShading 
        side={THREE.DoubleSide} 
        alphaTest={0.5}
      />
    </instancedMesh>
  );
}

function AnimatedBranch({ start, end, thickness, color }: { start: THREE.Vector3, end: THREE.Vector3, thickness: number, color: string }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const jointRef = useRef<THREE.Mesh>(null);
  
  const visual = useRef({
    start: start.clone(),
    end: start.clone(),
    thickness: 0
  });

  const isMounted = useRef(false);

  useFrame((state, delta) => {
    if (!meshRef.current || !jointRef.current) return;

    const speed = 3.0 * delta;
    visual.current.start.lerp(start, speed);
    visual.current.end.lerp(end, speed);
    visual.current.thickness = THREE.MathUtils.lerp(visual.current.thickness, thickness, speed);

    const direction = new THREE.Vector3().subVectors(visual.current.end, visual.current.start);
    const length = direction.length();

    if (length < 0.001) {
        meshRef.current.scale.set(0, 0, 0);
        return;
    }

    const midPoint = new THREE.Vector3().addVectors(visual.current.start, visual.current.end).multiplyScalar(0.5);
    const up = new THREE.Vector3(0, 1, 0);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(up, direction.clone().normalize());

    meshRef.current.position.copy(midPoint);
    meshRef.current.quaternion.copy(quaternion);
    meshRef.current.scale.set(visual.current.thickness, length, visual.current.thickness);

    jointRef.current.position.copy(visual.current.start);
    jointRef.current.scale.setScalar(visual.current.thickness);

    if (!isMounted.current) isMounted.current = true;
  });

  return (
    <group>
      <mesh ref={meshRef}>
        <cylinderGeometry args={[0.7, 1, 1, 8]} />
        <meshStandardMaterial color={color} roughness={0.9} />
      </mesh>
      <mesh ref={jointRef}>
        <sphereGeometry args={[1, 8, 8]} />
        <meshStandardMaterial color={color} roughness={0.9} />
      </mesh>
    </group>
  );
}

function AnimatedFoliage({ position, scale, color: baseColor, season = "Spring" }: { position: [number, number, number], scale: number, color: string, season?: Season }) {
  const groupRef = useRef<THREE.Group>(null);
  const materialsRef = useRef<THREE.MeshStandardMaterial[]>([]);
  const visualScale = useRef(0);
  const currentProgress = useRef(getSeasonProgress(season));
  
  const cSpring = useMemo(() => new THREE.Color("#81C784"), []); 
  const cSummer = useMemo(() => new THREE.Color("#2E7D32"), []); 
  const cFall = useMemo(() => new THREE.Color("#D84315"), []);   
  const cWinter = useMemo(() => new THREE.Color("#5D4037"), []); 

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    const time = state.clock.elapsedTime;
    const targetProgress = getSeasonProgress(season);
    currentProgress.current = THREE.MathUtils.lerp(currentProgress.current, targetProgress, delta * 0.5);
    const progress = currentProgress.current;

    let targetColor = cSpring;
    let seasonScaleMod = 1;
    let forceColorUpdate = false;

    if (progress < 0.25) { 
      // Spring (0.0 - 0.25)
      // FIX: Foliage grows IN as green instantly.
      // We don't lerp from Winter (brown) because winter leaves don't exist (scale 0).
      // They should start Fresh Green.
      targetColor.copy(cSpring);
      
      // Leaves grow in scale gradually over spring
      seasonScaleMod = THREE.MathUtils.smoothstep(progress / 0.25, 0, 1);
      
      // Enforce Green strictly at start
      if (progress < 0.05) forceColorUpdate = true;
    } else if (progress < 0.5) { 
      const p = (progress - 0.25) / 0.25;
      targetColor.copy(cSpring).lerp(cSummer, p);
      seasonScaleMod = 1;
    } else if (progress < 0.75) { 
      const p = (progress - 0.5) / 0.25;
      targetColor.copy(cSummer).lerp(cFall, p);
      seasonScaleMod = 1;
    } else { 
      const p = (progress - 0.75) / 0.25;
      targetColor.copy(cFall).lerp(cWinter, p);
      // Leaves wither away in winter
      seasonScaleMod = 1 - THREE.MathUtils.smoothstep(p, 0, 0.5); 
    }

    visualScale.current = THREE.MathUtils.lerp(visualScale.current, scale * seasonScaleMod, delta * 2);

    const windX = Math.sin(time * 0.5 + position[0]) * 0.1;
    const windZ = Math.cos(time * 0.3 + position[2]) * 0.05;
    
    groupRef.current.rotation.set(windX, windX * 0.5, windZ);
    groupRef.current.scale.setScalar(visualScale.current);

    materialsRef.current.forEach(mat => {
        if (forceColorUpdate) {
            mat.color.copy(targetColor);
        } else {
            mat.color.lerp(targetColor, delta * 2);
        }
    });
  });

  return (
    <group ref={groupRef} position={position}>
      <mesh>
        <dodecahedronGeometry args={[1, 0]} />
        <meshStandardMaterial ref={(el) => { if(el) materialsRef.current[0] = el }} color={cSpring} roughness={0.8} flatShading />
      </mesh>
      {Array.from({ length: 4 }).map((_, i) => (
        <mesh key={i} position={[
          (hashRandom(`p-${i}-x`) - 0.5) * 1.5,
          (hashRandom(`p-${i}-y`) - 0.5) * 1.5,
          (hashRandom(`p-${i}-z`) - 0.5) * 1.5
        ]} scale={0.4}>
          <dodecahedronGeometry args={[1, 0]} />
          <meshStandardMaterial 
            ref={(el) => { if(el) materialsRef.current[i+1] = el }}
            color={cSpring} 
            roughness={0.8} 
            flatShading 
          />
        </mesh>
      ))}
    </group>
  );
}

function SeasonalEnvironment({ season = "Spring" }: { season?: Season }) {
  const groundRef = useRef<THREE.MeshStandardMaterial>(null);
  const snowSystemRef = useRef<THREE.InstancedMesh>(null);
  const leafSystemRef = useRef<THREE.InstancedMesh>(null);
  const flowersRef = useRef<THREE.InstancedMesh>(null);
  const stemsRef = useRef<THREE.InstancedMesh>(null); // NEW: Stems
  const snowDriftsRef = useRef<THREE.InstancedMesh>(null);
  const leafPilesRef = useRef<THREE.InstancedMesh>(null); // NEW: Leaf Piles
  const currentProgress = useRef(getSeasonProgress(season));
  
  const dummy = useMemo(() => new THREE.Object3D(), []);
  
  // Colors
  const cSoil = useMemo(() => new THREE.Color("#3E2723"), []); // Dark Soil
  const cSnow = useMemo(() => new THREE.Color("#FFFFFF"), []);
  const cLeaf = useMemo(() => new THREE.Color("#D84315"), []);
  
  // Particles Data
  const particleCount = 60;
  const particles = useMemo(() => {
    return new Array(particleCount).fill(0).map((_, i) => ({
      x: 0,
      y: -10,
      z: 0,
      speed: 0.02 + hashRandom(`env-${i}-s`) * 0.05,
      drift: hashRandom(`env-${i}-d`) * Math.PI * 2,
      rotSpeed: (hashRandom(`env-${i}-r`) - 0.5) * 2,
    }));
  }, []);

  // Flowers & Stems Data
  const flowerCount = 500;
  const flowers = useMemo(() => {
     return new Array(flowerCount).fill(0).map((_, i) => {
         const r = 3 + hashRandom(`f-${i}-r`) * 10; 
         const theta = hashRandom(`f-${i}-t`) * Math.PI * 500;
         
         const hueSeed = hashRandom(`f-${i}-c`);
         let color = new THREE.Color();
         
         if (hueSeed < 0.2) color.setHSL(0.0, 0.9, 0.6); // Red
         else if (hueSeed < 0.4) color.setHSL(0.15, 0.9, 0.6); // Yellow
         else if (hueSeed < 0.6) color.setHSL(0.6, 0.9, 0.7); // Blue
         else if (hueSeed < 0.8) color.setHSL(0.8, 0.9, 0.7); // Purple
         else color.setHSL(0.9, 0.9, 0.8); // Pink
         
         // Random height for stem
         const height = 0.3 + hashRandom(`f-${i}-h`) * 0.5;

         return {
             x: r * Math.cos(theta),
             y: 0,
             z: r * Math.sin(theta),
             scale: 0.2 + hashRandom(`f-${i}-s`) * 0.3,
             height: height,
             color: color
         }
     })
  }, []);

  // Snow Drifts & Leaf Piles Data (Shared positions logic for simplicity, or different)
  const pileCount = 40;
  const piles = useMemo(() => {
    return new Array(pileCount).fill(0).map((_, i) => {
       const r = 2 + hashRandom(`d-${i}-r`) * 12;
       const theta = hashRandom(`d-${i}-t`) * Math.PI * 200;
       return {
           x: r * Math.cos(theta),
           y: 0,
           z: r * Math.sin(theta),
           scale: 1 + hashRandom(`d-${i}-s`) * 1.5,
           rotation: hashRandom(`d-${i}-rot`) * Math.PI
       }
    })
  }, []);

  useFrame((state, delta) => {
    const time = state.clock.elapsedTime;
    const targetProgress = getSeasonProgress(season);
    currentProgress.current = THREE.MathUtils.lerp(currentProgress.current, targetProgress, delta * 0.5);
    const progress = currentProgress.current;

    // --- Ground Color (Soil <-> Snow) ---
    if (groundRef.current) {
        let targetGround = cSoil;
        if (progress > 0.7 && progress < 1.0) targetGround = cSnow; 
        
        if (progress > 0.65 && progress < 0.75) {
             const p = (progress - 0.65) / 0.1;
             groundRef.current.color.lerpColors(cSoil, cSnow, p);
        } else if (progress > 0.95 || progress < 0.05) {
             const p = progress > 0.95 ? (progress - 0.95) / 0.1 : (progress + 0.05) / 0.1;
             groundRef.current.color.lerpColors(cSnow, cSoil, p);
        } else if (progress >= 0.75 && progress <= 0.95) {
             groundRef.current.color.copy(cSnow);
        } else {
             groundRef.current.color.copy(cSoil);
        }
    }

    // --- Weather Particles (Snow vs Leaves) ---
    let activeSystem = null;
    let particleColor = cLeaf;
    let particleScale = 0;
    
    if (progress > 0.5 && progress < 0.75) {
        activeSystem = leafSystemRef.current;
        particleScale = 0.5; 
        particleColor = cLeaf;
    } else if (progress > 0.75 && progress < 0.95) {
        activeSystem = snowSystemRef.current;
        particleScale = 0.1; 
        particleColor = cSnow;
    }

    if (leafSystemRef.current) leafSystemRef.current.scale.setScalar(0);
    if (snowSystemRef.current) snowSystemRef.current.scale.setScalar(0);

    if (activeSystem) {
        activeSystem.scale.setScalar(1);
        const isLeafSystem = activeSystem === leafSystemRef.current;
        const spread = isLeafSystem ? 6 : 25; 
        const resetHeightBase = isLeafSystem ? 7 : 12; 
        const resetHeightVariance = isLeafSystem ? 2 : 4;

        particles.forEach((p, i) => {
            p.y -= p.speed;

            if (p.y < -0.5) {
                p.y = resetHeightBase + hashRandom(`p-y-reset-${i}-${time}`) * resetHeightVariance;
                p.x = (hashRandom(`p-x-reset-${i}-${time}`) - 0.5) * spread;
                p.z = (hashRandom(`p-z-reset-${i}-${time}`) - 0.5) * spread;
            }
            
            const xOff = Math.sin(time + p.drift) * 0.5;
            dummy.position.set(p.x + xOff, p.y, p.z);
            
            if (isLeafSystem) {
                dummy.rotation.set(
                    time * p.rotSpeed + p.drift, 
                    time * p.rotSpeed * 0.5, 
                    time * p.rotSpeed * 0.3
                );
            } else {
                dummy.rotation.set(time, time, time);
            }
            
            dummy.scale.setScalar(particleScale);
            dummy.updateMatrix();
            activeSystem.setMatrixAt(i, dummy.matrix);
        });
        activeSystem.instanceMatrix.needsUpdate = true;
    }

    // --- Flowers & Stems (Spring & Summer) ---
    if (flowersRef.current && stemsRef.current) {
        flowers.forEach((f, i) => {
            let scale = 0;
            if (progress < 0.25) {
                // Spring: Grow in gradually
                const p = progress / 0.15; 
                scale = f.scale * THREE.MathUtils.smoothstep(p, 0, 1);
            } else if (progress < 0.65) {
                // Summer + Early Autumn: Stay fully bloomed (Extended duration)
                scale = f.scale; 
            } else if (progress < 0.75) {
                // Late Autumn: Shrink out quickly before Winter
                const p = (progress - 0.65) / 0.1;
                scale = f.scale * (1 - THREE.MathUtils.smoothstep(p, 0, 1));
            } else {
                // Winter: Gone
                scale = 0;
            }

            // Update Stem
            dummy.position.set(f.x, (f.height * scale) / 2, f.z);
            dummy.rotation.set(0, 0, 0);
            dummy.scale.set(1, scale * f.height, 1); // Scale height only
            dummy.updateMatrix();
            stemsRef.current!.setMatrixAt(i, dummy.matrix);

            // Update Flower Head
            // Position on top of stem
            dummy.position.set(f.x, f.height * scale, f.z);
            dummy.rotation.set(-Math.PI / 2, 0, f.x * 2); 
            dummy.scale.setScalar(scale);
            dummy.updateMatrix();
            flowersRef.current!.setMatrixAt(i, dummy.matrix);
            flowersRef.current!.setColorAt(i, f.color);
        });
        flowersRef.current.instanceMatrix.needsUpdate = true;
        flowersRef.current.instanceColor!.needsUpdate = true;
        stemsRef.current.instanceMatrix.needsUpdate = true;
    }

    // --- Snow Drifts (Winter) ---
    if (snowDriftsRef.current) {
        const isWinter = progress >= 0.7 && progress < 1.0;
        
        piles.forEach((d, i) => {
            let scale = 0;
            if (isWinter) {
                const p = (progress - 0.7) / 0.1;
                scale = d.scale * THREE.MathUtils.smoothstep(p, 0, 1);
                if (progress > 0.95) {
                     const fade = (progress - 0.95) / 0.05;
                     scale *= (1 - fade);
                }
            }
            
            dummy.position.set(d.x, 0, d.z);
            dummy.rotation.set(0, d.rotation, 0);
            dummy.scale.set(scale, scale * 0.3, scale);
            dummy.updateMatrix();
            snowDriftsRef.current!.setMatrixAt(i, dummy.matrix);
        });
        snowDriftsRef.current.instanceMatrix.needsUpdate = true;
    }

    // --- Leaf Piles (Autumn) ---
    if (leafPilesRef.current) {
        // Autumn: 0.5 - 0.75
        const isAutumn = progress >= 0.5 && progress < 0.75;
        const isWinter = progress >= 0.75; // Stay until covered by snow?
        
        piles.forEach((d, i) => {
            let scale = 0;
            if (isAutumn) {
                // Grow in Autumn
                const p = (progress - 0.5) / 0.2;
                scale = d.scale * THREE.MathUtils.smoothstep(p, 0, 1);
            } else if (isWinter) {
               // Shrink/Get covered in Winter
               const p = (progress - 0.75) / 0.1;
               scale = d.scale * (1 - THREE.MathUtils.smoothstep(p, 0, 1));
            }
            
            // Offset slightly from snow position to look distinct
            dummy.position.set(d.x + 0.5, 0, d.z + 0.5); 
            dummy.rotation.set(0, d.rotation + 1, 0);
            dummy.scale.set(scale, scale * 0.2, scale); // Flatter than snow
            dummy.updateMatrix();
            leafPilesRef.current!.setMatrixAt(i, dummy.matrix);
        });
        leafPilesRef.current.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <group>
       {/* Ground (Rich Soil) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <circleGeometry args={[22, 64]} />
        <meshStandardMaterial ref={groundRef} color="#3E2723" roughness={1} />
      </mesh>

      {/* Snow Drifts (Winter Piles) */}
      <instancedMesh ref={snowDriftsRef} args={[undefined, undefined, pileCount]}>
          <sphereGeometry args={[1, 16, 8]} />
          <meshStandardMaterial color="#FFFFFF" roughness={0.9} />
      </instancedMesh>

      {/* Leaf Piles (Autumn Piles) */}
      <instancedMesh ref={leafPilesRef} args={[undefined, undefined, pileCount]}>
          <sphereGeometry args={[1, 12, 6]} />
          <meshStandardMaterial color="#D84315" roughness={1} />
      </instancedMesh>

      {/* Snow Particles */}
      <instancedMesh ref={snowSystemRef} args={[undefined, undefined, particleCount]}>
          <dodecahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color="#FFFFFF" emissive="#AAAAAA" />
      </instancedMesh>

      {/* Leaf Particles */}
      <instancedMesh ref={leafSystemRef} args={[undefined, undefined, particleCount]}>
          <primitive object={leafGeometry} />
          <meshStandardMaterial color="#D84315" side={THREE.DoubleSide} />
      </instancedMesh>

       {/* Flower Stems (Green Cylinders) */}
       <instancedMesh ref={stemsRef} args={[undefined, undefined, flowerCount]}>
          <cylinderGeometry args={[0.02, 0.02, 1, 6]} />
          <meshStandardMaterial color="#4CAF50" />
       </instancedMesh>

       {/* Flowers (3D Petals) */}
       <instancedMesh ref={flowersRef} args={[undefined, undefined, flowerCount]}>
          <primitive object={flowerGeometry} />
          <meshStandardMaterial side={THREE.DoubleSide} roughness={0.5} />
      </instancedMesh>
    </group>
  );
}

// --- Lighting ---

function SeasonalLighting({ timeOfDay = 12, season = "Spring" }: { timeOfDay?: number, season?: Season }) {
  const ambientRef = useRef<THREE.AmbientLight>(null);
  const sunRef = useRef<THREE.DirectionalLight>(null);
  const hemiRef = useRef<THREE.HemisphereLight>(null);
  const { scene } = useThree();

  // Colors
  const sunColors = useMemo(() => ({
    Spring: new THREE.Color("#FFF8E1"), // Soft Warm
    Summer: new THREE.Color("#FFFFF0"), // Bright White
    Autumn: new THREE.Color("#FFD54F"), // Golden
    Winter: new THREE.Color("#E3F2FD"), // Cold Blue
  }), []);

  const hemiColors = useMemo(() => ({
    Spring: { sky: new THREE.Color("#E1F5FE"), ground: new THREE.Color("#E8F5E9") },
    Summer: { sky: new THREE.Color("#B3E5FC"), ground: new THREE.Color("#C8E6C9") },
    Autumn: { sky: new THREE.Color("#FFF3E0"), ground: new THREE.Color("#D7CCC8") },
    Winter: { sky: new THREE.Color("#E0E0E0"), ground: new THREE.Color("#FAFAFA") },
  }), []);

  useFrame(() => {
    // Calculate sun position based on time of day (0-24)
    let sunAngle = 0;
    
    if (timeOfDay >= 6 && timeOfDay <= 18) {
        sunAngle = ((timeOfDay - 6) / 12) * Math.PI; // 0 to PI
    } else {
        sunAngle = Math.PI + ((timeOfDay >= 18 ? timeOfDay - 18 : timeOfDay + 6) / 12) * Math.PI;
    }

    const sunHeight = Math.sin(sunAngle); 
    const sunX = Math.cos(sunAngle) * 20; 
    const sunY = sunHeight * 20;
    const sunZ = 10; 

    // Intensity based on height (daylight)
    let dayIntensity = Math.max(0, sunHeight);
    dayIntensity = Math.pow(dayIntensity, 0.5); // Smooth transition

    // Night intensity (Moonlight) - peaks at midnight
    let nightIntensity = Math.max(0, -sunHeight);
    nightIntensity = Math.pow(nightIntensity, 0.5);

    const currentSunColor = sunColors[season];
    const currentHemi = hemiColors[season];

    if (sunRef.current) {
        if (dayIntensity > 0.01) {
            // Sun Mode
            sunRef.current.color.copy(currentSunColor);
            // Redden the sun at horizon
            if (dayIntensity < 0.3) {
                 sunRef.current.color.lerp(new THREE.Color("#FF7043"), 1 - (dayIntensity / 0.3));
            }
            sunRef.current.intensity = dayIntensity * 1.5;
            sunRef.current.position.set(sunX, sunY, sunZ);
        } else {
            // Moon Mode
            // Simulate moon by keeping light source above but changing color/intensity
            // We flip Y so it comes from above even at night
            sunRef.current.color.set("#C5CAE9"); // Cool Moon White
            sunRef.current.intensity = Math.max(0.3, nightIntensity * 0.6); // Ensure minimum visibility
            sunRef.current.position.set(sunX, Math.abs(sunY), sunZ); 
        }
    }
    
    if (ambientRef.current) {
        const nightAmbient = 0.4; // Increased visibility at night
        const dayAmbient = 0.7;
        
        // Blend between day and night ambient
        const currentAmbient = THREE.MathUtils.lerp(nightAmbient, dayAmbient, dayIntensity);
        ambientRef.current.intensity = currentAmbient;
        
        const nightColor = new THREE.Color("#1e293b"); // Slate-800 (lighter than before)
        ambientRef.current.color.copy(currentHemi.sky).lerp(nightColor, 1 - dayIntensity);
    }
    
    if (hemiRef.current) {
        const nightSky = new THREE.Color("#1e293b");
        const nightGround = new THREE.Color("#0f172a");
        
        hemiRef.current.color.copy(currentHemi.sky).lerp(nightSky, 1 - dayIntensity);
        hemiRef.current.groundColor.copy(currentHemi.ground).lerp(nightGround, 1 - dayIntensity);
        hemiRef.current.intensity = THREE.MathUtils.lerp(0.4, 0.6, dayIntensity); // Min 0.4 intensity
    }
    
    // Update Fog and Background to match sky
    if (scene.fog) {
        // @ts-ignore
        const fogColor = hemiRef.current?.color.clone() || new THREE.Color("#FAF7F0");
        // @ts-ignore
        scene.fog.color.copy(fogColor);
        scene.background = fogColor;
    }
  });

  return (
    <>
      <ambientLight ref={ambientRef} />
      <directionalLight 
        ref={sunRef} 
        castShadow 
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0001}
      />
      <hemisphereLight ref={hemiRef} />
    </>
  );
}

// --- Fruit Component ---

function AnimatedFruit({ position, dropDelay }: { position: [number, number, number], dropDelay: number }) {
  const ref = useRef<THREE.Group>(null);
  const [dropped, setDropped] = useState(false);
  const [landed, setLanded] = useState(false);
  
  useEffect(() => {
      const timer = setTimeout(() => setDropped(true), dropDelay);
      return () => clearTimeout(timer);
  }, [dropDelay]);

  useFrame((state, delta) => {
      if (!ref.current || !dropped || landed) return;
      
      ref.current.position.y -= delta * 4; // Fall speed
      
      if (ref.current.position.y <= 0.15) {
          ref.current.position.y = 0.15;
          setLanded(true);
      }
  });

  return (
      <group ref={ref} position={position}>
          <mesh castShadow>
              <sphereGeometry args={[0.12, 16, 16]} />
              <meshStandardMaterial color="#FF5252" roughness={0.4} />
          </mesh>
          <mesh position={[0, 0.1, 0]}>
              <cylinderGeometry args={[0.02, 0.02, 0.1, 4]} />
              <meshStandardMaterial color="#3E2723" />
          </mesh>
      </group>
  );
}

// --- Tree Generator ---

function ProceduralTree({ contributions, position = [0, 0, 0], scale = 1, season = "Spring" }: { contributions: number, position?: [number, number, number], scale?: number, season?: Season }) {
  const groupRef = useRef<THREE.Group>(null);
  
  const treeStructure = useMemo(() => {
    const branches: { id: string, start: THREE.Vector3, end: THREE.Vector3, thickness: number }[] = [];
    const foliage: { id: string, position: [number, number, number], scale: number }[] = [];
    const fruits: { id: string, position: [number, number, number], dropDelay: number }[] = [];
    
    const growthFactor = Math.min(contributions / 1000, 1);
    
    let maxDepth = 2;
    if (contributions >= 50) maxDepth = 3;
    if (contributions >= 200) maxDepth = 4;
    if (contributions >= 500) maxDepth = 5;
    if (contributions >= 1000) maxDepth = 7;

    const trunkHeight = 2.5 + growthFactor * 5; 
    const baseThickness = 0.3 + growthFactor * 0.7;
    
    const fruitChance = contributions >= 1000 ? 0.05 : (contributions >= 500 ? 0.2 : 0);
    
    function growBranch(
        start: THREE.Vector3, 
        direction: THREE.Vector3, 
        length: number, 
        thickness: number, 
        depth: number,
        parentId: string
    ) {
      if (depth === 0) {
        foliage.push({ 
          id: parentId + "-foliage",
          position: start.toArray(), 
          scale: 0.5 + hashRandom(parentId + "-scale") * 0.5 
        });

        if (fruitChance > 0 && hashRandom(parentId + "-fruit") < fruitChance) {
            fruits.push({
                id: parentId + "-fruit",
                position: start.toArray(),
                dropDelay: 2000 + hashRandom(parentId + "-delay") * 10000
            });
        }
        return;
      }

      const end = new THREE.Vector3().copy(start).add(direction.clone().multiplyScalar(length));
      
      branches.push({ id: parentId, start, end, thickness });

      const isTrunk = depth === maxDepth;
      const numBranches = isTrunk ? 1 : 2 + Math.floor(hashRandom(parentId + "-num") * 3);
      
      // Random rotation offset for this node to prevent alignment artifacts
      const segmentOffset = hashRandom(parentId + "-offset") * Math.PI * 2;

      for (let i = 0; i < numBranches; i++) {
        const childId = `${parentId}-${i}`;
        
        // Distribute branches evenly around the trunk/branch (Azimuth)
        // i / numBranches gives 0, 0.33, 0.66 etc.
        const azimuth = segmentOffset + (i / numBranches) * Math.PI * 2 + (hashRandom(childId + "-az") - 0.5) * 0.5;
        
        // Angle away from parent direction (Pitch)
        // Trunk splits are narrower (growing up), branch splits are wider (growing out)
        const spread = isTrunk ? 0.3 : 0.8 + (hashRandom(childId + "-sp") - 0.5) * 0.4;
        
        // Calculate new direction using robust 3D rotation
        // 1. Find a vector perpendicular to current direction to serve as a rotation axis
        let perp = new THREE.Vector3(1, 0, 0);
        if (Math.abs(direction.x) > 0.9) perp.set(0, 1, 0); // Avoid parallel vectors
        
        const tangent = new THREE.Vector3().crossVectors(direction, perp).normalize();
        
        // 2. Rotate this tangent around the direction by 'azimuth' to get the specific axis for this branch
        const pitchAxis = tangent.clone().applyAxisAngle(direction, azimuth);
        
        // 3. Rotate the original direction around this new axis by 'spread' (pitch)
        const newDir = direction.clone().applyAxisAngle(pitchAxis, spread).normalize();
        
        const newLength = isTrunk ? length * 0.8 : length * 0.7;
        const newThickness = thickness * 0.7;

        growBranch(
          end, 
          newDir, 
          newLength, 
          newThickness, 
          depth - 1,
          childId
        );
      }
      
      if (isTrunk && hashRandom(parentId + "-side") > 0.3) {
         const sideId = parentId + "-side";
         
         // Generate a random side branch direction perpendicular to the trunk
         // 1. Get random azimuth
         const sideAzimuth = hashRandom(sideId + "-az") * Math.PI * 2;
         
         // 2. Create a perpendicular vector
         let perp = new THREE.Vector3(1, 0, 0);
         if (Math.abs(direction.x) > 0.9) perp.set(0, 1, 0);
         const tangent = new THREE.Vector3().crossVectors(direction, perp).normalize();
         
         // 3. Rotate tangent by azimuth to get the side direction
         const sideDir = tangent.applyAxisAngle(direction, sideAzimuth).normalize();
         
         // 4. Tilt it slightly up (blend with original direction)
         sideDir.add(direction.clone().multiplyScalar(0.5)).normalize();

         growBranch(end, sideDir, length * 0.5, thickness * 0.5, depth - 2 > 0 ? depth - 2 : 0, sideId);
      }
    }

    growBranch(
      new THREE.Vector3(0, 0, 0), 
      new THREE.Vector3(0, 1, 0), 
      trunkHeight / 2, 
      baseThickness, 
      maxDepth,
      "root"
    );

    return { branches, foliage, fruits };
  }, [contributions]);

  return (
    <group ref={groupRef} position={position} scale={[scale, scale, scale]}>
      {treeStructure.branches.map((b) => (
        <AnimatedBranch 
            key={b.id} 
            start={b.start} 
            end={b.end} 
            thickness={b.thickness} 
            color="#5D4037" 
        />
      ))}
      {treeStructure.foliage.map((f) => (
        <AnimatedFoliage 
            key={f.id} 
            position={f.position} 
            scale={f.scale} 
            color="#4CAF50" 
            season={season}
        />
      ))}
      {treeStructure.fruits.map((f) => (
        <AnimatedFruit
            key={f.id}
            position={f.position}
            dropDelay={f.dropDelay}
        />
      ))}
    </group>
  );
}

// Forest component removed as per request

// --- Floating Messages ---

function FloatingMessage({ contributor, position, onComplete }: { contributor: Contributor, position: [number, number, number], onComplete: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onComplete, 8000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <Html position={position} center distanceFactor={15} zIndexRange={[100, 0]}>
      <motion.div
        initial={{ opacity: 0, scale: 0.5, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.5, y: -20 }}
        transition={{ duration: 0.5 }}
        className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-md px-4 py-3 rounded-2xl shadow-xl border border-[#C8E86C] dark:border-[#C8E86C]/50 min-w-[180px] max-w-[240px] pointer-events-none"
      >
        <div className="flex items-center gap-2 mb-1">
          <div className="w-6 h-6 rounded-full bg-[#4A6B5C] flex items-center justify-center text-white text-xs font-bold">
            {contributor.name.charAt(0)}
          </div>
          <p className="font-bold text-[#2C2C2C] dark:text-gray-100 text-sm">{contributor.name}</p>
        </div>
        {contributor.message && (
          <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">"{contributor.message}"</p>
        )}
      </motion.div>
    </Html>
  );
}

function MessageSystem({ contributors, contributions }: { contributors: Contributor[], contributions: number }) {
  const [activeMessages, setActiveMessages] = useState<{ id: string; contributor: Contributor; position: [number, number, number] }[]>([]);
  
  useEffect(() => {
    if (contributors.length === 0 || contributions < 10) return;

    const interval = setInterval(() => {
      setActiveMessages((prev) => {
        if (prev.length >= 4) return prev; 

        const availableContributors = contributors.filter(c => !prev.find(p => p.contributor.id === c.id));
        if (availableContributors.length === 0) return prev;

        const randomContributor = availableContributors[Math.floor(Math.random() * availableContributors.length)];
        
        const heightBase = contributions > 200 ? 5 : 3;
        const theta = Math.random() * Math.PI * 2;
        const radius = 3.5 + Math.random() * 2;
        const y = heightBase + (Math.random() - 0.5) * 3;
        const x = radius * Math.cos(theta);
        const z = radius * Math.sin(theta);

        return [...prev, { id: Math.random().toString(), contributor: randomContributor, position: [x, y, z] }];
      });
    }, 2500);

    return () => clearInterval(interval);
  }, [contributors, contributions]);

  const removeMessage = (id: string) => {
    setActiveMessages(prev => prev.filter(m => m.id !== id));
  };

  return (
    <>
      <AnimatePresence>
        {activeMessages.map((msg) => (
          <FloatingMessage
            key={msg.id}
            contributor={msg.contributor}
            position={msg.position}
            onComplete={() => removeMessage(msg.id)}
          />
        ))}
      </AnimatePresence>
    </>
  );
}

// --- Realistic Seed & Sprout ---

function PlantLabel({ visible, onClose }: { visible: boolean, onClose: () => void }) {
    return (
        <Html position={[0, 2, 0]} center zIndexRange={[1000, 0]}>
            <AnimatePresence>
                {visible && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.8 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.8 }}
                        className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-md px-4 py-2 rounded-full shadow-lg border border-[#81C784] dark:border-[#81C784]/50 flex items-center gap-2 cursor-pointer"
                        onClick={(e) => { e.stopPropagation(); onClose(); }}
                    >
                        <span className="w-2 h-2 rounded-full bg-[#4CAF50] animate-pulse" />
                        <span className="font-display text-[#2E7D32] dark:text-[#81C784] font-bold text-sm whitespace-nowrap">Apple Tree</span>
                    </motion.div>
                )}
            </AnimatePresence>
        </Html>
    );
}

function RealisticSeed({ visible, onClick }: { visible: boolean, onClick: () => void }) {
    const meshRef = useRef<THREE.Group>(null);
    
    // Apple seed shape (teardrop)
    const seedGeometry = useMemo(() => {
        const points = [];
        for (let i = 0; i <= 10; i++) {
            const t = i / 10;
            const y = t * 0.4;
            const x = Math.sin(t * Math.PI) * 0.12 * (1 - t * 0.5); // Tapered top
            points.push(new THREE.Vector2(x, y));
        }
        return new THREE.LatheGeometry(points, 16);
    }, []);

    useFrame((state, delta) => {
        if (meshRef.current) {
            const targetScale = visible ? 1 : 0.01;
            meshRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), delta * 4);
        }
    });

    return (
        <group ref={meshRef} position={[0, 0.02, 0]} onClick={(e) => { e.stopPropagation(); onClick(); }}>
            {/* Main Seed Body */}
            <mesh geometry={seedGeometry} castShadow rotation={[0.2, 0, 0.2]}>
                <meshStandardMaterial color="#3E2723" roughness={0.4} />
            </mesh>
            {/* Soil displacement/mound */}
            <mesh position={[0, -0.02, 0]} rotation={[-Math.PI/2, 0, 0]} receiveShadow>
                <circleGeometry args={[0.3, 32]} />
                <meshStandardMaterial color="#281915" roughness={1} />
            </mesh>
        </group>
    );
}

function RealisticSprout({ onClick }: { onClick: () => void }) {
    const groupRef = useRef<THREE.Group>(null);
    
    // Curved stem
    const stemCurve = useMemo(() => new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0.02, 0.2, 0.02),
        new THREE.Vector3(-0.05, 0.5, 0),
        new THREE.Vector3(0, 0.8, 0)
    ]), []);

    useFrame((state) => {
        if (groupRef.current) {
            // Gentle sway in wind
            const time = state.clock.elapsedTime;
            groupRef.current.rotation.z = Math.sin(time * 0.5) * 0.05;
            groupRef.current.rotation.x = Math.cos(time * 0.3) * 0.05;
        }
    });

    return (
        <group ref={groupRef} onClick={(e) => { e.stopPropagation(); onClick(); }}>
            {/* Stem */}
            <mesh castShadow>
                <tubeGeometry args={[stemCurve, 20, 0.03, 8, false]} />
                <meshStandardMaterial color="#81C784" roughness={0.5} />
            </mesh>
            
            {/* Cotyledons (Seed leaves) */}
            <group position={[0, 0.78, 0]}>
                <mesh rotation={[0.5, 0, 0.5]} position={[0.1, 0, 0]} castShadow>
                    <primitive object={leafGeometry} />
                    <meshStandardMaterial color="#66BB6A" side={THREE.DoubleSide} />
                </mesh>
                <mesh rotation={[0.5, Math.PI, -0.5]} position={[-0.1, 0, 0]} castShadow>
                    <primitive object={leafGeometry} />
                    <meshStandardMaterial color="#66BB6A" side={THREE.DoubleSide} />
                </mesh>
            </group>
        </group>
    );
}

// --- Main Component ---

function SeasonIndicator({ season }: { season: Season }) {
    return (
        <Html position={[0, -2, 0]} center>
            <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur px-4 py-1 rounded-full text-xs font-mono tracking-widest text-gray-600 dark:text-gray-300 uppercase border border-white/50 dark:border-gray-600/50 shadow-sm">
                {season}
            </div>
        </Html>
    );
}

export function ThreePlant({ stage, contributors, contributions, timeOfDay = 12, season = "Spring" }: ThreePlantProps) {
  const [showLabel, setShowLabel] = useState(false);

  return (
    <div className="w-full h-full relative z-0">
      <Canvas
        camera={{ position: [0, 6, 14], fov: 45 }}
        shadows
        style={{ position: 'relative', zIndex: 0 }}
        gl={{ antialias: true, alpha: true, toneMapping: THREE.ACESFilmicToneMapping }}
      >
        {/* Background and Fog are managed by SeasonalLighting */}
        <fog attach="fog" args={['#FAF7F0', 15, 50]} />
        
        <SeasonalLighting timeOfDay={timeOfDay} season={season} />

        <RealisticSeed visible={stage === "seed"} onClick={() => setShowLabel(true)} />

        {stage === "sprout" && (
             <RealisticSprout onClick={() => setShowLabel(true)} />
        )}

        {(stage === "plant" || stage === "tree") && (
          <ProceduralTree contributions={contributions} season={season} />
        )}

        {/* Environment elements - GrassField now visible in all stages */}
        <GrassField season={season} />
        <SeasonalEnvironment season={season} />
        <SeasonIndicator season={season} />
        
        <PlantLabel visible={showLabel} onClose={() => setShowLabel(false)} />

        <MessageSystem contributors={contributors} contributions={contributions} />

        {/* Soil Mound - Fixed rotation to be flat on ground */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
          <circleGeometry args={[2, 32]} />
          <meshStandardMaterial color="#3E2723" roughness={1} />
        </mesh>

        <OrbitControls 
          enableZoom={true}
          minDistance={2}
          maxDistance={25}
          enablePan={false} 
          minPolarAngle={Math.PI / 3.5} 
          maxPolarAngle={Math.PI / 2.1}
          autoRotate
          autoRotateSpeed={0.8}
          target={[0, 1, 0]}
        />
      </Canvas>
    </div>
  );
}
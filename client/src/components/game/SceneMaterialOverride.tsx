import { useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useEngine } from "@/lib/stores/useEngine";

const cadWireframeMaterial = new THREE.MeshBasicMaterial({
  color: 0x000000,
  wireframe: true,
});

function getColorForMesh(mesh: THREE.Mesh): number {
  const name = (mesh.name + " " + (mesh.parent?.name || "")).toLowerCase();
  if (name.includes("block")) return 0x555555;
  if (name.includes("piston")) return 0xaaaaaa;
  if (name.includes("crank")) return 0x666666;
  if (name.includes("rod")) return 0x4682b4;
  if (name.includes("valve")) return 0xcc0000;
  if (name.includes("intake")) return 0x228b22;
  if (name.includes("exhaust")) return 0xcd6600;
  if (name.includes("oil")) return 0x333333;
  if (name.includes("head")) return 0x777777;
  return 0x888888;
}

export function SceneMaterialOverride() {
  const { scene } = useThree();
  const cadMode = useEngine((state) => state.cadMode);
  const wireframeMode = useEngine((state) => state.wireframeMode);
  const materialPreset = useEngine((state) => state.materialPreset);
  const originalMaterials = useRef<Map<THREE.Mesh, THREE.Material | THREE.Material[]>>(new Map());
  const presetMaterials = useRef<Map<THREE.Mesh, THREE.Material>>(new Map());

  useEffect(() => {
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        if (!originalMaterials.current.has(object)) {
          originalMaterials.current.set(object, object.material);
        }
      }
    });
  }, [scene]);

  useEffect(() => {
    if (cadMode) {
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          if (!originalMaterials.current.has(object)) {
            originalMaterials.current.set(object, object.material);
          }
          object.material = cadWireframeMaterial;
          object.castShadow = false;
          object.receiveShadow = false;
        }
      });
      return;
    }

    if (materialPreset === "default") {
      originalMaterials.current.forEach((material, mesh) => {
        if (mesh.parent) {
          mesh.material = material;
        }
      });
      presetMaterials.current.forEach((mat) => mat.dispose());
      presetMaterials.current.clear();
    } else {
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          if (!originalMaterials.current.has(object)) {
            originalMaterials.current.set(object, object.material);
          }

          let mat = presetMaterials.current.get(object);
          if (!mat) {
            if (materialPreset === "metallic") {
              mat = new THREE.MeshStandardMaterial({
                color: 0xc0c0c0,
                metalness: 1.0,
                roughness: 0.15,
              });
            } else if (materialPreset === "matte") {
              mat = new THREE.MeshStandardMaterial({
                color: 0x888888,
                metalness: 0.0,
                roughness: 0.9,
              });
            } else {
              mat = new THREE.MeshStandardMaterial({
                color: getColorForMesh(object),
                metalness: 0.3,
                roughness: 0.6,
              });
            }
            presetMaterials.current.set(object, mat);
          } else {
            if (materialPreset === "metallic") {
              (mat as THREE.MeshStandardMaterial).color.setHex(0xc0c0c0);
              (mat as THREE.MeshStandardMaterial).metalness = 1.0;
              (mat as THREE.MeshStandardMaterial).roughness = 0.15;
            } else if (materialPreset === "matte") {
              (mat as THREE.MeshStandardMaterial).color.setHex(0x888888);
              (mat as THREE.MeshStandardMaterial).metalness = 0.0;
              (mat as THREE.MeshStandardMaterial).roughness = 0.9;
            } else {
              (mat as THREE.MeshStandardMaterial).color.setHex(getColorForMesh(object));
              (mat as THREE.MeshStandardMaterial).metalness = 0.3;
              (mat as THREE.MeshStandardMaterial).roughness = 0.6;
            }
          }
          object.material = mat;
        }
      });
    }

    scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.castShadow = true;
        object.receiveShadow = true;
      }
    });
  }, [cadMode, materialPreset, scene]);

  useEffect(() => {
    if (cadMode) return;

    scene.traverse((object) => {
      if (object instanceof THREE.Mesh && object.material) {
        const mat = object.material as THREE.Material;
        if ("wireframe" in mat) {
          (mat as any).wireframe = wireframeMode;
        }
      }
    });
  }, [wireframeMode, cadMode, materialPreset, scene]);

  return null;
}

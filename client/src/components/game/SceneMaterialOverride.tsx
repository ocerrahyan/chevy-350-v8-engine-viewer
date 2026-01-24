import { useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useEngine } from "@/lib/stores/useEngine";

const wireframeMaterial = new THREE.MeshBasicMaterial({
  color: 0x000000,
  wireframe: true,
});

export function SceneMaterialOverride() {
  const { scene } = useThree();
  const cadMode = useEngine((state) => state.cadMode);
  const originalMaterials = useRef<Map<THREE.Mesh, THREE.Material | THREE.Material[]>>(new Map());

  useEffect(() => {
    if (cadMode) {
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          if (!originalMaterials.current.has(object)) {
            originalMaterials.current.set(object, object.material);
          }
          object.material = wireframeMaterial;
          object.castShadow = false;
          object.receiveShadow = false;
        }
      });
    } else {
      originalMaterials.current.forEach((material, mesh) => {
        if (mesh.parent) {
          mesh.material = material;
        }
      });
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.castShadow = true;
          object.receiveShadow = true;
        }
      });
    }
  }, [cadMode, scene]);

  return null;
}

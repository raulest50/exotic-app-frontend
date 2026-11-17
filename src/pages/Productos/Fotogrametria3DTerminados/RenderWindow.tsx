import { useEffect, useRef, useState } from "react";
import { Box, Text } from "@chakra-ui/react";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

export default function RenderWindow({ model, active }: { model: Blob | null; active: boolean }) {
    const host = useRef<HTMLDivElement>(null);
    const [error, setError] = useState("");
    useEffect(() => {
        if (!model || !active || !host.current) return;
        const target = host.current;
        let cancelled = false;
        let animation = 0;
        let scene: THREE.Scene | undefined;
        let renderer: THREE.WebGLRenderer;
        let controls: OrbitControls | undefined;
        let observer: ResizeObserver | undefined;
        setError("");
        const dispose = (object: THREE.Object3D) => object.traverse(child => {
            if (!(child instanceof THREE.Mesh)) return;
            child.geometry.dispose();
            for (const material of Array.isArray(child.material) ? child.material : [child.material]) {
                for (const value of Object.values(material)) if (value instanceof THREE.Texture) { value.dispose(); if (value.source.data instanceof ImageBitmap) value.source.data.close(); }
                material.dispose();
            }
        });
        try {
            renderer = new THREE.WebGLRenderer({ antialias: true });
            renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
            renderer.setClearColor(0x18212c);
            renderer.outputColorSpace = THREE.SRGBColorSpace;
            renderer.domElement.setAttribute("aria-label", "Modelo 3D del terminado: arrastra para girar y usa la rueda para acercar");
            renderer.domElement.setAttribute("role", "img");
            target.appendChild(renderer.domElement);
            scene = new THREE.Scene();
            const camera = new THREE.PerspectiveCamera(40, 1, 0.001, 10000);
            scene.add(new THREE.HemisphereLight(0xffffff, 0x64748b, 3));
            const light = new THREE.DirectionalLight(0xffffff, 3); light.position.set(3, 5, 4); scene.add(light);
            controls = new OrbitControls(camera, renderer.domElement); controls.enableDamping = true;
            const resize = () => { const width = target.clientWidth; renderer.setSize(width, 340); camera.aspect = width / 340; camera.updateProjectionMatrix(); };
            observer = new ResizeObserver(resize); observer.observe(target); resize();
            void model.arrayBuffer().then(buffer => new GLTFLoader().parseAsync(buffer, "")).then(gltf => {
                if (cancelled) { dispose(gltf.scene); return; }
                scene!.add(gltf.scene);
                const bounds = new THREE.Box3().setFromObject(gltf.scene);
                if (bounds.isEmpty()) throw new Error("El modelo no contiene una superficie visible.");
                const center = bounds.getCenter(new THREE.Vector3());
                const size = bounds.getSize(new THREE.Vector3()).length();
                camera.position.copy(center).add(new THREE.Vector3(size, size * 0.5, size));
                camera.near = Math.max(size / 10000, 0.000001); camera.far = Math.max(size * 100, 1); camera.updateProjectionMatrix();
                controls!.target.copy(center); controls!.update();
            }).catch(cause => { if (!cancelled) setError(cause instanceof Error ? cause.message : "No se pudo visualizar el modelo."); });
            const draw = () => { if (cancelled) return; controls?.update(); renderer.render(scene!, camera); animation = requestAnimationFrame(draw); };
            draw();
        } catch { setError("Este navegador no pudo iniciar el visor 3D. El modelo aceptado se conserva para guardarlo."); }
        return () => {
            cancelled = true; cancelAnimationFrame(animation); observer?.disconnect(); controls?.dispose();
            if (scene) dispose(scene);
            if (renderer!) { renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove(); }
        };
    }, [model, active]);
    return <Box borderWidth="1px" rounded="md" overflow="hidden" bg="bg.subtle">
        <Box ref={host} minH={model && active ? "340px" : undefined} />
        {!model && <Text p="6" color="fg.muted" textAlign="center">El modelo aparecerá aquí después de reconstruir las fotografías.</Text>}
        {model && <Text px="3" py="2" fontSize="xs" color="fg.muted">Arrastra para girar · rueda para acercar · botón derecho para desplazar.</Text>}
        {error && <Text role="alert" color="red.fg" p="3">{error}</Text>}
    </Box>;
}

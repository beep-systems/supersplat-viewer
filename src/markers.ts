import { Entity, Vec3, Quat, StandardMaterial, PROJECTION_PERSPECTIVE } from 'playcanvas';
import type { AppBase, CameraComponent, GraphNode } from 'playcanvas';

import type { MarkerOptions, MarkerVisual, MarkerConnectionOptions, MarkerConnection } from './voluscape-types';
// VoluScape marker primitives; ownership stays with the host controller.
const createMarkerMaterial = (color = [1, 8 / 255, 5 / 255]) => {
    const material = new StandardMaterial();
    material.useLighting = false;
    material.useSkybox = false;
    material.useFog = false;
    material.diffuse.set(0, 0, 0);
    material.emissive.set(color[0], color[1], color[2]);
    material.depthTest = true;
    material.depthWrite = true;
    material.update();
    return material;
};
const createSceneMarkerVisual = (app: AppBase, { position, normal, height, color }: MarkerOptions): MarkerVisual => {
    const component = app.root.findComponents('gsplat')[0];
    if (!component || !Number.isFinite(height) || height <= 0)
        throw new Error('A loaded scene and a positive marker height are required.');
    const parent = component.entity;
    const inverse = parent.getWorldTransform().clone().invert();
    const sourcePosition = inverse.transformPoint(new Vec3(position));
    // Surface normal is metadata only. The pin always points toward display-world +Y.
    const sourceNormal = inverse.transformVector(new Vec3(normal ?? [0, 0, 0])).normalize();
    const sourceUp = inverse.transformVector(new Vec3(0, 1, 0)).normalize();
    const scale = parent.getWorldTransform().transformVector(sourceUp).length();
    const localHeight = height / scale;
    const root = new Entity('VoluScapeMarker', app);
    root.setLocalPosition(sourcePosition);
    const alignToSceneUp = () => {
        const up = parent
            .getWorldTransform()
            .clone()
            .invert()
            .transformVector(new Vec3(0, 1, 0))
            .normalize();
        const rotation = new Quat();
        if (up.y < -0.999999) rotation.set(1, 0, 0, 0);
        else rotation.set(up.z, 0, -up.x, 1 + up.y).normalize();
        root.setLocalRotation(rotation);
        // The viewer renders on demand; geometry changes need an explicit frame.
        app.renderNextFrame = true;
    };
    const material = createMarkerMaterial(color);
    const shape = (type: 'cone' | 'sphere', y: number, sx: number, sy: number, sz: number) => {
        const entity = new Entity(`Marker-${type}`, app);
        root.addChild(entity);
        entity.addComponent('render', { type, material });
        entity.setLocalPosition(0, y * localHeight, 0);
        entity.setLocalScale(sx * localHeight, sy * localHeight, sz * localHeight);
        for (const mesh of entity.render.meshInstances) {
            mesh.pick = false;
            mesh.castShadow = false;
            mesh.receiveShadow = false;
        }
        return entity;
    };
    try {
        // PlayCanvas cone points along +Y. Flip it so the tip is exactly at the anchor.
        shape('cone', 0.35, 0.24, 0.7, 0.24).setLocalEulerAngles(180, 0, 0);
        shape('sphere', 0.8, 0.4, 0.4, 0.4);
        parent.addChild(root);
        alignToSceneUp();
    } catch (error) {
        root.destroy();
        material.destroy();
        throw error;
    }
    let disposed = false;
    const anchor = {
        componentIndex: 0,
        position: [sourcePosition.x, sourcePosition.y, sourcePosition.z],
        normal: [sourceNormal.x, sourceNormal.y, sourceNormal.z]
    };
    return {
        entity: root,
        alignToSceneUp,
        anchor,
        setColor: (color) => {
            if (disposed) return;
            material.emissive.set(color[0], color[1], color[2]);
            material.update();
            app.renderNextFrame = true;
        },
        moveTo: (hit) => {
            const inverse = parent.getWorldTransform().clone().invert();
            const point = inverse.transformPoint(new Vec3(hit.position));
            const normal = inverse.transformVector(new Vec3(hit.normal ?? [0, 0, 0])).normalize();
            root.setLocalPosition(point);
            anchor.position = [point.x, point.y, point.z];
            anchor.normal = [normal.x, normal.y, normal.z];
            app.renderNextFrame = true;
        },
        setSelected: (selected) => {
            const size = localHeight * (selected ? 0.55 : 0.4);
            root.findByName('Marker-sphere').setLocalScale(size, size, size);
            app.renderNextFrame = true;
        },
        screenPosition: () => {
            const camera = app.root.findComponents('camera')[0] as CameraComponent;
            const head = root.findByName('Marker-sphere').getPosition();
            const depth = head.clone().sub(camera.entity.getPosition()).dot(camera.entity.forward);
            if (depth <= camera.nearClip) return null;
            const screen = camera.worldToScreen(head);
            return { x: screen.x, y: screen.y, depth };
        },
        destroy: () => {
            if (disposed) return;
            disposed = true;
            root.destroy();
            material.destroy();
            app.renderNextFrame = true;
        }
    };
};

// Straight world-space segment between the spherical heads of consecutive pins.
const createSceneMarkerConnection = (
    app: AppBase,
    { from, to, height, color }: MarkerConnectionOptions
): MarkerConnection => {
    const parent = from.entity.parent;
    const fromHead = from.entity.findByName('Marker-sphere');
    const toHead = to.entity.findByName('Marker-sphere');
    const entity = new Entity('VoluScapeMarkerConnection', app);
    parent.addChild(entity);
    // Segments own their material so mixed-color endpoints can use a red fallback.
    const material = createMarkerMaterial(color);
    entity.addComponent('render', { type: 'cylinder', material });
    for (const mesh of entity.render.meshInstances) {
        mesh.pick = false;
        mesh.castShadow = false;
        mesh.receiveShadow = false;
    }
    let disposed = false;
    const update = () => {
        if (disposed) return;
        const inverse = parent.getWorldTransform().clone().invert();
        const a = inverse.transformPoint(fromHead.getPosition());
        const b = inverse.transformPoint(toHead.getPosition());
        const direction = b.clone().sub(a);
        const length = direction.length();
        entity.enabled = length > 1e-8;
        if (entity.enabled) {
            direction.mulScalar(1 / length);
            entity.setLocalPosition(a.clone().add(b).mulScalar(0.5));
            const rotation = new Quat();
            if (direction.y < -0.999999) rotation.set(1, 0, 0, 0);
            else rotation.set(direction.z, 0, -direction.x, 1 + direction.y).normalize();
            entity.setLocalRotation(rotation);
            entity.setLocalScale(height * 0.15, length, height * 0.15);
        }
        app.renderNextFrame = true;
    };
    update();
    return {
        entity,
        update,
        screenSegment: () => {
            if (disposed || !entity.enabled) return null;
            const camera = app.root.findComponents('camera')[0] as CameraComponent;
            const project = (head: GraphNode) => {
                const position = head.getPosition();
                const depth = position.clone().sub(camera.entity.getPosition()).dot(camera.entity.forward);
                if (depth <= camera.nearClip) return null;
                const screen = camera.worldToScreen(position);
                return { x: screen.x, y: screen.y, depth, position: [position.x, position.y, position.z] };
            };
            const a = project(fromHead),
                b = project(toHead);
            return a && b ? { a, b, perspective: camera.projection === PROJECTION_PERSPECTIVE } : null;
        },
        setColor: (color) => {
            if (disposed) return;
            material.emissive.set(color[0], color[1], color[2]);
            material.update();
            app.renderNextFrame = true;
        },
        destroy: () => {
            if (disposed) return;
            disposed = true;
            entity.destroy();
            material.destroy();
            app.renderNextFrame = true;
        }
    };
};

export { createSceneMarkerVisual, createSceneMarkerConnection };

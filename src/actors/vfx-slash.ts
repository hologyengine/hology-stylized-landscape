import { ActorComponent, Component, ViewController, World, inject } from "@hology/core/gameplay";
import System, {
  Emitter,
  Rate,
  Span,
  Position,
  Mass,
  Radius,
  Life,
  RadialVelocity,
  SpriteRenderer,
  PointZone,
  Vector3D,
  Alpha,
  Scale,
  Color,
  Body,
  BoxZone,
  Rotate,
  Gravity,
  MeshRenderer,
  Initializer,
  ease,
  Behaviour,
  Particle
} from 'three-nebula';
import * as THREE from 'three';
import VfxSlash from "../shaders/vfx-slash";
import Rotation from "three-nebula/src/initializer/Rotation";
import { NodeShaderMaterial } from "@hology/core/shader-nodes";


@Component()
class VfxSlashComponent extends ActorComponent {
  private world = inject(World)
  private viewController = inject(ViewController)
  private rate = new Rate(1, 99999)

  onInit(): void | Promise<void> {
    console.log("here")

    const system = new System();
    const emitter = new Emitter();
    const container = new THREE.Object3D()
    const renderer = new MeshRenderer(container, THREE);

    const material = new VfxSlash().build()
    material.transparent = true
    material.side = THREE.DoubleSide

    const createMesh = ({ geometry, material }) =>
        new THREE.Mesh(geometry, material);

    const geometry = new THREE.CircleGeometry(1.5, 20, )
    geometry.rotateX(Math.PI / 2)

    const mesh = createMesh({
          geometry: geometry,
          material
          //material: new THREE.MeshLambertMaterial({ color: '#ff0000', side: THREE.DoubleSide }),
        })

    // if I set uniforms per particle I may need to clone the material right?

    // Using a user interface for this would make it harder to steal.  

    container.position.y = 1.2
    
    container.rotateZ(.15)
    container.rotateY(Math.PI / 2)

    this.actor.object.add(container)


    const rate = this.rate
    emitter
      .setRate(rate)
      .addInitializers([
       // new Mass(1),
        new Radius(1),
        new Life(1),
        new Body(mesh)
        //new RadialVelocity(200, new Vector3D(0, 1, 1), 30),
      ])
      .addBehaviours([
        new Rotate(0, -Math.PI * 2.5, 0, 1, ease.easeOutCubic),
        new CustomBehaviour(),
        //new Scale(1, 0.5),
       // new Gravity(3),
      ])
      .emit()



    // add the emitter and a renderer to your particle system
    system
      .addEmitter(emitter)
      .addRenderer(renderer)
  /*    .emit({ onStart: () => {
        console.log("started")
      }, onUpdate: () => {}, onEnd: () => {
        console.log("ended")
      } });
*/



    this.viewController.onUpdate(this.actor).subscribe(dt => {
      system.update(dt)
    })

  }


  play() {
    // This is a hacky solution to make it play next frame
    this.rate.nextTime = 0
  }

}

export default VfxSlashComponent




const uniformNameParticleEnergy = 'hology_particle_energy'
class CustomBehaviour extends Behaviour {
  initialize(particle: Particle): void {
    if (particle.body instanceof THREE.Mesh) {
      // Cloning materials is necessary in order to provide 
      // these uniforms. This should only be necessary however
      // if the material is using per particle uniform like energy.
      // It might be worth having a pool of these materials to reduce allocations
      const material = particle.body.material
      if (material instanceof NodeShaderMaterial && material.uniforms[uniformNameParticleEnergy] != null) {
        particle.body.material = material.clone()
      }
    }
  }
  mutate(target: Particle | Emitter, time: number, index: number): void {
    this.energize(target, time)
    if (target.target instanceof THREE.Mesh) {
      const material = target.target.material as THREE.Material

      // What other uniforms could be useful?
      // Maybe the time when the particle first was created. That could help reduce the number of uniforms to copy

      if (material instanceof NodeShaderMaterial && material.uniforms[uniformNameParticleEnergy] != null) {
        material.uniforms[uniformNameParticleEnergy].value = this.energy
      }
    }
  }
}

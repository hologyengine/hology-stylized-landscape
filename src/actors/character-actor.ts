import {
  Actor, AnimationState,
  AnimationStateMachine, attach, BaseActor,
  inject,
  RootMotionClip,
  World
} from "@hology/core/gameplay";
import {
  CharacterAnimationComponent,
  CharacterMovementComponent,
  CharacterMovementMode,
  ThirdPartyCameraComponent
} from "@hology/core/gameplay/actors";
import { AnimationClip, Bone, Loader, Material, Mesh, MeshStandardMaterial, Object3D, ShaderMaterial } from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import VfxSlashComponent from "./vfx-slash";


@Actor()
class CharacterActor extends BaseActor {
  private world = inject(World)
  private animation = attach(CharacterAnimationComponent)
  public movement = attach(CharacterMovementComponent, {
    maxSpeed: 1.8,
    maxSpeedSprint: 5,
    maxSpeedBackwards: 1.7,
    snapToGround: 0.3,
    autoStepMaxHeight: 0.7,
    fallingReorientation: true,
    fallingMovementControl: 0.2,
    jumpVelocity: 5,
    colliderRadius: .3,
    colliderHeight: 1
  })
  public thirdPartyCamera: ThirdPartyCameraComponent = attach(ThirdPartyCameraComponent, {
    height: 1,
    offsetX: 0,
    minDistance: 5,
    maxDistance: 5.6,
    distance: 5,
    bounceBackSpeed: 3,
    
  })
  public vfxSlash = attach(VfxSlashComponent)

  private characterMesh: Object3D

  async onInit(): Promise<void> {

    const loader = new FBXLoader()
    const glbLoader = new GLTFLoader()

    const characterMeshPath = 'assets/Kachujin G Rosales.fbx'
    this.characterMesh = await loader.loadAsync(characterMeshPath)

    const weaponMesh = (await glbLoader.loadAsync('assets/weapon.glb')).scene
    weaponMesh.scale.multiplyScalar(20)

    const handBone = findBone(this.characterMesh, 'mixamorigRightHand')
    //handBone.add(weaponMesh)

    // Get a reference to an object in the loaded weapon mesh that 
    // we later can use to get its position.


    // Replace the material of the character mesh
    const characterMaterial = new MeshStandardMaterial({color: 0x999999})
    this.characterMesh.traverse(o => {
      if (o instanceof Mesh) {
        //o.material = characterMaterial
        o.castShadow = true
        //o.visible = false
      }
    })


    const sm = await this.createStateMachine(loader, this.characterMesh)
    this.animation.playStateMachine(sm)
    this.animation.setup(this.characterMesh, [findBone(this.characterMesh, "mixamorigSpine2")])
    

    const meshRescaleFactor = 1/120
    this.characterMesh.scale.multiplyScalar(meshRescaleFactor)
    this.object.add(this.characterMesh)

    const attackClips = await loadClips(loader, {
      slash: 'assets/sword/Great Sword Slash.fbx',
      spinSlash: 'assets/sword/Sword And Shield Attack.fbx',
    })
    
    setInterval(() => {
      // In genshin impact, all attack animations will pause the default movement.
      // This makes attacks look better. Basically they all use root motion

      // When using root motion, you could play a root motion clip through the animator.
      // Alternatively, have some other root motion feature that can control both the character
      // movement and the animation at the same time. 
      // One solution could be to call the movement and animation at the same time.


      // So for the demo I
      // have to have a way to pause movement when playing the animation
      // or add support for root motion, basically passing in a root motion clip
      // to the character controller. The least it can do is to check if a root motion clip is active 
      // if so, do not update according to velocity or anything.
      // then extend it with updating the character position based on the clip. 
      // the animation component should always play the clip in place, removing the velocity track for the root bone.
      const rootMotionSlash = RootMotionClip.fromClip(attackClips.spinSlash, false)
      this.animation.play(rootMotionSlash, {
        inPlace: false, loop: false, priority: 1
      })
      
      this.movement.setRootMotionAction(this.animation.getRootMotionAction())

      setTimeout(() => this.vfxSlash.play(), 300)

      //console.log(this.animation.getRootMotionAction())

    }, 3000)
  }

  override onLateUpdate(deltaTime: number) {
    // In order to syncronise the walking animation with the speed of the character,
    // we can pass the movement speed from the movement component to the animation component.
    // Because we are also scaling our mesh, we need to factor this in. 
    this.animation.movementSpeed = this.movement.horizontalSpeed / this.characterMesh.scale.x


    this.world.scene.traverse(o => {
      if (o instanceof Mesh && o.material instanceof ShaderMaterial) {
        if (o.material.uniforms['playerPos'] != null) {
          o.material.uniforms['playerPos'].value = this.position
        }
      }
    })
  }



  private async createStateMachine(loader: Loader, characterMesh: Object3D): Promise<AnimationStateMachine> {
    const clips = await loadClips(loader, {
      //run: 'assets/rifle run.fbx',
      run: 'assets/picked/Running.fbx',
      //walking: 'assets/walking.fbx',
      walking: 'assets/female/walking.fbx',
      walkForwardLeft: 'assets/picked/Jog Forward Diagonal Left.fbx',
      walkForwardRight: 'assets/picked/Jog Forward Diagonal.fbx',
      walkBackwardRight: 'assets/picked/Jog Backward Diagonal Right.fbx',
      walkBackwardLeft: 'assets/picked/Jog Backward Diagonal.fbx',
      walkingBackwards: 'assets/picked/Walking Backward.fbx',
      idle: 'assets/female/idle.fbx',
      startWalking: 'assets/start walking.fbx',
      jump: 'assets/jump forward.fbx',
      falling: 'assets/falling idle.fbx',
      //strafeLeft: 'assets/strafe (2).fbx',
      //strafeRight: 'assets/strafe.fbx',
      //strafeLeft: 'assets/picked/Left Strafe.fbx',
      strafeLeft: 'assets/female/left strafe walk.fbx',
      strafeRight: 'assets/female/right strafe walk.fbx',
      strafeRunLeft: 'assets/female/left strafe.fbx',
      strafeRunRight: 'assets/female/right strafe.fbx',
      reload: 'assets/reload.fbx',
      land: 'assets/hard landing.fbx',
    })

    // TODO Need running strafe states
    // TODO Need 
    // TODO Actually run a jump animation instead of directly falling

    const rootBone = characterMesh.children.find(c => c instanceof Bone) as Bone
    if (rootBone == null) {
      throw new Error("No root bone found in mesh")
    }

    const grounded = new AnimationState(clips.idle)
    const groundMovement = grounded.createChild(null, () => this.movement.horizontalSpeed > 0 && this.movement.mode == CharacterMovementMode.walking)
    const [sprint, walk] = groundMovement.split(() => this.movement.isSprinting)      

    const walkForward = walk.createChild(RootMotionClip.fromClip(clips.walking, true), () => this.movement.directionInput.vertical > 0)
    walkForward.createChild(RootMotionClip.fromClip(clips.walkForwardLeft, true), () => this.movement.directionInput.horizontal < 0)
    walkForward.createChild(RootMotionClip.fromClip(clips.walkForwardRight, true), () => this.movement.directionInput.horizontal > 0)

    const walkBackward = walk.createChild(RootMotionClip.fromClip(clips.walkingBackwards, true), () => this.movement.directionInput.vertical < 0)
    walkBackward.createChild(RootMotionClip.fromClip(clips.walkBackwardLeft, true), () => this.movement.directionInput.horizontal < 0)
    walkBackward.createChild(RootMotionClip.fromClip(clips.walkBackwardRight, true), () => this.movement.directionInput.horizontal > 0)

    const strafe = walk.createChild(null, () => this.movement.directionInput.vertical == 0 && !this.movement.isSprinting)
    strafe.createChild(RootMotionClip.fromClip(clips.strafeLeft, true), () => this.movement.directionInput.horizontal < 0)
    strafe.createChild(RootMotionClip.fromClip(clips.strafeRight, true), () => this.movement.directionInput.horizontal > 0)

    const strafeRun = sprint.createChild(null, () => this.movement.directionInput.vertical == 0 && this.movement.isSprinting)
    strafeRun.createChild(RootMotionClip.fromClip(clips.strafeRunLeft, true), () => this.movement.directionInput.horizontal < 0)
    strafeRun.createChild(RootMotionClip.fromClip(clips.strafeRunRight, true), () => this.movement.directionInput.horizontal > 0)
    
    const fall = new AnimationState(clips.falling)
    grounded.transitionsTo(fall, () => this.movement.mode === CharacterMovementMode.falling)

    const land = new AnimationState(clips.land)

    fall.transitionsTo(grounded, () => this.movement.mode !== CharacterMovementMode.falling && this.movement.directionInput.vector.length() > 0)
    fall.transitionsTo(land, () => this.movement.mode !== CharacterMovementMode.falling && this.movement.directionInput.vector.length() == 0)
    land.transitionsOnComplete(grounded, () => 
      this.movement.mode === CharacterMovementMode.falling || this.movement.directionInput.vector.length() > 0)

    const runForward = sprint.createChild(RootMotionClip.fromClip(clips.run, true), () => this.movement.directionInput.vertical > 0)
    runForward.createChild(RootMotionClip.fromClip(clips.walkForwardLeft, true), () => this.movement.directionInput.horizontal < 0)
    runForward.createChild(RootMotionClip.fromClip(clips.walkForwardRight, true), () => this.movement.directionInput.horizontal > 0)
    sprint.createChild(RootMotionClip.fromClip(clips.walkingBackwards, true), () => this.movement.directionInput.vertical < 0)
    sprint.transitionsTo(strafe)

    return new AnimationStateMachine(grounded)
  }


}

export default CharacterActor


async function getClip(file: string, loader: Loader, name?: string) {
  const group = await loader.loadAsync(file)
  const clips = group.animations as AnimationClip[]
  if (name != null) {
    return clips.find(c => c.name === 'name')
  }
  return clips[0]
}

async function loadClips<T extends {[name: string]: string}>(loader: Loader, paths: T): Promise<{[Property in keyof T]: AnimationClip}>  {
  const entries = await Promise.all(Object.entries(paths).map(([name, path]) => Promise.all([name, getClip(path, loader)])))
  return Object.fromEntries(entries) as {[Property in keyof T]: AnimationClip}
}

function findBone(object: Object3D, name: string): Bone {
  let found: Bone
  object.traverse(o => {
    if (o instanceof Bone && o.name === name) {
      if (!found || found.children.length < o.children.length) {
        found = o
      }
    }
  })
  return found
}

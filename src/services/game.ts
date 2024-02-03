
import { inject, Service, World, GameInstance, ViewController, PhysicsSystem } from '@hology/core/gameplay';
import { SpawnPoint } from '@hology/core/gameplay/actors';
import CharacterActor from '../actors/character-actor';
import { InputService } from '@hology/core/gameplay/input';
import PlayerController from './player-controller';
import { BackSide, BufferGeometry, Material, Mesh, MeshBasicMaterial, MeshStandardMaterial, Side, SphereBufferGeometry, TextureLoader, Vector3 } from 'three';

@Service()
class Game extends GameInstance {
  private world = inject(World)
  private view = inject(ViewController)
  private inputService = inject(InputService)
  private playerController = inject(PlayerController)
  private physics = inject(PhysicsSystem)

  async onStart() {
    this.physics.showDebug = false
    const spawnPoint = this.world.findActorByType(SpawnPoint)
    console.log(this.world)
    console.log(spawnPoint)
    const character = await spawnPoint.spawnActor(CharacterActor)
    this.playerController.start()
    this.playerController.setup(character)
    this.inputService.start()


    let skyMesh: Mesh
    this.world.scene.traverse(o => {
      if (skyMesh == null && o instanceof Mesh && o.geometry instanceof SphereBufferGeometry && o.material instanceof Material) {
        if (o.material.side === BackSide) {
          skyMesh = o as Mesh
        }
      }
    })
    console.log(skyMesh)

    const skyImage = 'Sky_Anime_03_Day_a.png'
    //const skyImage = 'Sky_Anime_15_Day_a.png'
    const skyTexture = await new TextureLoader().loadAsync(skyImage)


    const skyMat = new MeshBasicMaterial({color: 0xffffff, map: skyTexture, side: BackSide, fog: false})
    skyMesh.material = skyMat

    const camera = character.thirdPartyCamera.camera.instance
    
    this.view.onUpdate().subscribe(deltaTime => {
      skyMesh.rotateY(0.007 * deltaTime)
      skyMesh.position.copy(camera.getWorldPosition(new Vector3()))
    })
  }
}

export default Game

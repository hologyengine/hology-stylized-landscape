
import { inject, Service, World, GameInstance } from '@hology/core/gameplay';

@Service()
class Game extends GameInstance {
  private world = inject(World)

  onStart() {

  }
}

export default Game

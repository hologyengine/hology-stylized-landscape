
import { RgbNode, lambertMaterial, mixColorsByLayer, rgb, standardMaterial } from "@hology/core/shader-nodes";
import { NodeShader, NodeShaderOutput, Parameter } from "@hology/core/shader/shader";
import { Color } from "three";

export class GroundShader extends NodeShader {
  @Parameter()
  color: Color

  output(): NodeShaderOutput {
    const layered = mixColorsByLayer({
      layerColors: [
        rgb(this.color), // 0x073918
        rgb(0x89752F),
      ],
      decay: 0.2,
      noiseAmount: 0.7,
      noiseScale: .1
    })

    // Standard material results in some shadow acne
    return {
      color: lambertMaterial({color: layered}),
      transparent: false
    }
  }
}

export default GroundShader

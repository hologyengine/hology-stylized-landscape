
import { lambertMaterial, mixColorsByLayer, rgb } from "@hology/core/shader-nodes";
import { NodeShader, NodeShaderOutput, Parameter } from "@hology/core/shader/shader";
import { Color } from "three";

export class GroundShader extends NodeShader {
  @Parameter()
  color: Color = new Color(0x073918)

  @Parameter()
  colorPath: Color = new Color(0x89752F)

  output(): NodeShaderOutput {
    const layered = mixColorsByLayer({
      layerColors: [
        rgb(this.color), 
        rgb(this.colorPath)
      ],
      decay: 0.2,
      noiseAmount: 0.7,
      noiseScale: .1
    })

    return {
      color: lambertMaterial({color: layered}),
      transparent: false
    }
  }
}

export default GroundShader
